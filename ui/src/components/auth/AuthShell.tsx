import type { ReactNode } from "react";
import { Check, PhoneCall } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";

export function AuthShell({
  children,
  enterpriseSlot,
}: {
  children: ReactNode;
  enterpriseSlot?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Top Bar with Logo & Theme Switcher */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 lg:px-12">
        <BrandLogo size="md" className="h-7" />
        <div className="flex items-center gap-3">
          <ThemeToggle
            variant="outline"
            size="sm"
            className="rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-zinc-200 dark:border-zinc-800 shadow-2xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
          />
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="grid min-h-screen w-full lg:grid-cols-[52%_48%] xl:grid-cols-[50%_50%]">
        {/* Form Column (Left) */}
        <main className="flex min-h-screen flex-col items-center justify-center p-6 pt-24 pb-12 sm:p-10 sm:pt-28 lg:p-14">
          <div className="w-full max-w-[410px] space-y-6">
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/90 p-7 sm:p-9 shadow-sm dark:shadow-xl backdrop-blur-sm">
              {children}
            </div>
          </div>
        </main>

        {/* Business Value Column (Right) - Visible on lg+ */}
        <aside className="hidden lg:flex flex-col justify-between border-l border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-zinc-900/40 p-12 pt-28 xl:p-16">
          <div className="max-w-md space-y-8 my-auto">
            {/* Business Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-medium">
              <PhoneCall className="w-3.5 h-3.5" />
              24/7 Voice Operations
            </div>

            {/* Value Proposition — Plain Business English, Zero Jargon */}
            <div className="space-y-3">
              <h2 className="text-3xl xl:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug">
                Never miss another customer phone call.
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Talkar answers inbound calls, schedules appointments into your calendar, and routes urgent cases to your team — around the clock.
              </p>
            </div>

            {/* Practical Business Benefits */}
            <div className="space-y-3.5 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Zero hold times
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Callers speak to a responsive assistant immediately, even during peak rush hours.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Automated calendar bookings
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Appointments are booked, rescheduled, or confirmed directly in real time.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Warm human transfers
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Escalates high-priority calls to your staff with call summary and caller context.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise slot at bottom */}
          {enterpriseSlot && (
            <div className="max-w-md pt-6 border-t border-zinc-200 dark:border-zinc-800/80">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2.5">
                Managing multiple clinic locations or high call volume?
              </p>
              {enterpriseSlot}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
