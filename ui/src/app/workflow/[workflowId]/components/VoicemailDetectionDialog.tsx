import { useEffect, useState } from "react";

import { LLMConfigSelector } from "@/components/LLMConfigSelector";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    DEFAULT_VOICEMAIL_DETECTION_CONFIGURATION,
    type VoicemailDetectionConfiguration,
    type WorkflowConfigurations,
} from "@/types/workflow-configurations";

// Must match VoicemailDetector.DEFAULT_SYSTEM_PROMPT in pipecat
const DEFAULT_VOICEMAIL_SYSTEM_PROMPT = `You are a voicemail detection classifier for an OUTBOUND calling system. A bot has called a phone number and you need to determine if a human answered or if the call went to voicemail based on the provided text.

HUMAN ANSWERED - LIVE CONVERSATION (respond "CONVERSATION"):
- Personal greetings: "Hello?", "Hi", "Yeah?", "John speaking"
- Interactive responses: "Who is this?", "What do you want?", "Can I help you?"
- Conversational tone expecting back-and-forth dialogue
- Questions directed at the caller: "Hello? Anyone there?"
- Informal responses: "Yep", "What's up?", "Speaking"
- Natural, spontaneous speech patterns
- Immediate acknowledgment of the call

VOICEMAIL SYSTEM (respond "VOICEMAIL"):
- Automated voicemail greetings: "Hi, you've reached [name], please leave a message"
- Phone carrier messages: "The number you have dialed is not in service", "Please leave a message", "All circuits are busy"
- Professional voicemail: "This is [name], I'm not available right now"
- Instructions about leaving messages: "leave a message", "leave your name and number"
- References to callback or messaging: "call me back", "I'll get back to you"
- Carrier system messages: "mailbox is full", "has not been set up"
- Business hours messages: "our office is currently closed"

Respond with ONLY "CONVERSATION" if a person answered, or "VOICEMAIL" if it's voicemail/recording.`;

interface VoicemailDetectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowConfigurations: WorkflowConfigurations;
    onSave: (configurations: WorkflowConfigurations) => void;
}

