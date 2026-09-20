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
        // If the element text matches the tabs we want to completely hide
        const text = el.textContent?.trim();
        if (el.childNodes.length === 1 && (text === "API Keys" || text === "Team" || text === "Teams" || text === "Notifications" || text === "Notification")) {
          const clickable = el.closest("button") || el.closest("a") || el.closest('[role="tab"]') || el as HTMLElement;
          if (clickable && clickable.style.display !== "none") {
            clickable.style.display = "none !important";
            // Also try to hide its parent li if it's in a list
            const li = clickable.closest("li");
            if (li) li.style.display = "none";
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
        
        /* Aggressively force Stack Auth to adopt Dograh's light/dark mode variables */
        .auth-settings-container * {
          border-color: hsl(var(--border)) !important;
        }
        .auth-settings-container input,
        .auth-settings-container select,
        .auth-settings-container textarea {
          background-color: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          border-radius: var(--radius) !important;
        }
        .auth-settings-container [role="tablist"] {
          background-color: transparent !important;
          border-right: 1px solid hsl(var(--border)) !important;
        }
        .auth-settings-container [role="tab"][data-state="active"] {
          background-color: hsl(var(--accent)) !important;
          color: hsl(var(--accent-foreground)) !important;
        }
        .auth-settings-container [role="tab"]:hover {
          background-color: hsl(var(--accent)/0.5) !important;
        }
        
        /* 
           Fix the scrolling bug: Stack Auth tries to auto-scroll to the top of its 
           container when tabs change. We disable scroll anchoring and overflow tricks. 
        */
        .auth-settings-container, 
        .auth-settings-container > div,
        .auth-settings-container [role="tabpanel"],
        .stack-account-settings-container {
          overflow-anchor: none !important;
          overscroll-behavior: none !important;
          scroll-snap-type: none !important;
        }
        .auth-settings-container * {
          scroll-behavior: auto !important;
        }
      `}</style>
      <AccountSettings fullPage={false} />
    </div>
  );
}
