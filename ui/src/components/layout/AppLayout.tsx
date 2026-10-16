"use client";

import { AlertTriangle, AlertCircle, CheckCircle2, Menu, RefreshCw, ShieldAlert } from "lucide-react";
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
import { LowBalanceBanner } from "./LowBalanceBanner";
import { TalkarMaintenanceBlockage } from "./TalkarMaintenanceBlockage";

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
const TALKAR_ALLOWED_PATHS = [
  "/onboarding",
  "/wallet",
  "/handler",
  "/auth",
  "/api",
  "/support",
  "/privacy-policy",
  "/terms-of-service",
  "/after-sign-in",
];

const TALKAR_BLOCKED_DIRECT_PATHS = [
  "/workflow",
  "/telephony-configurations",
  "/model-configurations",
  "/api-keys",
  "/usage",
  "/billing",
  "/superadmin",
  "/tools",
];

function TalkarStatusGate() {
  const { talkarStatus, suspensionReason } = useTalkarCustomer();

  if (talkarStatus === "agent_building") {
    return (
      <div className="border-b border-border/60 bg-muted/40 text-foreground text-center py-2.5 px-4 text-xs font-medium z-40 sticky top-0 flex items-center justify-center gap-2.5">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin shrink-0" />
        <span>Your Talkar Agent is currently being configured. Feel free to explore the dashboard in the meantime.</span>
      </div>
    );
  }

  if (talkarStatus === "under_review") {
    return (
      <div className="border-b border-border/60 bg-muted/40 text-foreground text-center py-2.5 px-4 text-xs font-medium z-40 sticky top-0 flex items-center justify-center gap-2.5">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin shrink-0" />
        <span>Your application is under review. Our team will reach out within 24 hours.</span>
      </div>
    );
  }

  if (talkarStatus === "approved") {
    return (
      <div className="border-b border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-center py-2.5 px-4 text-xs font-medium z-40 sticky top-0 flex items-center justify-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Your integration quote is ready. Complete payment to begin live deployment.</span>
        <Link href="/onboarding" className="ml-1 font-semibold underline underline-offset-4 hover:opacity-80">Pay Now →</Link>
      </div>
    );
  }

  if (talkarStatus === "pending_deposit") {
    return (
      <div className="border-b border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-center py-2.5 px-4 text-xs font-medium z-40 sticky top-0 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>Workspace activation pending. Add credits to your wallet to activate your agent.</span>
        <Link href="/wallet" className="ml-1 font-semibold underline underline-offset-4 hover:opacity-80">Go to Wallet →</Link>
        <span className="opacity-40">|</span>
        <Link href="/onboarding/select-plan" className="font-semibold underline underline-offset-4 hover:opacity-80">Change Plan</Link>
      </div>
    );
  }

  if (talkarStatus === "suspended") {
    const isPolicyViolation = Boolean(suspensionReason && !["zero_balance", "", null].includes(suspensionReason));
    return (
      <div className="border-b border-rose-500/20 bg-rose-500/10 text-rose-900 dark:text-rose-200 text-center py-2.5 px-4 text-xs font-medium z-40 sticky top-0 flex items-center justify-center gap-2">
        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
        {isPolicyViolation ? (
          <>
            <span>Calling services suspended by administration ({suspensionReason === "fraud" ? "Suspicious Activity" : "Policy / Terms Violation"}). Please contact support.</span>
            <Link href="/support" className="ml-1 font-semibold underline underline-offset-4 hover:opacity-80">Contact Support →</Link>
          </>
        ) : (
          <>
            <span>Calling services suspended due to zero wallet balance. Top up to reactivate immediately.</span>
            <Link href="/wallet" className="ml-1 font-semibold underline underline-offset-4 hover:opacity-80">Add Credits →</Link>
          </>
        )}
      </div>
    );
  }

  return null;
}

