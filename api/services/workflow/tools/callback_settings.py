import logging
from datetime import datetime, timedelta, date, time
from typing import Dict, Any, Tuple
from zoneinfo import ZoneInfo
import phonenumbers
from phonenumbers import timezone
import asyncio

from api.db import db_client

logger = logging.getLogger(__name__)

async def resolve_callback_settings(
    organization_id: int,
    workflow_id: int,
    campaign_id: int | None = None
) -> Dict[str, Any]:
    """
    Resolves callback settings from Organization, Campaign, and Workflow levels.
    Priority: Org max ceilings -> Campaign overrides -> Workflow defaults.
    """
    # 1. Fetch all required DB records concurrently
    tasks = [
        db_client.get_configuration(organization_id, "ORGANIZATION_PREFERENCES"),
        db_client.get_workflow(workflow_id, organization_id)
    ]
    if campaign_id:
        tasks.append(db_client.get_campaign_by_id(campaign_id))
        
    results = await asyncio.gather(*tasks)
    
    org_config = results[0]
    workflow = results[1]
    campaign = results[2] if campaign_id else None

    # 2. Organization defaults/ceilings
    org_prefs = org_config.value if org_config else {}
    callback_defaults = org_prefs.get("callback_defaults", {})
    
    org_sociable_start = callback_defaults.get("sociable_hours_start", "08:00")
    org_sociable_end = callback_defaults.get("sociable_hours_end", "21:00")
    org_max_delay = callback_defaults.get("max_delay_minutes", 480)
    org_max_chain = callback_defaults.get("max_chain_depth", 2)
    org_timezone = org_prefs.get("timezone", "UTC")

    # 3. Workflow (Agent) defaults
    wf_config = workflow.workflow_configurations if workflow and workflow.workflow_configurations else {}
    wf_cb_config = wf_config.get("callback", {})
    
    wf_enabled = wf_cb_config.get("enabled", True)
    wf_min_delay = wf_cb_config.get("min_delay_minutes", 1)
    wf_max_delay = wf_cb_config.get("max_delay_minutes", org_max_delay)
    wf_include_summary = wf_cb_config.get("include_conversation_summary", True)
    
    # Cap workflow max delay to org max delay
    if wf_max_delay > org_max_delay:
        wf_max_delay = org_max_delay

    # 4. Campaign overrides
    camp_enabled = wf_enabled
    camp_sociable_start = org_sociable_start
    camp_sociable_end = org_sociable_end
    camp_sociable_tz = org_timezone
    camp_honor_window = True
    camp_long_thresh = 120

    if campaign and campaign.orchestrator_metadata:
            camp_cb_config = campaign.orchestrator_metadata.get("callback_config", {})
            camp_enabled = camp_cb_config.get("enabled", wf_enabled)
            camp_sociable_start = camp_cb_config.get("sociable_hours_start", org_sociable_start)
            camp_sociable_end = camp_cb_config.get("sociable_hours_end", org_sociable_end)
            camp_sociable_tz = camp_cb_config.get("sociable_hours_timezone", org_timezone)
            camp_honor_window = camp_cb_config.get("honor_campaign_window_for_long_callbacks", True)
            camp_long_thresh = camp_cb_config.get("long_callback_threshold_minutes", 120)
    
    return {
        "enabled": camp_enabled,
        "min_delay_minutes": wf_min_delay,
        "max_delay_minutes": wf_max_delay,
        "max_chain_depth": org_max_chain,
        "include_summary": wf_include_summary,
        "sociable_hours_start": camp_sociable_start,
        "sociable_hours_end": camp_sociable_end,
        "sociable_timezone": camp_sociable_tz,
        "honor_campaign_window": camp_honor_window,
        "long_callback_threshold": camp_long_thresh
    }

def adjust_for_sociable_hours(
    scheduled_utc: datetime,
    start_str: str,
    end_str: str,
    tz_str: str
) -> datetime:
    """
    Adjusts the scheduled time to fall within sociable hours (start_str to end_str HH:MM).
    If it's outside the window, returns the start of the next valid window.
    """
    try:
        tz = ZoneInfo(tz_str)
    except Exception:
        tz = ZoneInfo("UTC")
        
    local_dt = scheduled_utc.astimezone(tz)
    
    try:
        start_h, start_m = map(int, start_str.split(':'))
        end_h, end_m = map(int, end_str.split(':'))
    except Exception:
        start_h, start_m = 8, 0
        end_h, end_m = 21, 0
        
    start_time = time(start_h, start_m)
    end_time = time(end_h, end_m)
    
    local_time = local_dt.time()
    
    # If within window, return original
    if start_time <= local_time < end_time:
        return scheduled_utc
        
    # If before window start, move to start of today's window
    if local_time < start_time:
        target_dt = datetime.combine(local_dt.date(), start_time, tzinfo=tz)
        return target_dt.astimezone(ZoneInfo("UTC"))
        
    # If after window end, move to start of tomorrow's window
    target_dt = datetime.combine(local_dt.date() + timedelta(days=1), start_time, tzinfo=tz)
    return target_dt.astimezone(ZoneInfo("UTC"))

def get_timezone_for_number(phone_number: str, default_tz: str = "UTC") -> str:
    """
    Derive the timezone from a phone number using the phonenumbers library.
    Returns default_tz if undetermined or if an error occurs.
    """
    if not phone_number:
        return default_tz
        
    try:
        # Assuming E.164 format, if no +, we try to prepend it just in case
        if not phone_number.startswith("+"):
            phone_number = "+" + phone_number
            
        parsed = phonenumbers.parse(phone_number)
        timezones = timezone.time_zones_for_number(parsed)
        if timezones and len(timezones) > 0 and timezones[0] != "Etc/Unknown":
            now = datetime.now(ZoneInfo("UTC"))
            def get_offset(tz_name):
                try:
                    return ZoneInfo(tz_name).utcoffset(now).total_seconds()
                except Exception:
                    return -9999999
                    
            valid_tzs = [tz for tz in timezones if tz != "Etc/Unknown"]
            if valid_tzs:
                best_tz = max(valid_tzs, key=get_offset)
                return best_tz
    except Exception as e:
        logger.warning(f"Failed to derive timezone for {phone_number}: {e}")
        
    return default_tz