export const VoicemailDetectionDialog = ({
    open,
    onOpenChange,
    workflowConfigurations,
    onSave,
}: VoicemailDetectionDialogProps) => {
    const getConfig = (): VoicemailDetectionConfiguration => ({
        ...DEFAULT_VOICEMAIL_DETECTION_CONFIGURATION,
        ...workflowConfigurations.voicemail_detection,
    });

    const [enabled, setEnabled] = useState(getConfig().enabled);
    const [useWorkflowLlm, setUseWorkflowLlm] = useState(getConfig().use_workflow_llm);
    const [provider, setProvider] = useState(getConfig().provider || "openai");
    const [model, setModel] = useState(getConfig().model || "gpt-4.1");
    const [apiKey, setApiKey] = useState(getConfig().api_key || "");
    const [systemPrompt, setSystemPrompt] = useState(getConfig().system_prompt || DEFAULT_VOICEMAIL_SYSTEM_PROMPT);
    const [longSpeechTimeout, setLongSpeechTimeout] = useState(getConfig().long_speech_timeout);

    const [leaveMessage, setLeaveMessage] = useState(getConfig().leave_message ?? false);
    const [messageType, setMessageType] = useState<"static" | "dynamic">(getConfig().message_type ?? "static");
    const [messageText, setMessageText] = useState(getConfig().message_text ?? "");
    const [waitForBeep, setWaitForBeep] = useState(getConfig().wait_for_beep_seconds ?? 3.0);
    const [maxMessageDuration, setMaxMessageDuration] = useState(getConfig().max_message_duration_seconds ?? 30);

    // Sync state from props whenever the dialog opens
    useEffect(() => {
        if (open) {
            const config = {
                ...DEFAULT_VOICEMAIL_DETECTION_CONFIGURATION,
                ...workflowConfigurations.voicemail_detection,
            };
            setEnabled(config.enabled);
            setUseWorkflowLlm(config.use_workflow_llm);
            setProvider(config.provider || "openai");
            setModel(config.model || "gpt-4.1");
            setApiKey(config.api_key || "");
            setSystemPrompt(config.system_prompt || DEFAULT_VOICEMAIL_SYSTEM_PROMPT);
            setLongSpeechTimeout(config.long_speech_timeout);
            setLeaveMessage(config.leave_message ?? false);
            setMessageType(config.message_type ?? "static");
            setMessageText(config.message_text ?? "");
            setWaitForBeep(config.wait_for_beep_seconds ?? 3.0);
            setMaxMessageDuration(config.max_message_duration_seconds ?? 30);
        }
    }, [open, workflowConfigurations]);

    const handleOpenChange = (newOpen: boolean) => {
        onOpenChange(newOpen);
    };

    const handleSave = () => {
        const voicemailConfig: VoicemailDetectionConfiguration = {
            enabled,
            use_workflow_llm: useWorkflowLlm,
            provider: useWorkflowLlm ? undefined : provider,
            model: useWorkflowLlm ? undefined : model,
            api_key: useWorkflowLlm ? undefined : apiKey,
            system_prompt: systemPrompt && systemPrompt !== DEFAULT_VOICEMAIL_SYSTEM_PROMPT ? systemPrompt : undefined,
            long_speech_timeout: longSpeechTimeout,
            leave_message: enabled ? leaveMessage : false,
            message_type: messageType,
            message_text: messageText,
            wait_for_beep_seconds: waitForBeep,
            max_message_duration_seconds: maxMessageDuration,
        };

        onSave({
            ...workflowConfigurations,
            voicemail_detection: voicemailConfig,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Voicemail Detection</DialogTitle>
                    <DialogDescription>
                        Configure voicemail detection to automatically detect and end calls
                        when a voicemail system is reached.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center space-x-2 p-2 border rounded-md bg-muted/20">
                        <Switch
                            id="voicemail-enabled"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                        <Label htmlFor="voicemail-enabled">Enable Voicemail Detection</Label>
                    </div>

                    {enabled && (
                        <>
                            {/* LLM Configuration */}
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2 p-2 border rounded-md bg-muted/20">
                                    <Switch
                                        id="voicemail-use-workflow-llm"
                                        checked={useWorkflowLlm}
                                        onCheckedChange={setUseWorkflowLlm}
                                    />
                                    <Label htmlFor="voicemail-use-workflow-llm">Use Workflow LLM</Label>
                                    <Label className="text-xs text-muted-foreground ml-2">
                                        Use the LLM configured in your account settings.
                                    </Label>
                                </div>

                                {!useWorkflowLlm && (
                                    <LLMConfigSelector
                                        provider={provider}
                                        onProviderChange={setProvider}
                                        model={model}
                                        onModelChange={setModel}
                                        apiKey={apiKey}
                                        onApiKeyChange={setApiKey}
                                    />
                                )}
                            </div>

                            {/* System Prompt */}
                            <div className="grid gap-2">
                                <Label>System Prompt</Label>
                                <Label className="text-xs text-muted-foreground">
                                    Prompt for voicemail classification.
                                    The LLM must respond with either &quot;CONVERSATION&quot; or &quot;VOICEMAIL&quot;.
                                </Label>
                                <Textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="min-h-[200px] font-mono text-xs"
                                />
                            </div>

                            {/* Timing Configuration */}
                            <div className="grid gap-4 p-3 border rounded-md bg-muted/10">
                                <Label className="font-medium">Detection Timing</Label>
                                <div className="space-y-2">
                                    <Label className="text-sm">Speech Cutoff (seconds)</Label>
                                    <Label className="text-xs text-muted-foreground">
                                        Trigger classification early if first turn speech exceeds this duration.
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="1"
                                        max="30"
                                        value={longSpeechTimeout}
                                        onChange={(e) => setLongSpeechTimeout(parseFloat(e.target.value) || 8.0)}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Voicemail Message Configuration */}
                    <div className={`space-y-4 pt-4 border-t ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="voicemail-leave-message"
                                checked={leaveMessage}
                                onCheckedChange={setLeaveMessage}
                                disabled={!enabled}
                            />
                            <Label htmlFor="voicemail-leave-message">Leave Voicemail Message</Label>
                        </div>

                                {leaveMessage && (
                                    <div className="space-y-6 pl-6 border-l-2 ml-2 border-muted/50">
                                        <div className="space-y-3">
                                            <Label>Message Type</Label>
                                            <RadioGroup
                                                value={messageType}
                                                onValueChange={(val: "static" | "dynamic") => setMessageType(val)}
                                                className="flex flex-col space-y-1"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="static" id="msg-static" />
                                                    <Label htmlFor="msg-static" className="font-normal">Static</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="dynamic" id="msg-dynamic" />
                                                    <Label htmlFor="msg-dynamic" className="font-normal">Dynamic (LLM-generated)</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>

                                        {messageType === "static" ? (
                                            <div className="grid gap-2">
                                                <Label>Message Text</Label>
                                                <Textarea
                                                    value={messageText}
                                                    onChange={(e) => setMessageText(e.target.value)}
                                                    placeholder="Hi, this is [company]. We tried calling you back..."
                                                    className="min-h-[100px]"
                                                />
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>⏱ ~{(messageText.trim().split(/\s+/).filter(w => w.length > 0).length / 3.0).toFixed(1)} seconds</span>
                                                    {(messageText.trim().split(/\s+/).filter(w => w.length > 0).length / 3.0) > 20 && (
                                                        <span className="text-yellow-600">⚠ Keep under 20s recommended</span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-muted/20 rounded-md border text-sm text-muted-foreground">
                                                <p>LLM generates a context-aware message at detection time using gathered call context and conversation summary.</p>
                                            </div>
                                        )}

                                        <div className="grid gap-4">
                                            <Label className="font-medium">Message Timing</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-sm">Wait for beep</Label>
                                                    <div className="flex items-center space-x-2">
                                                        <Input
                                                            type="number"
                                                            step="0.5"
                                                            min="1"
                                                            max="10"
                                                            value={waitForBeep}
                                                            onChange={(e) => setWaitForBeep(parseFloat(e.target.value) || 3.0)}
                                                        />
                                                        <span className="text-xs text-muted-foreground shrink-0">s (1-10)</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-sm">Max message length</Label>
                                                    <div className="flex items-center space-x-2">
                                                        <Input
                                                            type="number"
                                                            step="1"
                                                            min="10"
                                                            max="120"
                                                            value={maxMessageDuration}
                                                            onChange={(e) => setMaxMessageDuration(parseInt(e.target.value, 10) || 30)}
                                                        />
                                                        <span className="text-xs text-muted-foreground shrink-0">s (10-120)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
