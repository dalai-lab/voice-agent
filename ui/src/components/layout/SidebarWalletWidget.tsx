"use client";

import React from "react";
import Link from "next/link";
import * as PhosphorIcons from "@phosphor-icons/react";
import { ArrowUpRight } from "lucide-react";
import { useRealtimeWallet } from "@/hooks/useRealtimeWallet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SidebarWalletWidgetProps {
  isCollapsed?: boolean;
  className?: string;
}

export function SidebarWalletWidget({ isCollapsed = false, className }: SidebarWalletWidgetProps) {
  const wallet = useRealtimeWallet();

  // Collapsed Mode (Clean icon + balance tooltip)
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/wallet"
            className={cn(
              "mx-auto flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-transparent text-sidebar-foreground/75 transition-all hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
              className
            )}
          >
            <PhosphorIcons.Wallet className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="py-1 px-2.5">
          <p className="text-xs font-sans font-medium text-foreground">
            Wallet · {wallet.currency}{wallet.balanceRupees}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expanded Mode (Ultra minimal, no dots, no badges, no AI jargon)
  return (
    <div className={cn("mx-2 w-[calc(100%-16px)] select-none", className)}>
      <Link
        href="/wallet"
        className="group block rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 hover:bg-sidebar-accent/60 p-3 transition-all duration-150 shadow-2xs"
      >
        {/* Top Header: Label + Add funds link */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors font-medium">
            <PhosphorIcons.Wallet className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-xs font-medium">Wallet</span>
          </div>

          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors inline-flex items-center gap-0.5">
            <span>Add funds</span>
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>

        {/* Bottom: Real-time balance */}
        <div className="mt-1.5 text-base font-semibold font-sans tracking-tight text-sidebar-foreground">
          <span className="text-xs font-normal text-muted-foreground mr-0.5 font-sans">
            {wallet.currency}
          </span>
          {wallet.balanceRupees}
        </div>
      </Link>
    </div>
  );
}
