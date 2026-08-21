import React from 'react';

export const WhyTalkarSection: React.FC = () => {
  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-16 bg-[#FFFFFF] text-slate-900 border-t border-slate-200 font-sans" id="why-talkar">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Section Header Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-orange-600"></span>
          04 • Positioning Differentiator
        </div>

        {/* Headline */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-slate-900 text-center mb-6 max-w-4xl">
          Why Businesses Partner With Talkar. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">Not Just Another AI Tool.</span>
        </h2>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto text-center leading-relaxed font-normal mb-16">
          We own everything from phone numbers to production deployment. No engineering team required.
        </p>

        {/* Sleek Enterprise AAA Matrix Table */}
        <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-semibold tracking-wide border-b border-slate-800">
                  <th className="py-5 px-6 font-bold text-white text-sm w-2/5">Capability / Responsibility</th>
                  <th className="py-5 px-6 text-slate-400 font-medium">DIY Voice APIs</th>
                  <th className="py-5 px-6 text-slate-400 font-medium">Generic Chatbots</th>
                  
                  {/* Talkar Featured Column Header */}
                  <th className="py-5 px-6 bg-gradient-to-r from-orange-600 via-orange-600 to-rose-600 text-white font-bold">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center">
                        <svg version="1.1" viewBox="0 0 300 97.83" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
                          <g fill="none" fillRule="nonzero">
                            <path d="M14.08,14.99h14v16.6h17.52c-0.05,4.22 0,8.53 0,12.75h-17.52v10.34c0,2.34-0.08,4.69 0.07,7.03 0.62,9.51 10.2,9.29 17.24,9.29h4.98l-0.38,12.26c-2.84,0.07-5.69,0.1-8.54,0.1-12.14-0.12-23.86-2.47-26.69-16.18-0.8-3.89-0.7-7.46-0.69-11.39v-9.58z" fill="#ffffff"/>
                            <path d="M74.54,30.82c6.4-0.64 12.6,1.79 16.87,6.55v-5.74h13.59v50.96h-13.63v-5.17c-0.86,0.84-1.49,1.37-2.43,2.13-7.98,6.05-20.7,4.8-28.13-1.6-16.95-14.61-10.08-45.18 13.72-47.12z" fill="#ffffff"/>
                            <path d="M77.07,43.55c7.58-0.76 14.33,4.78 15.06,12.36 0.74,7.58-4.82,14.31-12.4,15.03-7.55,0.71-14.26-4.82-14.99-12.37-0.73-7.55 4.78-14.27 12.33-15.02z" fill="#ea580c"/>
                            <path d="M115.03,14.63h13.59v67.96h-13.59z" fill="#ffffff"/>
                            <path d="M133.15,14.92h84.4l-3.66,10.74h-34.26v10.02c6.96-5.5 17.95-3.32 23.08,3.56 7.89,10.59 4.3,24.58-5.5,32.4 4.14,5.82 8.54,11.53 12.67,17.34h-14.65l-11.19-15.45c-1.04-1.45-2.07-2.91-3.07-4.39 6.2-3.77 13.06-8.27 13.44-16.34 0.47-10-12.63-11.39-14.55-2.11-0.56,2.68-0.24,7.79-0.24,10.72v21.11h-12.53c-0.06-4.33 0.03-8.66 0.03-12.99-2.95,2.5-5.68,4.01-9.57,4.52-5.1,0.69-10.27-0.7-14.33-3.86-9.46-7.31-10.16-21.34-3.12-30.54 6.38-8.33 18.46-10.99 27-4.3-0.11-3.15 0-6.55-0.03-9.75h-33.86z" fill="#ffedd5"/>
                            <path d="M156.81,43.38c4.1-0.59 7.46,1.4 10.23,4.2 0.62,6.67-1.95,12.94-8.97,14.62-13.19,1.52-13.72-16.59-1.26-18.82z" fill="#ea580c"/>
                            <path d="M233.12,30.81c0.54-0.09 2.43-0.06 3.02-0.02 5.82,0.4 10.2,2.32 14.06,6.65v-5.82h13.49v50.95h-13.5v-5.3c-0.92,0.92-1.52,1.44-2.54,2.25-8.27,5.74-20.21,5.06-27.89-1.41-17.16-14.44-10.55-45.17 13.35-47.3z" fill="#ffffff"/>
                            <path d="M235.66,43.54c7.6-0.81 14.41,4.73 15.16,12.34 0.75,7.61-4.83,14.37-12.44,15.07-7.54,0.69-14.22-4.82-14.97-12.35-0.75-7.53 4.72-14.25 12.25-15.05z" fill="#ea580c"/>
                            <path d="M286.19,30.96c1.17-0.18 7-0.05 8.55-0.03l-0.03,12.53c-1.29-0.04-2.58-0.08-3.87-0.1-6.43-0.05-7.18,2.95-7.15,8.77 0.01,2.54 0.01,5.2 0.01,7.75v22.7h-13.43v-24.21c0-6.47-0.83-14.03 2.52-19.79 2.94-5.05 7.83-7.16 13.38-7.62z" fill="#ffffff"/>
                          </g>
                        </svg>
                      </div>
                      <span className="text-[10px] bg-white/20 backdrop-blur-md text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/20 shrink-0">Full-Stack Platform</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                
                {/* Row 1 */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">Telephony & Number Provisioning</td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-rose-500 mr-1.5 font-bold">✕</span> You configure SIP & Twilio
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-slate-400 mr-1.5 font-bold">—</span> Not supported (Text only)
                  </td>
                  <td className="py-4 px-6 bg-orange-50/50 font-bold text-xs text-slate-900">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-extrabold">✓</span>
                      <span>Platform Handles Everything</span>
                    </div>
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">Call Logic & Prompt Architecture</td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-rose-500 mr-1.5 font-bold">✕</span> You write code & prompts
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-slate-400 mr-1.5 font-bold">—</span> Basic chat tree templates
                  </td>
                  <td className="py-4 px-6 bg-orange-50/50 font-bold text-xs text-slate-900">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-extrabold">✓</span>
                      <span>Configure & Manage via Dashboard</span>
                    </div>
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">Engineering Overhead Needed</td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-rose-500 mr-1.5 font-bold">✕</span> Requires dedicated devs
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-slate-400 mr-1.5 font-bold">—</span> Low, but limited scope
                  </td>
                  <td className="py-4 px-6 bg-orange-50/50 font-bold text-xs text-slate-900">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-extrabold">✓</span>
                      <span>Zero Engineers Needed</span>
                    </div>
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">Real-Time Phone Audio Quality</td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-amber-500 mr-1.5 font-bold">~</span> Varies by your config
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-slate-400 mr-1.5 font-bold">—</span> N/A
                  </td>
                  <td className="py-4 px-6 bg-orange-50/50 font-bold text-xs text-slate-900">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-extrabold">✓</span>
                      <span>Sub-120ms Tuned Natural Voice</span>
                    </div>
                  </td>
                </tr>

                {/* Row 5 */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">CRM & Calendar Integration</td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-rose-500 mr-1.5 font-bold">✕</span> You build custom webhooks
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-slate-400 mr-1.5 font-bold">—</span> Basic Zapier triggers
                  </td>
                  <td className="py-4 px-6 bg-orange-50/50 font-bold text-xs text-slate-900">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-extrabold">✓</span>
                      <span>2-Way Native & Custom Sync</span>
                    </div>
                  </td>
                </tr>

                {/* Row 6 */}
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-900">Ongoing Voice Operations & SLA</td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-rose-500 mr-1.5 font-bold">✕</span> Your internal team
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    <span className="text-slate-400 mr-1.5 font-bold">—</span> Self-serve dashboard
                  </td>
                  <td className="py-4 px-6 bg-orange-50/50 font-bold text-xs text-slate-900">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-extrabold">✓</span>
                      <span>Talkar Continuous Optimization</span>
                    </div>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
};
