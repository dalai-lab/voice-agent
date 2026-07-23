# Callback Feature Specification — Dograh

> **Status:** Proposed / Not Yet Implemented  
> **Scope:** Single outbound, inbound, and campaign calls  
> **Date:** 2026-07-23

---

## What "Callback" Means

When a user says during a live call:
> *"Can you call me back in 10 minutes?"*  
> *"I'm busy right now, call me in an hour."*

The AI agent should:
1. **Acknowledge** ("Sure, I'll call you back in 10 minutes!")
2. **End the current call gracefully**
3. **Schedule a new outbound call** to the same number after the requested delay
4. **Continue the conversation** via a fresh call with full context injected (see Section 4)

---

## Industry Standard (How Vapi Does It)

Vapi treats callback as a **first-class workflow tool** called `transferCall` with a `schedule` variant.  
When triggered, Vapi:
- Ends the call immediately
- Creates a deferred outbound job with a TTL delay
- On callback, starts a **fresh call** with the original assistant config
- Does NOT resume previous conversation — the conversation state is reset

**Key insight:** Vapi does NOT resume conversation context on callback. It is always a fresh call with optionally injected metadata (like "this is a callback, you spoke to this person earlier about X"). Dograh can follow the same pattern or go further by injecting a conversation summary.

---

## How It Should Work in Dograh

### Core Principle
The callback tool is just a **scheduled outbound call** triggered from inside a live call. It reuses:
- `initiate_call()` — already on every provider (Plivo, Twilio, Telnyx, etc.)
- `enqueue_job(..., _defer_by=timedelta(...))` — ARQ already supports delayed jobs natively
- `initial_context` — already injected into every workflow run

No new provider changes needed. A lightweight DB record is needed for single outbound/inbound callbacks (for durability against Redis flushes — see Section 9b).

---

## Section 1: Single Outbound Call

### Scenario
A sales agent calls a lead. The lead says "I'm in a meeting, call me back in 30 minutes."

### How it works step by step

```
1. AI detects intent → calls `schedule_callback(minutes=30, message="Sure, I'll call you back!")`
2. Tool execution:
   a. Reads `called_number` from `initial_context` (this is the lead's number)
   b. Reads `caller_number` from `initial_context` (this is the Dograh number that called)
   c. Reads `workflow_id` and `organization_id` from current run
   d. Optionally generates a SHORT summary of the conversation so far
   e. Enqueues ARQ job: `execute_callback(to=called_number, from=caller_number, ...)`
      with `_defer_by=timedelta(minutes=30)`
   f. Returns success to AI → AI says goodbye → call ends
3. 30 minutes later: ARQ fires → `initiate_call()` is called → new workflow run starts
4. The new workflow run has `initial_context` injected with full context:
   {
     "is_callback": true,
     "callback_reason": "user_requested",
     "original_run_id": 123,
     "conversation_summary": "User was interested in the premium plan but was in a meeting.",
     "gathered_context": { ...all data collected during original call },
     "callback_chain_depth": 1
   }
5. AI starts at Node 1, sees is_callback=true, greets: "Hi! Calling you back as promised..."
```

### Edge Cases — Single Outbound

| Edge Case | Behavior |
|---|---|
| User says "call me in 5 seconds" | Minimum delay enforced: **60 seconds**. AI tells user: "I'll call you back in about a minute." |
| User says "call me tomorrow" | Maximum delay enforced: **24 hours**. AI informs user and confirms. |
| Callback call is not answered | Treat as failed outbound — mark as `no_answer`. Do NOT auto-retry (avoids infinite loops). |
| Callback call goes to voicemail | Leave a short voicemail: "Hi, this is your requested callback. Please call us back." Then end. |
| Dograh number is busy when callback fires | ARQ retries up to 3 times with 30-second gaps. If still unavailable, callback fails with a log entry. |
| User requests callback twice in same call | Only the first `schedule_callback` call is honored. Tool rejects subsequent calls: "A callback is already scheduled." |

---

## Section 2: Inbound Call

### Scenario
A customer calls your support line. The agent picks up. The customer says "I'm about to go into a meeting, can you call me back in 20 minutes?"

### How it works

```
1. Inbound call arrives → normalized via `parse_inbound_webhook()`
   → `from_number` = customer's number (stored in `initial_context`)
   → `to_number`   = your Dograh/Plivo number (stored in `initial_context`)

2. AI calls `schedule_callback(minutes=20)`
3. Tool reads:
   - `to_number` from `initial_context` → becomes the NEW `from_number` for the callback
     (we call them BACK from the same number they originally called)
   - `from_number` from `initial_context` → the customer's number (who to call)
4. Enqueues ARQ callback job
5. Call ends gracefully
6. 20 minutes later → `initiate_call(to=customer_number, from=your_dograh_number)`
7. New workflow run starts with `is_callback: true` in `initial_context`
```

### Edge Cases — Inbound

| Edge Case | Behavior |
|---|---|
| Customer calls from a withheld / private number | `from_number` is null. Tool fails gracefully: "I'm sorry, I'm unable to schedule a callback as your number appears to be private. You can call us back at [number]." |
| The inbound number has no outbound capability | Tool must verify the Dograh number has outbound enabled before scheduling. If not, inform the user. |
| WebRTC / browser-based call (not phone) | `from_number` doesn't exist. Tool detects `WorkflowRunMode.WEBRTC` and responds: "I'm sorry, I can only schedule callbacks for phone calls." |

---

## Section 3: Campaigns

This is the most complex case.

### 3a. Normal Campaign Callback (Single Concurrency)

