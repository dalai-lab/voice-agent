import React from 'react';

export const FooterCtaSection: React.FC = () => {
  return (
    <footer className="relative w-full py-28 px-6 md:px-12 lg:px-16 bg-[#090A0F] text-white border-t border-white/10 overflow-hidden font-sans" id="cta-footer">
      
      {/* Background Subtle Gradient & Stripe Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-950/10 to-black pointer-events-none"></div>

      <div className="max-w-5xl mx-auto flex flex-col items-center relative z-10">
        
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          <span>Get Started Today</span>
        </div>

        {/* Main Headline */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-white text-center mb-6">
          Stop Missing Revenue. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 font-light italic">
            Start Building.
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-gray-300 max-w-xl mx-auto leading-relaxed font-light text-center mb-8">
          Set up your AI phone agent in minutes.
        </p>

        {/* CTA Button */}
        <div className="flex flex-col items-center gap-3 mb-20">
          <a href="/handler/sign-up" className="px-9 py-4 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-orange-600/25 transition-all duration-300 cursor-pointer text-center inline-block">
            Get Started
          </a>
          
          <p className="text-xs text-gray-400 font-mono">
            talkar.in
          </p>
        </div>

        {/* Corporate & Legal Entity Details */}
        <div className="pt-12 border-t border-white/10 w-full flex flex-col md:flex-row items-center md:items-start justify-between text-xs text-gray-400 gap-8 text-center md:text-left">
          <div className="max-w-2xl space-y-2">
            <p className="text-gray-200 font-medium text-xs sm:text-sm">
              Talkar is a brand operated by <span className="text-white font-semibold">4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED</span>
            </p>
            <p className="text-gray-400 text-xs font-mono">
              CIN: <span className="text-gray-300">U74999JH2022PTC018848</span>
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">
              <span className="text-gray-300 font-medium">Registered Office:</span> 4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED, C/O - Bundeshwari Devi, PN Bose Compound, Lalpur, Ranchi, Jharkhand, 834001
            </p>
          </div>

          <div className="flex flex-col md:items-end gap-3 text-xs text-gray-500 shrink-0">
            <div>© {new Date().getFullYear()} Talkar Voice AI Engine. All rights reserved.</div>
            <div className="flex items-center gap-3">
              <a href="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
              <span>·</span>
              <a href="/terms-of-service" className="hover:text-gray-300 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
