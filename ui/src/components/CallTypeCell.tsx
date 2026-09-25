"use client";

import { ArrowDownLeft, ArrowUpRight, Globe, MessageSquare, Phone } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const WEB_CALL_MODES = new Set(["webrtc", "smallwebrtc"]);
const TEXT_CHAT_MODES = new Set(["textchat"]);

const getCallChannel = (mode?: string | null): "phone" | "web" | "chat" => {
    if (mode && TEXT_CHAT_MODES.has(mode)) return "chat";
    if (mode && WEB_CALL_MODES.has(mode)) return "web";
    return "phone";
};

export function CallTypeCell({
    mode,
    callType,
}: {
    mode?: string | null;
    callType?: string | null;
}) {
    if (!mode && !callType) {
        return <span className="text-sm text-muted-foreground">-</span>;
    }

    const channel = getCallChannel(mode);
    const ChannelIcon = channel === "chat" ? MessageSquare : channel === "web" ? Globe : Phone;
    const channelLabel = channel === "chat" ? "Text chat" : channel === "web" ? "Web call" : "Phone call";

    const isInbound = callType === "inbound";
    const DirectionIcon = isInbound ? ArrowDownLeft : ArrowUpRight;
    const directionLabel = isInbound ? "Inbound" : "Outbound";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-default select-none whitespace-nowrap transition-colors ${channel === "web"
                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                            : channel === "chat"
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                : isInbound
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        }`}
                >
                    {channel === "web" ? (
                        <>
                            <Globe className="h-3 w-3" />
                            <span>Web</span>
                        </>
                    ) : channel === "chat" ? (
                        <>
                            <MessageSquare className="h-3 w-3" />
                            <span>Chat</span>
                        </>
                    ) : (
                        <>
                            <DirectionIcon className="h-3 w-3" />
                            <span>{directionLabel}</span>
                        </>
                    )}
                </span>
            </TooltipTrigger>
            <TooltipContent sideOffset={4} className="text-xs font-medium">
                {directionLabel} · {channelLabel}
            </TooltipContent>
        </Tooltip>
    );
}
