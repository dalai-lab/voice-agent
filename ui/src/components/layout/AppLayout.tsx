"use client";

import { AlertTriangle, Menu, RefreshCw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { ReactNode, useEffect, useRef } from "react";
import { useOrgConfig } from "@/context/OrgConfigContext";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { useAppConfig } from "@/context/AppConfigContext";
import { LeadFormsProvider } from "@/context/LeadFormsContext";
import { TalkarCustomerProvider, useTalkarCustomer } from "@/context/TalkarCustomerContext";
import { useAuth } from "@/lib/auth";
import SpinLoader from "@/components/SpinLoader";

import { AppSidebar } from "./AppSidebar";

import { NotificationBell } from "./NotificationBell";

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
        <NotificationBell />
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
const TALKAR_ALLOWED_PATHS = ["/onboarding", "/wallet", "/handler", "/auth", "/api", "/support"];

function TalkarStatusGate() {
  const { user } = useAuth();
  const { orgContext } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;
  const pathname = usePathname();
  const router = useRouter();
  // Track the last org we checked. Re-fires when switching workspaces (different orgId)
  // but ignores same-org double-fires from auth context settling.
  const lastCheckedOrgRef = useRef<number | null>(null);
  const [talkarStatus, setTalkarStatus] = React.useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (TALKAR_ALLOWED_PATHS.some(p => pathname.startsWith(p))) return;
    if (document.cookie.includes('talkar_admin_bypass=true')) return;
    if (!dograhOrgId) return;

    // Skip if we already checked this exact org on this exact page
    if (lastCheckedOrgRef.current === dograhOrgId) return;

    // Mark in-flight before any async work
    lastCheckedOrgRef.current = dograhOrgId;
    // Clear stale banner from previous org immediately
    setTalkarStatus(null);

    fetch(`/api/talkar/customers/status?dograh_org_id=${dograhOrgId}`)
      .then(async r => {
        if (r.status === 404) {
          // New workspace — no Talkar customer yet. Send to onboarding.
          router.replace('/onboarding');
          return;
        }
        if (!r.ok) return; // Real API error — fail open, don't block the user
        const data = await r.json();
        const { status, is_sub_org, has_onboarding_form } = data;
        setTalkarStatus(status);
        // Note: isTalkarCustomer state is managed by TalkarCustomerContext (shared)
        
        // Edge case: Sub-orgs with no brief form need to fill it first
        if (is_sub_org && !has_onboarding_form && (status === 'agent_building' || status === 'pending_approval')) {
            router.replace('/onboarding');
            return;
        }
        
        if (status === 'active' || status === 'agent_building' || status === 'under_review' || status === 'pending_deposit' || status === 'pending_plan_selection' || status === 'suspended' || status === 'approved') return;
        router.replace('/onboarding');
      })
      .catch(() => { /* network failure — fail open */ });
  }, [user, dograhOrgId, pathname, router]);

  if (talkarStatus === 'agent_building') {
    return (
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 border-b border-indigo-500/30 text-white text-center py-3 text-sm font-medium z-50 sticky top-0 shadow-lg flex items-center justify-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
        Your Talkar Agent is currently being built by our experts. Feel free to explore the dashboard in the meantime!
      </div>
    );
  }

  if (talkarStatus === 'under_review') {
    return (
      <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 border-b border-slate-500/30 text-white text-center py-3 text-sm font-medium z-50 sticky top-0 shadow-lg flex items-center justify-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
        Your application is under review. We&apos;ll notify you within 48 hours. Feel free to explore in the meantime!
      </div>
    );
  }

  if (talkarStatus === 'approved') {
    return (
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 border-b border-green-500/30 text-white text-center py-3 text-sm font-medium z-50 sticky top-0 shadow-lg flex items-center justify-center gap-3">
        <span className="text-lg">✅</span>
        Your integration fee has been quoted! Please complete your payment to begin development.
        <a href="/onboarding" className="ml-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs transition-colors">Pay Now →</a>
      </div>
    );
  }

  if (talkarStatus === 'pending_deposit') {
    return (
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 border-b border-orange-400/30 text-white text-center py-3 text-sm font-medium z-50 sticky top-0 shadow-lg flex items-center justify-center gap-3">
        <span className="text-lg">💰</span>
        Activate your agent! Please add credits to your wallet to get started.
        <a href="/wallet" className="ml-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs transition-colors">Go to Wallet →</a>
      </div>
    );
  }

  if (talkarStatus === 'pending_plan_selection') {
    return (
      <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 border-b border-green-400/30 text-white text-center py-3 text-sm font-medium z-50 sticky top-0 shadow-lg flex items-center justify-center gap-3">
        <span className="text-lg">🚀</span>
        Your AI Agent is ready! Please choose a plan to activate it.
        <a href="/onboarding/select-plan" className="ml-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs transition-colors">Choose Plan →</a>
      </div>
    );
  }

  if (talkarStatus === 'suspended') {
    return (
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 border-b border-red-500/40 text-white py-3 text-sm font-medium z-50 sticky top-0 shadow-lg flex items-center justify-center gap-3 px-4">
        <span className="text-lg">⛔</span>
        <span>Your account has been suspended due to zero balance. Top up your wallet to instantly reactivate.</span>
        <a href="/wallet" className="ml-2 shrink-0 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs transition-colors font-semibold">Add Credits →</a>
      </div>
    );
  }

  return null;
}

