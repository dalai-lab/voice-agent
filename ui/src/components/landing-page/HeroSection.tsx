import React from 'react';
import { VoiceWaveCanvas } from './VoiceWaveCanvas';
import { Navbar } from './Navbar';
import { Calendar, Share2, Cloud } from 'lucide-react';
import { DemoCallForm } from './DemoCallForm';

export const HeroSection: React.FC = () => {
  return (
    <section className="hero-bg min-h-[95vh] flex flex-col relative overflow-x-clip" id="home">
      <div className="hero-stripe-pattern pointer-events-none z-0"></div>
      
      {/* Interactive Multi-Ribbon Generative Audio Canvas */}
      <VoiceWaveCanvas />

      {/* Navigation */}
      <div className="relative z-50">
        <Navbar />
      </div>

      {/* Hero Content Grid (Talkar Wordings & Arts + Voxera Theme) */}
      <div className="flex-grow container mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12 relative z-20 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-7xl my-auto">
          
          {/* Left Column: Talkar Hero Copy & Social Proof */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Talkar Voice Badge & Hindi Tagline */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6">
              <div className="badge-glow inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide text-orange-200 border border-orange-500/20">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-[11px] text-orange-300 font-medium">Talkar Voice AI • End-to-End Partner</span>
              </div>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-orange-400 font-medium tracking-wide">
                बात भी. काम भी.
              </span>
            </div>

            {/* Talkar Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6 leading-[1.1] text-white">
              Your Best Agent <br />
              <span className="bg-gradient-to-r from-[#FF5500] via-[#F97316] to-[#E11D48] bg-clip-text text-transparent italic font-normal">Never Sleeps.</span>
            </h1>

            {/* Talkar Story Subheadline */}
            <p className="text-sm sm:text-base lg:text-lg text-gray-300 max-w-xl mb-6 sm:mb-8 leading-relaxed font-light">
              From business phone numbers to production deployment. Talkar builds, configures, and manages your 24/7 AI voice operations — so you don't have to lift a finger.
            </p>

            {/* Talkar CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-8 sm:mb-10">
              <a
                className="bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white hover:opacity-95 px-6 sm:px-7 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 shadow-md shadow-orange-600/25 hover:-translate-y-0.5 active:translate-y-0"
                href="/handler/sign-up"
              >
                Get Started Free
              </a>
            </div>

            {/* Talkar Integration & Partnership Trust Signals */}
            <div className="pt-5 sm:pt-6 border-t border-white/10 flex flex-wrap items-center gap-3 sm:gap-4 w-full">
              <div className="flex items-center gap-3 sm:gap-4 overflow-hidden opacity-80">
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-300 font-semibold text-xs">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                  Google Calendar
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-300 font-semibold text-xs">
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                  HubSpot
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-300 font-semibold text-xs">
                  <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
                  Salesforce
                </div>
              </div>
              <div className="text-xs text-gray-300 mt-1 w-full">
                <span className="text-gray-400 font-medium">Designed to work with your existing tools.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Demo Call Form */}
          <div className="lg:col-span-5 flex items-center justify-center w-full">
            <DemoCallForm />
          </div>

        </div>
      </div>

      {/* Subtle, Smooth Bottom Transition (Z-indexed below content to avoid dark shadow overlays on small screens) */}
      <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-24 bg-gradient-to-t from-[#090A0F] to-transparent pointer-events-none z-[2]"></div>
    </section>
  );
};