const TALKAR_FORBIDDEN_PREFIXES = [
  "/workflow",
  "/telephony-configurations",
  "/model-configurations",
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
    if (isTalkarCustomer && TALKAR_BLOCKED_DIRECT_PATHS.some(p => pathname.startsWith(p))) {
      router.replace("/overview");
      return;
    }
    if (isTalkarCustomer && isForbidden) {
      router.replace("/overview");
    }
  }, [isTalkarCustomer, isAdminBypass, isForbidden, pathname, router]);

  // Admin bypass sees everything
  if (isAdminBypass) {
    return <>{children}</>;
  }

  if (isTalkarCustomer && !isAdminBypass && TALKAR_BLOCKED_DIRECT_PATHS.some(p => pathname.startsWith(p))) {
    router.replace("/overview");
    return null;
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
            onClick={() => router.replace("/overview")}
            variant="outline"
            size="sm"
            className="text-xs h-9 px-4 border-border rounded-lg cursor-pointer"
          >
            Go to Overview
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
  const router = useRouter();
  const auth = useAuth();
  const {
    isLoading,
    isAdminBypass,
    isServiceDown,
    checkHealth,
    talkarStatus,
    hasOnboardingForm,
  } = useTalkarCustomer();

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/use-cases") ||
    pathname.startsWith("/integrations") ||
    pathname.startsWith("/handler") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/privacy-policy") ||
    pathname.startsWith("/terms-of-service");

  const isAllowedPath = TALKAR_ALLOWED_PATHS.some((p) => pathname.startsWith(p));

  // Determine if the customer has incomplete onboarding
  const isPendingOnboarding =
    talkarStatus === "not_onboarded" ||
    talkarStatus === "pending_approval" ||
    talkarStatus === "info_requested" ||
    talkarStatus === "rejected" ||
    (talkarStatus === "agent_building" && !hasOnboardingForm);

  // Prevent unverified Stack users from hanging in protected routes
  useEffect(() => {
    if (
      auth.provider === "stack" &&
      auth.user &&
      "primaryEmailVerified" in auth.user &&
      auth.user.primaryEmailVerified === false &&
      !isPublicRoute
    ) {
      router.replace("/auth/verify-email");
    }
  }, [auth.provider, auth.user, isPublicRoute, router]);

  // Route protection for non-admin users
  useEffect(() => {
    if (isPublicRoute || isAdminBypass || isLoading) return;

    if (isPendingOnboarding && !isAllowedPath) {
      router.replace("/onboarding");
      return;
    }

    if (
      (talkarStatus === "pending_deposit" || talkarStatus === "suspended") &&
      !isAllowedPath &&
      pathname !== "/overview"
    ) {
      router.replace("/wallet");
      return;
    }
  }, [
    isPublicRoute,
    isAdminBypass,
    isLoading,
    isPendingOnboarding,
    isAllowedPath,
    talkarStatus,
    pathname,
    router,
  ]);

  if (
    auth.provider === "stack" &&
    auth.user &&
    "primaryEmailVerified" in auth.user &&
    auth.user.primaryEmailVerified === false &&
    !isPublicRoute
  ) {
    return <SpinLoader label="Redirecting to email verification..." />;
  }

  // Full-level blockage when Talkar billing/backend is down
  if (isServiceDown && !isPublicRoute) {
    return <TalkarMaintenanceBlockage onRetry={checkHealth} />;
  }

  // Admin bypass sees everything
  if (isAdminBypass) {
    return <>{children}</>;
  }

  // Keep showing the initial Talkar SpinLoader until we know whether the user is an admin or customer
  if (isLoading && !isPublicRoute) {
    return <SpinLoader />;
  }

  // FAIL CLOSED: Never render protected dashboard pages for un-onboarded users
  if (!isPublicRoute && isPendingOnboarding && !isAllowedPath) {
    return <SpinLoader label="Redirecting to onboarding..." />;
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
                  <LowBalanceBanner />
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
              <LowBalanceBanner />
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
