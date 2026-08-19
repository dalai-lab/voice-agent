import React, { useState } from 'react';
import { Zap } from 'lucide-react';

interface Integration {
  name: string;
  category: string;
  description: string;
  status: string;
  logoUrl: string;
  iconImg?: string;
  bgColor?: string;
  logoPng?: string;
}

const integrations: Integration[] = [
  {
    name: 'Google Calendar',
    category: 'Calendar & Scheduling',
    description: 'Instant 2-way availability check and automatic meeting booking into AE calendars.',
    status: 'Native Sync',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg',
    logoPng: 'https://lh3.googleusercontent.com/--OpSHoGFfJc/AAAAAAAAAAI/AAAAAAAAAAA/uhIFp8cex7k/s32-c/photo.jpg',
    bgColor: '#fff',
    iconImg: 'https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png'
  },
  {
    name: 'Salesforce',
    category: 'Sales & CRM',
    description: 'Automated contact creation, call transcript logging, and deal stage updates.',
    status: '2-Way Sync',
    logoUrl: 'https://s2.googleusercontent.com/s2/favicons?domain=salesforce.com&sz=128',
    bgColor: '#00A1E0',
    iconImg: 'https://s2.googleusercontent.com/s2/favicons?domain=salesforce.com&sz=128'
  },
  {
    name: 'HubSpot',
    category: 'Sales & Marketing',
    description: 'Real-time lead scoring, instant activity logging, and automatic email dispatches.',
    status: 'Native Sync',
    logoUrl: 'https://s2.googleusercontent.com/s2/favicons?domain=hubspot.com&sz=128',
    bgColor: '#FF7A59',
    iconImg: 'https://s2.googleusercontent.com/s2/favicons?domain=hubspot.com&sz=128'
  },
  {
    name: 'Slack',
    category: 'Team Communications',
    description: 'Instant notifications in #inbound-leads with high-priority call summaries.',
    status: 'Instant Alert',
    logoUrl: 'https://s2.googleusercontent.com/s2/favicons?domain=slack.com&sz=128',
    bgColor: '#4A154B',
    iconImg: 'https://s2.googleusercontent.com/s2/favicons?domain=slack.com&sz=128'
  },
  {
    name: 'Zapier',
    category: 'Workflow Automation',
    description: 'Connect Talkar Voice AI to over 5,000+ business applications in seconds.',
    status: '5000+ Apps',
    logoUrl: 'https://s2.googleusercontent.com/s2/favicons?domain=zapier.com&sz=128',
    bgColor: '#FF4A00',
    iconImg: 'https://s2.googleusercontent.com/s2/favicons?domain=zapier.com&sz=128'
  },
  {
    name: 'Twilio',
    category: 'Telephony & Trunking',
    description: 'Managed business phone lines, global carrier routing, and crystal-clear voice infrastructure.',
    status: 'Managed Carrier',
    logoUrl: 'https://s2.googleusercontent.com/s2/favicons?domain=twilio.com&sz=128',
    bgColor: '#F22F46',
    iconImg: 'https://s2.googleusercontent.com/s2/favicons?domain=twilio.com&sz=128'
  },
  {
    name: 'Stripe',
    category: 'Billing & Checkout',
    description: 'Send instant SMS checkout links & process deposits securely during live calls.',
    status: 'Secure PCI',
    logoUrl: 'https://s2.googleusercontent.com/s2/favicons?domain=stripe.com&sz=128',
    bgColor: '#635BFF',
    iconImg: 'https://s2.googleusercontent.com/s2/favicons?domain=stripe.com&sz=128'
  },
  {
    name: 'Webhooks & API',
    category: 'Developer Platform',
    description: 'Dispatch real-time JSON webhooks and REST API events to any internal database.',
    status: 'REST API',
    logoUrl: 'https://s2.googleusercontent.com/s2/favicons?domain=hookdeck.com&sz=128',
    bgColor: '#1c1c2e',
    iconImg: 'https://s2.googleusercontent.com/s2/favicons?domain=hookdeck.com&sz=128'
  }
];

