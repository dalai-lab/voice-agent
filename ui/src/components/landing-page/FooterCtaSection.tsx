import React from 'react';

export const FooterCtaSection: React.FC = () => {
  return (
    <footer className="relative w-full py-28 px-6 md:px-12 lg:px-16 bg-[#090A0F] text-white border-t border-white/10 overflow-hidden font-sans" id="cta-footer">
      
      {/* Background Subtle Gradient & Stripe Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-950/10 to-black pointer-events-none"></div>

      <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10 space-y-8">
        
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          <span>Get Started Today</span>
        </div>

        {/* Main Headline */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-white">
          Stop Missing Revenue. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 font-light italic">
            Start Building.
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-gray-300 max-w-xl mx-auto leading-relaxed font-light">
          Set up your AI phone agent in minutes. Activation starts from ₹6,000.
        </p>

        {/* CTA Button */}
        <div className="pt-4 flex flex-col items-center gap-3">
          <a href="/handler/sign-up" className="px-9 py-4 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-orange-600/25 transition-all duration-300 cursor-pointer text-center inline-block">
            Get Started
          </a>
          
          <p className="text-xs text-gray-400 font-mono">
            talkar.in — Activation starts from ₹6,000
          </p>
        </div>

        {/* Copyright Footer Line */}
        <div className="pt-16 border-t border-white/10 w-full flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <div>© {new Date().getFullYear()} Talkar Voice AI Engine. All rights reserved.</div>
          <div className="flex gap-6 text-gray-400">
          </div>
        </div>

      </div>
    </footer>
  );
};
