import { isNextRouterError } from "next/dist/client/components/is-next-router-error";
import { redirect } from "next/navigation";

import { getAuthUserApiV1UserAuthUserGet } from "@/client/sdk.gen";
import { getServerAccessToken, getServerAuthProvider, getServerUser } from "@/lib/auth/server";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export default async function AfterSignInPage() {
    logger.debug("[AfterSignInPage] Starting after-sign-in page");
    const authProvider = await getServerAuthProvider();
    logger.debug("[AfterSignInPage] Auth provider:", authProvider);
    logger.debug("[AfterSignInPage] Getting server user...");
    const user = await getServerUser();
    logger.debug("[AfterSignInPage] Got user:", { hasUser: !!user, userId: user?.id });

    // 1. Zero unverified entry: redirect unverified Stack users to verification holding page
    if (authProvider === "stack" && user && "primaryEmailVerified" in user && user.primaryEmailVerified === false) {
        logger.debug("[AfterSignInPage] Stack user email unverified, redirecting to /auth/verify-email");
        redirect("/auth/verify-email");
    }

    // 2. Obtain access token for Dograh / Talkar checks
    let token = "";
    if (authProvider === "stack" && user && "getAuthJson" in user) {
        const authJson = await user.getAuthJson();
        token = authJson?.accessToken ?? "";
    } else {
        token = (await getServerAccessToken()) ?? "";
    }

    // 3. Superuser check: superadmins always bypass onboarding to /superadmin
    if (token) {
        try {
            const authUser = await getAuthUserApiV1UserAuthUserGet({
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (authUser.data?.is_superuser) {
                logger.debug("[AfterSignInPage] User is superuser, redirecting to /superadmin");
                redirect("/superadmin");
            }
        } catch (e) {
            if (isNextRouterError(e)) throw e;
            logger.warn("[AfterSignInPage] Could not check superuser status:", e);
        }
    }

    // 4. Talkar Onboarding & Customer Status Gate (100% deterministic)
    const email = (user as any)?.primaryEmail || (user as any)?.email;
    if (email) {
        const talkarUrl =
            process.env.TALKAR_SERVICE_URL ||
            process.env.TALKAR_API_URL ||
            "http://host.docker.internal:8002";
        const serviceToken = (
            process.env.TALKAR_BILLING_API_TOKEN || "change-me-in-production-billing-token"
        ).trim();

        try {
            logger.debug(`[AfterSignInPage] Querying Talkar status for '${email}'...`);
            const statusRes = await fetch(
                `${talkarUrl}/customers/status?contact_email=${encodeURIComponent(email)}`,
                {
                    headers: {
                        Authorization: `Bearer ${serviceToken}`,
                        "X-Talkar-Email": email,
                    },
                    cache: "no-store",
                }
            );

            if (statusRes.status === 404) {
                logger.info(`[AfterSignInPage] No Talkar customer record for '${email}' -> redirecting to /onboarding`);
                redirect("/onboarding");
            }

            if (statusRes.ok) {
                const customer = await statusRes.json();
                logger.info(`[AfterSignInPage] Customer '${email}' status is '${customer.status}'`);

                if (customer.status === "active") {
                    redirect("/overview");
                } else if (customer.status === "agent_building") {
                    if (customer.has_onboarding_form) {
                        redirect("/overview");
                    } else {
                        redirect("/onboarding");
                    }
                } else if (customer.status === "pending_deposit" || customer.status === "suspended") {
                    redirect("/wallet");
                } else {
                    // pending_approval, under_review, info_requested, rejected
                    redirect("/onboarding");
                }
            }
        } catch (err) {
            if (isNextRouterError(err)) throw err;
            logger.error("[AfterSignInPage] Error querying Talkar customer status:", err);
        }
    }

    // 5. Default Talkar destination for new / un-onboarded workspaces
    logger.info("[AfterSignInPage] Final fallback redirecting to /onboarding");
    redirect("/onboarding");
}

