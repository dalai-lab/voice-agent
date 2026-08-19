import React, { useState, useEffect, useRef } from 'react';

// Custom hook to trigger animation when scrolled into view
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.unobserve(node);
  }, [threshold]);

  return [ref, isInView] as const;
}

export const ProblemSection: React.FC = () => {
  const [card1Ref, card1InView] = useInView(0.25);
  const [card2Ref, card2InView] = useInView(0.25);
  const [card3Ref, card3InView] = useInView(0.25);

  return (
    <section className="w-full bg-[#090A0F] text-white py-24 px-6 md:px-12 lg:px-16 relative font-sans" id="problem">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Sticky Left Column: Talkar Story Copy */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span className="text-xs text-orange-400 font-semibold">
                02 • Revenue Leak
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-white">
              Unanswered Intent Is <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400">Missed Revenue.</span>
            </h2>
            <p className="text-base md:text-lg text-gray-300 leading-relaxed font-light">
              Basic call routing is a dead end. Talkar captures live intent, qualifies leads, and dispatches actions while the caller is still on the line.
            </p>
          </div>

          {/* Right Column: 3 Minimal Business SaaS Cards */}
          <div className="lg:col-span-7 flex flex-col gap-8 font-sans">
            
            {/* CARD 1 — MISSED CALLS / LOST REVENUE */}
            <div 
              ref={card1Ref}
              className="bg-[#12111A] border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl hover:border-white/20 transition-all duration-300"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF3B30]"></span>
                  <span className="text-xs text-rose-400 font-semibold">
                    Missed Calls & Lead Drain
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-medium">Inbound Lead Loss</span>
              </div>

              {/* Sleek iPhone 15 Pro Chassis Shell (Flush Screen, Sharp Bottom Crop) */}
              <div className="w-full max-w-[290px] mx-auto bg-black border-[7px] border-[#1C1C1E] border-b-0 rounded-t-[44px] rounded-b-none shadow-2xl relative overflow-hidden max-h-[290px] text-white font-sans select-none">
                
                {/* iPhone Wallpaper Background */}
                <div 
                  className="w-full h-full p-3.5 relative overflow-hidden bg-cover bg-center space-y-3 min-h-[280px]"
                  style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80')",
                  }}
                >
                  {/* Dark Wallpaper Overlay */}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-0"></div>

                  {/* iPhone Status Bar & Dynamic Island */}
                  <div className="relative z-10 flex items-center justify-between pt-0.5 px-1">
                    <span className="text-[11px] font-bold text-white tracking-tight ml-1 font-sans">9:41</span>
                    
                    {/* Dynamic Island */}
                    <div className="w-[82px] h-[20px] bg-black rounded-full flex items-center justify-end px-2 border border-white/5 shadow-inner">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0B1528] ring-1 ring-blue-500/30"></span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-white mr-1">
                      <span>5G</span>
                      <span className="w-3.5 h-2 rounded-[2px] border border-white p-[1px] flex items-center">
                        <span className="w-full h-full bg-white rounded-[1px]"></span>
                      </span>
                    </div>
                  </div>

                  {/* iOS Lock Screen Date & Clock */}
                  <div className="relative z-10 text-center pt-1">
                    <div className="text-[10px] text-white/80 font-medium tracking-wide">Monday, August 10</div>
                    <div className="text-4xl font-extrabold text-white tracking-tight leading-none mt-0.5 font-sans drop-shadow-md">09:41</div>
                  </div>

                  {/* Translucent Glass iOS Lockscreen Notification Card */}
                  <div className="relative z-10 space-y-2 pt-1">
                    <div 
                      className={`bg-white/15 backdrop-blur-xl border border-white/25 p-3 rounded-2xl text-left shadow-2xl space-y-1 transform transition-all duration-700 ease-out ${
                        card1InView ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                            </svg>
                          </div>
                          <span className="text-[10px] font-bold text-white tracking-wide">Phone</span>
                        </div>
                        <span className="text-[9px] text-gray-200 font-medium">12m ago</span>
                      </div>
                      <div className="text-xs font-extrabold text-white">Missed Call (2)</div>
                      <div className="text-[10px] text-gray-100 truncate font-medium">+1 (555) 019-2834</div>
                      <div className="text-[9.5px] text-rose-300 font-bold pt-0.5">
                        Unanswered — Customer Called Competitor
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Screenshot Crop Fade */}
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-30"></div>

              </div>

              <div className="text-left">
                <h3 className="text-xl font-bold text-white mb-1.5">Missed Calls Mean Lost Customers</h3>
                <p className="text-sm text-gray-400 leading-relaxed font-light">
                  When prospects can't reach a live voice, 85% hang up and call a competitor immediately.
                </p>
              </div>
            </div>

            {/* CARD 2 — INSTANT VOICE QUALIFICATION */}
            <div 
              ref={card2Ref}
              className="bg-[#12111A] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl hover:border-white/10 transition-all duration-300"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-xs text-orange-400 font-semibold">
                    Instant Voice Qualification
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  Live Response
                </span>
              </div>

              {/* Minimal Clean Call Transcript UI */}
              <div className="w-full max-w-md mx-auto bg-[#18171F] border border-white/5 rounded-xl p-4 space-y-3 text-left">
                <div className="flex items-center justify-between bg-[#111016] p-2.5 rounded-lg border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <img 
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80" 
                      className="w-6 h-6 rounded-full object-cover border border-white/10" 
                      alt="Caller" 
                    />
                    <span className="text-white font-semibold">Inbound Commercial Lead</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">Active Call</span>
                </div>

                {/* Animated Speech Dialogue Bubbles */}
                <div className="space-y-2.5 text-xs">
                  <div 
                    className={`bg-[#24232B] text-gray-200 p-3 rounded-xl rounded-tl-xs leading-relaxed transform transition-all duration-500 ease-out ${
                      card2InView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                    }`}
                  >
                    "I need an emergency technician for our commercial AC right away."
                  </div>

                  <div 
                    className={`bg-gradient-to-r from-orange-600 to-rose-600 text-white p-3 rounded-xl rounded-tr-xs font-medium ml-auto max-w-[88%] leading-relaxed shadow-md transform transition-all duration-500 ease-out delay-300 ${
                      card2InView ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95'
                    }`}
                  >
                    "I can dispatch an emergency tech to your location within 30 minutes. What is your site address?"
                  </div>

                  <div 
                    className={`bg-[#24232B] text-gray-200 p-3 rounded-xl rounded-tl-xs leading-relaxed transform transition-all duration-500 ease-out delay-600 ${
                      card2InView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                    }`}
                  >
                    "440 Industrial Parkway, Building B."
                  </div>
                </div>
              </div>

              <div className="text-left">
                <h3 className="text-xl font-bold text-white mb-1.5">Instant Voice Engagement</h3>
                <p className="text-sm text-gray-400 leading-relaxed font-light">
                  Talkar picks up instantly, answers questions naturally, and gathers lead requirements in real time.
                </p>
              </div>
            </div>

            {/* CARD 3 — AUTOMATED CALENDAR & CRM SYNC */}
            <div 
              ref={card3Ref}
              className="bg-[#12111A] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl hover:border-white/10 transition-all duration-300"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#34C759]"></span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    Automated Workflow Resolution
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-medium">Instant Execution</span>
              </div>

              {/* Minimal SaaS Action Resolution Card */}
              <div className="w-full max-w-md mx-auto space-y-3 text-left">
                
                {/* Desktop Notification Banner */}
                <div 
                  className={`bg-[#23222A] border border-white/5 rounded-xl p-3.5 flex items-start gap-3 shadow-lg transform transition-all duration-600 ease-out ${
                    card3InView ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white text-black flex flex-col items-center overflow-hidden shrink-0 shadow">
                    <div className="bg-[#FF3B30] text-white text-[7px] font-bold w-full text-center py-0.5">
                      Aug
                    </div>
                    <div className="text-xs font-extrabold mt-0.5">10</div>
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Calendar Dispatch</span>
                      <span className="text-[10px] text-gray-400">Just now</span>
                    </div>
                    <div className="text-xs font-bold text-[#34C759] mt-0.5">
                      ✓ Emergency HVAC Tech Dispatched
                    </div>
                    <div className="text-[11px] text-gray-300 truncate">
                      Assigned: Tech Mike R. • 440 Industrial Pkwy
                    </div>
                  </div>
                </div>

                {/* SaaS Booking Status Ticket */}
                <div 
                  className={`bg-[#18171F] border border-white/5 rounded-xl p-4 space-y-3 transform transition-all duration-600 ease-out delay-300 ${
                    card3InView ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-8 bg-[#4285F4] rounded-full"></div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Emergency HVAC On-Site Dispatch</h4>
                        <div className="text-[11px] text-gray-400">Today • 2:30 PM – 3:30 PM</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-[#4285F4]/15 text-[#4285F4] text-[10px] font-bold rounded">
                      Confirmed
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-[#111016] p-2.5 rounded-lg border border-white/5">
                      <div className="text-[10px] text-gray-400 mb-0.5">Service Type</div>
                      <div className="text-white font-medium">Commercial AC Repair</div>
                    </div>
                    <div className="bg-[#111016] p-2.5 rounded-lg border border-white/5">
                      <div className="text-[10px] text-gray-400 mb-0.5">Response Time</div>
                      <div className="text-[#34C759] font-bold">Under 15 Seconds</div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="text-left">
                <h3 className="text-xl font-bold text-white mb-1.5">Automated Calendar & CRM Sync</h3>
                <p className="text-sm text-gray-400 leading-relaxed font-light">
                  Calls automatically trigger team notifications, calendar bookings, and technician dispatches in seconds.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
