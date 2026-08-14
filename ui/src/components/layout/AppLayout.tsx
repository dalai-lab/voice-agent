"use client";

import { AlertTriangle, Menu, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { ReactNode, useEffect, useRef } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { useAppConfig } from "@/context/AppConfigContext";
import { LeadFormsProvider } from "@/context/LeadFormsContext";
import { useAuth } from "@/lib/auth";

import { AppSidebar } from "./AppSidebar";

function AppHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/55 md:hidden">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Open menu" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/">
          <BrandLogo className="md:hidden" />
        </Link>
      </div>
      <div className="flex items-center gap-3">
      </div>
    </header>
  );
}

function BackendStatusBanner() {
  const { config, loading, refresh } = useAppConfig();

  if (!config || config.backendStatus === "reachable") {
    return null;
  }

  const backendUrl = config.backendUrl && config.backendUrl !== "unknown"
    ? config.backendUrl
    : "the configured backend";
  const message = config.backendMessage || `Backend is not reachable at ${backendUrl}.`;

  return (
    <div
      role="alert"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Backend connection failed</p>
            <p className="break-words text-sm">{message}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
          className="h-8 shrink-0 border-amber-400 bg-transparent text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/40"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}

// TALKAR PATCH: Client-side status gate.
// We cannot use middleware for this because the Stack Auth opaque access token
// in hexclave-access cannot be validated server-side from Edge runtime.
// The browser already has a valid session, so the /api/talkar proxy works fine.
const TALKAR_ALLOWED_PATHS = ["/onboarding", "/wallet", "/billing", "/handler", "/auth", "/api"];

function TalkarStatusGate() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const checkedRef = useRef(false);
  const [talkarStatus, setTalkarStatus] = React.useState<string | null>(null);

  useEffect(() => {
    // Reset check when pathname changes so navigating to a new page re-checks
    checkedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!user || checkedRef.current) return;
    if (TALKAR_ALLOWED_PATHS.some(p => pathname.startsWith(p))) return;
    if (document.cookie.includes('talkar_admin_bypass=true')) return;

    // Get the user's email - available on both Stack Auth and local auth users
    const email = (user as any)?.primaryEmail ?? (user as any)?.email;
    // Also try org_id for local auth users that have it
    const orgId = (user as any)?.organization_id ?? (user as any)?.organizationId;

    if (!email && !orgId) return;

    checkedRef.current = true;

    const query = orgId
      ? `dograh_org_id=${orgId}`
      : `contact_email=${encodeURIComponent(email)}`;

    fetch(`/api/talkar/customers/status?${query}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return; // Talkar API down — fail open
        const { status } = data;
        setTalkarStatus(status);
        if (status === 'active' || status === 'agent_building') return;
        if (status === 'pending_deposit') {
          router.replace('/wallet?activation=true');
        } else if (status === 'pending_plan_selection') {
          router.replace('/onboarding/select-plan');
        } else {
          router.replace('/onboarding');
        }
      })
      .catch(() => { /* fail open */ });
  }, [user, pathname, router]);

  if (talkarStatus === 'agent_building') {
    return (
      <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium z-50 sticky top-0">
        Your Talkar Agent is currently being built! You can explore the dashboard while you wait.
      </div>
    );
  }

  return null;
}

interface AppLayoutProps {
  children: ReactNode;
  headerActions?: ReactNode;
  stickyTabs?: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  headerActions,
  stickyTabs,
}) => {
  const pathname = usePathname();

  // Hide sidebar for root (/), public marketing routes (/use-cases, /integrations), /handler routes (Stack Auth routes), and /auth routes
  // TALKAR PATCH: Hide sidebar on /onboarding to strictly lock navigation during onboarding flow
  const shouldShowSidebar =
    pathname !== "/" &&
    !pathname.startsWith("/use-cases") &&
    !pathname.startsWith("/integrations") &&
    !pathname.startsWith("/handler") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/onboarding");

  // Only match the exact editor page /workflow/<id>, not sub-routes like /workflow/<id>/runs
  const isWorkflowEditor = /^\/workflow\/\d+$/.test(pathname);

  // Always render SidebarProvider to keep the component tree shape consistent
  // across route changes (avoids React hooks ordering violations during navigation).
  return (
    <SidebarProvider defaultOpen>
      {/* TALKAR PATCH: Client-side status gate (works with Stack Auth unlike middleware) */}
      <TalkarStatusGate />
      {shouldShowSidebar ? (
        <LeadFormsProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <SidebarInset className="flex-1">
              <BackendStatusBanner />
              {!isWorkflowEditor && <AppHeader />}
              {/* Optional header area for specific pages */}
              {headerActions && (
                <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/55">
                  <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-center">
                      {headerActions}
                    </div>
                  </div>
                </header>
              )}

              {/* Optional sticky tabs */}
              {stickyTabs && (
                <div className="sticky top-0 z-40 bg-[#2a2e39] border-b border-gray-700">
                  <div className="container mx-auto px-4">
                    <div className="flex items-center justify-center py-2">
                      {stickyTabs}
                    </div>
                  </div>
                </div>
              )}

              {/* Main content area */}
              <main className="app-surface flex-1">
                {children}
              </main>
            </SidebarInset>
          </div>
        </LeadFormsProvider>
      ) : (
        <div className="app-surface w-full flex-1">
          <BackendStatusBanner />
          {children}
        </div>
      )}
    </SidebarProvider>
  );
};

export default AppLayout;
