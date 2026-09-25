import { redirect } from "next/navigation";

import { getAuthProvider } from "@/lib/auth/config";

import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const authProvider = await getAuthProvider();
  if (authProvider === "stack") {
    redirect("/handler/sign-up");
  }

  return <SignupForm />;
}
