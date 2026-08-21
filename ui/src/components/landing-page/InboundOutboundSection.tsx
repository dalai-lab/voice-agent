import React, { useState } from 'react';

export const InboundOutboundSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');

  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-16 bg-[#090A0F] text-white border-t border-white/10 font-sans" id="capabilities">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Header Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-orange-400 font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          Dual Voice Capabilities
        </div>

        {/* Section Headline */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-white text-center mb-6 max-w-4xl">
          Inbound Reception. Outbound Growth. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400">One Unified Voice AI Operator.</span>
        </h2>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto text-center leading-relaxed font-light mb-12">
          Whether capturing high-intent inbound calls or proactively following up with warm web leads, Talkar operates seamlessly in both directions.
        </p>

        {/* Inbound / Outbound Toggle Buttons */}
        <div className="flex items-center gap-3 p-1.5 bg-[#14131F] border border-white/10 rounded-full mb-14 shadow-lg">
          <button
            onClick={() => setActiveTab('inbound')}
            className={`px-6 py-2.5 rounded-full text-xs font-semibold transition-all duration-300 cursor-pointer ${
              activeTab === 'inbound'
                ? 'bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white shadow-md shadow-orange-600/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Inbound AI Receptionist
          </button>

          <button
            onClick={() => setActiveTab('outbound')}
            className={`px-6 py-2.5 rounded-full text-xs font-semibold transition-all duration-300 cursor-pointer ${
              activeTab === 'outbound'
                ? 'bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white shadow-md shadow-orange-600/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Outbound AI Calling Engine
          </button>
        </div>

        {/* Dynamic Capability Content Card */}
        <div className="w-full max-w-5xl bg-[#13121C] border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center text-left">
          
          {/* Left Description Column */}
          <div className="lg:col-span-7 space-y-6">
            {activeTab === 'inbound' ? (
              <>
                <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                  24/7 Always-On Inbound Intake
                </div>
                <h3 className="text-3xl font-bold text-white leading-tight">
                  Never Miss a Customer Call Again
                </h3>
                <p className="text-sm md:text-base text-gray-300 leading-relaxed font-light">
                  Talkar answers inbound calls instantly, greets callers naturally, extracts intent, qualifies leads using custom business rules, and dispatches appointments or warm call transfers.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-300 pt-2 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                    <span>Instant Call Pickup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                    <span>Automated Lead Qualification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                    <span>Live Calendar Booking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                    <span>Warm Human Transfer</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="inline-block px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium rounded-full">
                  Proactive Lead Activation
                </div>
                <h3 className="text-3xl font-bold text-white leading-tight">
                  Turn Web Form Leads Into Phone Conversations
                </h3>
                <p className="text-sm md:text-base text-gray-300 leading-relaxed font-light">
                  When a prospect submits a contact form or requests a quote, Talkar initiates an outbound call within seconds while their interest is fresh, securing the booking before competitors respond.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-300 pt-2 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span>Instant Speed-to-Lead Dialing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span>Appointment Confirmation Calls</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span>Stale Lead Re-Engagement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span>Post-Call SMS & Email Dispatch</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Visual Flow Diagram */}
          <div className="lg:col-span-5 bg-[#0D0C16] border border-white/5 rounded-2xl p-6 space-y-4 font-sans text-xs shadow-xl">
            <div className="border-b border-white/5 pb-3">
              <h4 className="font-bold text-white text-sm">Call Execution Flow</h4>
              <p className="text-[11px] text-gray-400 font-normal">Automated step-by-step resolution</p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-[#171624] border border-white/5 rounded-xl flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-xs shrink-0">1</div>
                <span className="text-gray-200 font-medium">{activeTab === 'inbound' ? 'Inbound Phone Ring' : 'Web Form Trigger'}</span>
              </div>
              
              <div className="flex justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              <div className="p-3.5 bg-[#171624] border border-white/5 rounded-xl flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-xs shrink-0">2</div>
                <span className="text-gray-200 font-medium">Real-Time Voice Conversation</span>
              </div>
              
              <div className="flex justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              <div className="p-3.5 bg-[#171624] border border-white/5 rounded-xl flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-xs shrink-0">3</div>
                <span className="text-gray-200 font-medium">Intent & Qualification</span>
              </div>
              
              <div className="flex justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              <div className="p-3.5 bg-[#171624] border border-emerald-500/20 rounded-xl flex items-center gap-3 shadow-md">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">4</div>
                <span className="text-white font-bold">Action Execution (Calendar + SMS)</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
