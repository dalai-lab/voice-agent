import React from 'react';
import { 
  CheckCircle2, 
  Database, 
  Search, 
  Play, 
  Zap, 
  RefreshCw, 
  UserCheck
} from 'lucide-react';

export const NoCrmSection: React.FC = () => {
  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-16 bg-[#FFFFFF] text-slate-900 border-t border-slate-200 font-sans" id="no-crm">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Section Header Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-orange-600"></span>
          08 • Built-in Infrastructure
        </div>

        {/* Headline */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-slate-900 text-center mb-6 max-w-4xl">
          Works WITH Your CRM. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">Works Without One, Too.</span>
        </h2>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto text-center leading-relaxed font-normal mb-16">
          Don't let complex CRM setups slow down your voice operations. Talkar gives you a fully functional lead & call management system right out of the box.
        </p>

        {/* 2 Column Native Art Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl text-left">
          
          {/* ART 1: Standalone Mode (macOS Built-in Operations App Window) */}
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-semibold rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                Option A • Standalone Mode
              </div>

              <h3 className="text-2xl font-bold text-white leading-snug">No CRM Installed? Zero Problem.</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                Talkar captures every call, transcribes conversations in real-time, extracts customer contact details, and logs qualified leads inside your built-in Operations Console.
              </p>
            </div>

            {/* REAL-WORLD ART: Built-in macOS Operations App Window Mockup */}
            <div className="bg-[#0f111a] border border-slate-800 rounded-2xl p-4 space-y-3 font-sans shadow-xl text-xs">
              {/* Window Controls Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#FF5F56]"></span>
                  <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
                  <span className="w-3 h-3 rounded-full bg-[#27C93F]"></span>
                </div>
                <div className="bg-slate-800/80 px-3 py-1 rounded-md text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                  <Search className="w-3 h-3 text-slate-400" />
                  <span>Talkar Built-in Console</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">● Active</span>
              </div>

              {/* Lead Ticket & Recording Player Card */}
              <div className="bg-[#161926] border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-xs">
                      SJ
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Sarah Jenkins</div>
                      <div className="text-[10px] text-slate-400 font-mono">+1 (555) 019-2834</div>
                    </div>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                    BOOKED
                  </span>
                </div>

                {/* Inline Audio Scrubber */}
                <div className="bg-[#0f111a] p-2 rounded-lg border border-slate-800 flex items-center gap-2.5">
                  <button className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">
                    <Play className="w-3 h-3 ml-0.5" />
                  </button>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="w-3/5 h-full bg-orange-500 rounded-full"></div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">00:42 / 01:15</span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-2 pt-1 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Built-in call logs & audio recording player</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Automatic instant SMS & email lead notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Direct Google & Outlook calendar sync for bookings</span>
                </div>
              </div>
            </div>

          </div>

          {/* ART 2: Connected Mode (Salesforce / HubSpot Live Deal Pipeline Canvas) */}
          <div className="bg-slate-50 text-slate-900 rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xl flex flex-col justify-between hover:border-slate-300 transition-all">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-200/80 text-slate-800 border border-slate-300 text-xs font-semibold rounded-full">
                <RefreshCw className="w-3 h-3 text-slate-600" />
                Option B • Connected Mode
              </div>

              <h3 className="text-2xl font-bold text-slate-900 leading-snug">Already Have Salesforce or HubSpot?</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Talkar syncs 2-way with your existing tech stack. Contacts are created automatically, call summaries are attached to deal records, and pipeline stages update live.
              </p>
            </div>

            {/* REAL-WORLD ART: Salesforce / HubSpot Deal Pipeline Visualizer */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm text-xs font-sans">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <Database className="w-4 h-4 text-orange-600" />
                  <span>HubSpot / Salesforce 2-Way Sync</span>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-blue-600" />
                  Live Sync
                </span>
              </div>

              {/* Deal Card Canvas */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-900">Deal #8940 • Commercial HVAC</span>
                  <span className="font-extrabold text-emerald-600">$4,800 Stage Value</span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  <span>Contact Created: Sarah Jenkins</span>
                  <span className="text-slate-300">•</span>
                  <span>Pipeline Stage: Qualified Lead</span>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200 text-[10px] text-slate-600 space-y-1 font-mono">
                  <div className="text-emerald-700 font-bold font-sans">✓ Call Transcript Attached</div>
                  <p className="text-slate-500 font-sans truncate">"Requested emergency tech dispatch at 440 Industrial Pkwy."</p>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-2 pt-1 text-[11px] text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Instant 2-way contact & deal stage sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Automated call transcript logging to CRM records</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Webhooks & Zapier triggers for custom workflows</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
