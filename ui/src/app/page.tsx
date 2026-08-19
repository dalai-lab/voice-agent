"use client";

import { HeroSection } from '@/components/landing-page/HeroSection';
import { ProblemSection } from '@/components/landing-page/ProblemSection';
import { WhyNowSection } from '@/components/landing-page/WhyNowSection';
import { WhyTalkarSection } from '@/components/landing-page/WhyTalkarSection';
import { InboundOutboundSection } from '@/components/landing-page/InboundOutboundSection';
import { BrainSection } from '@/components/landing-page/BrainSection';
import { HomeBaseSection } from '@/components/landing-page/HomeBaseSection';
import { NoCrmSection } from '@/components/landing-page/NoCrmSection';
import { IntegrationsSection } from '@/components/landing-page/IntegrationsSection';
import { HowItWorksSection } from '@/components/landing-page/HowItWorksSection';
import { SecuritySection } from '@/components/landing-page/SecuritySection';
import { FaqSection } from '@/components/landing-page/FaqSection';
import { FooterCtaSection } from '@/components/landing-page/FooterCtaSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500 selection:text-white">
      <HeroSection />
      <ProblemSection />
      <WhyNowSection />
      <WhyTalkarSection />
      <InboundOutboundSection />
      <BrainSection />
      <HomeBaseSection />
      <NoCrmSection />
      <IntegrationsSection />
      <HowItWorksSection />
      <SecuritySection />
      <FaqSection />
      <FooterCtaSection />
    </div>
  );
}