const TALKAR_FORBIDDEN_PREFIXES = [
  "/workflow",
  "/telephony-configurations",
  "/model-configurations",
  "/models",
  "/api-keys",
  "/usage",
  "/billing",
  "/files",
  "/recordings",
  "/superadmin",
  "/tools",
  "/automation",
  "/actions",
  "/integrations",
  "/impersonate",
];

function isTalkarForbiddenPath(path: string): boolean {
  // Allow call runs: /workflow/<id>/run/<runId> and /workflow/<id>/runs
  if (/^\/workflow\/\d+\/run(\/|$)/.test(path) || /^\/workflow\/\d+\/runs(\/|$)/.test(path)) {
    return false;
  }

  return TALKAR_FORBIDDEN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?")
  );
}

function TalkarRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isTalkarCustomer, isAdminBypass, isLoading } = useTalkarCustomer();
  const isForbidden = isTalkarForbiddenPath(pathname);

  useEffect(() => {
    if (isAdminBypass) return;
    if (isTalkarCustomer && isForbidden) {
      router.replace("/runs");
    }
  }, [isTalkarCustomer, isAdminBypass, isForbidden, router]);

  // Admin bypass sees everything
  if (isAdminBypass) {
    return <>{children}</>;
  }

  // If visiting a forbidden path and verified as a Talkar customer:
  // Strictly prevent rendering {children} so no internal Dograh API requests fire
  if (isForbidden && isTalkarCustomer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This configuration area is managed directly by your dedicated Talkar engineering team. Need changes to your voice agent, numbers, or integrations?
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={() => router.replace("/support?type=support")}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 px-4 rounded-lg cursor-pointer shadow-sm"
          >
            Contact Support
          </Button>
          <Button
            onClick={() => router.replace("/runs")}
            variant="outline"
            size="sm"
            className="text-xs h-9 px-4 border-border rounded-lg cursor-pointer"
          >
            Go to Call History
          </Button>
        </div>
      </div>
    );
  }

  // If on a forbidden path and status is still loading, wait before mounting forbidden children
  if (isForbidden && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

function TalkarLayoutGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isLoading, isAdminBypass } = useTalkarCustomer();

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/use-cases") ||
    pathname.startsWith("/integrations") ||
    pathname.startsWith("/handler") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/privacy-policy") ||
    pathname.startsWith("/terms-of-service");

  // Keep showing the initial Talkar SpinLoader until we know whether the user is an admin or customer
  if (isLoading && !isPublicRoute && !isAdminBypass) {
    return <SpinLoader />;
  }

  return <>{children}</>;
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
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/privacy-policy") &&
    !pathname.startsWith("/terms-of-service");

  // Only match the exact editor page /workflow/<id>, not sub-routes like /workflow/<id>/runs
  const isWorkflowEditor = /^\/workflow\/\d+$/.test(pathname);

  // always render SidebarProvider to keep the component tree shape consistent
  // across route changes (avoids React hooks ordering violations during navigation).
  return (
    <TalkarCustomerProvider>
      <TalkarLayoutGate>
        <SidebarProvider defaultOpen>
          {shouldShowSidebar ? (
            <LeadFormsProvider>
              <div className="flex min-h-screen w-full">
                <AppSidebar />
                <SidebarInset className="flex-1">
                  <TalkarStatusGate />
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
                    <TalkarRouteGuard>
                      {children}
                    </TalkarRouteGuard>
                  </main>
                </SidebarInset>
              </div>
            </LeadFormsProvider>
          ) : (
            <div className="app-surface w-full flex-1">
              <TalkarStatusGate />
              <BackendStatusBanner />
              <TalkarRouteGuard>
                {children}
              </TalkarRouteGuard>
            </div>
          )}
        </SidebarProvider>
      </TalkarLayoutGate>
    </TalkarCustomerProvider>
  );
};

export default AppLayout;
