Build a landing page for Nova, an AI voice / phone system platform. Follow every spec below exactly. Do not add sections, features, or explanations beyond what is listed. Output should be production-ready code (Next.js + Tailwind CSS + shadcn/ui + tailwindcss-animate), not a mockup or placeholder.

PRODUCT Name: Nova Category: AI phone system platform (agents, models, phone numbers, dashboard, CRM, pricing — all in one) Positioning line: Launch your AI phone system in days — with agents, models, numbers, dashboard, and pricing all in one place. Audience: Broad-market businesses exploring AI calling, phone automation, booking, and lead handling. Not industry-specific. Primary goal: Convert visitors into demo bookings and signups.

TONE & COPY RULES Confident, simple, modern, sales-focused. Lead every section with outcome, not technology. No buzzwords. No "we do everything." No feature dumps. One primary CTA per section, repeated consistently (e.g. "Book a demo" or "Get started"). Copy should read like a serious, production-grade product — not a demo toy.

PAGE STRUCTURE (build in this exact order)

Hero

One headline (outcome-first, using or adapting the positioning line above)

One subheadline (one sentence, plain language)

One primary CTA button

One large hero image (real photo, not a product/dashboard screenshot — see IMAGERY below)

Use-case cards

Five cards: Hotel, Sales, Medical, Legal, Home services

Each card: large real photo representing the use case, one short line of value copy, click-through to demo/signup flow

Grid layout, equal-weight cards, no card longer than the others

Model plans

Three tiers: Cheap, Mid, Premium

Simple comparison layout (table or three-column cards)

Minimal copy per tier — name, one-line description, key spec or two

Pricing

Clear, self-explanatory pricing (numbers or tiers matching the model plans)

One repeated CTA button per pricing option

Layout must make self-selection obvious at a glance — no ambiguity

DESIGN SYSTEM

Theme

Locked dark mode by default (no light mode toggle needed unless specified)

Aesthetic: sleek, high-performance, developer-grade — inspired by Vercel, Linear, shadcn/ui

Minimal, sharp, premium. Spacious layout. No clutter, no visual noise.

Typography

Primary font: Geist Sans (--font-geist-sans) — all UI text, headings, buttons

Monospace font: Geist Mono (--font-geist-mono) — code, schemas, variables, API-style text only

Apply antialiased globally for sharp font rendering

Color palette (OKLCH)

Background: oklch(0.14 0.003 260) — deep, cool near-black slate

Cards / popovers: oklch(0.17 0.004 260) — slightly elevated dark slate

Primary text: oklch(0.96 0.001 240) — high-contrast off-white

Muted / sub-text: oklch(0.46 0.004 240) — soft neutral gray

Borders / inputs: oklch(0.90 0.004 240) applied at low opacity on dark backgrounds — thin structural lines

Accent (primary CTA / brand color): oklch(0.56 0.236 15) — electric ruby crimson

UI/component rules

Framework: Next.js + Tailwind CSS + shadcn/ui + tailwindcss-animate

Border radius: --radius: 0.6rem (~10px) on cards, buttons, dialogs, inputs

Shadows: subtle only, 1px borders, low-opacity shadow (rgba(0,0,0,0.05)–0.08) for depth

Borders: thin, clean, consistent across components

Spacing: generous whitespace, organized grid, premium feel

No decorative clutter, no unnecessary animation, no gradient overload

UNIQUENESS TO REINFORCE THROUGHOUT COPY

All-in-one: number + agent + dashboard + CRM + deployment

Fast launch

Production-ready, not a builder toy

Works across multiple use cases

Understandable in one page, one pass

BUILD OUTPUT Generate the full homepage (hero → use-case cards → model plans → pricing) as working code matching every spec above. Keep messaging flexible enough to generalize across use cases. The homepage is the primary conversion asset — treat it as such.