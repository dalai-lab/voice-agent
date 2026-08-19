import React from 'react';

export const SecuritySection: React.FC = () => {
  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-16 bg-[#090A0F] text-white border-t border-white/10 font-sans" id="security">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Section Header Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-orange-400 font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          11 • Enterprise Security & Compliance
        </div>

        {/* Headline */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-white text-center mb-6 max-w-4xl">
          Carrier-Grade Reliability. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400">Enterprise Security Standard.</span>
        </h2>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto text-center leading-relaxed font-light mb-16">
          Built from the ground up for strict privacy, compliance, and zero-downtime voice operations across regulated industries.
        </p>

        {/* 4 Security Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl text-left">
          
          {/* Pillar 1 */}
          <div className="bg-[#13121C] border border-white/5 rounded-2xl p-6 space-y-3 hover:border-white/10 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
              SOC-2
            </div>
            <h3 className="text-lg font-bold text-white leading-snug">SOC-2 Type II Ready</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Audited operational protocols and data access controls guaranteeing strict data isolation.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-[#13121C] border border-white/5 rounded-2xl p-6 space-y-3 hover:border-white/10 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm">
              HIPAA
            </div>
            <h3 className="text-lg font-bold text-white leading-snug">HIPAA Compliance Ready</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Full BAA agreement support with encrypted patient intake handling for medical practices.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-[#13121C] border border-white/5 rounded-2xl p-6 space-y-3 hover:border-white/10 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
              256-bit
            </div>
            <h3 className="text-lg font-bold text-white leading-snug">End-to-End Encryption</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              All voice streams and stored transcript logs are encrypted with TLS 1.3 in transit and AES-256 at rest.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bg-[#13121C] border border-white/5 rounded-2xl p-6 space-y-3 hover:border-white/10 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              99.99%
            </div>
            <h3 className="text-lg font-bold text-white leading-snug">Multi-Region Redundancy</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              High-availability carrier trunks and redundant cloud infrastructure ensuring zero dropped calls.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
