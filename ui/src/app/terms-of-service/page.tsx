import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Talkar',
  description:
    'Terms of Service for Talkar — a voice AI platform operated by 4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED.',
};

const LAST_UPDATED = 'September 17, 2025';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#090A0F] text-white font-sans">
      {/* Top Nav */}
      <nav className="border-b border-white/10 px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <svg version="1.1" viewBox="0 0 300 97.83" className="h-7 w-auto" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="talkar-k-tos" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF5500" />
                <stop offset="100%" stopColor="#E11D48" />
              </linearGradient>
            </defs>
            <g fill="none" fillRule="nonzero">
              <path d="M14.08,14.99h14v16.6h17.52c-0.05,4.22 0,8.53 0,12.75h-17.52v10.34c0,2.34-0.08,4.69 0.07,7.03 0.62,9.51 10.2,9.29 17.24,9.29h4.98l-0.38,12.26c-2.84,0.07-5.69,0.1-8.54,0.1-12.14-0.12-23.86-2.47-26.69-16.18-0.8-3.89-0.7-7.46-0.69-11.39v-9.58z" fill="#fcfbf7"/>
              <path d="M74.54,30.82c6.4-0.64 12.6,1.79 16.87,6.55v-5.74h13.59v50.96h-13.63v-5.17c-0.86,0.84-1.49,1.37-2.43,2.13-7.98,6.05-20.7,4.8-28.13-1.6-16.95-14.61-10.08-45.18 13.72-47.12z" fill="#fcfbf7"/>
              <path d="M77.07,43.55c7.58-0.76 14.33,4.78 15.06,12.36 0.74,7.58-4.82,14.31-12.4,15.03-7.55,0.71-14.26-4.82-14.99-12.37-0.73-7.55 4.78-14.27 12.33-15.02z" fill="#121316"/>
              <path d="M115.03,14.63h13.59v67.96h-13.59z" fill="#fcfbf7"/>
              <path d="M133.15,14.92h84.4l-3.66,10.74h-34.26v10.02c6.96-5.5 17.95-3.32 23.08,3.56 7.89,10.59 4.3,24.58-5.5,32.4 4.14,5.82 8.54,11.53 12.67,17.34h-14.65l-11.19-15.45c-1.04-1.45-2.07-2.91-3.07-4.39 6.2-3.77 13.06-8.27 13.44-16.34 0.47-10-12.63-11.39-14.55-2.11-0.56,2.68-0.24,7.79-0.24,10.72v21.11h-12.53c-0.06-4.33 0.03-8.66 0.03-12.99-2.95,2.5-5.68,4.01-9.57,4.52-5.1,0.69-10.27-0.7-14.33-3.86-9.46-7.31-10.16-21.34-3.12-30.54 6.38-8.33 18.46-10.99 27-4.3-0.11-3.15 0-6.55-0.03-9.75h-33.86z" fill="url(#talkar-k-tos)"/>
              <path d="M156.81,43.38c4.1-0.59 7.46,1.4 10.23,4.2 0.62,6.67-1.95,12.94-8.97,14.62-13.19,1.52-13.72-16.59-1.26-18.82z" fill="#121316"/>
              <path d="M233.12,30.81c0.54-0.09 2.43-0.06 3.02-0.02 5.82,0.4 10.2,2.32 14.06,6.65v-5.82h13.49v50.95h-13.5v-5.3c-0.92,0.92-1.52,1.44-2.54,2.25-8.27,5.74-20.21,5.06-27.89-1.41-17.16-14.44-10.55-45.17 13.35-47.3z" fill="#fcfbf7"/>
              <path d="M235.66,43.54c7.6-0.81 14.41,4.73 15.16,12.34 0.75,7.61-4.83,14.37-12.44,15.07-7.54,0.69-14.22-4.82-14.97-12.35-0.75-7.53 4.72-14.25 12.25-15.05z" fill="#121316"/>
              <path d="M286.19,30.96c1.17-0.18 7-0.05 8.55-0.03l-0.03,12.53c-1.29-0.04-2.58-0.08-3.87-0.1-6.43-0.05-7.18,2.95-7.15,8.77 0.01,2.54 0.01,5.2 0.01,7.75v22.7h-13.43v-24.21c0-6.47-0.83-14.03 2.52-19.79 2.94-5.05 7.83-7.16 13.38-7.62z" fill="#fcfbf7"/>
            </g>
          </svg>
        </Link>
        <Link href="/privacy-policy" className="text-xs text-gray-400 hover:text-white transition-colors">
          Privacy Policy →
        </Link>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            Legal Document
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Terms of Service</h1>
          <p className="text-gray-400 text-sm">Last updated: {LAST_UPDATED}</p>
          <p className="text-gray-300 leading-relaxed text-sm">
            Please read these Terms of Service (&quot;Terms&quot;) carefully before using the Talkar platform. By accessing or
            using our Services, you agree to be bound by these Terms. If you do not agree, please discontinue use immediately.
          </p>
        </div>

        <Divider />

        {/* Company Info */}
        <Section title="1. Parties">
          <p>
            These Terms constitute a legally binding agreement between:
          </p>
          <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-xl text-sm space-y-1">
            <p className="text-white font-semibold">Service Provider</p>
            <p className="text-gray-300"><strong className="text-white">4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED</strong></p>
            <p className="text-gray-300">CIN: U74999JH2022PTC018848</p>
            <p className="text-gray-300">Registered Office: C/O - Bundeshwari Devi, PN Bose Compound, Lalpur, Ranchi, Jharkhand — 834001, India</p>
            <p className="text-gray-300">Brand: Talkar | Website: <a href="https://talkar.in" className="text-orange-400 hover:text-orange-300 underline">talkar.in</a></p>
          </div>
          <p className="mt-3">
            — and —{' '}
            <strong className="text-white">&quot;Customer&quot;</strong>, the business or individual who signs up for and uses the Talkar platform.
          </p>
        </Section>

        <Section title="2. Description of Services">
          <p>
            Talkar is a voice AI platform that enables businesses to build, deploy, and manage AI-powered phone agents for
            inbound and outbound calling. Services include:
          </p>
          <ul>
            <li>AI voice workflow builder and configuration tools</li>
            <li>Telephony integration and management (inbound &amp; outbound calls)</li>
            <li>Bulk outbound calling campaigns</li>
            <li>Call recording, transcription, and analytics</li>
            <li>CRM and calendar integrations</li>
            <li>API access for custom integrations</li>
            <li>Human-assisted agent setup and managed services (where applicable)</li>
          </ul>
        </Section>

        <Section title="3. Account Registration & Eligibility">
          <ul>
            <li>You must be at least 18 years of age and legally capable of entering a binding contract.</li>
            <li>You must provide accurate, complete, and up-to-date information during registration.</li>
            <li>You are responsible for maintaining the confidentiality of your credentials. Notify us immediately at <a href="mailto:support@talkar.in" className="text-orange-400 hover:text-orange-300 underline">support@talkar.in</a> if you suspect unauthorised access.</li>
            <li>One account may represent one organisation. Sub-organisations may be provisioned separately with explicit approval.</li>
            <li>We reserve the right to refuse registration or suspend accounts at our discretion.</li>
          </ul>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree to use Talkar only for lawful purposes. You must <strong className="text-white">not</strong>:</p>
          <ul>
            <li>Use the platform to make calls without the prior consent of called parties where required by applicable law (including TRAI DND regulations in India).</li>
            <li>Engage in spam, robo-calling, phishing, fraud, harassment, or any deceptive practice.</li>
            <li>Impersonate any person, business, or government agency.</li>
            <li>Use the platform to conduct illegal, defamatory, or harmful activities.</li>
            <li>Attempt to reverse-engineer, decompile, or extract source code from the platform.</li>
            <li>Resell or sublicense access to Talkar without our prior written consent.</li>
            <li>Transmit malware, viruses, or any code designed to disrupt or damage systems.</li>
            <li>Circumvent usage limits, access controls, or rate limits.</li>
            <li>Upload or transmit content that is obscene, discriminatory, or violates third-party rights.</li>
          </ul>
          <p className="mt-3">
            Violation of acceptable use may result in immediate suspension or termination without refund.
          </p>
        </Section>

        <Section title="5. Pricing, Payments & Billing">
          <ul>
            <li>Talkar operates on an activation + usage-based pricing model. Current pricing is available at <a href="https://talkar.in" className="text-orange-400 hover:text-orange-300 underline">talkar.in</a>.</li>
            <li>Activation fees are due prior to agent development commencing and are <strong className="text-white">non-refundable</strong> once work has begun.</li>
            <li>Usage charges (calls, API usage, minutes) are billed monthly in arrears or deducted from a pre-loaded wallet balance.</li>
            <li>All prices are in Indian Rupees (₹) and exclusive of applicable taxes (GST) unless stated otherwise.</li>
            <li>We may change pricing with 30 days&apos; written notice to your registered email.</li>
            <li>Overdue balances may attract interest and result in service suspension.</li>
            <li>Disputes on invoices must be raised within 14 days of the invoice date.</li>
          </ul>
        </Section>

        <Section title="6. Refund Policy">
          <ul>
            <li><strong className="text-gray-200">Activation Fees:</strong> Non-refundable once agent development work has commenced.</li>
            <li><strong className="text-gray-200">Prepaid Wallet Credits:</strong> Unused credits may be refunded upon account closure, subject to a processing fee of 5% or ₹500 (whichever is higher).</li>
            <li><strong className="text-gray-200">Monthly Subscription Fees:</strong> Non-refundable for the current billing cycle.</li>
            <li>Refund requests must be submitted in writing to <a href="mailto:billing@talkar.in" className="text-orange-400 hover:text-orange-300 underline">billing@talkar.in</a>.</li>
          </ul>
        </Section>

        <Section title="7. Intellectual Property">
          <SubSection title="7.1 Our IP">
            <p>
              All software, algorithms, models, designs, trademarks, and content comprising the Talkar platform are the
              exclusive property of 4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED. No licence to our IP is granted beyond
              the limited right to use the Services as described herein.
            </p>
          </SubSection>
          <SubSection title="7.2 Your Content">
            <p>
              You retain ownership of content, data, scripts, and workflows you create or upload. By using Talkar, you
              grant us a non-exclusive, worldwide, royalty-free licence to process your content solely to provide the Services.
            </p>
          </SubSection>
          <SubSection title="7.3 Feedback">
            <p>
              Any feedback, suggestions, or ideas you provide to us may be used by us without restriction or compensation.
            </p>
          </SubSection>
        </Section>

        <Section title="8. Data Processing & Privacy">
          <p>
            Your use of Talkar is subject to our{' '}
            <Link href="/privacy-policy" className="text-orange-400 hover:text-orange-300 underline">Privacy Policy</Link>,
            which is incorporated into these Terms by reference. You acknowledge that you have read, understood, and agreed
            to the Privacy Policy.
          </p>
          <p className="mt-3">
            For calls made on behalf of your customers, you are the Data Fiduciary and Talkar acts as a Data Processor under
            the DPDP Act, 2023. You warrant that you have obtained all necessary consents from individuals whose data you
            process using our platform.
          </p>
        </Section>

        <Section title="9. Compliance with Telecom Regulations">
          <p>You are solely responsible for ensuring your use of Talkar complies with:</p>
          <ul>
            <li><strong className="text-gray-200">TRAI Regulations:</strong> Including Unsolicited Commercial Communication (UCC) rules, DND registry compliance, and telemarketing regulations.</li>
            <li><strong className="text-gray-200">DPDP Act, 2023:</strong> Obtaining proper consent for data processing and outbound communications.</li>
            <li><strong className="text-gray-200">IT Act, 2000:</strong> Prohibition on unlawful interception and recording.</li>
            <li><strong className="text-gray-200">Applicable State Laws:</strong> Any state-specific consumer protection or data laws.</li>
          </ul>
          <p className="mt-3">
            Talkar shall not be liable for regulatory fines or penalties arising from your non-compliance.
          </p>
        </Section>

        <Section title="10. Uptime & Service Levels">
          <p>
            We target 99.5% monthly uptime for the core Talkar platform. Scheduled maintenance windows will be communicated
            at least 24 hours in advance. Uptime does not include downtime caused by:
          </p>
          <ul>
            <li>Third-party telephony providers or carriers.</li>
            <li>Force majeure events (see Section 15).</li>
            <li>Your own systems or integrations.</li>
            <li>Misuse or violations of these Terms.</li>
          </ul>
          <p className="mt-3">
            Service credits (if applicable) must be requested within 7 days of the incident and will be applied as wallet
            credits, not cash refunds.
          </p>
        </Section>

        <Section title="11. Confidentiality">
          <p>
            Each party agrees to keep the other&apos;s confidential information (business data, pricing, API keys, technical
            details) strictly confidential and not to disclose it to any third party without prior written consent, except
            as required by law.
          </p>
        </Section>

        <Section title="12. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law:
          </p>
          <ul>
            <li>Talkar&apos;s total liability to you for any claim arising under these Terms shall not exceed the amounts paid by you to Talkar in the 3 months preceding the event giving rise to the claim.</li>
            <li>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits, lost data, or business interruption.</li>
            <li>We make no warranty that the platform will be error-free, uninterrupted, or that AI-generated content will be accurate.</li>
          </ul>
        </Section>

        <Section title="13. Indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless 4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED, its officers,
            directors, employees, and agents from any claim, liability, damages, or expenses arising from:
          </p>
          <ul>
            <li>Your use or misuse of the Services.</li>
            <li>Your violation of these Terms or any applicable law.</li>
            <li>Content or data you process through Talkar.</li>
            <li>Any calls made to individuals without proper consent or in violation of TRAI rules.</li>
          </ul>
        </Section>

        <Section title="14. Termination">
          <SubSection title="14.1 By You">
            <p>
              You may terminate your account at any time by providing 30 days&apos; written notice to{' '}
              <a href="mailto:support@talkar.in" className="text-orange-400 hover:text-orange-300 underline">support@talkar.in</a>.
            </p>
          </SubSection>
          <SubSection title="14.2 By Us">
            <p>
              We may suspend or terminate your account immediately for material breach of these Terms, non-payment,
              or illegal activity. We may terminate with 30 days&apos; notice for any other reason.
            </p>
          </SubSection>
          <SubSection title="14.3 Effect of Termination">
            <p>
              Upon termination: your access ceases immediately; you must pay all outstanding dues; and your data will be
              retained for 90 days before deletion, during which you may request an export.
            </p>
          </SubSection>
        </Section>

        <Section title="15. Force Majeure">
          <p>
            Neither party shall be liable for delays or failures in performance resulting from causes beyond their reasonable
            control, including natural disasters, acts of government, internet outages, pandemics, or failure of third-party
            telecommunications providers.
          </p>
        </Section>

        <Section title="16. Governing Law & Dispute Resolution">
          <p>
            These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of
            the courts in <strong className="text-white">Ranchi, Jharkhand, India</strong>.
          </p>
          <p className="mt-3">
            We encourage resolution of disputes through good-faith negotiation first. If unresolved within 30 days, disputes
            may be submitted to arbitration under the Arbitration and Conciliation Act, 1996 (India), with a sole arbitrator
            appointed by mutual agreement.
          </p>
        </Section>

        <Section title="17. Modifications to Terms">
          <p>
            We reserve the right to update these Terms at any time. We will notify you of material changes via email or
            in-platform notice at least 15 days before they take effect. Continued use of the Services after the effective
            date constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section title="18. Miscellaneous">
          <ul>
            <li><strong className="text-gray-200">Entire Agreement:</strong> These Terms, together with the Privacy Policy and any order forms, constitute the entire agreement between the parties.</li>
            <li><strong className="text-gray-200">Severability:</strong> If any provision is found invalid, the remaining provisions remain in full force.</li>
            <li><strong className="text-gray-200">No Waiver:</strong> Failure to enforce any provision does not constitute a waiver of future enforcement.</li>
            <li><strong className="text-gray-200">Assignment:</strong> You may not assign your rights under these Terms without our written consent. We may assign our rights freely.</li>
            <li><strong className="text-gray-200">Notices:</strong> All notices to us should be sent to <a href="mailto:legal@talkar.in" className="text-orange-400 hover:text-orange-300 underline">legal@talkar.in</a>.</li>
          </ul>
        </Section>

        <Section title="19. Contact Us">
          <p>For questions about these Terms, please contact:</p>
          <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-xl text-sm space-y-1">
            <p className="text-white font-semibold">Talkar — Legal Team</p>
            <p className="text-gray-300">4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED</p>
            <p className="text-gray-300">C/O - Bundeshwari Devi, PN Bose Compound, Lalpur, Ranchi, Jharkhand — 834001</p>
            <p className="text-gray-300">Email: <a href="mailto:legal@talkar.in" className="text-orange-400 hover:text-orange-300 underline">legal@talkar.in</a></p>
            <p className="text-gray-300">Website: <a href="https://talkar.in" className="text-orange-400 hover:text-orange-300 underline">talkar.in</a></p>
          </div>
        </Section>

        <Divider />

        {/* Footer note */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} 4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
            <span>·</span>
            <Link href="/terms-of-service" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
            <span>·</span>
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">Back to Talkar</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Small reusable components ────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-white/10" />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="text-sm text-gray-300 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      <div className="text-sm text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}
