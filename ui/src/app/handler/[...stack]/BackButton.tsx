"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  // On a direct load (e.g. an OAuth redirect or a deep link to /handler/sign-in)
  // there's no in-app history, so router.back() would bounce the user off-app.
  // Fall back to the home route in that case.
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="group inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors py-1 px-2 -ml-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/60 mb-3 cursor-pointer"
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
      <span>Back</span>
    </button>
  );
}