```
Campaign has 100 contacts, 1 phone number, concurrency = 1.
Contact #45 says "call me back in 15 mins."

1. AI calls `schedule_callback(minutes=15)`
2. Tool behavior:
   a. Reads `called_number` from `initial_context`
   b. Reads `caller_number` from `initial_context`
   c. Reads `campaign_id` from `initial_context`
   d. Creates a NEW `queued_run` in the DB:
      - campaign_id = original campaign_id  ← keeps it linked for reporting
      - context_variables = { ...original_vars, is_callback: true }
      - scheduled_for = now + 15 minutes
      - state = "queued"
      - retry_reason = "user_requested_callback"  ← new reason type
   e. Call ends gracefully
3. Campaign continues calling contacts #46, #47, #48...
4. At T+15min, orchestrator sees the scheduled queued_run is due → dispatches it
5. Contact #45 gets called back with `is_callback: true` in `initial_context`
```

**Why use `queued_run`?**  
The campaign orchestrator already handles `scheduled_for` on `QueuedRun`. See `_has_pending_work()` in `campaign_orchestrator.py` — it already checks `scheduled_before=datetime.now(UTC)`. The callback slot naturally plugs into existing infrastructure with zero changes to the orchestrator.

### 3a-1. Critical Edge Case: Number Is Busy When Callback Fires (Single Number)

```
1 phone number. Concurrency = 1.

T+0:00  → User #45 says "call me back in 2 mins"
           → Callback queued_run created with scheduled_for = T+2:00
           → User #45's call ends gracefully
T+0:01  → Campaign picks up next queued run → starts calling User #46
T+2:00  → Orchestrator sees callback queued_run is due → tries to dispatch it
           → acquire_from_number() tries to grab the Plivo number from the pool
           → BUT the number is BUSY on User #46's call!
           → acquire_from_number() WAITS — polls every 1 second, up to 600 seconds
T+10:00 → User #46's call finally ends → number is released back to the pool
           → acquire_from_number() finally gets the number
           → Callback to User #45 fires — 8 minutes late
```

**The campaign does NOT stop calling other people. It should NOT.**  
Pausing the entire campaign for one person's callback would punish everyone else in the list. That would be terrible product behavior.

**The callback timing is "best-effort" on a single-number campaign.**  
The user was promised 2 minutes. They might get it in 10 minutes. This is unavoidable with 1 number.

**What should the AI say when scheduling the callback on a single-number campaign?**  
The tool should detect `concurrency = 1` + `1 phone number` and instruct the AI to temper expectations:

> ❌ "I'll call you back in exactly 2 minutes."  
> ✅ "I'll call you back in about 2 minutes — it may be a few minutes longer depending on availability."

**What if the callback wait exceeds 600 seconds (10 minutes)?**  
`acquire_from_number()` returns `None` → `PhoneNumberPoolExhaustedError` is raised.  
The queued_run should be re-queued (not failed) and retried on the next orchestrator cycle.  
The callback will eventually fire — just later than promised.

**For multi-number campaigns this problem largely disappears.**  
With 3 numbers and concurrency = 3, there is usually a free number available when the callback fires. Timing is nearly exact.

### 3b. Campaign Callback (Multi-Concurrency, Multiple Numbers)

**Which number calls them back?**

**Standard (recommended):** Always use the **same `caller_number` that made the original call**.
- Already stored in `initial_context.caller_number` by `campaign_call_dispatcher.py`
- Familiar number = customer more likely to pick up
- Simple implementation: pass `caller_number` directly to the callback queued_run

**Do NOT** randomly pick a different number from the pool. This confuses the contact.

### 3c. Edge Case: User requests callback just before campaign ends

```
Campaign has 3 contacts total.
Contact #3 (the last one) says "call me back in 5 minutes."
Campaign processes #3, creates callback queued_run, original call ends.
Campaign sees: processed_rows = 3, no more standard "queued" rows.
But the callback queued_run is in state "queued" with scheduled_for = now+5min.
```

**What happens:**  
The orchestrator's `_has_pending_work()` checks for ALL queued runs including the callback one. The campaign will **NOT** be marked as completed until after the callback has been dispatched and completed. This already works with existing code — no special handling needed.

### 3d. Edge Case: Callback outside Campaign Schedule Window

This is more complex than it first appears. There are **two very different sub-cases**:

#### Sub-case 1: Short delay, slightly outside window (the 2-hour example)
```
Campaign window: 6:00 PM – 6:30 PM
User says "call me back in 2 hours" at 6:15 PM
Callback fires at: 8:15 PM  ← reasonable hour, just outside the window
```
**Correct behavior:** Fire it. The user asked for 8:15 PM. That's a normal hour. Ignore the campaign window for this callback.

#### Sub-case 2: Long delay, crosses into unsociable/illegal hours (your 6-hour example)
```
Campaign window: 6:00 PM – 6:30 PM
User says "call me back in 6 hours" at 6:15 PM
Callback fires at: 12:15 AM  ← MIDNIGHT
```
**Wrong behavior (current spec):** `ignore_schedule_window: true` → Dograh calls at 12:15 AM. Person is asleep. ❌  
**Also wrong:** Block the callback entirely because it's outside the window. User was promised a callback. ❌  
**Correct behavior:** Hold the callback until the **next allowed window opens** (next day 6:00 PM).

#### The Rule (Two-Layer Check)

When a callback `queued_run` is about to be dispatched, check in this order:

```
1. Is the callback fire time within "sociable hours" (8 AM – 9 PM local time)?
   → YES: Fire it. Ignore campaign schedule window. (Sub-case 1)
   → NO (e.g., midnight, 3 AM): Do NOT fire. Hold until next allowed window. (Sub-case 2)

2. If holding, when to fire?
   → Campaign has a schedule config? → Fire at the start of the next configured slot.
   → No schedule config? → Fire at 8:00 AM next morning (safe default).
```

