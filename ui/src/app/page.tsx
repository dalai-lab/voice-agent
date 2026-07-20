"use client";

import { ArrowRight, ArrowUpRight, Cpu, Shield, Terminal } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-foreground selection:text-background transition-colors duration-150">

      {/* Grid background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808007_1px,transparent_1px),linear-gradient(to_bottom,#80808007_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Subtle radial highlights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-foreground/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-foreground/[0.01] rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo mark className="h-6" />
            <span className="font-semibold tracking-tight text-lg">dograh</span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle variant="ghost" size="icon" className="rounded-full hover:bg-muted" />
            <Link
              href="/auth/login"
              className="text-sm font-medium hover:text-muted-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-semibold bg-cta text-cta-foreground hover:bg-cta/90 transition-colors shadow-xs"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center space-y-8 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-muted/40 text-xs font-medium backdrop-blur-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Open source voice infrastructure
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] max-w-3xl mx-auto">
          The voice AI platform <br />
          <span className="text-muted-foreground">built for developers.</span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Create, manage, and scale real-time voice agents. Minimal latency, native tool call execution, and complete deployment control.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg text-sm font-medium bg-cta text-cta-foreground hover:bg-cta/90 transition-colors w-full sm:w-auto shadow-xs gap-1.5"
          >
            Create account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com/dalai-lab/voice-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted/50 transition-colors w-full sm:w-auto gap-2"
          >
            View on GitHub
            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>
      </section>

      {/* Audio Waveform Section / Decorative */}
      <section className="max-w-5xl mx-auto px-6 py-6 flex justify-center">
        <div className="w-full max-w-md border border-border/40 bg-card/45 backdrop-blur-xs rounded-xl p-5 shadow-xs flex flex-col items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cta animate-ping" />
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Active Voice Stream</span>
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

          <div className="text-xs text-muted-foreground font-mono">latency: ~120ms</div>
        </div>
      </section>

      {/* Feature Grids */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-border/40 bg-card/40 backdrop-blur-xs p-6 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground border border-border/80">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">Model-agnostic engine</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plug in any LLM or voice provider seamlessly. Total independence over routing and custom provider setups.
            </p>
          </div>

          <div className="border border-border/40 bg-card/40 backdrop-blur-xs p-6 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground border border-border/80">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">MCP Native integrations</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect voice workflows directly to internal databases, dev environments, and dynamic APIs via Model Context Protocol.
            </p>
          </div>

          <div className="border border-border/40 bg-card/40 backdrop-blur-xs p-6 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground border border-border/80">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base">On-premise deployment</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Keep voice audio and context inside your network perimeter. Full security compliance for high-scale teams.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10 text-center text-xs text-muted-foreground bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} Dograh. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="https://docs.dograh.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Docs</a>
            <a href="https://github.com/dalai-lab/voice-agent" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GitHub</a>
            <a href="https://www.dograh.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
