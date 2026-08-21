import React from 'react';

export const WhyNowSection: React.FC = () => {
  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-16 bg-[#FFFFFF] text-slate-900 border-t border-slate-200 overflow-hidden font-sans" id="why-now">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
        
        {/* Section Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-orange-600"></span>
          03 • Why Voice AI Now
        </div>

        {/* Headline */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-slate-900 mb-6 max-w-4xl">
          The Phone Line Is Still Your Most <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">High-Intent Revenue Channel.</span>
        </h2>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal mb-16">
          When a potential client picks up the phone, their intent is at its peak. Delaying a response or sending them to voicemail kills deal velocity.
        </p>

        {/* 3 DISTINCT REAL-WORLD CROPPED UI & OS ART WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl text-left">
          
          {/* CARD 1: REAL AUTHENTIC IPHONE 15 PRO LOCKSCREEN MOCKUP WITH SHARP BOTTOM CROP */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:border-slate-300 transition-all duration-300 shadow-sm">
            
            {/* Sleek iPhone 15 Pro Chassis Shell (Flush Screen, Sharp Bottom Crop) */}
            <div className="w-full max-w-[290px] mx-auto bg-black border-[7px] border-[#1C1C1E] border-b-0 rounded-t-[44px] rounded-b-none shadow-2xl relative overflow-hidden max-h-[300px] text-white font-sans select-none">
              
              {/* iPhone Wallpaper Background */}
              <div 
                className="w-full h-full p-3.5 relative overflow-hidden bg-cover bg-center space-y-3 min-h-[290px]"
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

                {/* Translucent Glass iOS Lockscreen Notification Card Stack */}
                <div className="relative z-10 space-y-2 pt-1">
                  <div className="bg-white/15 backdrop-blur-xl border border-white/25 p-3 rounded-2xl text-left shadow-2xl space-y-1">
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
                    <div className="text-xs font-extrabold text-white">Missed Call (3)</div>
                    <div className="text-[10px] text-gray-100 truncate font-medium">+91 98765 43210 • Commercial HVAC</div>
                    <div className="text-[9.5px] text-rose-300 font-bold pt-0.5">
                      Status: Unanswered — Called Competitor
                    </div>
                  </div>

                  {/* Loss Alert Banner */}
                  <div className="bg-rose-500/25 backdrop-blur-md border border-rose-400/30 p-1.5 rounded-xl text-center shadow-xs">
                    <span className="text-[9.5px] text-rose-200 font-bold">High Intent Prospects Lost to Voicemail</span>
                  </div>
                </div>

              </div>

              {/* Bottom Screenshot Crop Fade */}
              <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-30"></div>

            </div>

            {/* Copy */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-rose-600">Most</span>
                <h3 className="text-base font-bold text-slate-900">Inbound Calls Go Unanswered</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Small and mid-market businesses miss a large portion of phone inquiries during peak operational hours and after-hours shifts.
              </p>
            </div>

          </div>

          {/* CARD 2: REAL SLACK / TEAMS LIVE BOT ALERT WIDGET (< 15s Qualification Window) */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:border-slate-300 transition-all duration-300 shadow-sm">
            
            {/* Authentic Slack Workspace Lead Notification Card */}
            <div className="bg-[#1A1D21] rounded-2xl p-4 space-y-3 font-sans text-xs text-white shadow-md border border-slate-800">
              
              {/* Slack Channel Header Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-300 font-bold">
                  <span className="text-gray-400">#</span>
                  <span>sales-inbound-leads</span>
                </div>
                <span className="text-[9.5px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  ⚡ Instant Action
                </span>
              </div>

              {/* Slack Message Item */}
              <div className="flex items-start gap-2.5 text-left">
                {/* Bot Avatar */}
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-600 to-rose-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow">
                  ⚡
                </div>

                <div className="space-y-1.5 flex-grow min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-[11px]">System Alert</span>
                    <span className="bg-slate-700 text-[8px] font-bold text-gray-300 px-1 rounded">APP</span>
                    <span className="text-[9px] text-gray-400">09:41 AM</span>
                  </div>

                  <div className="text-[11px] font-semibold text-emerald-400">
                    Emergency Inquiry Qualified <span className="underline decoration-emerald-400 font-mono font-extrabold">Instantly</span>!
                  </div>

                  {/* Slack Attachment Block */}
                  <div className="bg-[#222529] border-l-4 border-emerald-500 p-2.5 rounded-r-lg space-y-1 text-[10px] font-sans">
                    <div className="text-gray-300 truncate">
                      <span className="font-bold text-white">Prospect:</span> Sarah M. (Commercial HVAC)
                    </div>
                    <div className="text-gray-300">
                      <span className="font-bold text-white">Speed:</span> <span className="text-emerald-400 font-bold">8.4s</span> <span className="text-gray-400">(vs 42m rep delay)</span>
                    </div>
                    <div className="text-emerald-400 font-bold">
                      ✓ Action: Tech Dispatched @ 2:30 PM
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Copy */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-orange-600">Instant</span>
                <h3 className="text-base font-bold text-slate-900">Action Matters</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Leads responded to immediately are significantly more likely to convert than those called back even 30 minutes later.
              </p>
            </div>

          </div>

          {/* CARD 3: CROPPED CONTROL PANEL UI SNIPPET (100% Zero Setup) */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:border-slate-300 transition-all duration-300 shadow-sm">
            
            {/* Cropped UI Control Bar Component */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 font-sans text-xs text-slate-800 shadow-sm">
              
              {/* Header Status */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">System Readiness</span>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  Active System
                </span>
              </div>

              {/* Status Rows */}
              <div className="space-y-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-700 font-medium">Business Line (+91 9876)</span>
                  </div>
                  <span className="text-emerald-600 font-bold font-mono">Connected</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span className="text-slate-700 font-medium">Neural Voice Synthesis</span>
                  </div>
                  <span className="text-orange-600 font-bold font-mono">Sub-120ms</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span className="text-slate-700 font-medium">CRM & Calendar Integration</span>
                  </div>
                  <span className="text-purple-600 font-bold font-mono">2-Way Sync</span>
                </div>

                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">Live Telephony Stream</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-3 bg-orange-500 rounded-full animate-pulse"></span>
                    <span className="w-1 h-4 bg-rose-500 rounded-full animate-pulse delay-75"></span>
                    <span className="w-1 h-2 bg-amber-500 rounded-full animate-pulse delay-150"></span>
                    <span className="w-1 h-4 bg-emerald-500 rounded-full animate-pulse delay-200"></span>
                  </div>
                </div>
              </div>

            </div>

            {/* Copy */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-emerald-600">100%</span>
                <h3 className="text-base font-bold text-slate-900">Zero Infrastructure Friction</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Natural real-time speech models mean AI voice agents sound human, handle complex questions, and execute actions instantly.
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