**Legal note:** In India (TRAI), outbound marketing calls are restricted to 9 AM – 9 PM. In the US (TCPA), it's 8 AM – 9 PM local time. The 8 AM – 9 PM default is a safe, universal window that avoids regulatory violations in both markets.

**Implementation change:** Replace `ignore_schedule_window: true` with two flags:
```python
context_variables = {
    ...original_vars,
    "is_callback": True,
    "callback_ignore_campaign_window": True,   # skip campaign's business schedule
    "callback_sociable_hours_only": True,       # still respect 8AM-9PM hard limit
    "callback_originally_requested_at": "2026-07-23T18:15:00Z",
    "callback_originally_requested_minutes": 360,  # 6 hours
}
```



### 3e. Edge Case: Callback fires but campaign is Paused or Completed

| Campaign State | Behavior |
|---|---|
| **Paused** (manually) | Do NOT fire the callback. Leave queued_run in `queued` state. Fire when campaign is resumed. |
| **Paused** (circuit breaker) | Same as manual pause — defer. |
| **Completed** | Fire the callback anyway. A user was explicitly promised. Log it as a special run linked to the completed campaign for reporting. |
| **Failed** | Fire the callback anyway for the same reason. |

---

## Section 4: Conversation Continuity — Does It Resume Where It Left Off?

### Final Decision: Fresh call. Start at Node 1. Inject full `gathered_context` + summary.

---

### Why Not Resume the Exact Call State

The Pipecat pipeline (`pipecat_engine.py`) is **entirely in-memory**:
- `self._current_node` — gone when call ends
- LLM context window (message history) — gone
- `self._gathered_context` — gone (not persisted to DB during call)
- WebSocket to Plivo/Twilio — dead

There is literally nothing to resume. The only thing that survives is what was written to the DB: the transcript and the workflow run record.

---

### Why Not Jump Straight to Node 7

You might think: "Just skip to the node where the user was." The code proves why this breaks.

In `set_node()` ([pipecat_engine.py L669]()), the engine accumulates variables via extraction as it moves through nodes:
```python
nodes_visited = self._gathered_context.setdefault("nodes_visited", [])
```

If you jump to Node 7, Nodes 1–6 never ran. Any variable that those nodes were supposed to extract is **missing**. Node 7's prompt might say:
> *"The user's pain point is `{{gathered_context.pain_point}}`"*

But `pain_point` was extracted in Node 4 which was skipped → it's blank → conversation is broken.

---

### The Right Approach: Node 1 + Pre-filled `gathered_context`

**1. When `schedule_callback` tool fires**, before ending the call, save:
```python
gathered_context = engine._gathered_context   # everything already collected
conversation_summary = "[LLM-generated 1-2 sentence summary]"
```

**2. The callback's `initial_context` includes both:**
```json
{
  "is_callback": true,
  "callback_reason": "user_requested",
  "original_run_id": 167,
  "conversation_summary": "Rahul was interested in Premium plan ₹2999/mo. Asked about onboarding timeline. Callback requested in 30 mins.",
  "gathered_context": {
    "name": "Rahul",
    "company": "TechStartup",
    "interest": "Premium plan",
    "pain_point": "Current tool is too slow",
    "budget_confirmed": true
  },
  "callback_chain_depth": 1
}
```

**3. The engine starts at `workflow.start_node_id` — exactly as always.**  
Zero changes to `pipecat_engine.py`. Zero changes to `workflow_graph.py`.

**4. The AI at Node 1 handles everything through its prompt:**
```
If is_callback is true in initial_context:
- Skip intro and qualification entirely
- Greet them: "Hi {{gathered_context.name}}, calling back as promised!"
- Reference what they were discussing: {{conversation_summary}}
- Continue the conversation naturally from there
```

**Result:**
```
Callback call starts at Node 1.
AI sees: is_callback=true, name="Rahul", summary="Premium plan, onboarding question"
AI says: "Hi Rahul! Calling you back as promised. You were asking about
          the onboarding timeline for the Premium plan — shall we pick
          up right there?"
User: "Yes!"
→ Conversation continues naturally. Node transitions happen normally.
→ gathered_context.pain_point is already filled → Node 7 works perfectly.
```

Feels like continuity. Is technically a fresh call. No glitches. No empty variables.

---

### Why This Beats Every Other Option

| Option | Result |
|---|---|
| Resume live pipeline state | ❌ Impossible — pipeline is dead |
| Fresh call, no context | ❌ "What's your name?" again — user is annoyed |
| Jump to Node 7 | ❌ Missing extracted variables from Nodes 1–6 → broken prompts |
| **Node 1 + pre-filled gathered_context + summary** | ✅ Seamless UX, no engine changes, extracted data available everywhere |

---



## Section 5: The `schedule_callback` Tool Definition

```python
{
  "name": "schedule_callback",
  "description": (
    "Schedule a callback call to the current user after a delay. "
    "Use this ONLY when the user explicitly asks to be called back later. "
    "This will end the current call and call the user back after the specified delay. "
    "Minimum delay is 1 minute. Maximum delay is 480 minutes (8 hours) by default — configurable per workflow. "
    "NOT available for web/browser calls — only phone calls. "
    "After calling this tool, say your farewell_message and let the call end naturally."
  ),
  "parameters": {
    "type": "object",
    "properties": {
      "minutes": {
        "type": "integer",
        "description": "Number of minutes before calling back. Min: 1, Max: determined by workflow config (default 480).",
        "minimum": 1,
        "maximum": 480
      },
      "farewell_message": {
        "type": "string",
        "description": "What to say to the user before ending the call. E.g. 'Perfect, I'll call you back in 10 minutes!'"
      },
      "conversation_summary": {
        "type": "string",
        "description": "A 1-2 sentence summary of the conversation so far, to be injected as context on the callback call."
      }
    },
    "required": ["minutes", "farewell_message", "conversation_summary"]
  }
}
```

