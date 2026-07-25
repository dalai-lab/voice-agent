import { Position } from "@xyflow/react";
import { ReactNode } from "react";

import { BaseHandle } from "@/components/flow/nodes/BaseHandle";
import { BaseNode } from "@/components/flow/nodes/BaseNode";
import { cn } from "@/lib/utils";

interface NodeContentProps {
    selected: boolean;
    invalid?: boolean;
    selected_through_edge?: boolean;
    hovered_through_edge?: boolean;
    runtimeActive?: boolean;
    title: string;
    icon: ReactNode;
    badgeLabel?: string;
    badgeClassName?: string;
    accentClassName?: string;
    contentLabel?: string;
    hasSourceHandle?: boolean;
    hasTargetHandle?: boolean;
    children?: ReactNode;
    className?: string;
    onDoubleClick?: () => void;
    nodeId?: string;
}

// Get badge styling based on node type
const DEFAULT_BADGE = { label: 'Node', className: 'bg-zinc-500 text-white' };

export const NodeContent = ({
    selected,
    invalid,
    selected_through_edge,
    hovered_through_edge,
    runtimeActive,
    title,
    icon,
    badgeLabel,
    badgeClassName,
    accentClassName,
    contentLabel = "Prompt",
    hasSourceHandle = false,
    hasTargetHandle = false,
    children,
    className = "",
    onDoubleClick,
    nodeId,
}: NodeContentProps) => {
    const badge = {
        label: badgeLabel ?? DEFAULT_BADGE.label,
        className: badgeClassName ?? DEFAULT_BADGE.className,
    };

    return (
        <BaseNode
            selected={selected}
            invalid={invalid}
            selected_through_edge={selected_through_edge}
            hovered_through_edge={hovered_through_edge}
            runtimeActive={runtimeActive}
            className={cn("p-4.5 flex flex-col justify-between gap-4.5 h-full pl-6.5", className)}
            onDoubleClick={onDoubleClick}
        >
            {accentClassName && (
                <div className={cn("absolute left-[1px] top-[1px] bottom-[1px] w-[3.5px] rounded-l-[11px]", accentClassName)} />
            )}

            {hasTargetHandle && <BaseHandle type="target" position={Position.Top} />}

            <div className="space-y-3">
                {/* Header Row: Title, Node Type Badge, ID */}
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0 flex-1 pl-1">
                        <h3 className="text-base font-extrabold text-foreground leading-snug tracking-tight truncate">
                            {title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/85 font-bold uppercase tracking-wider">
                            {accentClassName && (
                                <span className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", accentClassName)} />
                            )}
                            <span>{badge.label}</span>
                        </div>
                    </div>

                    <div className="bg-muted/40 p-1.5 rounded-lg border border-border shrink-0 text-muted-foreground">
                        <span className="[&>*]:w-4.5 [&>*]:h-4.5">{icon}</span>
                    </div>
                </div>

                {/* Content area */}
                {children && (
                    <div className="text-[11px] text-foreground/75 pl-1 pt-2 border-t border-border/80 line-clamp-2 leading-relaxed">
                        {children}
                    </div>
                )}
            </div>

            {hasSourceHandle && <BaseHandle type="source" position={Position.Bottom} />}
        </BaseNode>
    );
};
