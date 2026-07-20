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
            className={cn("p-3 flex flex-col justify-center gap-2 h-full", className)}
            onDoubleClick={onDoubleClick}
        >
            {hasTargetHandle && <BaseHandle type="target" position={Position.Top} />}

            <div className="space-y-2">
                {/* Header Row: Title, Node Type Badge, ID */}
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-foreground truncate tracking-tight">
                            {title}
                        </h3>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">
                            <span className={cn(
                                "inline-flex items-center px-1 py-0.25 rounded-md text-[8px] font-bold",
                                badge.className
                            )}>
                                {badge.label}
                            </span>
                        </div>
                    </div>

                    <div className="bg-muted/40 p-1 rounded-md border border-border/40 shrink-0 text-muted-foreground">
                        <span className="[&>*]:w-3.5 [&>*]:h-3.5">{icon}</span>
                    </div>
                </div>

                {/* Content area */}
                {children && (
                    <div className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/10 line-clamp-2 leading-relaxed">
                        {children}
                    </div>
                )}
            </div>

            {hasSourceHandle && <BaseHandle type="source" position={Position.Bottom} />}
        </BaseNode>
    );
};