export const IntegrationsSection: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const activeItem = integrations[selectedIndex];

  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-16 bg-[#090A0F] text-white border-t border-white/10 overflow-hidden font-sans" id="integrations">
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[500px]">
          
          {/* Left Column: Heading Copy & Fixed-Height Active Integration Inspector */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-orange-400">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              09 • Ecosystem Integrations
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-white">
              Works With the Tools <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400">
                You Already Use.
              </span>
            </h2>

            <p className="text-base md:text-lg text-gray-300 leading-relaxed font-light">
              Connect Talkar Voice AI directly to your existing CRM, scheduling calendar, messaging channels, and custom webhooks.
            </p>

            {/* STRICT FIXED HEIGHT Active Selected Integration Detail Inspector Card */}
            <div className="bg-[#161522] border border-white/10 p-6 rounded-2xl shadow-xl h-[170px] flex flex-col justify-between transition-colors duration-300 hover:border-orange-500/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 p-2.5 flex items-center justify-center shrink-0 shadow-md">
                    <img 
                      src={activeItem.iconImg || activeItem.logoUrl} 
                      alt={activeItem.name} 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://s2.googleusercontent.com/s2/favicons?domain=google.com&sz=128';
                      }}
                      className="w-full h-full object-contain rounded" 
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-snug">{activeItem.name}</h3>
                    <div className="text-xs text-orange-400 font-medium">{activeItem.category}</div>
                  </div>
                </div>

                <span className="text-xs font-semibold text-orange-300 px-3 py-1 bg-orange-500/10 rounded-md border border-orange-500/20 shrink-0">
                  {activeItem.status}
                </span>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed font-light pt-3 border-t border-white/10 h-[52px] flex items-center overflow-hidden">
                {activeItem.description}
              </p>
            </div>
          </div>

          {/* Right Column: Orbit Hub */}
          <div className="lg:col-span-7 flex items-center justify-center">
            <div className="relative w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] flex items-center justify-center">
              
              {/* Concentric Orbit Circles */}
              <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none"></div>
              <div className="absolute inset-12 rounded-full border border-white/10 border-dashed pointer-events-none opacity-60"></div>
              <div className="absolute inset-24 rounded-full border border-orange-500/20 pointer-events-none"></div>

              {/* SVG Connecting Ray Beams */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {integrations.map((_, idx) => {
                  const total = integrations.length;
                  const angle = (idx * 2 * Math.PI) / total - Math.PI / 2;
                  const radius = 160;
                  const x = 230 + Math.cos(angle) * radius;
                  const y = 230 + Math.sin(angle) * radius;

                  const isSelected = selectedIndex === idx;

                  return (
                    <line
                      key={idx}
                      x1="230"
                      y1="230"
                      x2={x}
                      y2={y}
                      stroke={isSelected ? '#FF5500' : 'rgba(255, 255, 255, 0.15)'}
                      strokeWidth={isSelected ? '3' : '1.5'}
                      strokeDasharray={isSelected ? 'none' : '4 4'}
                      className="transition-all duration-300"
                    />
                  );
                })}
              </svg>

              {/* Central Talkar Logo "k" Brand Emblem */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#FF5500] via-[#E11D48] to-amber-400 p-0.5 shadow-[0_0_40px_rgba(255,85,0,0.5)] z-20 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full bg-[#0D0C14] flex items-center justify-center p-2">
                  <svg viewBox="130 10 90 80" className="w-14 h-14">
                    <defs>
                      <linearGradient id="talkar-k-gradient-int" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF5500" />
                        <stop offset="100%" stopColor="#E11D48" />
                      </linearGradient>
                    </defs>
                    <path d="M133.15,14.92h84.4l-3.66,10.74h-34.26v10.02c6.96-5.5 17.95-3.32 23.08,3.56 7.89,10.59 4.3,24.58-5.5,32.4 4.14,5.82 8.54,11.53 12.67,17.34h-14.65l-11.19-15.45c-1.04-1.45-2.07-2.91-3.07-4.39 6.2-3.77 13.06-8.27 13.44-16.34 0.47-10-12.63-11.39-14.55-2.11-0.56,2.68-0.24,7.79-0.24,10.72v21.11h-12.53c-0.06-4.33 0.03-8.66 0.03-12.99-2.95,2.5-5.68,4.01-9.57,4.52-5.1,0.69-10.27-0.7-14.33-3.86-9.46-7.31-10.16-21.34-3.12-30.54 6.38-8.33 18.46-10.99 27-4.3-0.11-3.15 0-6.55-0.03-9.75h-33.86z" fill="url(#talkar-k-gradient-int)"/>
                    <path d="M156.81,43.38c4.1-0.59 7.46,1.4 10.23,4.2 0.62,6.67-1.95,12.94-8.97,14.62-13.19,1.52-13.72-16.59-1.26-18.82z" fill="#0D0C14"/>
                  </svg>
                </div>
              </div>

              {/* 8 Surrounding Satellite Integration Nodes */}
              {integrations.map((item, idx) => {
                const total = integrations.length;
                const angle = (idx * 2 * Math.PI) / total - Math.PI / 2;
                const radius = 160;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                const isSelected = selectedIndex === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      transform: `translate(${x}px, ${y}px)`
                    }}
                    className={`absolute w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#161522] border p-2.5 flex items-center justify-center cursor-pointer shadow-xl transition-transform duration-200 z-10 ${
                      isSelected
                        ? 'border-white/40 scale-125 bg-[#201F2F] shadow-2xl'
                        : 'border-white/10 hover:border-white/25 hover:scale-110'
                    }`}
                  >
                    <img 
                      src={item.iconImg || item.logoUrl} 
                      alt={item.name} 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://s2.googleusercontent.com/s2/favicons?domain=google.com&sz=128';
                      }}
                      className="w-full h-full object-contain rounded" 
                    />
                  </div>
                );
              })}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
