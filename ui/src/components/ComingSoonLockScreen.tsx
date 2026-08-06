"use client";

import Link from "next/link";
import { Lock, ArrowRight, ArrowLeft, PhoneCall } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";

export function ComingSoonLockScreen({
  title,
  category,
}: {
  title: string;
  category: string;
}) {
  return (
    <div className="w-full min-h-screen bg-background text-foreground font-sans flex flex-col justify-between selection:bg-cta selection:text-cta-foreground">
      {/* Top Header */}
      <header className="w-full border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50 px-6 lg:px-12 py-4 flex items-center justify-between">
        <Link href="/">
          <BrandLogo size="lg" className="tracking-tight text-foreground" />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle variant="ghost" size="icon" className="h-8 w-8 rounded-lg" />
          <Link
            href="/"
            className="h-8 px-3.5 rounded-lg text-xs font-semibold border border-border bg-muted/40 hover:bg-muted/70 transition-all flex items-center gap-1.5 text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back Home
          </Link>
        </div>
      </header>

      {/* Main Lock Screen Body */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
        {/* Soft Background Radial Glow */}
        <div className="absolute inset-0 bg-cta/5 blur-3xl rounded-full pointer-events-none transform scale-90" />

        <div className="max-w-md w-full rounded-2xl border border-border/80 bg-card/90 dark:bg-zinc-950/90 backdrop-blur-xl p-8 text-center space-y-6 shadow-2xl relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-cta/10 border border-cta/30 flex items-center justify-center mx-auto shadow-xs text-cta">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground uppercase tracking-widest">
              Private Beta • {category}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              Our AI phone agent for {category.toLowerCase()} is currently in private beta and coming soon to all Talkar accounts.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <Link
              href="/use-cases/hotel"
              className="w-full h-11 rounded-xl text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Try Active Hotel AI Agent
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/"
              className="w-full h-10 rounded-xl text-xs font-semibold border border-border bg-muted/40 hover:bg-muted/70 transition-all text-foreground flex items-center justify-center"
            >
              Return to Landing Page
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 px-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Talkar AI Phone System. All rights reserved.
      </footer>
    </div>
  );
}
