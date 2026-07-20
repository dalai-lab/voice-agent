// Shared dark two-column auth shell, used by BOTH the Stack Auth handler
// (/handler/[...stack], cloud) and the local/OSS auth pages (/auth/login,
// /auth/signup). LEFT: a centered card that wraps the auth form (`children`).
// RIGHT (lg+ only): a brand/value panel with the Dograh logo, proof points, and
// a Bland-style enterprise CTA block at the bottom (passed in as `enterpriseSlot`).
// Mobile collapses to the single card column. The form column scrolls and stays
// centered so tall (sign-up) forms never clip on short viewports. Palette is the
// app's blacks/greys with one warm CTA accent.

import type { ReactNode } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";

const HIGHLIGHTS = [
  "Speech-to-speech",
  "MCP-native",
  "BYOK - any model",
];

export function AuthShell({
  children,
  enterpriseSlot,
}: {
  children: ReactNode;
  enterpriseSlot?: ReactNode;
}) {
  return (
    <div className="relative grid min-h-screen w-full bg-background lg:grid-cols-[52%_48%] transition-colors duration-150">
      {/* Sleek Theme Switcher overlay in top right */}
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle variant="outline" size="sm" className="rounded-full bg-background/50 backdrop-blur-xs border-border/80" />
      </div>

      {/* Form column (LEFT) */}
      <main className="auth-imprint flex min-h-screen flex-col overflow-y-auto relative">
        <div className="flex min-h-full items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-6 shadow-xl dark:shadow-black/40 sm:p-8">
            {/* Mobile-only wordmark */}
            <div className="lg:hidden flex justify-center mb-4">
              <BrandLogo className="h-6" />
            </div>
            {children}
          </div>
        </div>
      </main>

      {/* Brand / value panel (RIGHT) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-l border-border/40 bg-zinc-950/95 dark:bg-zinc-950/40 p-10 lg:flex xl:p-14">
        {/* Soft grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

        {/* Ambient top-right glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full opacity-30 dark:opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--cta), transparent 70%)" }}
        />

        <div className="relative">
          <BrandLogo inverse className="h-7" />
        </div>

        <div className="relative max-w-md space-y-8 my-auto">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl font-sans">
              The open-source <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-red-600">voice AI platform</span>.
            </h1>
            <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">
              Build, run, and scale voice agents with state-of-the-art speech-to-speech models and MCP tools.
            </p>
          </div>

          <div className="auth-waveform">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>

          <ul className="flex flex-wrap gap-2 pt-2">
            {HIGHLIGHTS.map((point) => (
              <li
                key={point}
                className="rounded-full border border-white/5 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-xs"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Enterprise CTA block */}
        <div className="relative max-w-md space-y-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-xs">
          <h2 className="text-sm font-semibold text-zinc-100">
            Need on-prem, data residency &amp; a data perimeter?
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            We deploy Dograh inside your environment for regulated and
            high-scale teams.
          </p>
          {enterpriseSlot}
        </div>
      </aside>
    </div>
  );
}