---

## Section 6: New ARQ Task Needed

```python
# api/tasks/function_names.py — add:
EXECUTE_CALLBACK = "execute_callback"

# api/tasks/callback_tasks.py — new file:
async def execute_callback(ctx, to_number, from_number,
                           workflow_id, organization_id,
                           original_run_id, conversation_summary,
                           gathered_context,          # ← full context from original call
                           callback_chain_depth=1,    # ← for chain depth enforcement
                           campaign_id=None):
    """
    Fires the actual callback outbound call.
    Called by ARQ after the delay expires.
    """
    provider = await get_telephony_provider_for_org(organization_id)

    callback_context = {
        "is_callback": True,
        "callback_reason": "user_requested",
        "original_run_id": original_run_id,
        "conversation_summary": conversation_summary,
        "gathered_context": gathered_context,           # ← injected for Node 1 continuity
        "callback_chain_depth": callback_chain_depth,   # ← chain depth enforcement
        "caller_number": from_number,
        "called_number": to_number,
    }
    if campaign_id:
        callback_context["campaign_id"] = campaign_id

    new_run = await db_client.create_workflow_run(
        name=f"WR-CALLBACK-{original_run_id}",
        workflow_id=workflow_id,
        mode=provider.PROVIDER_NAME,
        initial_context=callback_context,
        campaign_id=campaign_id,
        organization_id=organization_id,
    )

    backend_endpoint, _ = await get_backend_endpoints()
    webhook_url = (
        f"{backend_endpoint}/api/v1/telephony/{provider.WEBHOOK_ENDPOINT}"
        f"?workflow_id={workflow_id}&workflow_run_id={new_run.id}"
        f"&organization_id={organization_id}"
    )

    await provider.initiate_call(
        to_number=to_number,
        from_number=from_number,
        webhook_url=webhook_url,
        workflow_run_id=new_run.id,
    )
```

---

## Section 7: What NOT to Do (Anti-Patterns)

| Anti-Pattern | Why Bad |
|---|---|
| Auto-retry a missed callback | Creates infinite callback loops |
| Use a random number from pool for callback | Caller ID should be consistent — user won't recognise unknown number |
| Resume live LLM conversation state | Technically impossible across two separate phone calls |
| Allow callbacks > 8 hours (default) | Beyond 8 hours is unusual for a phone callback; org-level cap prevents abuse. Absolute hard limit is 24h — beyond that ARQ deferred jobs are unreliable. |
| Allow callbacks on WebRTC/web sessions | No `from_number` exists — meaningless |
| Block callback if campaign is completed | Bad UX — user was explicitly promised a callback |
| Let schedule window block a user-requested callback | User was promised — always honor it |

---

## Section 8: Summary Table

| Scenario | Supported | Number Used | Context Carried Over |
|---|---|---|---|
| Single outbound → callback | ✅ | Same `caller_number` | `gathered_context` + summary injected, starts at Node 1 |
| Inbound → callback | ✅ | Same `to_number` the customer originally called | `gathered_context` + summary injected, starts at Node 1 |
| WebRTC / web call → callback | ❌ Not possible | N/A — no phone number | N/A |
| Campaign (1 number) → callback | ✅ | Same campaign number | `gathered_context` + summary injected + campaign linked |
| Campaign (multi-number) → callback | ✅ | Same number that made the original call | `gathered_context` + summary injected + campaign linked |
| Callback just before campaign completes | ✅ | Campaign stays "running" until callback fires | Campaign tracking preserved |
| Callback outside campaign window (short delay) | ✅ Ignore campaign window, respect sociable hours | Same number | Fires when due if within 8AM–9PM |
| Callback outside sociable hours (long delay) | ⏸ Held | Same number | Fires at next allowed window opening |
| Campaign paused → callback pending | ⏸ Deferred | — | Fires when campaign resumes |
| Campaign completed → callback pending | ✅ Fire anyway | Same number | Logged as standalone callback run |
| Private/withheld number inbound | ❌ Not possible | N/A | User informed gracefully |

---

## Section 9: User-Configurable Settings

These are settings that should be exposed to the user — either in **Workflow Settings** (per-agent) or **Campaign Advanced Settings** (per-campaign) or **Organization Settings** (platform-wide).

---

### 10a. Workflow (Agent) Level Settings

Stored in `workflow_configurations` JSON column on `WorkflowModel` — the same pattern already used for `external_pbx_field_mappings` and `context_compaction_enabled`.

```json
{
  "callback": {
    "enabled": true,
    "min_delay_minutes": 1,
    "max_delay_minutes": 480,
    "max_chain_depth": 2,
    "include_conversation_summary": true,
    "busy_retry_enabled": true,
    "busy_retry_delay_minutes": 5
  }
}
```

| Setting | Type | Default | What it does |
|---|---|---|---|
| `enabled` | bool | `true` | Master toggle — disables the `schedule_callback` tool entirely for this agent |
| `min_delay_minutes` | int | `1` | Minimum callback delay the AI will accept. If user says "call in 10 seconds", AI says it can only go as low as this. |
| `max_delay_minutes` | int | `480` (8 hrs) | Maximum delay allowed. If user says "call me next week", AI caps at this and asks to confirm. |
| `max_chain_depth` | int | `2` | How many times a callback can itself request another callback before being blocked. Prevents infinite loops. |
| `include_conversation_summary` | bool | `true` | Whether to generate and inject a conversation summary into the callback call's `initial_context`. Some workflows may not want this (e.g., simple transactional agents). |
| `busy_retry_enabled` | bool | `true` | Whether to retry the callback call once if the user is busy (carrier returns `busy`). |
| `busy_retry_delay_minutes` | int | `5` | How long to wait before the single busy-retry attempt. |

