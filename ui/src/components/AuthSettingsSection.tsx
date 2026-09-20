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
      
      // 1. Hide by href (most reliable for Stack Auth tabs)
      const links = containerRef.current.querySelectorAll("a");
      links.forEach((a) => {
        const href = a.getAttribute("href") || "";
        if (
          href.includes("/api-keys") || 
          href.includes("/notifications") || 
          href.includes("/teams") || 
          href.includes("/settings") || 
          href.match(/\/team\//)
        ) {
          a.style.setProperty("display", "none", "important");
          const li = a.closest("li");
          if (li) li.style.setProperty("display", "none", "important");
        }
      });

      // 2. Hide by exact text match (catches headers, buttons, and anything href missed)
      const elements = containerRef.current.querySelectorAll("*");
      elements.forEach((el) => {
        const text = el.textContent?.trim();
        const exactMatches = [
          "API Keys", 
          "Notifications", 
          "Notification", 
          "Settings", 
          "Teams", 
          "Team", 
          "Create a team",
          "Create Team"
        ];
        
        if (text && exactMatches.includes(text)) {
           (el as HTMLElement).style.setProperty("display", "none", "important");
           const li = el.closest("li");
           if (li) li.style.setProperty("display", "none", "important");
        }

        // Hide dynamic team names (e.g. "it@4thorbit.in's Team" or "it@4thorbit.in")
        // We know it's a team link if it has an avatar or specific classes, but text matching is safer:
        if ((el.tagName === 'A' || el.tagName === 'BUTTON') && text) {
          if (text.includes("'s Team") || (text.includes("@") && el.closest("ul")?.previousElementSibling?.textContent?.includes("Teams"))) {
             (el as HTMLElement).style.setProperty("display", "none", "important");
             const li = el.closest("li");
             if (li) li.style.setProperty("display", "none", "important");
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
           Aggressive overrides for Stack Auth.
           We use !important everywhere because Stack injects inline styles and tailwind classes.
        */
        
        /* Strip outer backgrounds and borders */
        .auth-settings-container > div,
        .auth-settings-container [data-radix-scroll-area-viewport],
        .auth-settings-container [class*="bg-white"],
        .auth-settings-container [class*="bg-gray"],
        .auth-settings-container [class*="bg-zinc"] {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }

        /* Force Dograh text and border colors globally within the component */
        .auth-settings-container * {
          border-color: hsl(var(--border)) !important;
          color: hsl(var(--foreground));
        }

        /* Style inputs, selects, and textareas */
        .auth-settings-container input,
        .auth-settings-container select,
        .auth-settings-container textarea {
          background-color: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: var(--radius) !important;
          padding: 0.5rem !important;
        }

        /* Style buttons */
        .auth-settings-container button[type="submit"],
        .auth-settings-container button[class*="bg-black"],
        .auth-settings-container button[class*="bg-primary"] {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          border-radius: var(--radius) !important;
        }

        /* Sidebar active tab styling */
        .auth-settings-container a[data-active="true"],
        .auth-settings-container [role="tab"][data-state="active"],
        .auth-settings-container [class*="bg-gray-100"] {
          background-color: hsl(var(--accent)) !important;
          color: hsl(var(--accent-foreground)) !important;
          border-radius: var(--radius) !important;
        }
        
        .auth-settings-container a:hover,
        .auth-settings-container [role="tab"]:hover {
          background-color: hsl(var(--accent)/0.5) !important;
        }

        /* Hide the annoying 'Account Settings' title if it shows up */
        .auth-settings-container h2:contains('Account Settings') {
          display: none !important;
        }

        /* Fix Stack Auth scrolling bugs */
        .auth-settings-container, 
        .auth-settings-container > div,
        .auth-settings-container [role="tabpanel"],
        .stack-account-settings-container {
          overflow-anchor: none !important;
          overscroll-behavior: none !important;
          scroll-snap-type: none !important;
        }
      `}</style>
      <AccountSettings fullPage={false} />
    </div>
  );
}
