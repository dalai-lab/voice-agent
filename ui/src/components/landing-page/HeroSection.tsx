import React from 'react';
import { VoiceWaveCanvas } from './VoiceWaveCanvas';
import { Navbar } from './Navbar';
import { Play, Calendar, Share2, Cloud } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="hero-bg min-h-[95vh] flex flex-col relative overflow-hidden" id="home">
      <div className="hero-stripe-pattern"></div>
      
      {/* Interactive Multi-Ribbon Generative Audio Canvas */}
      <VoiceWaveCanvas />

      {/* Navigation */}
      <Navbar />

      {/* Hero Content Grid (Talkar Wordings & Arts + Voxera Theme) */}
      <div className="flex-grow container mx-auto px-6 py-8 z-10 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full max-w-7xl my-auto">
          
          {/* Left Column: Talkar Hero Copy & Social Proof */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Talkar Voice Badge & Hindi Tagline */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="badge-glow inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide text-orange-200 border border-orange-500/20">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span className="text-[11px] text-orange-300 font-medium">Talkar Voice AI • End-to-End Partner</span>
              </div>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-orange-400 font-medium tracking-wide">
                बात भी. काम भी.
              </span>
            </div>

            {/* Talkar Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1] text-white">
              Your Best Agent <br />
              <span className="bg-gradient-to-r from-[#FF5500] via-[#F97316] to-[#E11D48] bg-clip-text text-transparent italic font-normal">Never Sleeps.</span>
            </h1>

            {/* Talkar Story Subheadline */}
            <p className="text-base sm:text-lg text-gray-300 max-w-xl mb-8 leading-relaxed font-light">
              From business phone numbers to production deployment. Talkar builds, configures, and manages your 24/7 AI voice operations — so you don't have to lift a finger.
            </p>

            {/* Talkar CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <a
                className="bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white hover:opacity-95 px-7 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-md shadow-orange-600/25 hover:-translate-y-0.5"
                href="https://talkar.in/handler/sign-up"
              >
                Get Started Free
              </a>
              <a
                className="bg-white/10 hover:bg-white/15 text-white border border-white/15 px-7 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 backdrop-blur-md flex items-center gap-2"
                href="#demo"
              >
                <Play className="w-4 h-4 fill-white text-white" />
                Watch Demo Call
              </a>
            </div>

            {/* Talkar Integration & Partnership Trust Signals */}
            <div className="pt-6 border-t border-white/10 flex flex-wrap items-center gap-4 w-full">
              <div className="flex items-center gap-4 overflow-hidden opacity-80">
                <div className="flex items-center gap-2 text-gray-300 font-semibold text-xs">
                  <Calendar className="w-4 h-4 text-orange-400" />
                  Google Calendar
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                <div className="flex items-center gap-2 text-gray-300 font-semibold text-xs">
                  <Share2 className="w-4 h-4 text-rose-400" />
                  HubSpot
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                <div className="flex items-center gap-2 text-gray-300 font-semibold text-xs">
                  <Cloud className="w-4 h-4 text-sky-400" />
                  Salesforce
                </div>
              </div>
              <div className="text-xs text-gray-300 mt-1 w-full">
                <span className="text-gray-400 font-medium">Built to integrate with your existing revenue stack.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Demo Call Form Placeholder */}
          <div className="lg:col-span-5 flex items-center justify-center w-full">
            <div className="w-full max-w-md bg-[#16151E]/95 border border-white/10 p-6 sm:p-8 flex flex-col gap-5 rounded-2xl shadow-2xl backdrop-blur-xl hover:border-orange-500/30 transition-all">
              
              {/* Card Header */}
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <div className="text-sm text-white font-bold tracking-tight">Try Live AI Demo</div>
                  <div className="text-xs text-gray-400 font-light mt-0.5">Receive an instant test call from Talkar</div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs text-emerald-400 font-medium">Ready</span>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs text-gray-300 font-medium">Select Voice Agent</label>
                <select className="bg-[#0F0E14] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 text-xs w-full transition-colors cursor-pointer">
                  <option value="atlas">Atlas — Commercial Specialist (Warm)</option>
                  <option value="aurora">Aurora — Female Executive (Empathetic)</option>
                  <option value="cortex">Cortex — Concise Technical (Male)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs text-gray-300 font-medium">Full Name</label>
                <input
                  className="bg-[#0F0E14] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 text-xs w-full transition-colors placeholder:text-gray-500"
                  placeholder="Your Full Name"
                  type="text"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs text-gray-300 font-medium">Phone Number</label>
                <input
                  className="bg-[#0F0E14] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500 text-xs w-full transition-colors placeholder:text-gray-500"
                  placeholder="+1 (555) 000-0000"
                  type="tel"
                />
              </div>

              {/* Action Button */}
              <button className="bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white px-4 py-3.5 rounded-xl font-bold text-xs w-full hover:opacity-95 transition-all shadow-lg shadow-orange-600/25 mt-1">
                Receive Demo Call
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Smooth Seamless Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/80 to-transparent pointer-events-none z-10"></div>
    </section>
  );
};