**Where in the UI:** Agent Workflow → Settings tab → "Callback Settings" section. Same place as DTMF toggle (`enable_dtmf` already lives here).

---

### 10b. Campaign Level Settings

Stored in `orchestrator_metadata` JSON column on `CampaignModel` — same pattern already used for `circuit_breaker` and `schedule_config`.

```json
{
  "callback_config": {
    "enabled": true,
    "sociable_hours_start": "08:00",
    "sociable_hours_end": "21:00",
    "sociable_hours_timezone": "Asia/Kolkata",
    "honor_campaign_window_for_long_callbacks": true,
    "long_callback_threshold_minutes": 120
  }
}
```

| Setting | Type | Default | What it does |
|---|---|---|---|
| `enabled` | bool | `true` | Campaign-level toggle. Overrides the workflow-level `enabled` flag. Lets you run an agent that supports callbacks in general, but disable it for a specific bulk campaign. |
| `sociable_hours_start` | string (HH:MM) | `"08:00"` | No callbacks before this time (local). Regulatory safe default (TRAI: 9 AM, TCPA: 8 AM — using 8 AM to be safe for both). |
| `sociable_hours_end` | string (HH:MM) | `"21:00"` | No callbacks after this time (local). |
| `sociable_hours_timezone` | IANA timezone | org default timezone | Which timezone to use for sociable hours enforcement. Defaults to the org's configured timezone from `ORGANIZATION_PREFERENCES`. |
| `honor_campaign_window_for_long_callbacks` | bool | `true` | If `true` and callback delay > `long_callback_threshold_minutes`, hold the callback until the next campaign schedule window instead of firing immediately. |
| `long_callback_threshold_minutes` | int | `120` (2 hrs) | The threshold beyond which a callback is considered "long" and subject to window re-alignment. Below this, the callback always fires when due (ignoring campaign window). |

**Where in the UI:** Campaign → Advanced Settings → "Callback Settings" section. Same section as the existing "Automatically retry failed calls" and "Circuit Breaker" toggles.

---

### 10c. Organization Level Settings

Stored in `ORGANIZATION_PREFERENCES` configuration key — same pattern as the org's `timezone` and `test_call_number`.

```json
{
  "callback_defaults": {
    "sociable_hours_start": "08:00",
    "sociable_hours_end": "21:00",
    "max_delay_minutes": 480,
    "max_chain_depth": 2
  }
}
```

| Setting | Type | Default | What it does |
|---|---|---|---|
| `sociable_hours_start` | string (HH:MM) | `"08:00"` | Org-wide default. Individual campaigns can override this. |
| `sociable_hours_end` | string (HH:MM) | `"21:00"` | Org-wide default. Individual campaigns can override this. |
| `max_delay_minutes` | int | `480` | Org-wide max. Agents cannot allow callbacks longer than this, even if the agent's own setting is higher. |
| `max_chain_depth` | int | `2` | Org-wide chain depth cap. Hard ceiling regardless of agent settings. |

**Where in the UI:** Organization Settings → "Calling Defaults" or "Compliance" section.

---

### 10d. Settings Priority (Precedence Order)

When the tool executes, it must resolve conflicting settings in this order:

```
Org max_delay_minutes         ← hard ceiling, always wins
  ↓
Campaign callback_config       ← overrides workflow defaults for campaign calls
  ↓
Workflow callback config        ← per-agent defaults
  ↓
Tool call arguments (minutes)  ← what the user actually said
```

**Example:**  
- Org sets `max_delay_minutes = 480` (8 hours)  
- Campaign sets `enabled = false`  
- User says "call me in 2 hours"  
→ Result: Callback is **blocked** because campaign-level `enabled = false`

**Example 2:**  
- Org sets `max_delay_minutes = 480`  
- Workflow sets `max_delay_minutes = 60` (1 hour)  
- User says "call me in 3 hours"  
→ Result: AI says "I can schedule a callback for up to 1 hour from now. Shall I call you back in 1 hour?"

---

### 10e. What the AI Should Say for Each Config Case

| Situation | AI Response |
|---|---|
| Callback disabled entirely | "I'm sorry, I'm unable to schedule callbacks for this call. Please call us back at [number] when you're ready." |
| Requested delay < `min_delay_minutes` | "I can schedule a callback in as little as [min] minute(s). Shall I call you back in [min] minutes?" |
| Requested delay > `max_delay_minutes` | "I can schedule callbacks for up to [max] hours from now. Shall I call you back in [max] hours?" |
| Callback would fire at midnight (outside sociable hours) | "I'll schedule your callback for [next allowed window start time] when I'm able to reach you at a reasonable hour. Does that work?" |
| Max chain depth reached | "I'm unable to schedule another callback. Please call us back directly at [number] when you're ready." |
| WebRTC / browser call | "I'm sorry, callbacks are only available for phone calls." |
| Private number inbound | "I'm sorry, I can't schedule a callback as your number is private. You're welcome to call us back at [number]." |

---

## Section 10: All Remaining Edge Cases


### 9a. Call Gets Force-Terminated Before Tool Can Execute

The code in `pipecat_engine_callbacks.py` shows two hard kill scenarios:
- **User Idle**: After 2 idle periods → `end_call_with_reason(USER_IDLE_MAX_DURATION_EXCEEDED)` — call killed immediately
- **Max Duration**: Call time limit exceeded → `end_call_with_reason(CALL_DURATION_EXCEEDED, abort_immediately=True)` — **hard abort, no graceful exit**

