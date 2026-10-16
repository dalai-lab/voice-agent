"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import SpinLoader from "@/components/SpinLoader";
import logger from "@/lib/logger";

export default function AfterSignInPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isAuthenticated, loading, provider } = auth;
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) return;
    if (loading) return;

    // Failsafe timer: after 3 seconds, if routing hasn't settled, default to /onboarding
    const failsafeTimer = setTimeout(() => {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        logger.warn("[AfterSignIn] Failsafe timeout reached. Redirecting to /onboarding");
        router.replace("/onboarding");
      }
    }, 3000);

    const routeUser = async () => {
      // 1. If not authenticated at all, redirect to sign-in
      if (!user && !isAuthenticated) {
        redirectedRef.current = true;
        clearTimeout(failsafeTimer);
        router.replace("/handler/sign-in");
        return;
      }

      // 2. Zero unverified entry: redirect unverified Stack users to verification holding page
      if (provider === "stack" && user) {
        const isVerified = (user as any).primaryEmailVerified;
        if (!isVerified) {
          redirectedRef.current = true;
          clearTimeout(failsafeTimer);
          logger.info("[AfterSignIn] Stack user email not verified. Redirecting to /auth/verify-email");
          router.replace("/auth/verify-email");
          return;
        }
      }

      // 3. Superuser check: superadmins always bypass onboarding to /superadmin
      try {
        const token = await auth.getAccessToken?.();
        if (token) {
          const res = await fetch("/api/v1/user/auth/user", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const authUserData = await res.json();
            if (authUserData?.is_superuser) {
              redirectedRef.current = true;
              clearTimeout(failsafeTimer);
              logger.info("[AfterSignIn] User is superuser. Redirecting to /superadmin");
              router.replace("/superadmin");
              return;
            }
          }
        }
      } catch (err) {
        logger.debug("[AfterSignIn] Superuser check skipped:", err);
      }

      // 4. Talkar Onboarding & Customer Status Gate
      const email = (user as any)?.primaryEmail || (user as any)?.email;
      const query = email ? `contact_email=${encodeURIComponent(email)}` : "";

      try {
        const statusRes = await fetch(`/api/talkar/customers/status?${query}`);
        if (statusRes.status === 404) {
          redirectedRef.current = true;
          clearTimeout(failsafeTimer);
          logger.info("[AfterSignIn] No Talkar customer record -> redirecting to /onboarding");
          router.replace("/onboarding");
          return;
        }

        if (statusRes.ok) {
          const customer = await statusRes.json();
          redirectedRef.current = true;
          clearTimeout(failsafeTimer);
          logger.info(`[AfterSignIn] Customer status is '${customer.status}'`);

          if (customer.status === "active") {
            router.replace("/overview");
          } else if (customer.status === "agent_building") {
            if (customer.has_onboarding_form) {
              router.replace("/overview");
            } else {
              router.replace("/onboarding");
            }
          } else if (customer.status === "pending_deposit" || customer.status === "suspended") {
            router.replace("/wallet");
          } else {
            router.replace("/onboarding");
          }
          return;
        }
      } catch (err) {
        logger.error("[AfterSignIn] Error querying Talkar customer status:", err);
      }

      // 5. Default Talkar destination for new / un-onboarded workspaces
      redirectedRef.current = true;
      clearTimeout(failsafeTimer);
      logger.info("[AfterSignIn] Default fallback redirecting to /onboarding");
      router.replace("/onboarding");
    };

    routeUser();

    return () => clearTimeout(failsafeTimer);
  }, [user, isAuthenticated, loading, provider, router, auth]);

  return <SpinLoader label="Redirecting..." />;
}
