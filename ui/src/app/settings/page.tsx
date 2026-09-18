"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { MCPSection } from "@/components/MCPSection";
import { OrganizationPreferencesSection } from "@/components/OrganizationPreferencesSection";
import { TelemetrySection } from "@/components/TelemetrySection";
import { useOrgConfig } from "@/context/OrgConfigContext";

export default function SettingsPage() {
  const { orgContext } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;
  const [isTalkarCustomer, setIsTalkarCustomer] = useState(false);

  useEffect(() => {
    if (!dograhOrgId) return;
    const isAdminBypass = document.cookie.includes("talkar_admin_bypass=true");
    if (isAdminBypass) return; // Admins see everything

    fetch(`/api/talkar/customers/status?dograh_org_id=${dograhOrgId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.status) setIsTalkarCustomer(true);
      })
      .catch(() => {});
  }, [dograhOrgId]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 bg-background text-foreground">
      <div className="pb-4 border-b border-border/40">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Platform Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your platform configuration and integrations.
        </p>
      </div>

      {/* Preferences Section */}
      <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Preferences</h2>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            Set organization-wide defaults such as the test phone number and timezone.
          </p>
        </div>
        <div className="pt-2 border-t border-border/40">
          <OrganizationPreferencesSection hidePbx={isTalkarCustomer} />
        </div>
      </div>

      {/* MCP Server Section — hidden for Talkar customers */}
      {!isTalkarCustomer && (
        <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">MCP Server</h2>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Let AI agents access your Dograh workspace and documentation via the Model Context Protocol.{" "}
              <a
                href="https://docs.dograh.com/integrations/mcp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline font-semibold text-foreground"
              >
                Learn more <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
          <div className="pt-2 border-t border-border/40">
            <MCPSection />
          </div>
        </div>
      )}

      {/* Telemetry Section — hidden for Talkar customers */}
      {!isTalkarCustomer && (
        <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Telemetry</h2>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Configure Langfuse tracing for your voice agent calls.{" "}
              <a
                href="https://docs.dograh.com/configurations/tracing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline font-semibold text-foreground"
              >
                Learn more <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
          <div className="pt-2 border-t border-border/40">
            <TelemetrySection />
          </div>
        </div>
      )}
    </div>
  );
}
