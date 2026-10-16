import { redirect } from "next/navigation";

import { AuthEnterpriseCTA } from "@/components/auth/AuthEnterpriseCTA";
import { AuthShell } from "@/components/auth/AuthShell";
import { StackVerifyEmailView } from "@/components/auth/stack/StackVerifyEmailView";
import { getAuthProvider, getStackConfig } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage() {
  const authProvider = await getAuthProvider();
  if (authProvider === "local") {
    redirect("/after-sign-in");
  }

  const stackConfig = await getStackConfig();

  return (
    <AuthShell enterpriseSlot={<AuthEnterpriseCTA />}>
      <StackVerifyEmailView
        projectId={stackConfig?.projectId || ""}
        publishableClientKey={stackConfig?.publishableClientKey || ""}
      />
    </AuthShell>
  );
}
