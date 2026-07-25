"use client";

import { ArrowRight, ArrowUpRight, Cpu, Shield, Terminal } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";
import { useAuth } from "@/lib/auth";

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-foreground selection:text-background transition-colors duration-150">

      {/* Modern High-Density Fine Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {/* Multiple overlapping premium ambient glow highlights */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-cta/[0.03] dark:bg-cta/[0.04] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/[0.02] dark:bg-indigo-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo className="text-xl font-bold tracking-tight" />
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle variant="ghost" size="icon" className="rounded-full hover:bg-muted" />
            {!loading && isAuthenticated ? (
              <Link
                href="/overview"
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-semibold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-sm"
              >
                Console
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-semibold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-sm"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-16 text-center space-y-8 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 backdrop-blur-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-cta animate-pulse" />
          Open source voice infrastructure
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] max-w-3xl mx-auto font-sans">
          The voice AI platform <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-red-500 dark:from-red-300 dark:via-rose-200 dark:to-red-400">built for developers.</span>
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Create, manage, and scale real-time voice agents. Minimal latency, native tool call execution, and complete deployment control.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {!loading && isAuthenticated ? (
            <Link
              href="/overview"
              className="inline-flex items-center justify-center h-10 px-6 rounded-lg text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/95 hover:scale-[1.01] active:scale-[0.99] transition-all w-full sm:w-auto shadow-sm gap-1.5"
            >
              Go to Console
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center h-10 px-6 rounded-lg text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/95 hover:scale-[1.01] active:scale-[0.99] transition-all w-full sm:w-auto shadow-sm gap-1.5"
              >
                Create account
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center h-10 px-6 rounded-lg text-xs font-bold border border-border bg-background hover:bg-muted/40 transition-all w-full sm:w-auto"
              >
                Launch Console
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Audio Waveform Section / Decorative */}
      <section className="max-w-5xl mx-auto px-6 py-6 flex justify-center">
        <div className="w-full max-w-sm border border-border bg-card/40 backdrop-blur-md rounded-2xl p-5 shadow-xs flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cta opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cta"></span>
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/60">Active Voice Stream</span>
          </div>

          <div className="auth-waveform my-2">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div className="text-[10px] text-muted-foreground/60 font-mono tracking-tight">latency: ~120ms</div>
        </div>
      </section>

      {/* Feature Grids */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-border bg-card/30 backdrop-blur-md p-6 rounded-2xl space-y-4 hover:border-border/80 transition-all duration-200">
            <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center text-cta border border-border/60 shadow-xs">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Model-agnostic engine</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Plug in any LLM or voice provider seamlessly. Total independence over routing and custom provider setups.
            </p>
          </div>

          <div className="border border-border bg-card/30 backdrop-blur-md p-6 rounded-2xl space-y-4 hover:border-border/80 transition-all duration-200">
            <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center text-cta border border-border/60 shadow-xs">
              <Terminal className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-foreground">MCP Native integrations</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect voice workflows directly to internal databases, dev environments, and dynamic APIs via Model Context Protocol.
            </p>
          </div>

          <div className="border border-border bg-card/30 backdrop-blur-md p-6 rounded-2xl space-y-4 hover:border-border/80 transition-all duration-200">
            <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center text-cta border border-border/60 shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-foreground">On-premise deployment</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Keep voice audio and context inside your network perimeter. Full security compliance for high-scale teams.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10 text-center text-xs text-muted-foreground bg-muted/10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[10px] text-muted-foreground/60">© {new Date().getFullYear()} Nova. All rights reserved.</div>
          <div className="flex gap-6 text-[10px] font-semibold">
            <a href="https://docs.dograh.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Docs</a>
            <a href="https://github.com/dalai-lab/voice-agent" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="https://www.dograh.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
