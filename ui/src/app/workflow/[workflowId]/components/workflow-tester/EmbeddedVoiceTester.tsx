"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RealtimeFeedback } from "@/components/workflow/conversation";

import { ApiKeyErrorDialog, ConnectionStatus, WorkflowConfigErrorDialog } from "../../run/[runId]/components";
import { useWebSocketRTC } from "../../run/[runId]/hooks";
import type { WorkflowRuntimeNodeTransition } from "./types";

import * as PhosphorIcons from "@phosphor-icons/react";

interface EmbeddedVoiceTesterProps {
    workflowId: number;
    workflowRunId: number;
    initialContextVariables?: Record<string, string>;
    accessToken: string;
    onReset: () => void;
    onNodeTransition?: (transition: WorkflowRuntimeNodeTransition) => void;
}

export function EmbeddedVoiceTester({
    workflowId,
    workflowRunId,
    initialContextVariables,
    accessToken,
    onReset,
    onNodeTransition,
}: EmbeddedVoiceTesterProps) {
    const router = useRouter();
    const {
        audioRef,
        connectionActive,
        permissionError,
        isCompleted,
        apiKeyModalOpen,
        setApiKeyModalOpen,
        apiKeyError,
        apiKeyErrorCode,
        workflowConfigError,
        workflowConfigModalOpen,
        setWorkflowConfigModalOpen,
        connectionStatus,
        start,
        stop,
        isStarting,
        feedbackMessages,
        sendDtmfDigit,
    } = useWebSocketRTC({
        workflowId,
        workflowRunId,
        accessToken,
        initialContextVariables,
        onNodeTransition,
    });
    const autoStartedRef = useRef(false);

    useEffect(() => {
        if (autoStartedRef.current) {
            return;
        }
        autoStartedRef.current = true;
        void start();
    }, [start]);

    const endButtonLabel = connectionActive
        ? "End Call"
        : isCompleted
            ? "Start Another Test"
            : connectionStatus === "failed"
                ? "Retry Call"
                : "Starting Test...";

    const handleFooterAction = async () => {
        if (connectionActive) {
            stop();
            return;
        }
        if (isCompleted) {
            onReset();
            return;
        }
        if (connectionStatus === "failed") {
            await start();
        }
    };

    return (
        <>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xs">
                <div className="min-h-0 flex-1 overflow-hidden bg-muted/10">
                    <RealtimeFeedback
                        mode="live"
                        messages={feedbackMessages}
                        isCallActive={connectionActive}
                        isCallCompleted={isCompleted}
                    />
                </div>

                <div className="border-t border-border bg-background px-4 py-3">
                    <div className="flex flex-col gap-3">
                        <ConnectionStatus connectionStatus={connectionStatus} />
                        {permissionError ? (
                            <p className="text-center text-xs text-destructive">{permissionError}</p>
                        ) : null}
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleFooterAction}
                                disabled={isStarting && connectionStatus !== "failed"}
                                variant={connectionActive ? "outline" : "default"}
                                className={cn(
                                    "flex-1 gap-2",
                                    connectionActive && "border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5 text-destructive font-semibold"
                                )}
                            >
                                {isStarting && connectionStatus !== "failed" ? (
                                    <>
                                        <PhosphorIcons.CircleNotch className="h-4 w-4 animate-spin text-muted-foreground" />
                                        Starting Test...
                                    </>
                                ) : connectionActive ? (
                                    <>
                                        <PhosphorIcons.PhoneDisconnect className="h-4 w-4 text-destructive" />
                                        {endButtonLabel}
                                    </>
                                ) : connectionStatus === "failed" ? (
                                    <>
                                        <PhosphorIcons.ArrowsCounterClockwise className="h-4 w-4" />
                                        {endButtonLabel}
                                    </>
                                ) : isCompleted ? (
                                    <>
                                        <PhosphorIcons.ArrowsCounterClockwise className="h-4 w-4" />
                                        {endButtonLabel}
                                    </>
                                ) : (
                                    <>
                                        <PhosphorIcons.CircleNotch className="h-4 w-4 animate-spin" />
                                        {endButtonLabel}
                                    </>
                                )}
                            </Button>

                            {connectionActive && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="icon" className="shrink-0 rounded-lg h-9 w-9" title="Keypad">
                                            <PhosphorIcons.GridNine className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" align="end" className="w-[200px] p-3 bg-background border-border/60">
                                        <div className="grid grid-cols-3 gap-2">
                                            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                                                <Button
                                                    key={digit}
                                                    variant="secondary"
                                                    className="h-10 text-lg font-medium hover:bg-foreground/[0.04] transition-colors"
                                                    onClick={() => sendDtmfDigit(digit)}
                                                >
                                                    {digit}
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                    </div>
                </div>

                <audio ref={audioRef} autoPlay playsInline className="hidden" />
            </div>

            <ApiKeyErrorDialog
                open={apiKeyModalOpen}
                onOpenChange={setApiKeyModalOpen}
                error={apiKeyError}
                errorCode={apiKeyErrorCode}
                onNavigateToBilling={() => router.push("/billing")}
                onNavigateToDevelopers={() => router.push("/api-keys")}
                onNavigateToModelConfig={() => router.push("/model-configurations")}
            />

            <WorkflowConfigErrorDialog
                open={workflowConfigModalOpen}
                onOpenChange={setWorkflowConfigModalOpen}
                error={workflowConfigError}
                onNavigateToWorkflow={() => router.push(`/workflow/${workflowId}`)}
            />
        </>
    );
}
