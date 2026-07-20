import { forwardRef, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const BaseNode = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement> & {
        selected?: boolean;
        invalid?: boolean;
        selected_through_edge?: boolean;
        hovered_through_edge?: boolean;
        runtimeActive?: boolean;
    }
>(({ children, className, selected, invalid, selected_through_edge, hovered_through_edge, runtimeActive, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative rounded-xl border bg-card text-card-foreground min-w-[260px] max-w-[340px] min-h-[64px] shadow-sm transition-all duration-200 select-none",
            "border-border/60",
            className,
            // Selected state - sharp, high contrast ring, no neon glow
            selected ? "border-foreground ring-1 ring-foreground/20 shadow-md scale-[1.01]" : "",
            // Invalid state
            invalid ? "border-destructive ring-1 ring-destructive/20" : "",
            // Edge highlights
            hovered_through_edge ? "border-foreground/80 ring-1 ring-foreground/10" : "",
            !hovered_through_edge && selected_through_edge ? "border-foreground/60" : "",
            runtimeActive ? "border-sky-500 ring-2 ring-sky-500/10" : "",
            !selected_through_edge && !hovered_through_edge && "hover:border-border/100 hover:shadow-xs",
        )}
        tabIndex={0}
        {...props}
    >
        {children}
    </div>
));

BaseNode.displayName = "BaseNode";