**Edge Case:** User says "call me back in 10 mins" at second 59 of a 60-second max-duration call.  
The tool starts executing. At second 60, `abort_immediately=True` fires and kills the task.  
The `schedule_callback` tool call never completes. No queued_run is created. No callback scheduled.

**Fix:** The tool execution must be atomic — it must either fully commit the queued_run to DB OR not start at all. The tool should write the queued_run to DB as its **first action** (before returning to the LLM), so that even if the call is killed mid-tool, the DB entry exists and the callback still fires.

---

### 9b. ARQ Worker Restarts While Callback Job Is Deferred

ARQ stores deferred jobs in Redis. If the ARQ worker restarts (deployment, crash) while a 30-minute callback job is sitting in Redis, the job survives because it's in Redis — not in memory.

**What happens:** Worker comes back up, job fires at the correct time. ✅ No issue.

**But:** If Redis itself is flushed (data loss), the deferred ARQ job is gone. The callback is silently lost. The user never gets called back.

**Fix for campaigns:** Since campaign callbacks are stored as `queued_run` rows in PostgreSQL, they survive Redis flushes. The orchestrator's `_check_stale_campaigns()` loop picks them up within 60 seconds. ✅

**Fix for single outbound / inbound callbacks:** These use pure ARQ (`_defer_by`) with no DB row. They are Redis-only. A Redis flush loses them silently. To make them durable, the callback must also write a lightweight DB record (e.g. a new `ScheduledCallbackModel`).
**UI Requirement:** Because these pending non-campaign callbacks do not exist in the main `WorkflowRunModel` (call logs) until they actually fire, the UI must have a separate **"Pending Callbacks"** menu/view that reads from this new `ScheduledCallbackModel` table. This allows admins to see and manage callbacks that are waiting to happen.

---

### 9c. User Says "Call Me Back" Multiple Times Across Multiple Calls

```
Day 1: User gets campaign call → says "call me back in 10 mins" → callback fires
Day 1: Callback fires → user says "call me back tomorrow morning"
Day 2: Callback fires → user says "call me back next week"
```

**Is there a limit?** Currently no mechanism prevents a chain of callbacks creating an infinite loop where one person monopolizes a campaign number indefinitely.

**Fix:** Track `callback_chain_depth` in `initial_context`. Max depth = 2 (one callback per original contact). If `callback_chain_depth >= 2`, the AI should say: "I'm sorry, I'm unable to schedule another callback. Please call us back at [number] when you're ready."

---

### 9d. DB Unique Constraint Conflict on Campaign Callback `source_uuid`

From `models.py` line 836-841:
```python
UniqueConstraint(
    "campaign_id", "source_uuid", "retry_count",
    name="unique_campaign_source_retry",
)
```

When creating a callback `queued_run`, the `source_uuid` must be unique within the campaign + retry_count combination. If the same person requests callback twice (in two different calls on the same campaign), creating a second `queued_run` with the same `source_uuid` will throw a DB integrity error.

**Fix:** Use a timestamp-based unique suffix for callback source_uuids:  
`source_uuid = f"{original_source_uuid}_callback_{int(time.time())}"`  
This guarantees uniqueness even for repeat callbacks.

---

### 9e. Workflow Is Deleted or Archived After Callback Is Scheduled

```
User requests callback in 2 hours.
Admin deletes the workflow 30 minutes later.
Callback ARQ job fires 2 hours later → tries to create workflow run with deleted workflow_id.
```

**What happens:** `db_client.get_workflow()` returns None → `ValueError: Workflow not found` → ARQ job fails → callback silently dropped.

**Fix:** Before scheduling a callback, validate that the workflow exists. In the ARQ task, if the workflow is deleted/archived, log the failure and send a fallback SMS or notification to the org (if notification system exists). Do NOT retry — the workflow is gone.

---

### 9f. Quota Exceeded When Callback Fires

From `campaign_call_dispatcher.py` line 333-353 — every call goes through `authorize_workflow_run_start()`. If the org has run out of quota between when the callback was scheduled and when it fires:

```
User requests callback in 1 hour.
Org quota is exhausted 30 minutes later.
Callback ARQ job fires → authorize_workflow_run_start() returns has_quota=False.
The workflow run is created but immediately marked completed with error.
The user never gets called.
```

