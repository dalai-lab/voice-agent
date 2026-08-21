import React, { useState } from 'react';

export const FaqSection: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What can Talkar handle?',
      a: 'Talkar handles 24/7 inbound phone qualification, appointment bookings, emergency dispatches, customer inquiries, and automatic CRM activity logging.',
    },
    {
      q: 'Does the AI voice agent sound human?',
      a: 'Yes. Talkar uses sub-120ms neural voice synthesis tuned for natural cadence, empathy, business tone, and zero awkward pauses.',
    },
    {
      q: 'How long does deployment take?',
      a: 'You can be live in under 24 hours after activation. Talkar handles number provisioning, call flow logic, and system integration for you.',
    },
    {
      q: 'Does Talkar integrate with our existing tools?',
      a: 'Talkar syncs natively with Google Calendar, Salesforce, HubSpot, Slack, Zapier, Stripe, and custom REST API webhooks.',
    },
    {
      q: 'Is Talkar secure and enterprise-ready?',
      a: 'Yes. Talkar features carrier-grade infrastructure with SOC-2 aligned architecture, healthcare compatible workflows, and end-to-end encrypted audio streams.',
    },
  ];

  return (
    <section className="py-24 bg-[#FFFFFF] text-slate-900 border-t border-slate-200 font-sans" id="faq">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-orange-600"></span>
            12 • Frequently Asked Questions
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Everything You Need To Know
          </h2>
        </div>

        <div className="divide-y divide-slate-200">
          {faqs.map((item, idx) => (
            <div key={idx} className="py-6">
              <button
                className="flex w-full items-center justify-between text-left focus:outline-none group cursor-pointer"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <span className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                  {item.q}
                </span>
                <span className="ml-6 flex items-center justify-center text-slate-400">
                  <svg
                    className={`w-5 h-5 transition-transform duration-200 ${openFaq === idx ? 'rotate-45 text-orange-600' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </span>
              </button>
              {openFaq === idx && (
                <div className="mt-4 pr-12">
                  <p className="text-base text-slate-600 leading-relaxed font-light">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
