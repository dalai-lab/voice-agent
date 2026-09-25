"use client";

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

interface TalkarMaintenanceBlockageProps {
  onRetry: () => Promise<boolean>;
}

export function TalkarMaintenanceBlockage({ onRetry }: TalkarMaintenanceBlockageProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 select-none">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Brand Logo */}
        <div className="flex justify-center">
          <BrandLogo />
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-7 shadow-2xs space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              System Maintenance
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We are currently performing routine maintenance on our voice and telephony network. Calling operations will resume shortly.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full h-9 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${retrying ? "animate-spin" : ""}`} />
              {retrying ? "Checking Status..." : "Refresh Status"}
            </Button>

            <a
              href="mailto:support@talkar.in"
              className="inline-block text-[11px] text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              Need assistance? Contact support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
