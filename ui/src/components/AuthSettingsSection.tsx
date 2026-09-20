"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const AccountSettings = dynamic(
  () => import("@stackframe/stack").then((mod) => ({ default: mod.AccountSettings })),
  { ssr: false, loading: () => <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" /> }
);

export function AuthSettingsSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Stack Auth injects the UI dynamically. We use a MutationObserver to 
    // aggressively find and hide any tab or link that says "API Keys" to 
    // comply with the "DO NOT BRING API KEYS" requirement.
    const observer = new MutationObserver(() => {
      if (!containerRef.current) return;
      const elements = containerRef.current.querySelectorAll("*");
      elements.forEach((el) => {
        // If the element has exact text "API Keys"
        if (el.childNodes.length === 1 && el.textContent?.trim() === "API Keys") {
          const clickable = el.closest("button") || el.closest("a") || el.closest('[role="tab"]') || el as HTMLElement;
          if (clickable && clickable.style.display !== "none") {
            clickable.style.display = "none";
          }
        }
      });
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true, characterData: true });
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full relative auth-settings-container -ml-4" ref={containerRef}>
      <style jsx global>{`
        /* 
           Overrides to make Stack Auth blend better into our settings page layout.
           We remove external borders and padding since it's already wrapped in our Card.
        */
        .auth-settings-container > div {
          box-shadow: none !important;
          border: none !important;
          background: transparent !important;
        }
        /* Hide the navigation sidebar title if it conflicts */
        .auth-settings-container h2:contains('Account Settings') {
          display: none !important;
        }
      `}</style>
      <AccountSettings fullPage={false} />
    </div>
  );
}
