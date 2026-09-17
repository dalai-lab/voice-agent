import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import AppLayout from "@/components/layout/AppLayout";
import PostHogIdentify from "@/components/PostHogIdentify";
import { SentryErrorBoundary } from "@/components/SentryErrorBoundary";
import SpinLoader from "@/components/SpinLoader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { AppConfigProvider } from "@/context/AppConfigContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { OrgConfigProvider } from "@/context/OrgConfigContext";
import { TelephonyConfigWarningsProvider } from "@/context/TelephonyConfigWarningsContext";
import { AuthProvider } from "@/lib/auth";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://talkar.in"),
  title: {
    default: "Talkar — 24/7 AI Voice Agents & Phone Operations",
    template: "%s | Talkar",
  },
  description:
    "Talkar builds, configures, and manages your 24/7 conversational AI voice agents. Automate inbound customer support, lead qualification, and appointment booking with human-like AI phone calls.",
  keywords: [
    "Talkar",
    "Voice AI",
    "AI Voice Agents",
    "AI Phone Agent",
    "AI Calling",
    "Conversational AI",
    "Automated Phone Calls",
    "AI Receptionist",
    "Inbound Call Automation",
    "Outbound Lead Qualification",
    "Talkar Voice AI",
  ],
  authors: [{ name: "Talkar", url: "https://talkar.in" }],
  creator: "4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED",
  publisher: "Talkar",
  alternates: {
    canonical: "https://talkar.in",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://talkar.in",
    siteName: "Talkar Voice AI",
    title: "Talkar — 24/7 AI Voice Agents & Phone Operations",
    description:
      "Talkar builds, configures, and manages your 24/7 conversational AI voice agents. Automate inbound customer support, lead qualification, and appointment booking with human-like AI phone calls.",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Talkar Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Talkar — 24/7 AI Voice Agents & Phone Operations",
    description:
      "Talkar builds, configures, and manages your 24/7 conversational AI voice agents.",
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Schema.org JSON-LD for Google Search & Knowledge Graph */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Talkar",
              alternateName: ["Talkar Voice AI", "Talkar.in"],
              url: "https://talkar.in",
              logo: "https://talkar.in/icon-512.png",
              image: "https://talkar.in/icon-512.png",
              description:
                "Talkar builds, configures, and manages 24/7 conversational AI voice agents for inbound support, appointment booking, and lead qualification.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Cloud",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "INR",
              },
              creator: {
                "@type": "Organization",
                name: "4THORBIT BUSINESS SOLUTIONS PRIVATE LIMITED",
                url: "https://talkar.in",
              },
            }),
          }}
        />
        {/* Inline script to prevent theme flash - runs before React hydrates.
            Light is the default theme: only an explicit stored 'dark' opts in. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SentryErrorBoundary>
            <AuthProvider>
              <AppConfigProvider>
                <Suspense fallback={<SpinLoader />}>
                  <OrgConfigProvider>
                    <TelephonyConfigWarningsProvider>
                      <OnboardingProvider>
                        <PostHogIdentify />
                        <AppLayout>
                          {children}
                        </AppLayout>
                        <Toaster />

                      </OnboardingProvider>
                    </TelephonyConfigWarningsProvider>
                  </OrgConfigProvider>
                </Suspense>
              </AppConfigProvider>
            </AuthProvider>
          </SentryErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