**Fix:** Log this as a `quota_exceeded_callback` event on the campaign (if it's a campaign callback) or as a system log entry (if single outbound/inbound). The user deserves to know their callback was dropped due to quota.

---

### 9g. The Callback Call Is Picked Up, But User Hangs Up Immediately

This is a real-world scenario — the user forgot they requested a callback, sees an unknown number, picks up and immediately hangs up.

**What happens:** Callback call is marked as `user_hangup` with 1-2 second duration. 

**Should it retry?** NO. Unlike campaign retries for `no_answer`/`busy`, a `user_hangup` means the person actively rejected the call. Retrying is harassment.

**Fix:** The `retry_reason = "user_requested_callback"` flag should explicitly be excluded from the normal retry logic. If a callback call results in `user_hangup`, it is permanently closed.

---

### 9h. Callback Fires, But User Is Currently On Another Call (Busy)

The user is on their personal phone when the callback comes in. Their carrier sends a `busy` signal back to Plivo.

**Should it retry?** YES, once, after a short delay (5 minutes). Unlike campaign retries, a single retry is reasonable.

**Implementation:** On `busy` from a callback call, re-enqueue the ARQ job with `_defer_by=timedelta(minutes=5)`. Set `callback_chain_depth` so it doesn't retry again after the retry attempt.

---

### 9i. Two Campaigns Have the Same Contact Number — Race Condition

```
Campaign A calls +919876543210 → user says "call me back in 5 mins"
Campaign B also has +919876543210 in its list → calls them at T+1min
Callback from Campaign A fires at T+5min → tries to acquire a from_number
But Campaign B's call to the same number is already active!
```

This isn't a phone number pool conflict (different campaigns may use different Plivo numbers). The issue is on the **recipient side** — you're calling the same person twice near-simultaneously from two different campaigns.

**What happens at the carrier level:** The recipient's phone rings with call 2 while they're on call 1 (call waiting). Or they get a missed call. This is confusing UX.

**Fix:** Before dispatching any outbound call (callback or regular), check if a `workflow_run` with `initial_context.called_number == target_number` is currently `in_progress` across the entire org. If yes, delay the dispatch by 30 seconds and retry. This is a cross-campaign deduplication check.

---

### 9j. User Requests Callback During the Farewell/Goodbye Sequence

```
Agent is already saying "Thank you for your time, have a great day!"
User interrupts: "Wait, can you call me back in 5 minutes?"
```

Dograh uses an LLM pipeline — the AI may already be in the middle of its goodbye speech when user speech is detected. Depending on VAD (Voice Activity Detection) and LLM interrupt settings, the new user utterance may or may not be processed.

**What happens:** If the goodbye TTS is playing and the call ends before the LLM processes the interrupt, the callback request is silently lost.

**Fix:** The `schedule_callback` tool, when executed, should immediately flush a TTS "Okay, I'll call you back!" confirmation frame BEFORE returning control to the pipeline. This ensures the user hears a confirmation even if the call is ending.

---

### 9k. Callback Scheduled, But Worker Is Down for Maintenance During the Fire Time

```
Callback scheduled for 3:00 PM.
ARQ worker is redeployed at 2:55 PM → back up at 3:07 PM.
The 3:00 PM job was missed.
```

**What ARQ does:** ARQ uses `_defer_by` which sets a `scheduled_at` timestamp in Redis. When the worker comes back up at 3:07 PM, it sees the job was due at 3:00 PM and runs it immediately. ✅ No loss.

**For campaign queued_runs:** The orchestrator's 60-second poll loop sees the `scheduled_for` is overdue and dispatches it immediately on the next cycle. ✅

---

### 9l. Summary of All New Edge Cases

| # | Edge Case | Risk | Fix |
|---|---|---|---|
| 9a | Call hard-killed before tool commits | Callback silently lost | Write DB row as first action |
| 9b | Redis flush loses ARQ job | Single outbound callbacks lost | Add DB-backed record for non-campaign callbacks |
| 9c | Chain of callbacks (callback of a callback) | Infinite loop, number monopolized | Cap `callback_chain_depth` at 2 |
| 9d | DB unique constraint on source_uuid | DB error, callback not created | Use timestamp suffix for callback source_uuid |
| 9e | Workflow deleted after scheduling | Callback silently dropped | Log as org notification |
| 9f | Quota exhausted when callback fires | Callback silently dropped | Log `quota_exceeded_callback` event |
| 9g | User picks up and immediately hangs up | Do NOT retry — that's harassment | Exclude `user_hangup` from callback retry |
| 9h | User is busy when callback fires | Retry once after 5 mins | Re-enqueue with 5-min defer, max 1 retry |
| 9i | Same number in two active campaigns simultaneously | Confusing UX for recipient | ⚠️ Drop for v1 — too complex, low probability |
| 9j | Callback requested during farewell sequence | Request silently lost | Flush TTS confirmation before tool returns |
| 9k | ARQ worker down at callback fire time | Delayed callback (not lost) | ARQ handles this natively ✅ |
| 9m | Inbound caller's timezone unknown | Legal violation (calling at 2 AM) | Derive timezone from phone number country code |
| 9n | LLM calls the tool twice (double-fire) | Two callbacks to same person | Idempotency check on `workflow_run_id` |

---

### 9m. Inbound Caller Timezone Unknown

**The problem:**
```
Indian business. Org timezone = Asia/Kolkata.
US caller (+1-212-555-0100) calls inbound at 11 PM IST.
They say "call me back in 6 hours."
Callback scheduled for 5 AM IST.

But the caller is in New York → 5 AM IST = 7:30 PM EST → totally fine!
But if we apply org timezone (IST) sociable hours check, 5 AM IST is blocked. ✅ correct block.
But what if the situation is reversed?

US business. Org timezone = America/New_York.
Indian caller (+91-98765-43210) calls inbound at 10 AM EST.
They say "call me back in 8 hours."
Callback fires at 6 PM EST.
But the caller is in India → 6 PM EST = 3:30 AM IST → CALLING SOMEONE AT 3:30 AM.
```

**The fix: Derive caller timezone from phone number country code.**

Use Python's `phonenumbers` library (already likely in the project for number parsing):

```python
import phonenumbers
from phonenumbers import geocoder, timezone as phone_timezone

def get_timezone_for_number(phone_number: str) -> str:
    """Best-effort timezone from E.164 phone number."""
    try:
        parsed = phonenumbers.parse(phone_number)
        timezones = phone_timezone.time_zones_for_number(parsed)
        if timezones:
            return timezones[0]  # Take first (most common) timezone
    except Exception:
        pass
    return None  # Fall back to org timezone
```

**Priority for sociable hours timezone:**
```
1. Caller's timezone (derived from phone number)  ← use this if available
2. Org timezone from ORGANIZATION_PREFERENCES     ← fallback
3. "UTC" as absolute fallback                      ← last resort
```

**For `+1` (US/Canada ambiguity):**  
`phonenumbers` returns multiple possible timezones for `+1` (e.g. `["America/New_York", "America/Chicago", "America/Los_Angeles"]`). Take the **earliest** (most eastern) timezone as the conservative choice — this gives the smallest "safe" window and avoids accidentally calling someone at 5 AM Pacific.

**This only matters for inbound calls.** For outbound/campaign, the number in the CSV is the contact's number, so the same logic applies directly.

---

### 9n. LLM Double-Fires the Tool (Idempotency)

**The problem:**
LLMs (especially with streaming + function calling) occasionally emit the same tool call twice in rapid succession. This is a known behavior with GPT-4 and Gemini when there's a streaming interruption or when the LLM retries internally.

```
T+0.0s  → LLM emits tool call: schedule_callback(minutes=10)
T+0.1s  → Tool starts executing, creates queued_run #1 ← callback scheduled ✅
T+0.1s  → LLM emits tool call AGAIN: schedule_callback(minutes=10) ← duplicate!
T+0.2s  → Tool executes again, creates queued_run #2 ← second callback ❌
T+10min → Person gets called TWICE
```

**Why it's bad:** Two calls to the same person 0-30 seconds apart. Person picks up, hears the AI start the callback script, hangs up confused. The second call arrives immediately. They think it's a spam robocall loop.

**The fix: Check idempotency on `workflow_run_id` before creating.**

Inside the `schedule_callback` tool handler:

```python
async def handle_schedule_callback(engine, minutes, farewell_message, conversation_summary):
    workflow_run_id = engine._workflow_run_id

    # IDEMPOTENCY CHECK: Has a callback already been scheduled for this run?
    existing = await db_client.get_scheduled_callback_for_run(workflow_run_id)
    if existing:
        # Return success silently — LLM gets a clean response, no duplicate created
        return {"status": "already_scheduled", "scheduled_for": existing.scheduled_for.isoformat()}

    # Proceed with scheduling...
    await create_callback_queued_run(...)
    return {"status": "scheduled", "callback_in_minutes": minutes}
```

**Why return success instead of an error?**  
If you return an error on the duplicate call, the LLM may try to handle it or apologize to the user unnecessarily. Returning a silent success lets the LLM continue its farewell message smoothly as if everything worked — because it did (the first time).

**Implementation note:** The idempotency check can be a simple in-memory flag on the engine instance (`engine._callback_scheduled = True`) since within a single call session the engine is a single object. No DB query needed for the check — just:

```python
if getattr(engine, '_callback_scheduled', False):
    return {"status": "already_scheduled"}
engine._callback_scheduled = True
# proceed...
```

The DB write is still the source of truth (for durability), but the in-memory flag is sufficient to block the double-fire within the same call session.

---

## Section 11: Implementation Checklist (Build Order)

Build in this order. Each step depends on the previous.

### Phase 1 — Core Tool (no campaign support yet)
- [ ] Create `api/services/workflow/tools/schedule_callback.py`
  - Idempotency flag: `engine._callback_scheduled`
  - Read `called_number`, `caller_number`, `workflow_id`, `organization_id` from context
  - Capture `engine._gathered_context` at execution time
  - Validate: not WebRTC, not private number, delay within min/max, chain depth not exceeded
  - Write DB record first (durability — see 9a, 9b)
  - Enqueue ARQ job with `_defer_by`
- [ ] Create `api/tasks/callback_tasks.py` with `execute_callback()` function (Section 6)
- [ ] Register `EXECUTE_CALLBACK` in `api/tasks/function_names.py`
- [ ] Register `execute_callback` in ARQ worker functions list (`api/tasks/arq.py`)
- [ ] Register `schedule_callback` tool in `CustomToolManager` (`pipecat_engine_custom_tools.py`)

### Phase 2 — Sociable Hours Enforcement
- [ ] Create `api/services/callback_scheduler.py` with:
  - `get_timezone_for_number(phone_number)` using `phonenumbers` library (9m)
  - `is_within_sociable_hours(fire_time, timezone)` — 8 AM–9 PM check
  - `get_next_allowed_window(campaign, timezone)` — for long-delay holdback

### Phase 3 — Campaign Integration
- [ ] In `schedule_callback` tool: detect if `campaign_id` is in context
- [ ] If campaign: create `QueuedRunModel` row with `scheduled_for` + `retry_reason="user_requested_callback"` + `source_uuid` with timestamp suffix (9d)
- [ ] In `QueuedRunModel` dispatch: skip normal retry logic if `retry_reason == "user_requested_callback"` and disposition is `user_hangup` (9g)
- [ ] In campaign's `_is_within_schedule()`: skip window check if `callback_ignore_campaign_window=True`, but still enforce sociable hours (3d)
- [ ] In callback `execute_callback`: handle `campaign completed/failed` state — fire anyway (3e)

### Phase 4 — Configurable Settings
- [ ] Read `workflow_configurations.callback` in tool handler (Section 9a settings)
- [ ] Read `orchestrator_metadata.callback_config` for campaign context (Section 9b settings)
- [ ] Implement precedence resolution: org → campaign → workflow → tool args (10d)

### Phase 5 — UI
- [ ] Agent Settings tab: add "Callback Settings" toggle + min/max delay fields
- [ ] Campaign Advanced Settings: add "Callback Settings" section with sociable hours + enable toggle
- [ ] New "Pending Callbacks" universal menu: build UI view to list/cancel pending non-campaign callbacks from `ScheduledCallbackModel` (see 10b)

### Phase 6 — Validation / Testing
- [ ] Unit test: tool rejects WebRTC calls
- [ ] Unit test: tool rejects private numbers
- [ ] Unit test: idempotency — calling tool twice creates only one queued_run
- [ ] Integration test: single outbound callback fires after delay
- [ ] Integration test: campaign callback keeps campaign in `running` state until fired
- [ ] Manual test: "call me back in 6 hours" on a campaign with a schedule window → fires at next window
