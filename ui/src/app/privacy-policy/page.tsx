import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Talkar',
  description:
    'Privacy Policy for Talkar — a voice AI platform operated by 4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED.',
};

const LAST_UPDATED = 'September 17, 2025';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#090A0F] text-white font-sans">
      {/* Top Nav */}
      <nav className="border-b border-white/10 px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <svg version="1.1" viewBox="0 0 300 97.83" className="h-7 w-auto" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="talkar-k-pp" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF5500" />
                <stop offset="100%" stopColor="#E11D48" />
              </linearGradient>
            </defs>
            <g fill="none" fillRule="nonzero">
              <path d="M14.08,14.99h14v16.6h17.52c-0.05,4.22 0,8.53 0,12.75h-17.52v10.34c0,2.34-0.08,4.69 0.07,7.03 0.62,9.51 10.2,9.29 17.24,9.29h4.98l-0.38,12.26c-2.84,0.07-5.69,0.1-8.54,0.1-12.14-0.12-23.86-2.47-26.69-16.18-0.8-3.89-0.7-7.46-0.69-11.39v-9.58z" fill="#fcfbf7"/>
              <path d="M74.54,30.82c6.4-0.64 12.6,1.79 16.87,6.55v-5.74h13.59v50.96h-13.63v-5.17c-0.86,0.84-1.49,1.37-2.43,2.13-7.98,6.05-20.7,4.8-28.13-1.6-16.95-14.61-10.08-45.18 13.72-47.12z" fill="#fcfbf7"/>
              <path d="M77.07,43.55c7.58-0.76 14.33,4.78 15.06,12.36 0.74,7.58-4.82,14.31-12.4,15.03-7.55,0.71-14.26-4.82-14.99-12.37-0.73-7.55 4.78-14.27 12.33-15.02z" fill="#121316"/>
              <path d="M115.03,14.63h13.59v67.96h-13.59z" fill="#fcfbf7"/>
              <path d="M133.15,14.92h84.4l-3.66,10.74h-34.26v10.02c6.96-5.5 17.95-3.32 23.08,3.56 7.89,10.59 4.3,24.58-5.5,32.4 4.14,5.82 8.54,11.53 12.67,17.34h-14.65l-11.19-15.45c-1.04-1.45-2.07-2.91-3.07-4.39 6.2-3.77 13.06-8.27 13.44-16.34 0.47-10-12.63-11.39-14.55-2.11-0.56,2.68-0.24,7.79-0.24,10.72v21.11h-12.53c-0.06-4.33 0.03-8.66 0.03-12.99-2.95,2.5-5.68,4.01-9.57,4.52-5.1,0.69-10.27-0.7-14.33-3.86-9.46-7.31-10.16-21.34-3.12-30.54 6.38-8.33 18.46-10.99 27-4.3-0.11-3.15 0-6.55-0.03-9.75h-33.86z" fill="url(#talkar-k-pp)"/>
              <path d="M156.81,43.38c4.1-0.59 7.46,1.4 10.23,4.2 0.62,6.67-1.95,12.94-8.97,14.62-13.19,1.52-13.72-16.59-1.26-18.82z" fill="#121316"/>
              <path d="M233.12,30.81c0.54-0.09 2.43-0.06 3.02-0.02 5.82,0.4 10.2,2.32 14.06,6.65v-5.82h13.49v50.95h-13.5v-5.3c-0.92,0.92-1.52,1.44-2.54,2.25-8.27,5.74-20.21,5.06-27.89-1.41-17.16-14.44-10.55-45.17 13.35-47.3z" fill="#fcfbf7"/>
              <path d="M235.66,43.54c7.6-0.81 14.41,4.73 15.16,12.34 0.75,7.61-4.83,14.37-12.44,15.07-7.54,0.69-14.22-4.82-14.97-12.35-0.75-7.53 4.72-14.25 12.25-15.05z" fill="#121316"/>
              <path d="M286.19,30.96c1.17-0.18 7-0.05 8.55-0.03l-0.03,12.53c-1.29-0.04-2.58-0.08-3.87-0.1-6.43-0.05-7.18,2.95-7.15,8.77 0.01,2.54 0.01,5.2 0.01,7.75v22.7h-13.43v-24.21c0-6.47-0.83-14.03 2.52-19.79 2.94-5.05 7.83-7.16 13.38-7.62z" fill="#fcfbf7"/>
            </g>
          </svg>
        </Link>
        <Link href="/terms-of-service" className="text-xs text-gray-400 hover:text-white transition-colors">
          Terms of Service →
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
          <h1 className="text-4xl font-bold tracking-tight text-white">Privacy Policy</h1>
          <p className="text-gray-400 text-sm">Last updated: {LAST_UPDATED}</p>
          <p className="text-gray-300 leading-relaxed text-sm">
            This Privacy Policy describes how <strong className="text-white">4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED</strong>{' '}
            (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), operating the brand <strong className="text-white">Talkar</strong>, collects,
            uses, stores, and shares information when you use our platform, services, and website (collectively, &quot;Services&quot;).
          </p>
        </div>

        <Divider />

        {/* Company Info */}
        <Section title="1. Company Information">
          <p>
            <strong className="text-white">4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED</strong><br />
            CIN: U74999JH2022PTC018848<br />
            Registered Office: C/O - Bundeshwari Devi, PN Bose Compound, Lalpur, Ranchi, Jharkhand — 834001, India<br />
            Brand: Talkar (<a href="https://talkar.in" className="text-orange-400 hover:text-orange-300 underline">talkar.in</a>)
          </p>
          <p className="mt-3">
            For any privacy-related concerns, please contact us at:{' '}
            <a href="mailto:privacy@talkar.in" className="text-orange-400 hover:text-orange-300 underline">privacy@talkar.in</a>
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <SubSection title="2.1 Information You Provide">
            <ul>
              <li><strong className="text-gray-200">Account Data:</strong> Name, email address, phone number, organisation name, and password when you register.</li>
              <li><strong className="text-gray-200">Business Information:</strong> Industry, use-case description, and workflow configuration details you enter while setting up voice agents.</li>
              <li><strong className="text-gray-200">Payment Information:</strong> Billing address and transaction details (card numbers are handled by our payment processor and are never stored on our servers).</li>
              <li><strong className="text-gray-200">Support Communications:</strong> Messages, emails, or other content you send to our support team.</li>
            </ul>
          </SubSection>
          <SubSection title="2.2 Information Collected Automatically">
            <ul>
              <li><strong className="text-gray-200">Usage Data:</strong> Pages visited, features used, API call logs, and time spent on the platform.</li>
              <li><strong className="text-gray-200">Device & Technical Data:</strong> IP address, browser type, operating system, and device identifiers.</li>
              <li><strong className="text-gray-200">Cookies & Tracking:</strong> Session cookies for authentication and analytics cookies (see Section 8).</li>
            </ul>
          </SubSection>
          <SubSection title="2.3 Voice & Call Data">
            <ul>
              <li><strong className="text-gray-200">Call Recordings:</strong> Audio recordings of AI-managed calls, retained for quality assurance and regulatory compliance, unless disabled by the customer.</li>
              <li><strong className="text-gray-200">Transcripts:</strong> Text transcriptions of calls generated by our AI engine.</li>
              <li><strong className="text-gray-200">Contact Lists:</strong> Phone numbers and associated metadata uploaded by you (CSV files, CRM integrations) for outbound campaigns.</li>
            </ul>
          </SubSection>
          <SubSection title="2.4 Third-Party Data">
            <p>When you connect third-party services (CRMs, calendars, telephony providers), we may receive information from those services as authorised by you.</p>
          </SubSection>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul>
            <li>To provide, operate, and improve the Talkar platform and its features.</li>
            <li>To process payments and manage your subscription.</li>
            <li>To send transactional emails, service alerts, and support responses.</li>
            <li>To detect fraud, abuse, and ensure platform security.</li>
            <li>To comply with applicable Indian laws including the Information Technology Act, 2000, Digital Personal Data Protection Act, 2023 (DPDP Act), and TRAI regulations.</li>
            <li>To send marketing communications (only with your consent, and you may opt out at any time).</li>
            <li>To analyse usage patterns and improve our AI models and service quality.</li>
          </ul>
        </Section>

        <Section title="4. Legal Basis for Processing">
          <p>We process your personal data under the following legal grounds:</p>
          <ul>
            <li><strong className="text-gray-200">Contractual Necessity:</strong> To perform our obligations under the Terms of Service you&apos;ve agreed to.</li>
            <li><strong className="text-gray-200">Legitimate Interests:</strong> To improve our services, prevent fraud, and ensure security.</li>
            <li><strong className="text-gray-200">Consent:</strong> For marketing communications and non-essential cookies.</li>
            <li><strong className="text-gray-200">Legal Obligation:</strong> Where required by applicable Indian law or regulatory authority.</li>
          </ul>
        </Section>

        <Section title="5. Data Sharing & Disclosure">
          <p>We do <strong className="text-white">not sell</strong> your personal data. We may share your data with:</p>
          <ul>
            <li><strong className="text-gray-200">Service Providers:</strong> Cloud hosting (AWS/GCP), telephony providers (Exotel, Twilio, etc.), payment processors, analytics platforms — all under data processing agreements.</li>
            <li><strong className="text-gray-200">AI / LLM Providers:</strong> OpenAI, Google, and other AI API providers that process call data to generate responses. Their privacy policies govern their handling of data.</li>
            <li><strong className="text-gray-200">Legal Authorities:</strong> When required by law, court order, or government authority in India or applicable jurisdiction.</li>
            <li><strong className="text-gray-200">Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred with appropriate notice.</li>
          </ul>
        </Section>

        <Section title="6. Data Retention">
          <ul>
            <li><strong className="text-gray-200">Account Data:</strong> Retained for the duration of your account and up to 90 days after deletion.</li>
            <li><strong className="text-gray-200">Call Recordings & Transcripts:</strong> Retained for up to 180 days by default. Enterprise customers may configure custom retention windows.</li>
            <li><strong className="text-gray-200">Payment Records:</strong> Retained for 7 years as required under Indian financial regulations.</li>
            <li><strong className="text-gray-200">Logs:</strong> Server and access logs retained for 90 days for security and debugging purposes.</li>
          </ul>
        </Section>

        <Section title="7. Your Rights">
          <p>Under the DPDP Act, 2023 and other applicable laws, you have the right to:</p>
          <ul>
            <li><strong className="text-gray-200">Access:</strong> Request a copy of personal data we hold about you.</li>
            <li><strong className="text-gray-200">Correction:</strong> Ask us to correct inaccurate or incomplete data.</li>
            <li><strong className="text-gray-200">Erasure:</strong> Request deletion of your personal data (subject to legal obligations).</li>
            <li><strong className="text-gray-200">Withdraw Consent:</strong> Where processing is based on consent, withdraw it at any time.</li>
            <li><strong className="text-gray-200">Grievance Redressal:</strong> Raise a complaint with us or with the Data Protection Board of India.</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, email us at{' '}
            <a href="mailto:privacy@talkar.in" className="text-orange-400 hover:text-orange-300 underline">privacy@talkar.in</a>{' '}
            with subject line &quot;Privacy Rights Request&quot;. We will respond within 30 days.
          </p>
        </Section>

        <Section title="8. Cookies">
          <p>We use the following types of cookies:</p>
          <ul>
            <li><strong className="text-gray-200">Strictly Necessary:</strong> Authentication sessions and security tokens. These cannot be disabled.</li>
            <li><strong className="text-gray-200">Analytics:</strong> PostHog and similar tools to understand how the platform is used. You may opt out.</li>
            <li><strong className="text-gray-200">Preferences:</strong> To remember your settings (e.g., theme, language).</li>
          </ul>
          <p className="mt-3">You can manage cookie preferences through your browser settings.</p>
        </Section>

        <Section title="9. Data Security">
          <p>
            We implement industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest,
            role-based access control, and regular security audits. However, no system is completely secure and we cannot
            guarantee absolute security.
          </p>
          <p className="mt-3">
            In the event of a data breach affecting your rights, we will notify you as required under applicable law.
          </p>
        </Section>

        <Section title="10. Cross-Border Data Transfers">
          <p>
            Your data may be processed in countries outside India (e.g., US-based AI providers). We ensure appropriate
            safeguards are in place for such transfers as required by applicable Indian data protection law.
          </p>
        </Section>

        <Section title="11. Children's Privacy">
          <p>
            Talkar&apos;s services are not directed at individuals under the age of 18. We do not knowingly collect personal
            data from minors. If you believe a minor&apos;s data has been submitted, contact us immediately at{' '}
            <a href="mailto:privacy@talkar.in" className="text-orange-400 hover:text-orange-300 underline">privacy@talkar.in</a>.
          </p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a
            prominent notice on our platform at least 15 days before the changes take effect. Continued use of the Services
            after the effective date constitutes acceptance of the revised policy.
          </p>
        </Section>

        <Section title="13. Grievance Officer">
          <p>
            As required under the Information Technology Act, 2000 and the DPDP Act, 2023, our Grievance Officer is:
          </p>
          <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-xl text-sm space-y-1">
            <p className="text-white font-semibold">Grievance Officer — Talkar</p>
            <p className="text-gray-300">4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED</p>
            <p className="text-gray-300">C/O - Bundeshwari Devi, PN Bose Compound, Lalpur, Ranchi, Jharkhand — 834001</p>
            <p className="text-gray-300">Email: <a href="mailto:grievance@talkar.in" className="text-orange-400 hover:text-orange-300 underline">grievance@talkar.in</a></p>
            <p className="text-gray-400 text-xs mt-2">Complaints are addressed within 30 days of receipt.</p>
          </div>
        </Section>

        <Section title="14. Contact Us">
          <p>
            For any questions about this Privacy Policy, please contact us at:
          </p>
          <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-xl text-sm space-y-1">
            <p className="text-white font-semibold">Talkar — Privacy Team</p>
            <p className="text-gray-300">Email: <a href="mailto:privacy@talkar.in" className="text-orange-400 hover:text-orange-300 underline">privacy@talkar.in</a></p>
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

// ─── Small reusable components ───────────────────────────────────────────────

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
