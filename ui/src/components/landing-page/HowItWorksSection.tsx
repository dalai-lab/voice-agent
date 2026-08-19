import React, { useState, useEffect, useRef } from 'react';
import { PhoneCall, Bot, Zap, Play, Pause, Check } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const [selectedVoice, setSelectedVoice] = useState<string>('atlas');
  
  // Step 01: Self-typing phone number effect
  const [phoneNumberText, setPhoneNumberText] = useState<string>('');
  const [isNumberReady, setIsNumberReady] = useState<boolean>(false);

  // Step 02: Sequential workflow construction steps (0 = hidden, 1 = node 1, 2 = node 2, 3 = node 3)
  const [flowStepCount, setFlowStepCount] = useState<number>(0);

  // Step 04: Live system toggle switch & uptime counter
  const [isSystemLive, setIsSystemLive] = useState<boolean>(false);
  const [uptimeCount, setUptimeCount] = useState<number>(90.0);

  // IntersectionObserver targets
  const step1Ref = useRef<HTMLDivElement | null>(null);
  const step2Ref = useRef<HTMLDivElement | null>(null);
  const step3Ref = useRef<HTMLDivElement | null>(null);
  const step4Ref = useRef<HTMLDivElement | null>(null);

  // Step 01: Trigger self-typing phone number animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Self typing sequence for phone number
          const fullNumber = '+91 98765 43210';
          let i = 0;
          setPhoneNumberText('');
          setIsNumberReady(false);

          const typingInterval = setInterval(() => {
            if (i < fullNumber.length) {
              setPhoneNumberText(fullNumber.slice(0, i + 1));
              i++;
            } else {
              clearInterval(typingInterval);
              setIsNumberReady(true);
            }
          }, 60);

          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    if (step1Ref.current) observer.observe(step1Ref.current);
    return () => observer.disconnect();
  }, []);

  // Step 02: Trigger sequential workflow construction on scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setFlowStepCount(1);
          setTimeout(() => setFlowStepCount(2), 600);
          setTimeout(() => setFlowStepCount(3), 1200);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    if (step2Ref.current) observer.observe(step2Ref.current);
    return () => observer.disconnect();
  }, []);

  // Step 04: Trigger live switch toggle & uptime ticker on scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsSystemLive(true), 400);
          
          let count = 90.0;
          const ticker = setInterval(() => {
            count += 1.5;
            if (count >= 99.9) {
              setUptimeCount(99.9);
              clearInterval(ticker);
            } else {
              setUptimeCount(Number(count.toFixed(1)));
            }
          }, 50);

          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    if (step4Ref.current) observer.observe(step4Ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-16 bg-[#FFFFFF] text-slate-900 border-t border-slate-200 overflow-hidden font-sans" id="how-it-works">
      
      <div className="max-w-6xl mx-auto flex flex-col items-center relative">
        
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200/80 border border-slate-300 mb-4">
            <span className="w-2 h-2 rounded-full bg-orange-600"></span>
            <span className="text-xs text-slate-700 font-semibold">
              10 • How It Works
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-slate-900 mb-4">
            From Phone Number <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">To Live Production.</span>
          </h2>

          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            We own the entire deployment lifecycle so your business doesn't have to manage telephony, LLMs, or integrations.
          </p>
        </div>

        {/* VERTICAL TIMELINE CORRIDOR CONTAINER (4 STEPS) */}
        <div className="relative w-full space-y-16 lg:space-y-24">
          
          {/* Vertical Central Spine Line */}
          <div className="hidden md:block absolute left-1/2 top-8 bottom-8 -translate-x-1/2 w-0.5 bg-gradient-to-b from-orange-500 via-rose-500 to-emerald-500 opacity-30 z-0"></div>

          {/* STEP 01: SET UP A NUMBER (Self-Typing Minimal UI) */}
          <div ref={step1Ref} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center relative z-10">
            <div className="md:text-right md:pr-10 space-y-3">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-md">
                Step 01
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
                Number & Line Provisioning
              </h3>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed font-light">
                We assign dedicated local or toll-free business phone lines and handle all carrier routing directly.
              </p>
            </div>

            <div className="md:pl-10">
              {/* Clean Light-Themed Indian IST Phone Provisioning Table Snippet */}
              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden font-sans text-left transition-all">
                
                {/* Real Data Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4 min-w-[150px]">Phone Number</th>
                        <th className="py-3 px-4 text-center">Monthly Rate</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      
                      {/* ROW 1: Active Provisioning Row (Self-Typing Animated Number) */}
                      <tr className="bg-red-50/40 font-medium hover:bg-red-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-sans font-extrabold text-[#F22F46] text-sm sm:text-base whitespace-nowrap">{phoneNumberText}</span>
                            <span className="w-1.5 h-4 bg-[#F22F46] animate-pulse shrink-0"></span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-700 text-xs text-center whitespace-nowrap font-bold">
                          Included
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button 
                            disabled={!isNumberReady}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap ${
                              isNumberReady
                                ? 'bg-[#F22F46] hover:bg-[#D12B40] text-white active:scale-95'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {isNumberReady ? 'Provisioned' : 'Allocating...'}
                          </button>
                        </td>
                      </tr>

                      {/* ROW 2: Static Secondary Number */}
                      <tr className="text-slate-600 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-sans font-bold text-slate-800 text-xs sm:text-sm whitespace-nowrap">
                          +91 98100 12345
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-500 text-xs text-center whitespace-nowrap font-semibold">
                          ₹149 / mo
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer whitespace-nowrap">
                            Buy
                          </button>
                        </td>
                      </tr>

                      {/* ROW 3: Static Tertiary Number */}
                      <tr className="text-slate-600 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-sans font-bold text-slate-800 text-xs sm:text-sm whitespace-nowrap">
                          +91 80 4920 1920
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-500 text-xs text-center whitespace-nowrap font-semibold">
                          ₹149 / mo
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer whitespace-nowrap">
                            Buy
                          </button>
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>

                {/* Table Footer Bar */}
                <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Showing 3 available Indian phone numbers</span>
                  <span className="font-sans text-emerald-600 font-bold">Ready for Deployment</span>
                </div>

              </div>
            </div>
          </div>

          {/* STEP 02: MAP OUT CALLS (Minimal AAA-Grade Flow Nodes) */}
          <div ref={step2Ref} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center relative z-10">
            <div className="order-2 md:order-1 md:pr-10">
              {/* Dark-Themed Workflow Node Canvas UI Snippet (100% Matching BrainSection Theme) */}
              <div 
                className="relative w-full bg-[#0F172A] border border-slate-800 rounded-2xl p-4 md:p-5 shadow-2xl flex items-center justify-between gap-1.5 md:gap-3 overflow-hidden font-sans select-none"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1.2px, transparent 1.2px)',
                  backgroundSize: '16px 16px'
                }}
              >
                {/* Node 1: Inbound Call */}
                <div className="z-10 flex-1 min-w-[95px] bg-[#1E293B] border border-blue-500/40 rounded-xl p-2.5 sm:p-3 shadow-lg flex flex-col justify-between h-[150px] text-white">
                  <div className="flex items-center justify-between">
                    <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xs font-bold">
                      <PhoneCall className="w-3 h-3" />
                    </span>
                    <span className="text-[9px] font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.5 rounded">Start</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-snug">Inbound Call</div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">+91 98765 43210</div>
                  </div>
                  <div className="text-[9px] text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 p-1 rounded text-center">
                    Listener Active
                  </div>
                </div>

                {/* Visible Neon Connecting Wire Line 1 */}
                <div className="flex-shrink-0 flex items-center justify-center w-5 sm:w-8 relative z-0">
                  <div className="w-full h-0.5 bg-gradient-to-r from-blue-500 via-orange-500 to-orange-500 relative flex items-center justify-end shadow-[0_0_8px_rgba(249,115,22,0.6)]">
                    <span className="text-[9px] text-orange-400 font-extrabold translate-x-1">►</span>
                  </div>
                </div>

                {/* Node 2: Intent Filter */}
                <div className="z-10 flex-1 min-w-[105px] bg-[#1E293B] border border-orange-500/40 rounded-xl p-2.5 sm:p-3 shadow-lg flex flex-col justify-between h-[150px] text-white">
                  <div className="flex items-center justify-between">
                    <span className="w-5 h-5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center text-xs font-bold">
                      <Bot className="w-3 h-3" />
                    </span>
                    <span className="text-[9px] font-bold text-orange-300 bg-orange-500/20 border border-orange-500/30 px-1.5 py-0.5 rounded">Logic</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-snug">Intent Filter</div>
                    <div className="text-[9px] text-slate-400 font-sans mt-0.5 leading-tight">Prompt: Emergency AC</div>
                  </div>
                  <div className="text-[9px] text-orange-400 font-bold bg-orange-500/10 border border-orange-500/20 p-1 rounded text-center">
                    GPT-4o Engine
                  </div>
                </div>

                {/* Visible Neon Connecting Wire Line 2 */}
                <div className="flex-shrink-0 flex items-center justify-center w-5 sm:w-8 relative z-0">
                  <div className="w-full h-0.5 bg-gradient-to-r from-orange-500 via-emerald-400 to-emerald-500 relative flex items-center justify-end shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                    <span className="text-[9px] text-emerald-400 font-extrabold translate-x-1">►</span>
                  </div>
                </div>

                {/* Node 3: CRM Action */}
                <div className="z-10 flex-1 min-w-[95px] bg-[#1E293B] border border-emerald-500/40 rounded-xl p-2.5 sm:p-3 shadow-lg flex flex-col justify-between h-[150px] text-white">
                  <div className="flex items-center justify-between">
                    <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold">
                      <Zap className="w-3 h-3" />
                    </span>
                    <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded">Action</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-snug">CRM Action</div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">Calendar Sync</div>
                  </div>
                  <div className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-1 rounded text-center flex items-center justify-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Confirmed
                  </div>
                </div>

              </div>
            </div>

            <div className="order-1 md:order-2 md:pl-10 space-y-3">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-md">
                Step 02
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
                Talkar Maps Your Calls
              </h3>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed font-light">
                Visual logic for every scenario. We custom-build prompt conditions, call transfer rules, and CRM actions based on your exact business needs.
              </p>
            </div>
          </div>

          {/* STEP 03: CHOOSE A VOICE (Minimal AAA-Grade Cards) */}
          <div ref={step3Ref} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center relative z-10">
            <div className="md:text-right md:pr-10 space-y-3">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-md">
                Step 03
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
                Choose a Voice
              </h3>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed font-light">
                Ultra-low latency neural synthesis. Pick from enterprise voice presets tuned for clarity, empathy, and speed.
              </p>
            </div>

            <div className="md:pl-10">
              {/* 100% Authentic ElevenLabs Style Voice Selector UI Card (Monochrome Slate/Black, No Orange) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 font-sans text-left transition-all relative">
                
                {/* Header: Voice Library Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-800 tracking-tight">Voice Model Presets</span>
                  <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    Turbo v2.5 • Sub-100ms
                  </span>
                </div>

                {/* Voice Item List (Authentic ElevenLabs Card Layout) */}
                <div className="space-y-2.5">
                  
                  {/* Voice 1: Aurora */}
                  <div 
                    onClick={() => setSelectedVoice('aurora')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      selectedVoice === 'aurora'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-slate-50/50 border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-xs shrink-0 transition-transform ${
                        selectedVoice === 'aurora' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                      }`}>
                        {selectedVoice === 'aurora' ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${selectedVoice === 'aurora' ? 'text-white' : 'text-slate-900'}`}>Aurora</span>
                          <span className={`text-[10px] ${selectedVoice === 'aurora' ? 'text-slate-400' : 'text-slate-500'}`}>98ms</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${selectedVoice === 'aurora' ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>female</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${selectedVoice === 'aurora' ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>executive</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${selectedVoice === 'aurora' ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>conversational</span>
                        </div>
                      </div>
                    </div>

                    <button className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap self-end sm:self-center transition-all flex items-center gap-1 ${
                      selectedVoice === 'aurora'
                        ? 'bg-white text-slate-900 font-bold'
                        : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}>
                      {selectedVoice === 'aurora' ? <><Check className="w-3 h-3" /> Active</> : 'Use Voice'}
                    </button>
                  </div>

                  {/* Voice 2: Cortex */}
                  <div 
                    onClick={() => setSelectedVoice('cortex')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      selectedVoice === 'cortex'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-slate-50/50 border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-xs shrink-0 transition-transform ${
                        selectedVoice === 'cortex' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                      }`}>
                        {selectedVoice === 'cortex' ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${selectedVoice === 'cortex' ? 'text-white' : 'text-slate-900'}`}>Cortex</span>
                          <span className={`text-[10px] ${selectedVoice === 'cortex' ? 'text-slate-400' : 'text-slate-500'}`}>95ms</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${selectedVoice === 'cortex' ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>male</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${selectedVoice === 'cortex' ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>concise</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${selectedVoice === 'cortex' ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>technical</span>
                        </div>
                      </div>
                    </div>

                    <button className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap self-end sm:self-center transition-all flex items-center gap-1 ${
                      selectedVoice === 'cortex'
                        ? 'bg-white text-slate-900 font-bold'
                        : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}>
                      {selectedVoice === 'cortex' ? <><Check className="w-3 h-3" /> Active</> : 'Use Voice'}
                    </button>
                  </div>

                  {/* Voice 3: Atlas (Active Playing) */}
                  <div 
                    onClick={() => setSelectedVoice('atlas')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      selectedVoice === 'atlas'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-slate-50/50 border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-xs shrink-0 transition-transform ${
                        selectedVoice === 'atlas' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                      }`}>
                        {selectedVoice === 'atlas' ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${selectedVoice === 'atlas' ? 'text-white' : 'text-slate-900'}`}>Atlas</span>
                          <span className={`text-[10px] ${selectedVoice === 'atlas' ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>105ms</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${selectedVoice === 'atlas' ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>male</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${selectedVoice === 'atlas' ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>commercial</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${selectedVoice === 'atlas' ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>warm</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {selectedVoice === 'atlas' && (
                        <span className="flex items-center gap-0.5 mr-1">
                          <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
                          <span className="w-0.5 h-4 bg-emerald-400 rounded-full animate-pulse delay-75"></span>
                          <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-pulse delay-150"></span>
                        </span>
                      )}
                      <button className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                        selectedVoice === 'atlas'
                          ? 'bg-white text-slate-900 font-bold'
                          : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-100'
                      }`}>
                        {selectedVoice === 'atlas' ? <><Check className="w-3 h-3" /> Active</> : 'Use Voice'}
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>

          {/* STEP 04: GO LIVE (Minimal AAA-Grade Switch & Telemetry) */}
          <div ref={step4Ref} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center relative z-10">
            <div className="order-2 md:order-1 md:pr-10">
              {/* Clean Dark-Themed Business SaaS Control Card (No Extra Tags, No Jargon) */}
              <div className="bg-[#0F172A] text-white border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 text-left font-sans transition-all relative">
                
                {/* Header Bar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isSystemLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                    <span className="text-xs font-bold text-white tracking-tight">
                      {isSystemLive ? 'System Active' : 'System Ready'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">24/7 Production</span>
                </div>

                {/* Simple Business Metrics */}
                <div className="bg-[#1E293B] border border-slate-700/80 p-4 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-700/60 pb-2.5">
                    <span className="text-slate-400">Voice Agent Status:</span>
                    <span className={`font-bold flex items-center gap-1.5 ${isSystemLive ? 'text-emerald-400' : 'text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isSystemLive ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                      {isSystemLive ? 'Active (24/7)' : 'Standby'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Call Capacity:</span>
                    <span className="text-white font-medium">Unlimited Concurrent Calls</span>
                  </div>
                </div>

                {/* Clean Toggle Switch */}
                <div className="p-3.5 border border-slate-700 bg-[#1E293B]/80 flex items-center justify-between rounded-xl">
                  <span className={`text-xs font-bold ${isSystemLive ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isSystemLive ? 'System Live' : 'System Offline'}
                  </span>
                  <div 
                    onClick={() => setIsSystemLive(!isSystemLive)}
                    className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-all duration-300 cursor-pointer ${
                      isSystemLive ? 'bg-emerald-500 justify-end shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-md"></div>
                  </div>
                </div>

              </div>
            </div>

            <div className="order-1 md:order-2 md:pl-10 space-y-3">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-md">
                Step 04
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
                Go Live
              </h3>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed font-light">
                Real-time call monitoring, instant failover, and automatic lead logging enabled.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
