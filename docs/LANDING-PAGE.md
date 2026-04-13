# LANDING-PAGE.md — Marketing Site: Complete Specification

> **Platform:** Onlyou Telehealth — Indian telehealth for stigmatized chronic conditions
> **Site Type:** Next.js 14 (App Router) — Static Site Generation (SSG) for all marketing/SEO pages
> **URL:** `onlyou.life`
> **Local Dev Port:** `3006` (`pnpm --filter landing dev`)
> **Monorepo Package:** `apps/landing/`
> **CMS:** Sanity (headless) for blog content management
> **Auth:** None — fully public site, no login required
> **API Protocol:** No tRPC — landing page makes zero API calls (all content is statically generated or CMS-driven)
> **Styling:** Tailwind CSS via shared `packages/ui` + landing-specific components
> **Target Audience:** Indian adults (18-60) experiencing hair loss, ED, PE, weight issues, or PCOS — plus healthcare SEO traffic
> **Primary Device:** Mobile-first (70%+ Indian web traffic is mobile)
> **Build Phase:** Phase 10 (Weeks 26-27) per PROJECT-OVERVIEW.md Section 11

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Site Architecture & File Layout](#2-site-architecture--file-layout)
3. [Design System & Brand Identity](#3-design-system--brand-identity)
4. [Page 1: Homepage (`/`)](#4-page-1-homepage-)
5. [Page 2: Condition Page — Hair Loss (`/hair-loss`)](#5-page-2-condition-page--hair-loss-hair-loss)
6. [Page 3: Condition Page — Erectile Dysfunction (`/erectile-dysfunction`)](#6-page-3-condition-page--erectile-dysfunction-erectile-dysfunction)
7. [Page 4: Condition Page — Premature Ejaculation (`/premature-ejaculation`)](#7-page-4-condition-page--premature-ejaculation-premature-ejaculation)
8. [Page 5: Condition Page — Weight Management (`/weight-management`)](#8-page-5-condition-page--weight-management-weight-management)
9. [Page 6: Condition Page — PCOS (`/pcos`)](#9-page-6-condition-page--pcos-pcos)
10. [Condition Page Template (Shared Structure)](#10-condition-page-template-shared-structure)
11. [Page 7: Pricing (`/pricing`)](#11-page-7-pricing-pricing)
12. [Page 8: How It Works (`/how-it-works`)](#12-page-8-how-it-works-how-it-works)
13. [Page 9: About (`/about`)](#13-page-9-about-about)
14. [Legal Pages (`/terms`, `/privacy`, `/refund`)](#14-legal-pages-terms-privacy-refund)
15. [Blog System (`/blog`)](#15-blog-system-blog)
16. [App Download & Smart Banners](#16-app-download--smart-banners)
17. [SEO Strategy & Technical SEO](#17-seo-strategy--technical-seo)
18. [Structured Data (JSON-LD)](#18-structured-data-json-ld)
19. [Responsive Design & Breakpoints](#19-responsive-design--breakpoints)
20. [Performance Targets & Optimization](#20-performance-targets--optimization)
21. [Navigation & Header/Footer](#21-navigation--headerfooter)
22. [Analytics & Tracking](#22-analytics--tracking)
23. [Accessibility & Localization](#23-accessibility--localization)
24. [Security & Privacy](#24-security--privacy)
25. [Deployment & Hosting](#25-deployment--hosting)
26. [Content Guidelines & Tone of Voice](#26-content-guidelines--tone-of-voice)
27. [Error Pages & Edge Cases](#27-error-pages--edge-cases)
28. [Testing Checklist](#28-testing-checklist)
29. [Phase 2 Features (Deferred)](#29-phase-2-features-deferred)

---

## 1. Purpose & Scope

### What This Is

The landing page at `onlyou.life` is Onlyou's public-facing marketing site. It is the only entry point for organic traffic, paid campaigns, and brand discovery. It serves three functions:

1. **Conversion** — convince visitors to download the patient app and start an assessment
2. **SEO** — rank for high-intent Indian health queries (e.g., "hair loss treatment online India", "ED treatment delivery")
3. **Trust** — establish credibility through licensed doctor credentials, transparent pricing, data encryption messaging, and professional design

### What This Is NOT

- NOT a web-based patient portal (patients use the React Native mobile app per APP-PATIENT.md)
- NOT an admin/doctor/nurse/lab/pharmacy portal (those are separate Next.js apps on subdomains per ARCHITECTURE.md Section 4)
- NOT a transactional site — no payments, no prescriptions, no consultations happen here
- NOT a Progressive Web App (PWA) — standard responsive website with SSG

### Relationship to Other Systems

| System | Relationship |
|---|---|
| Patient App (APP-PATIENT.md) | Landing page drives downloads; CTA links to App Store / Play Store |
| Doctor Portal (PORTAL-DOCTOR.md) | No direct link; doctor portal is at `doctor.onlyou.life` (not linked from public site) |
| Admin Portal (PORTAL-ADMIN.md) | No direct link; blog content managed via Sanity CMS, not admin portal |
| Nurse Portal (PORTAL-NURSE-FIXED.md) | No public relationship |
| Lab Portal (PORTAL-LAB-FIXED.md) | No public relationship |
| Pharmacy Portal (PORTAL-PHARMACY.md) | No public relationship |
| Backend API (ARCHITECTURE.md) | No API calls — landing page is entirely static or CMS-driven |
| Monorepo (ARCHITECTURE.md Section 4) | Lives at `apps/landing/` in Turborepo monorepo, shares `packages/ui` components |

### Key Reference Documents

- **PROJECT-OVERVIEW.md** — verticals, pricing, subscription model, domain strategy, timeline
- **onlyou-spec-resolved-v4.md Section 4.7** — landing page spec summary, Section 5 for final pricing
- **ARCHITECTURE.md Section 3** — tech stack decisions (Next.js, Sanity, Tailwind), Section 4 for monorepo structure
- **APP-PATIENT.md** — patient journey (linked from CTAs), deep link scheme, app store URLs

---

## 2. Site Architecture & File Layout

### File-Based Routing (Next.js App Router)

```
apps/landing/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  → Root layout (header, footer, analytics, meta)
│   │   ├── page.tsx                    → Homepage (/)
│   │   ├── not-found.tsx               → Custom 404
│   │   ├── error.tsx                   → Custom error boundary
│   │   ├── sitemap.ts                  → Dynamic sitemap generation
│   │   ├── robots.ts                   → Robots.txt generation
│   │   ├── manifest.ts                 → Web app manifest (for smart banners)
│   │   │
│   │   ├── hair-loss/
│   │   │   └── page.tsx                → Hair Loss condition page
│   │   ├── erectile-dysfunction/
│   │   │   └── page.tsx                → ED condition page
│   │   ├── premature-ejaculation/
│   │   │   └── page.tsx                → PE condition page
│   │   ├── weight-management/
│   │   │   └── page.tsx                → Weight Management condition page
│   │   ├── pcos/
│   │   │   └── page.tsx                → PCOS condition page
│   │   │
│   │   ├── pricing/
│   │   │   └── page.tsx                → All-verticals pricing comparison
│   │   ├── how-it-works/
│   │   │   └── page.tsx                → Step-by-step process explanation
│   │   ├── about/
│   │   │   └── page.tsx                → About Onlyou
│   │   │
│   │   ├── terms/
│   │   │   └── page.tsx                → Terms of Service
│   │   ├── privacy/
│   │   │   └── page.tsx                → Privacy Policy (DPDPA 2023 compliant)
│   │   ├── refund/
│   │   │   └── page.tsx                → Refund Policy
│   │   │
│   │   ├── blog/
│   │   │   ├── page.tsx                → Blog listing (paginated)
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx            → Individual blog post (SSG from Sanity)
│   │   │   └── category/
│   │   │       └── [category]/
│   │   │           └── page.tsx        → Category filter page
│   │   │
│   │   └── api/
│   │       ├── revalidate/
│   │       │   └── route.ts            → Sanity webhook → ISR revalidation
│   │       └── og/
│   │           └── route.tsx           → Dynamic OG image generation
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx              → Navigation header (sticky, transparent → solid on scroll)
│   │   │   ├── Footer.tsx              → Site-wide footer
│   │   │   ├── MobileMenu.tsx          → Hamburger slide-out menu
│   │   │   └── SmartBanner.tsx         → App download banner (iOS/Android detection)
│   │   │
│   │   ├── home/
│   │   │   ├── HeroSection.tsx         → Main hero with headline + CTA
│   │   │   ├── TrustBadges.tsx         → Licensed doctors, discreet, encrypted
│   │   │   ├── HowItWorks.tsx          → 3-step process
│   │   │   ├── ConditionCards.tsx      → 5 condition cards grid
│   │   │   ├── PricingPreview.tsx      → Pricing summary (links to /pricing)
│   │   │   ├── FAQAccordion.tsx        → Expandable FAQ section
│   │   │   └── CTABanner.tsx           → Final conversion CTA
│   │   │
│   │   ├── condition/
│   │   │   ├── ConditionHero.tsx       → Condition-specific hero
│   │   │   ├── ConditionContent.tsx    → Long-form SEO content renderer
│   │   │   ├── ConditionPricing.tsx    → Vertical-specific pricing table
│   │   │   ├── ConditionFAQ.tsx        → Condition-specific FAQ
│   │   │   └── ConditionCTA.tsx        → "Start Your [Condition] Assessment" CTA
│   │   │
│   │   ├── blog/
│   │   │   ├── BlogCard.tsx            → Blog post preview card
│   │   │   ├── BlogContent.tsx         → Sanity Portable Text renderer
│   │   │   ├── BlogSidebar.tsx         → Categories, recent posts, CTA
│   │   │   └── Pagination.tsx          → Blog pagination
│   │   │
│   │   └── shared/
│   │       ├── AppDownloadButtons.tsx  → App Store + Play Store badges
│   │       ├── PricingTable.tsx        → Reusable pricing table component
│   │       ├── TestimonialCard.tsx     → Patient testimonial (Phase 2 content)
│   │       ├── DoctorCredential.tsx    → Doctor profile badge
│   │       └── StructuredData.tsx      → JSON-LD script injector
│   │
│   ├── lib/
│   │   ├── sanity/
│   │   │   ├── client.ts              → Sanity client configuration
│   │   │   ├── queries.ts             → GROQ queries for blog posts
│   │   │   ├── schemas/               → Sanity schema definitions
│   │   │   │   ├── post.ts
│   │   │   │   ├── category.ts
│   │   │   │   ├── author.ts
│   │   │   │   └── blockContent.ts
│   │   │   └── portable-text.tsx       → Custom Portable Text components
│   │   │
│   │   ├── constants/
│   │   │   ├── pricing.ts             → All vertical pricing data (single source)
│   │   │   ├── conditions.ts          → Condition metadata (names, slugs, descriptions)
│   │   │   ├── faq.ts                 → FAQ data (homepage + per-condition)
│   │   │   └── navigation.ts          → Nav links configuration
│   │   │
│   │   ├── seo/
│   │   │   ├── metadata.ts            → Per-page metadata generators
│   │   │   ├── structured-data.ts     → JSON-LD generators (Organization, MedicalCondition, FAQ)
│   │   │   └── og-fonts.ts            → Font loading for OG image generation
│   │   │
│   │   └── utils/
│   │       ├── format-price.ts        → ₹ formatting with Indian numbering
│   │       └── device-detection.ts    → iOS/Android detection for app links
│   │
│   └── styles/
│       └── globals.css                → Tailwind base + custom brand styles
│
├── public/
│   ├── images/
│   │   ├── logo.svg                   → Onlyou logo (SVG, scalable)
│   │   ├── logo-dark.svg             → Logo variant for dark backgrounds
│   │   ├── conditions/               → Condition hero illustrations (abstract, not medical)
│   │   │   ├── hair-loss.webp
│   │   │   ├── ed.webp
│   │   │   ├── pe.webp
│   │   │   ├── weight.webp
│   │   │   └── pcos.webp
│   │   ├── how-it-works/             → Step illustrations
│   │   │   ├── step-1-questionnaire.webp
│   │   │   ├── step-2-doctor.webp
│   │   │   └── step-3-delivery.webp
│   │   ├── trust/                    → Trust badge icons
│   │   │   ├── licensed-doctors.svg
│   │   │   ├── licensed-pharmacy.svg
│   │   │   ├── discreet-delivery.svg
│   │   │   └── encrypted-data.svg
│   │   ├── app-store-badge.svg
│   │   └── play-store-badge.svg
│   │
│   ├── fonts/                         → Self-hosted brand fonts (WOFF2)
│   └── favicon.ico
│
├── sanity/
│   ├── sanity.config.ts              → Sanity Studio configuration
│   ├── sanity.cli.ts                 → Sanity CLI config
│   └── schemas/                      → Sanity document schemas
│
├── next.config.js
├── tailwind.config.ts                → Extends shared config from packages/ui
├── tsconfig.json
└── package.json
```

### Build Configuration

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // Full SSG for MVP — no server needed
  images: {
    unoptimized: true,       // Required for static export; use WebP + srcset manually
  },
  trailingSlash: true,       // /hair-loss/ not /hair-loss (better SEO consistency)
  // When blog needs ISR, switch to output: undefined (default) and deploy to Fargate or Vercel
};
```

**MVP decision:** Full static export (`output: 'export'`) deployed to S3 + CloudFront. When blog volume grows and ISR (Incremental Static Regeneration) is needed for Sanity content, switch to standard Next.js deployment on Fargate or Vercel (see Section 25).

---

## 3. Design System & Brand Identity

### Brand Positioning

Onlyou is a **wellness brand**, not a clinical brand. The visual identity should feel like a premium consumer health company — think Hims, Ro, or Noom — not a hospital portal or pharmaceutical website.

**Core brand attributes:**
- **Calm** — not clinical or anxiety-inducing
- **Discreet** — no embarrassing imagery, no graphic medical photos
- **Trustworthy** — professional, credible, doctor-backed
- **Modern** — clean, contemporary, digital-native
- **Warm** — approachable, empathetic, non-judgmental

### Color Palette

```css
/* globals.css — CSS custom properties */
:root {
  /* Primary — Calm teal/green (wellness, health, calm) */
  --color-primary-50:  #effcf6;
  --color-primary-100: #d0f7e4;
  --color-primary-200: #a4edce;
  --color-primary-300: #6addb1;
  --color-primary-400: #38c991;
  --color-primary-500: #16a974;  /* Primary brand color */
  --color-primary-600: #0b8a5e;
  --color-primary-700: #096e4d;
  --color-primary-800: #0b573e;
  --color-primary-900: #0a4834;

  /* Secondary — Soft blue (trust, calm, reliability) */
  --color-secondary-50:  #eff6ff;
  --color-secondary-100: #dbeafe;
  --color-secondary-200: #bfdbfe;
  --color-secondary-300: #93c5fd;
  --color-secondary-400: #60a5fa;
  --color-secondary-500: #3b82f6;  /* Secondary accent */

  /* Neutral — Warm grays (not cold/clinical) */
  --color-neutral-50:  #fafaf9;
  --color-neutral-100: #f5f5f4;
  --color-neutral-200: #e7e5e4;
  --color-neutral-300: #d6d3d1;
  --color-neutral-400: #a8a29e;
  --color-neutral-500: #78716c;
  --color-neutral-600: #57534e;
  --color-neutral-700: #44403c;
  --color-neutral-800: #292524;
  --color-neutral-900: #1c1917;

  /* Condition accent colors (used on condition pages only) */
  --color-hair-loss:   #8B5CF6;  /* Purple — growth, confidence */
  --color-ed:          #3B82F6;  /* Blue — masculinity, trust */
  --color-pe:          #6366F1;  /* Indigo — discretion, calm */
  --color-weight:      #10B981;  /* Emerald — health, vitality */
  --color-pcos:        #EC4899;  /* Pink — femininity, warmth */

  /* Semantic */
  --color-success:     #22C55E;
  --color-warning:     #F59E0B;
  --color-error:       #EF4444;

  /* Background */
  --color-bg-primary:    #FFFFFF;
  --color-bg-secondary:  #FAFAF9;
  --color-bg-tertiary:   #F5F5F4;
}
```

### Typography

```css
/* Self-hosted fonts (WOFF2, loaded via @font-face in globals.css) */

/* Display/Headings: DM Sans — geometric, modern, friendly, excellent Hindi character support */
--font-display: 'DM Sans', system-ui, sans-serif;

/* Body: Source Sans 3 — highly readable, clean, professional */
--font-body: 'Source Sans 3', system-ui, sans-serif;

/* Type scale */
--text-display:   clamp(2.5rem, 5vw, 4rem);    /* Hero headlines */
--text-h1:        clamp(2rem, 4vw, 3rem);       /* Page titles */
--text-h2:        clamp(1.5rem, 3vw, 2.25rem);  /* Section headings */
--text-h3:        clamp(1.25rem, 2.5vw, 1.75rem);
--text-body:      1.125rem;                       /* 18px body text — optimized for readability */
--text-body-sm:   1rem;                           /* 16px secondary text */
--text-caption:   0.875rem;                       /* 14px captions/labels */

/* Line heights */
--leading-tight:  1.2;    /* Headings */
--leading-normal: 1.6;    /* Body text */
--leading-relaxed: 1.8;   /* Long-form content (condition pages) */
```

### Image & Illustration Style

- **Abstract, warm, non-medical** — soft gradient illustrations, lifestyle photography of confident people (stock), abstract body/health shapes
- **NO clinical imagery** — no stethoscopes, no pills, no hospital beds, no medical equipment
- **NO before/after photos** — deferred to Phase 2 (requires patient consent infrastructure)
- **NO face-identifiable patient photos** — privacy-first brand; use abstract or anonymized imagery
- **WebP format** with JPEG fallback for all raster images
- **SVG** for icons, logos, trust badges
- **Max image dimensions:** Hero images 1920×1080, condition cards 600×400, blog thumbnails 800×450
- **Lazy loading** for all below-fold images via `loading="lazy"` attribute

### Spacing System

```css
/* 4px base unit — spacing scale uses multiples of 4px (Tailwind-compatible) */
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
--space-32: 8rem;      /* 128px */

/* Section padding */
--section-padding-y: clamp(3rem, 8vw, 6rem);   /* Vertical padding between sections */
--container-max:     1280px;                     /* Max content width */
--container-padding: clamp(1rem, 4vw, 2rem);    /* Horizontal padding */
```

### Component Library

The landing page shares `packages/ui` (Tailwind + shadcn/ui base) from the monorepo (per ARCHITECTURE.md Section 4) but adds landing-specific components:

| Component | Source | Notes |
|---|---|---|
| Button, Card | `packages/ui` | Shared with portals |
| PricingTable | `apps/landing` | Landing-specific, renders pricing data from `constants/pricing.ts` |
| FAQAccordion | `apps/landing` | Uses Radix Accordion primitive; SEO-friendly (content in HTML, not JS-toggled) |
| ConditionHero | `apps/landing` | Full-width hero with condition-specific accent color |
| AppDownloadButtons | `apps/landing` | App Store + Play Store badges with device detection |
| SmartBanner | `apps/landing` | iOS/Android smart app banner |
| BlogCard | `apps/landing` | Blog post preview, Sanity content |

---

## 4. Page 1: Homepage (`/`)

### URL & SEO

- **URL:** `https://onlyou.life/`
- **Title tag:** `Onlyou — Private Healthcare, Delivered to You | Online Doctor Consultations India`
- **Meta description:** `Get discreet treatment for hair loss, ED, weight management & PCOS from licensed Indian doctors. AI assessment, prescription medication, doorstep delivery. Starting ₹999/month.`
- **H1:** `Private healthcare for the conditions you don't want to talk about`
- **Canonical:** `https://onlyou.life/`

### Section-by-Section Layout

#### 4.1 Hero Section

**Layout:** Full-viewport-height (100vh on desktop, auto on mobile) with subtle gradient background.

**Content:**
- **Headline (H1):** "Private healthcare for the conditions you don't want to talk about"
- **Subheadline:** "Licensed doctors. Prescription medication. Discreet doorstep delivery. All from one app."
- **Primary CTA:** `[Start Your Free Assessment →]` — links to app download (device-detected: App Store on iOS, Play Store on Android, both on desktop)
- **Secondary CTA:** `[See How It Works]` — smooth-scrolls to How It Works section
- **Trust strip (below CTAs):** Inline row: "✓ Licensed doctors · ✓ Real prescriptions · ✓ 100% discreet · ✓ Starting ₹999/mo"

**Visual:** Abstract wellness illustration or soft gradient with floating health-related shapes (not medical). No stock photo of a smiling doctor — that's every other telehealth site.

**Mobile:** Headline + subheadline + single primary CTA + trust strip. No illustration on mobile (viewport too small; illustration pushed below fold adds scroll friction).

#### 4.2 Trust Badges Section

**Layout:** Horizontal strip, 4 badges, icon + label + one-line description.

| Badge | Icon | Label | Description |
|---|---|---|---|
| 1 | Shield with checkmark | Licensed Doctors | Board-certified specialists in dermatology, urology, endocrinology |
| 2 | Rx symbol | Licensed Pharmacy | Genuine prescription medication from registered pharmacies |
| 3 | Package with lock | 100% Discreet | Plain packaging, anonymous delivery, no condition names visible |
| 4 | Lock/encrypt icon | Data Encrypted | AES-256 encryption, DPDPA compliant, your data never sold |

**Mobile:** 2×2 grid. Each badge = icon above text.

**Cross-reference:** Privacy architecture per PROJECT-OVERVIEW.md Section 7 — lab/pharmacy/delivery partners never see diagnosis. Encryption per APP-PATIENT.md Section 25.1 and ARCHITECTURE.md Section 14.

#### 4.3 How It Works Section

**Layout:** 3-step horizontal timeline (desktop), vertical stack (mobile).

**Step 1: Answer Questions**
- Icon: Clipboard/questionnaire illustration
- Title: "Complete a private health assessment"
- Description: "Answer condition-specific questions from your phone. Takes 8-12 minutes. Our AI analyzes your responses to prepare your case for the doctor."
- Cross-reference: Questionnaire engine per APP-PATIENT.md Section 9 (20-35 questions per vertical, ~8-12 min per onlyou-spec-resolved-v4.md Section 6.3)

**Step 2: Doctor Reviews**
- Icon: Doctor with stethoscope (abstract)
- Title: "A specialist reviews your case"
- Description: "A licensed dermatologist, urologist, or endocrinologist reviews your AI-prepared case file. They'll prescribe treatment, order blood work if needed, or ask follow-up questions — usually within 24 hours."
- Cross-reference: Async consultation model per PROJECT-OVERVIEW.md Section 12 Decision #1; doctor review per PORTAL-DOCTOR.md Sections 4-5

**Step 3: Treatment Delivered**
- Icon: Delivery package
- Title: "Medication delivered to your door"
- Description: "Your prescription medication is prepared by a licensed pharmacy and delivered discreetly. Plain packaging — nobody knows what's inside. Auto-refills on your subscription cycle."
- Cross-reference: Delivery flow per PORTAL-PHARMACY.md, partner anonymization per PROJECT-OVERVIEW.md Section 7

**Link below steps:** `[Learn more about how it works →]` → `/how-it-works`

#### 4.4 Conditions Section

**Layout:** 5 condition cards in a scrollable row (mobile) or 3+2 grid (desktop).

Each card contains:
- Condition accent color bar at top
- Illustration (abstract, condition-themed)
- Condition name (H3)
- One-line description
- Starting price
- CTA: `[Learn More →]` → respective condition page

| Card | Name | Description | Starting Price | Link |
|---|---|---|---|---|
| 1 | Hair Loss | Clinically proven treatments for thinning hair. For men & women. | From ₹750/mo | `/hair-loss` |
| 2 | Erectile Dysfunction | Prescription ED treatment. Private, effective, delivered. | From ₹1,000/mo | `/erectile-dysfunction` |
| 3 | Premature Ejaculation | Longer-lasting intimacy. Prescription treatment, maximum discretion. | From ₹1,000/mo | `/premature-ejaculation` |
| 4 | Weight Management | Medical weight loss with prescription medication. Standard & GLP-1 options. | From ₹2,500/mo | `/weight-management` |
| 5 | PCOS | Comprehensive PCOS management. Hormonal treatment + ongoing monitoring. | From ₹1,167/mo | `/pcos` |

**"Starting from" prices** use the 6-month plan per-month rate (lowest price point), sourced from onlyou-spec-resolved-v4.md Section 5:
- Hair Loss: ₹4,499/6mo = ₹750/mo
- ED: ₹5,999/6mo = ₹1,000/mo
- PE: ₹5,999/6mo = ₹1,000/mo
- Weight Standard: ₹14,999/6mo = ₹2,500/mo
- PCOS: ₹6,999/6mo = ₹1,167/mo

Weight GLP-1 tier (₹7,500/mo) is shown as an option on the weight management condition page, not on the homepage card.

#### 4.5 Pricing Preview Section

**Layout:** Simple comparison strip with key price points.

**Headline (H2):** "Transparent pricing. No hidden fees."
**Subheadline:** "Everything included — consultation, prescription, medication, delivery."

| Vertical | Monthly | Save with 6-Month |
|---|---|---|
| Hair Loss | ₹999/mo | ₹750/mo (25% off) |
| ED | ₹1,299/mo | ₹1,000/mo (23% off) |
| PE | ₹1,299/mo | ₹1,000/mo (23% off) |
| Weight Management | ₹2,999/mo | ₹2,500/mo (17% off) |
| PCOS | ₹1,499/mo | ₹1,167/mo (22% off) |

**CTA:** `[See Full Pricing →]` → `/pricing`

**Fine print:** "Prices include consultation, prescription, medication, and doorstep delivery. First blood panel included when clinically indicated; follow-up panels charged separately (₹800-₹4,500). GLP-1 weight management plans available from ₹7,500/mo (limited availability)."

Cross-reference: Complete pricing per onlyou-spec-resolved-v4.md Section 5, blood work pricing per same section (first panel included; follow-ups ₹800-₹4,500). Self-upload option available at no cost per onlyou-spec-resolved-v4.md Section 1.10.

#### 4.6 FAQ Section

**Layout:** Accordion (click to expand). Server-rendered HTML for SEO (not client-only JS toggle).

**10 Homepage FAQs:**

1. **How does Onlyou work?** — Three-step process summary (questionnaire → doctor → delivery)
2. **Who are the doctors?** — Licensed Indian doctors, board-certified specialists (dermatologists, urologists, endocrinologists, gynecologists), registered with NMC
3. **Is it really private?** — Plain packaging, anonymous patient IDs for lab/pharmacy, encrypted data, DPDPA compliant, discreet app icon option
4. **What conditions do you treat?** — List of 5 verticals with brief descriptions
5. **What's included in the subscription?** — AI assessment, doctor consultation, prescription, medication, delivery, ongoing check-ins (per PROJECT-OVERVIEW.md Section 5)
6. **Is this legal?** — Telemedicine Practice Guidelines 2020 allow teleconsultation, all prescriptions by licensed doctors, Schedule H medication via registered pharmacies
7. **How much does it cost?** — Starting from ₹999/mo, pricing summary with link to `/pricing`
8. **How long until I see results?** — Varies by condition: Hair Loss 3-6 months, ED immediate, PE 1-4 weeks, Weight 4-8 weeks, PCOS 2-3 months
9. **Can I cancel anytime?** — Monthly plans cancel anytime, quarterly/6-month plans follow refund policy
10. **How is my data protected?** — AES-256 encryption, data stored in India (AWS Mumbai per ARCHITECTURE.md Section 3), DPDPA 2023 compliant, data never sold

**Structured data:** Each FAQ pair marked up as `FAQPage` JSON-LD schema (see Section 18).

#### 4.7 Final CTA Banner

**Layout:** Full-width colored band at bottom of page (above footer).

**Headline:** "Ready to take the first step?"
**Subheadline:** "Start your free, private health assessment today."
**CTA:** `[Download the App]` — device-detected app store link
**Secondary:** `[Or browse our conditions →]` → `/hair-loss` (first condition)

---

## 5. Page 2: Condition Page — Hair Loss (`/hair-loss`)

### URL & SEO

- **URL:** `https://onlyou.life/hair-loss/`
- **Title tag:** `Hair Loss Treatment Online India — Clinically Proven Plans from ₹750/mo | Onlyou`
- **Meta description:** `Get prescription hair loss treatment from licensed dermatologists. Finasteride, Minoxidil & more. AI assessment + doctor consultation + medication delivered discreetly. Starting ₹750/mo.`
- **H1:** `Clinically proven hair loss treatment — delivered discreetly`
- **Canonical:** `https://onlyou.life/hair-loss/`

### Target Keywords

Primary: "hair loss treatment online India", "hair loss treatment home delivery"
Secondary: "finasteride online India", "minoxidil prescription online", "dermatologist online consultation hair", "hair thinning treatment men", "female pattern hair loss treatment"
Long-tail: "hair loss doctor consultation from home India", "discreet hair loss medication delivery"

### Condition-Specific Content

- **Target audience:** Men 18-45, Women with AGA (per PROJECT-OVERVIEW.md Section 4)
- **Doctor type:** Dermatologist / Trichologist (per PROJECT-OVERVIEW.md Section 4)
- **Photos required:** 4 mandatory (per PROJECT-OVERVIEW.md Section 4)
- **Blood work:** Sometimes (per PROJECT-OVERVIEW.md Section 4)
- **Questionnaire:** 20-35 questions, ~8-12 min (per APP-PATIENT.md Section 9)

### Pricing Table (Hair Loss)

| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹999/month | ₹999 | — |
| Quarterly | ₹2,499/quarter | ₹833 | 17% |
| 6-Month | ₹4,499/6 months | ₹750 | 25% |

Source: onlyou-spec-resolved-v4.md Section 5

---

## 6. Page 3: Condition Page — Erectile Dysfunction (`/erectile-dysfunction`)

### URL & SEO

- **URL:** `https://onlyou.life/erectile-dysfunction/`
- **Title tag:** `ED Treatment Online India — Prescription Medication Delivered Discreetly from ₹1,000/mo | Onlyou`
- **Meta description:** `Get private ED treatment from licensed urologists. Prescription Sildenafil, Tadalafil & more. No clinic visit needed. AI assessment + doctor consultation + discreet delivery. From ₹1,000/mo.`
- **H1:** `Private, effective ED treatment — no clinic visit needed`
- **Canonical:** `https://onlyou.life/erectile-dysfunction/`

### Target Keywords

Primary: "ED treatment online India", "erectile dysfunction treatment home delivery"
Secondary: "sildenafil online India", "tadalafil prescription online", "urologist online consultation ED", "erectile dysfunction pills delivered"
Long-tail: "private ED doctor consultation India", "discreet erectile dysfunction medication delivery"

### Condition-Specific Content

- **Target audience:** Men 25-60 (per PROJECT-OVERVIEW.md Section 4)
- **Doctor type:** Urologist / Andrologist (per PROJECT-OVERVIEW.md Section 4)
- **Photos required:** None (per PROJECT-OVERVIEW.md Section 4)
- **Blood work:** Sometimes (per PROJECT-OVERVIEW.md Section 4)
- **Privacy emphasis:** Maximum discretion — no photos, no video, text-only consultation

### Pricing Table (ED)

| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹1,299/month | ₹1,299 | — |
| Quarterly | ₹3,299/quarter | ₹1,100 | 15% |
| 6-Month | ₹5,999/6 months | ₹1,000 | 23% |

Source: onlyou-spec-resolved-v4.md Section 5

---

## 7. Page 4: Condition Page — Premature Ejaculation (`/premature-ejaculation`)

### URL & SEO

- **URL:** `https://onlyou.life/premature-ejaculation/`
- **Title tag:** `PE Treatment Online India — Prescription Medication for Premature Ejaculation from ₹1,000/mo | Onlyou`
- **Meta description:** `Private premature ejaculation treatment from licensed specialists. Dapoxetine & other prescription options. No clinic visit. AI assessment + doctor + discreet delivery. From ₹1,000/mo.`
- **H1:** `Premature ejaculation treatment — private, effective, delivered`
- **Canonical:** `https://onlyou.life/premature-ejaculation/`

### Target Keywords

Primary: "premature ejaculation treatment online India", "PE treatment home delivery"
Secondary: "dapoxetine online India", "premature ejaculation doctor online", "PE pills prescription"
Long-tail: "premature ejaculation medication delivery India", "private PE treatment from home"

### Condition-Specific Content

- **Target audience:** Men 18-60 (per onlyou-spec-resolved-v4.md Section 6.1)
- **Doctor type:** Urologist / Andrologist / Sexual Medicine (same pool as ED per onlyou-spec-resolved-v4.md Section 6.1)
- **Photos required:** None (per onlyou-spec-resolved-v4.md Section 6.1)
- **Blood work:** Rarely (per PROJECT-OVERVIEW.md Section 4)
- **Comorbidity note:** Often co-exists with ED; system handles cross-referral (per onlyou-spec-resolved-v4.md Section 6.1)
- **Packaging:** Maximum discretion — plain box, "Onlyou" branding only, no medication or condition names (per onlyou-spec-resolved-v4.md Section 6)

### Pricing Table (PE)

| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹1,299/month | ₹1,299 | — |
| Quarterly | ₹3,299/quarter | ₹1,100 | 15% |
| 6-Month | ₹5,999/6 months | ₹1,000 | 23% |

Source: onlyou-spec-resolved-v4.md Section 5. Same as ED — same doctor pool, similar medication cost (per Section 6.2).

---

## 8. Page 5: Condition Page — Weight Management (`/weight-management`)

### URL & SEO

- **URL:** `https://onlyou.life/weight-management/`
- **Title tag:** `Medical Weight Loss Online India — Prescription Treatment Plans from ₹2,500/mo | Onlyou`
- **Meta description:** `Lose weight with prescription medication supervised by doctors. Standard & GLP-1 treatment plans. BMI assessment + ongoing monitoring + medication delivery. From ₹2,500/mo.`
- **H1:** `Medical weight loss — real medication, real doctors, real results`
- **Canonical:** `https://onlyou.life/weight-management/`

### Target Keywords

Primary: "weight loss treatment online India", "medical weight loss India"
Secondary: "GLP-1 weight loss India", "semaglutide India", "weight management doctor online", "prescription weight loss medication India"
Long-tail: "online doctor weight loss prescription India", "obesity treatment medication delivery"

### Condition-Specific Content

- **Target audience:** M&F 18-55, BMI ≥25 (per PROJECT-OVERVIEW.md Section 4)
- **Doctor type:** Endocrinologist / Internal Medicine (per PROJECT-OVERVIEW.md Section 4)
- **Photos required:** 2 (per PROJECT-OVERVIEW.md Section 4)
- **Blood work:** Usually (per PROJECT-OVERVIEW.md Section 4)
- **Two tiers:** Standard and GLP-1 Premium (per PROJECT-OVERVIEW.md Section 4)

### Pricing Table (Weight Management — Two Tiers)

**Standard Tier:**

| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹2,999/month | ₹2,999 | — |
| Quarterly | ₹7,999/quarter | ₹2,666 | 11% |
| 6-Month | ₹14,999/6 months | ₹2,500 | 17% |

**Premium GLP-1 Tier:**

| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹9,999/month | ₹9,999 | — |
| Quarterly | ₹24,999/quarter | ₹8,333 | 17% |
| 6-Month | ₹44,999/6 months | ₹7,500 | 25% |

Source: onlyou-spec-resolved-v4.md Section 5.

**Page must clearly explain two-tier difference:** Standard tier = oral medications (metformin, orlistat, etc.); GLP-1 tier = semaglutide/liraglutide injections. GLP-1 tier note: "Injectable medication requires nurse home visit for administration" (per onlyou-spec-resolved-v4.md Section 7 — nurse system handles injections, muted for MVP but scaffolded).

**⚠️ GLP-1 MVP Status:** The GLP-1 Premium tier has **limited availability at MVP launch**. In the patient app, GLP-1 is displayed but greyed out with a "Coming Soon" badge (per APP-PATIENT.md Section 11.1). The landing page should display GLP-1 pricing with a visual "Coming Soon" or "Limited Availability" badge on the GLP-1 pricing card, and include a note: "GLP-1 injectable treatment is currently in limited availability. Join the waitlist to be notified when it opens in your area." This ensures the landing page doesn't over-promise availability that the app cannot fulfill. Cold chain delivery for GLP-1 uses manual insulated bag process for MVP, not system-tracked (per onlyou-spec-resolved-v4.md Section 1.12).

---

## 9. Page 6: Condition Page — PCOS (`/pcos`)

### URL & SEO

- **URL:** `https://onlyou.life/pcos/`
- **Title tag:** `PCOS Treatment Online India — Hormonal Management from ₹1,167/mo | Onlyou`
- **Meta description:** `Comprehensive PCOS management from specialist gynecologists & endocrinologists. Blood work, hormonal treatment, period tracking, ongoing monitoring. From ₹1,167/mo.`
- **H1:** `PCOS treatment that actually works — from specialist doctors who understand`
- **Canonical:** `https://onlyou.life/pcos/`

### Target Keywords

Primary: "PCOS treatment online India", "PCOS doctor consultation online"
Secondary: "PCOS medication delivery", "polycystic ovary syndrome treatment India", "hormonal treatment PCOS online"
Long-tail: "PCOS blood test home collection India", "PCOS specialist doctor online consultation"

### Condition-Specific Content

- **Target audience:** Women 18-40 (per PROJECT-OVERVIEW.md Section 4)
- **Doctor type:** Gynecologist / Endocrinologist (per PROJECT-OVERVIEW.md Section 4)
- **Photos required:** Optional (per PROJECT-OVERVIEW.md Section 4)
- **Blood work:** Almost always (per PROJECT-OVERVIEW.md Section 4)
- **Special feature:** Built-in period tracker in patient app (per APP-PATIENT.md Section 18)
- **Fertility awareness:** Questionnaire includes fertility intent branching — trying-to-conceive vs. not-trying produces different treatment templates (per onlyou-spec-resolved-v4.md Section 9, PCOS spec)

### Pricing Table (PCOS)

| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹1,499/month | ₹1,499 | — |
| Quarterly | ₹3,799/quarter | ₹1,266 | 16% |
| 6-Month | ₹6,999/6 months | ₹1,167 | 22% |

Source: onlyou-spec-resolved-v4.md Section 5.

---

## 10. Condition Page Template (Shared Structure)

All 5 condition pages follow the same section layout. Content differs per condition but structure is identical:

### Section Order (Top to Bottom)

1. **Condition Hero** — H1, condition description (2-3 sentences), "Start Your [Condition] Assessment" CTA, condition accent color background
2. **What Is [Condition]?** — 300-500 words, educational, empathetic tone, de-stigmatizing language
3. **Causes & Risk Factors** — Bullet-style list, medically accurate, referenced to Indian demographic data where relevant
4. **Symptoms** — "Do you experience any of these?" framing, encouraging self-identification
5. **How Onlyou Treats [Condition]** — 3-step recap (questionnaire → doctor → treatment), specific to this condition's flow (e.g., Hair Loss mentions 4 photos, PCOS mentions blood work)
6. **Treatments We Prescribe** — List of medication classes (NOT specific brand names or dosages — that's the doctor's decision). Example for Hair Loss: "Oral medications (DHT blockers), Topical treatments (growth stimulators), Combination therapy"
7. **Why Onlyou?** — 4 differentiators specific to this condition vs. alternatives (per PROJECT-OVERVIEW.md Section 3)
8. **Pricing** — Condition-specific pricing table (Monthly / Quarterly / 6-Month) with "Includes" list
9. **What's Included** — Bulleted list: AI assessment, specialist consultation, prescription, medication delivery, ongoing check-ins, first blood panel (when indicated)
10. **FAQ** — 8-10 condition-specific questions (see per-condition FAQ data in `lib/constants/faq.ts`)
11. **CTA** — "Start Your [Condition] Assessment" → app download link
12. **Related Conditions** — Cross-links to other relevant condition pages (e.g., ED page links to PE, Weight page links to PCOS)

### SEO Content Length

Per onlyou-spec-resolved-v4.md Section 4.7: each condition page contains **2,000-3,000 words** of SEO-optimized long-form content. This is the full rendered text content on the page (headings + body text), not including navigation/footer/CTA elements.

### Structured Data Per Condition Page

Each condition page includes JSON-LD for:
- `MedicalCondition` — condition name, description, possible treatments
- `FAQPage` — all FAQ pairs on the page
- `Product` — subscription plan with pricing (as `Offer`)
- `BreadcrumbList` — Home > [Condition Name]

See Section 18 for full structured data specifications.

---

## 11. Page 7: Pricing (`/pricing`)

### URL & SEO

- **URL:** `https://onlyou.life/pricing/`
- **Title tag:** `Pricing — Online Healthcare Plans from ₹750/mo | Onlyou`
- **Meta description:** `Transparent pricing for all Onlyou treatment plans. Hair loss from ₹750/mo, ED from ₹1,000/mo, weight management from ₹2,500/mo, PCOS from ₹1,167/mo. Everything included.`
- **H1:** `Simple, transparent pricing`

### Page Content

**Subheadline:** "Every plan includes: AI health assessment, specialist doctor consultation, prescription medication, discreet doorstep delivery, and ongoing monitoring."

**Layout:** Tab-based (one tab per condition) or stacked vertical cards showing all conditions.

**For each condition, display:**
- Condition name + accent color
- Monthly / Quarterly / 6-Month pricing table
- "What's included" checklist
- "Start Assessment" CTA

**Weight Management special case:** Two sub-tabs or cards for Standard and GLP-1 Premium tiers.

**Blood Work note:** "First blood panel included when clinically indicated. Follow-up panels from ₹800-₹4,500 depending on tests required." (per onlyou-spec-resolved-v4.md Section 5)

**Self-upload note:** "Already have recent blood work? Upload your results for free — no additional charge." (per onlyou-spec-resolved-v4.md Section 1.10)

**Complete pricing data source:** `lib/constants/pricing.ts`, derived from onlyou-spec-resolved-v4.md Section 5 (authoritative). Cross-reference with PROJECT-OVERVIEW.md Section 5 for consistency.

---

## 12. Page 8: How It Works (`/how-it-works`)

### URL & SEO

- **URL:** `https://onlyou.life/how-it-works/`
- **Title tag:** `How It Works — Online Doctor Consultation & Treatment Delivery | Onlyou`
- **Meta description:** `Onlyou in 3 steps: Complete a private health assessment, a specialist doctor reviews your case, and treatment is delivered to your door. Here's exactly how it works.`
- **H1:** `How Onlyou works`

### Page Content (Expanded 3-Step Flow)

This page is an expanded version of the homepage "How It Works" section, with additional detail and visual treatment.

**Step 1: Complete Your Health Assessment (8-12 minutes)**
- Download the Onlyou app
- Select your condition
- Answer a private, condition-specific questionnaire (20-35 questions depending on condition per APP-PATIENT.md Section 9)
- Upload photos if required (Hair Loss: 4 photos, Weight: 2 photos, others: none per PROJECT-OVERVIEW.md Section 4)
- Our AI analyzes your responses, flagging risk factors and contraindications for the doctor
- Cross-reference: AI pre-assessment per PROJECT-OVERVIEW.md Section 6, Claude-powered per ARCHITECTURE.md Section 3

**Step 2: Doctor Reviews Your Case (within 24 hours)**
- A licensed specialist (dermatologist, urologist, gynecologist, or endocrinologist) reviews your AI-prepared case file
- The doctor may prescribe treatment, order blood work, ask follow-up questions, or refer you to an in-person clinic
- If blood work is needed, a nurse visits your home for sample collection (per PORTAL-NURSE-FIXED.md)
- All communication happens via secure in-app messaging — no phone calls, no video (unless you need it later)
- Cross-reference: Consultation lifecycle per PORTAL-DOCTOR.md Section 23, async model per PROJECT-OVERVIEW.md Section 12

**Step 3: Treatment Delivered to Your Door**
- Your prescription is prepared by a licensed partner pharmacy (per PORTAL-PHARMACY.md)
- Medication is delivered in plain packaging — no condition or medication names visible
- Delivery confirmed via OTP code — only you can receive your package (per APP-PATIENT.md Section 14)
- Automatic refills on your subscription cycle — no need to reorder
- Cross-reference: Delivery flow per PORTAL-PHARMACY.md, OTP confirmation per APP-PATIENT.md Section 14

**Ongoing Care:**
- Check-ins at 4 weeks, 3 months, and 6 months (per PROJECT-OVERVIEW.md Section 5)
- Message your doctor anytime through the app (per APP-PATIENT.md Section 7)
- Track your progress with medication reminders (per APP-PATIENT.md Section 4)
- Period tracking for PCOS patients (per APP-PATIENT.md Section 18)

---

## 13. Page 9: About (`/about`)

### URL & SEO

- **URL:** `https://onlyou.life/about/`
- **Title tag:** `About Onlyou — India's Private Telehealth Platform`
- **Meta description:** `Onlyou is a subscription telehealth platform for stigmatized chronic conditions in India. Learn about our mission, team, and approach to private healthcare.`
- **H1:** `About Onlyou`

### Page Content

**Mission section:** Why Onlyou exists — the stigma problem, fragmented care, access barriers, compliance failure (sourced from PROJECT-OVERVIEW.md Section 2).

**What makes us different:** Vertically integrated model, AI-first clinical workflow, subscription on chronic conditions, discreet by design, condition-specific everything (sourced from PROJECT-OVERVIEW.md Section 3).

**Our approach:**
- Real doctors, not health coaches or supplement salespeople
- Real prescription medication, not nutraceuticals
- AI-powered efficiency that gives doctors 10x throughput (per PROJECT-OVERVIEW.md Section 3)
- End-to-end care, not fragmented point solutions

**Regulatory compliance:**
- Compliant with Telemedicine Practice Guidelines 2020
- DPDPA 2023 compliant data handling (per ARCHITECTURE.md Section 14)
- All prescriptions issued by NMC-registered doctors
- All medication dispensed by Drug License-holding pharmacies
- Data stored exclusively in India (AWS Mumbai per ARCHITECTURE.md Section 3)

**Contact information:**
- Support email
- Business inquiry email
- Registered company address (for regulatory compliance)
- No phone number on public site (all patient support goes through in-app messaging per APP-PATIENT.md Section 7)

---

## 14. Legal Pages (`/terms`, `/privacy`, `/refund`)

### 14.1 Terms of Service (`/terms`)

- **URL:** `https://onlyou.life/terms/`
- **Title tag:** `Terms of Service | Onlyou`
- **Content:** Standard telehealth terms covering: eligibility (18+, Indian residents), account responsibility, consultation disclaimer (not emergency care), subscription auto-renewal, payment terms, intellectual property, limitation of liability, governing law (Indian courts)
- **Key clauses to include:**
  - Telemedicine is not a substitute for in-person emergency care
  - Doctor's clinical judgment takes precedence over AI recommendations
  - Subscription auto-renews unless cancelled before cycle end
  - Medications are prescription-only; doctor may decline to prescribe
  - 18+ age requirement (minors cannot use the platform)

### 14.2 Privacy Policy (`/privacy`)

- **URL:** `https://onlyou.life/privacy/`
- **Title tag:** `Privacy Policy — Data Protection & DPDPA Compliance | Onlyou`
- **DPDPA 2023 requirements** (per APP-PATIENT.md Section 25.3 and ARCHITECTURE.md Section 14):
  - What data is collected (personal, health, payment)
  - How data is processed and stored (AES-256 encryption, AWS Mumbai per ARCHITECTURE.md)
  - Who data is shared with (anonymized to partners per PROJECT-OVERVIEW.md Section 7):
    - Lab partners: anonymous patient ID, tests ordered only (no name, phone, address, diagnosis)
    - Pharmacy partners: anonymous patient ID, medications only (no diagnosis, no patient address)
    - Delivery: pickup/delivery addresses, patient phone only (no medication names, no condition)
    - Nurses: patient name, address, test type only (no diagnosis, no full medical history)
  - Data retention periods (3 years per Telemedicine Practice Guidelines 2020 for clinical records, per APP-PATIENT.md Section 22.4)
  - Consent management (separate consent for teleconsultation, prescription sharing, lab processing, analytics per APP-PATIENT.md Section 25.3)
  - Data portability ("Download My Data" per APP-PATIENT.md Section 25.3)
  - Account deletion (30-day grace period, anonymization per APP-PATIENT.md Section 22.4)
  - Right to withdraw consent (with consequences explained per APP-PATIENT.md Section 25.3)
  - No pre-ticked consent boxes (per APP-PATIENT.md Section 25.3)
  - Data never sold to third parties

### 14.3 Refund Policy (`/refund`)

- **URL:** `https://onlyou.life/refund/`
- **Title tag:** `Refund Policy | Onlyou`
- **Content:** Refund terms covering:
  - Full refund if doctor cannot treat (referral case per PORTAL-DOCTOR.md Section 14)
  - Partial refund for unused subscription period on cancellation
  - No refund after medication has been dispatched
  - Wallet credit system for prorated refunds (per APP-PATIENT.md Section 16)
  - Wallet balance refund to original payment method on account deletion (per APP-PATIENT.md Section 22.4)
  - Razorpay processing timeline (5-7 business days per standard Razorpay refund SLA)

### Design for Legal Pages

- Clean, readable typography with generous line-height (`--leading-relaxed: 1.8`)
- Table of contents with anchor links at top
- "Last updated" date prominently displayed
- Printable layout (clean `@media print` styles)
- No marketing CTAs or interstitials on legal pages — clean reading experience

---

## 15. Blog System (`/blog`)

### Architecture

- **CMS:** Sanity (headless) — chosen per ARCHITECTURE.md Section 3 for visual editing by non-developers, free tier, real-time preview, structured content
- **Content delivery:** SSG at build time for MVP (all blog posts baked into static HTML during `next build`). New blog posts require a rebuild + redeploy. ISR (Incremental Static Regeneration) deferred to when blog volume grows and content freshness requires sub-build-cycle updates.
- **Revalidation (post-ISR migration only):** Once migrated from `output: 'export'` to standard Next.js deployment (Fargate or Vercel), Sanity webhook hits `/api/revalidate/` endpoint → Next.js revalidates specific blog post/category pages. **Note:** This webhook endpoint does NOT exist in the static export build — API routes are not supported with `output: 'export'`. For MVP, adding/updating blog content requires a full rebuild via CI/CD (push to `main` → GitHub Actions → rebuild → deploy to S3).

### Sanity Schema

```typescript
// sanity/schemas/post.ts
{
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    { name: 'title', type: 'string', validation: Rule => Rule.required() },
    { name: 'slug', type: 'slug', options: { source: 'title' } },
    { name: 'excerpt', type: 'text', rows: 3 },
    { name: 'mainImage', type: 'image', options: { hotspot: true } },
    { name: 'categories', type: 'array', of: [{ type: 'reference', to: { type: 'category' } }] },
    { name: 'author', type: 'reference', to: { type: 'author' } },
    { name: 'publishedAt', type: 'datetime' },
    { name: 'body', type: 'blockContent' },  // Portable Text (rich text)
    { name: 'seoTitle', type: 'string' },
    { name: 'seoDescription', type: 'text', rows: 2 },
    { name: 'condition', type: 'string', options: {
      list: ['hair-loss', 'ed', 'pe', 'weight', 'pcos', 'general']
    }},
  ]
}
```

```typescript
// sanity/schemas/category.ts
{
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug', options: { source: 'title' } },
    { name: 'description', type: 'text' },
  ]
}
```

### Blog Categories (Matching Verticals)

| Category | Slug | Description |
|---|---|---|
| Hair Loss | `hair-loss` | Articles about hair thinning, treatments, lifestyle tips |
| Sexual Health | `sexual-health` | Articles covering ED, PE, intimacy, men's health |
| Weight Management | `weight-management` | Articles about weight loss, GLP-1, metabolism, nutrition |
| Women's Health | `womens-health` | Articles about PCOS, hormonal health, menstrual health |
| Wellness | `wellness` | General health, mental health, lifestyle articles |
| Platform Updates | `updates` | Onlyou feature announcements, vertical launches |

### Blog Listing Page (`/blog`)

- Grid of blog cards (3 columns desktop, 1 column mobile)
- Each card: thumbnail, title, excerpt (140 chars), category badge, published date
- Category filter (tab bar or dropdown)
- Pagination (12 posts per page)
- Sidebar (desktop only): category list, "Start Assessment" CTA card, recent posts

### Individual Blog Post (`/blog/[slug]`)

- Full-width hero image
- Title (H1), author, published date, reading time estimate
- Portable Text body with support for: headings (H2-H4), paragraphs, bulleted lists, numbered lists, block quotes, code blocks, images with captions, internal links
- "Related posts" section at bottom (same category)
- Condition-specific CTA at bottom ("Dealing with [condition]? Start your assessment →")
- Social sharing buttons (WhatsApp share is priority #1 for Indian audience, then Twitter/X, Facebook)
- Table of contents (auto-generated from H2 headings for posts >1,500 words)

### Blog SEO

Each blog post generates:
- Unique `<title>` and `<meta name="description">` from `seoTitle` / `seoDescription` fields (fallback to `title` / `excerpt`)
- `<link rel="canonical">` to `https://onlyou.life/blog/[slug]/`
- Open Graph tags for social sharing
- `Article` JSON-LD structured data
- Automatic inclusion in sitemap

---

## 16. App Download & Smart Banners

### App Store Links

| Platform | Store | Link Format |
|---|---|---|
| iOS | Apple App Store | `https://apps.apple.com/in/app/onlyou/id[APP_ID]` |
| Android | Google Play Store | `https://play.google.com/store/apps/details?id=life.onlyou.app` |

**Bundle identifier:** `life.onlyou.app` (per standard reverse-domain naming)

### Device Detection Logic

```typescript
// lib/utils/device-detection.ts
export function getAppStoreLink(): string {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return APP_STORE_URL;
  if (/android/i.test(ua)) return PLAY_STORE_URL;
  return PLAY_STORE_URL; // Default to Play Store (70%+ Indian mobile users are Android)
}

export function getDeviceType(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}
```

### Smart App Banner (iOS)

```html
<!-- In root layout.tsx <head> -->
<meta name="apple-itunes-app" content="app-id=[APP_ID]" />
```

iOS Safari automatically shows a native "Open in App Store" banner.

### Custom App Banner (Android + Desktop)

Since Android doesn't have a native equivalent of iOS Smart App Banners, implement a custom sticky banner:

- **Position:** Top of page (above header), dismissible
- **Content:** App icon + "Get the Onlyou app" + `[Download]` button
- **Behavior:**
  - Shows on first visit (stored in `localStorage`)
  - Dismissible — hide for 7 days after dismissal
  - Does not show if user arrived from app (check `document.referrer` for app deep link domain)
- **Desktop:** Shows both App Store + Play Store badges side by side
- **Mobile (Android):** Shows Play Store badge only

### Universal Links / App Links

For future deep linking from landing page to app:
- iOS: `apple-app-site-association` file at `https://onlyou.life/.well-known/apple-app-site-association`
- Android: `assetlinks.json` at `https://onlyou.life/.well-known/assetlinks.json`

Cross-reference: Deep link scheme per APP-PATIENT.md Section 23 (`onlyou://` custom scheme + `https://onlyou.life/app/...` universal links).

---

## 17. SEO Strategy & Technical SEO

### Technical SEO Checklist

| Requirement | Implementation |
|---|---|
| SSG (Static Site Generation) | All pages pre-rendered at build time via Next.js `output: 'export'` |
| Semantic HTML | Proper heading hierarchy (single H1 per page, H2-H4 for sections) |
| Sitemap | Dynamic `sitemap.ts` generates XML sitemap including all static pages + blog posts |
| Robots.txt | Dynamic `robots.ts` — allow all crawlers, reference sitemap URL |
| Canonical URLs | Every page has `<link rel="canonical">` pointing to self |
| Trailing slashes | Enabled (`trailingSlash: true` in next.config.js) for URL consistency |
| HTTPS | Enforced via CloudFront + ACM certificate (per ARCHITECTURE.md) |
| Hreflang | `en-IN` (English, India) — single language for MVP, Hindi deferred to Phase 2 |
| Meta robots | `index, follow` on all public pages; `noindex` on paginated blog pages beyond page 1 |
| Page speed | Target: LCP <2.5s, FID <100ms, CLS <0.1 (Core Web Vitals) |
| Mobile-friendly | Responsive design, all content accessible on mobile |
| Structured data | JSON-LD on all pages (Organization, FAQPage, MedicalCondition, Product, BreadcrumbList, Article) |

### Sitemap Structure

```xml
<!-- Generated by src/app/sitemap.ts -->
<urlset>
  <!-- Core pages -->
  <url><loc>https://onlyou.life/</loc><priority>1.0</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://onlyou.life/how-it-works/</loc><priority>0.8</priority></url>
  <url><loc>https://onlyou.life/pricing/</loc><priority>0.9</priority></url>
  <url><loc>https://onlyou.life/about/</loc><priority>0.6</priority></url>

  <!-- Condition pages (highest SEO priority after homepage) -->
  <url><loc>https://onlyou.life/hair-loss/</loc><priority>0.9</priority><changefreq>monthly</changefreq></url>
  <url><loc>https://onlyou.life/erectile-dysfunction/</loc><priority>0.9</priority></url>
  <url><loc>https://onlyou.life/premature-ejaculation/</loc><priority>0.9</priority></url>
  <url><loc>https://onlyou.life/weight-management/</loc><priority>0.9</priority></url>
  <url><loc>https://onlyou.life/pcos/</loc><priority>0.9</priority></url>

  <!-- Legal pages -->
  <url><loc>https://onlyou.life/terms/</loc><priority>0.3</priority></url>
  <url><loc>https://onlyou.life/privacy/</loc><priority>0.3</priority></url>
  <url><loc>https://onlyou.life/refund/</loc><priority>0.3</priority></url>

  <!-- Blog (dynamically generated from Sanity) -->
  <url><loc>https://onlyou.life/blog/</loc><priority>0.7</priority><changefreq>daily</changefreq></url>
  <!-- Individual blog posts added dynamically -->
</urlset>
```

### Robots.txt

```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://onlyou.life/sitemap.xml
```

### Open Graph & Social Sharing

Every page includes:

```html
<meta property="og:title" content="[Page Title]" />
<meta property="og:description" content="[Page Description]" />
<meta property="og:image" content="https://onlyou.life/api/og?title=[encoded]" />
<meta property="og:url" content="https://onlyou.life/[path]/" />
<meta property="og:type" content="website" />  <!-- "article" for blog posts -->
<meta property="og:locale" content="en_IN" />
<meta property="og:site_name" content="Onlyou" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="[Page Title]" />
<meta name="twitter:description" content="[Page Description]" />
<meta name="twitter:image" content="https://onlyou.life/api/og?title=[encoded]" />
```

### Dynamic OG Image Generation

```typescript
// src/app/api/og/route.tsx
// Uses @vercel/og or next/og for dynamic OG image generation
// Generates branded images with:
// - Onlyou logo
// - Page title (large text)
// - Condition accent color (if applicable)
// - 1200×630px (OG image standard)
```

---

## 18. Structured Data (JSON-LD)

### Organization (Site-wide, in root layout)

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalOrganization",
  "name": "Onlyou",
  "url": "https://onlyou.life",
  "logo": "https://onlyou.life/images/logo.svg",
  "description": "Subscription-based telehealth platform for stigmatized chronic conditions in India.",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "IN"
  },
  "medicalSpecialty": [
    "Dermatology",
    "Urology",
    "Endocrinology",
    "Gynecology"
  ],
  "availableService": [
    {
      "@type": "MedicalTherapy",
      "name": "Hair Loss Treatment"
    },
    {
      "@type": "MedicalTherapy",
      "name": "Erectile Dysfunction Treatment"
    },
    {
      "@type": "MedicalTherapy",
      "name": "Premature Ejaculation Treatment"
    },
    {
      "@type": "MedicalTherapy",
      "name": "Weight Management"
    },
    {
      "@type": "MedicalTherapy",
      "name": "PCOS Treatment"
    }
  ]
}
```

### FAQPage (Homepage + Each Condition Page)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does Onlyou work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Complete a private health assessment, a specialist doctor reviews your case, and prescription treatment is delivered to your door."
      }
    }
    // ... additional FAQ pairs
  ]
}
```

### MedicalCondition (Each Condition Page)

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalCondition",
  "name": "Hair Loss",
  "alternateName": "Androgenetic Alopecia",
  "description": "Progressive thinning of hair...",
  "possibleTreatment": [
    {
      "@type": "MedicalTherapy",
      "name": "Finasteride",
      "drugClass": "5-alpha-reductase inhibitor"
    },
    {
      "@type": "MedicalTherapy",
      "name": "Minoxidil",
      "drugClass": "Vasodilator"
    }
  ]
}
```

### BreadcrumbList (All pages except homepage)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://onlyou.life/" },
    { "@type": "ListItem", "position": 2, "name": "Hair Loss", "item": "https://onlyou.life/hair-loss/" }
  ]
}
```

### Article (Blog Posts)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[Post Title]",
  "image": "[Hero Image URL]",
  "author": { "@type": "Person", "name": "[Author Name]" },
  "publisher": {
    "@type": "Organization",
    "name": "Onlyou",
    "logo": { "@type": "ImageObject", "url": "https://onlyou.life/images/logo.svg" }
  },
  "datePublished": "[ISO Date]",
  "dateModified": "[ISO Date]",
  "description": "[Excerpt]"
}
```

### Validation

All structured data must pass the **Google Rich Results Test** (https://search.google.com/test/rich-results) before launch. This is part of the Phase 10 checkpoint per onlyou-spec-resolved-v4.md: "structured data validates in Google Rich Results Test."

---

## 19. Responsive Design & Breakpoints

### Breakpoint System

| Breakpoint | Width | Target |
|---|---|---|
| `sm` | ≥640px | Large phones (landscape) |
| `md` | ≥768px | Tablets |
| `lg` | ≥1024px | Small laptops |
| `xl` | ≥1280px | Desktops (container max-width) |
| `2xl` | ≥1536px | Large monitors |

**Design approach:** Mobile-first. All CSS starts from mobile and adds complexity at larger breakpoints via Tailwind's `sm:`, `md:`, `lg:` prefixes.

### Layout Behavior

| Element | Mobile (<768px) | Tablet (768-1023px) | Desktop (≥1024px) |
|---|---|---|---|
| Header | Hamburger menu + logo | Hamburger + logo + primary CTA | Full nav links + logo + CTA |
| Hero | Stacked, no illustration | Illustration right-aligned | Side-by-side layout |
| Trust badges | 2×2 grid | 4-column row | 4-column row |
| How It Works | Vertical stack | Horizontal timeline | Horizontal timeline |
| Condition cards | Horizontal scroll | 2×3 grid | 3+2 grid or 5-column |
| Pricing tables | Stacked cards | Side-by-side | Side-by-side with comparison |
| FAQ | Full width | 2-column | 2-column |
| Blog grid | 1 column | 2 columns | 3 columns |
| Footer | Stacked sections | 2-column | 4-column |

### Mobile-Specific Considerations (Indian Market)

- **70%+ traffic will be mobile** — mobile UX is the primary UX
- **Variable network quality** — optimize for 3G/4G (see Section 20)
- **Small screens (5-6.5 inch)** — minimum tap target: 44×44px
- **Android-heavy** — test on Android Chrome (Samsung Internet is #2 browser in India)
- **Font size minimum:** 16px body text to prevent iOS Safari auto-zoom on input focus
- **No horizontal scroll** — ever, on any element except intentionally scrollable carousels

---

## 20. Performance Targets & Optimization

### Core Web Vitals Targets

| Metric | Target | Measurement |
|---|---|---|
| LCP (Largest Contentful Paint) | <2.5s | PageSpeed Insights, field data |
| FID (First Input Delay) | <100ms | Field data (CrUX) |
| CLS (Cumulative Layout Shift) | <0.1 | PageSpeed Insights |
| TTFB (Time to First Byte) | <200ms | CloudFront edge, S3 static files |
| Total page size | <500KB | Initial load (before lazy-loaded images) |

### Optimization Strategies

**Static delivery:**
- Full SSG output served from S3 + CloudFront CDN (17+ Indian edge locations per ARCHITECTURE.md Section 3)
- TTFB <50ms from CloudFront edge for static HTML
- All assets (CSS, JS, images, fonts) served via CloudFront with aggressive caching

**Image optimization:**
- All raster images in WebP format with JPEG fallback (`<picture>` element)
- Responsive images via `srcset` for different viewport widths
- Lazy loading via `loading="lazy"` for below-fold images
- Hero image preloaded via `<link rel="preload">`
- Maximum image quality: 80% for hero, 70% for thumbnails
- SVG for all icons and logos (inline where possible)

**Font optimization:**
- Self-hosted WOFF2 fonts (no Google Fonts external request)
- `font-display: swap` to prevent invisible text during load
- Subset fonts to Latin + Latin Extended (covers English) — Hindi characters deferred to Phase 2 localization
- Preload primary font weight: `<link rel="preload" href="/fonts/dm-sans-500.woff2" as="font" crossorigin>`

**JavaScript optimization:**
- Zero client-side JavaScript for static content pages (condition pages, legal pages, about)
- Minimal JS for interactive components (FAQ accordion, mobile menu, pricing tabs)
- No heavy frameworks beyond Next.js core
- No third-party widget scripts in initial load (analytics deferred via `defer` or `loading="lazy"`)

**CSS optimization:**
- Tailwind CSS purges unused classes at build time
- Critical CSS inlined in `<head>` for above-fold content
- Total CSS bundle target: <30KB (gzipped)

### Indian Network Optimization

- **3G target:** Homepage fully interactive within 5 seconds on 3G (1.5 Mbps)
- **Jio/Airtel 4G target:** Homepage interactive within 2 seconds
- **CloudFront edge locations in India:** Mumbai, Delhi, Chennai, Bangalore, Hyderabad, Kolkata + additional (per ARCHITECTURE.md — 17+ locations)
- **Compression:** Brotli (primary) + gzip (fallback) via CloudFront

---

## 21. Navigation & Header/Footer

### Header (Sticky, All Pages)

**Desktop (≥1024px):**

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo]    Hair Loss  ED  PE  Weight  PCOS  How It Works  Pricing   [Start Assessment →]  │
└────────────────────────────────────────────────────────────────┘
```

**Mobile (<1024px):**

```
┌──────────────────────────────────────┐
│  [☰]  [Logo]        [Start Assessment →]  │
└──────────────────────────────────────┘
```

**Behavior:**
- Transparent background at top of page → solid white with shadow on scroll (after 100px scroll)
- Sticky positioning (`position: sticky; top: 0;`)
- Z-index above all page content
- "Start Assessment" CTA always visible in header (primary conversion action)
- Condition page names in nav link to respective condition pages
- Active page highlighted in nav

**Mobile Hamburger Menu:**
- Slide-in from left (full height)
- Menu items: Hair Loss, ED, PE, Weight, PCOS, How It Works, Pricing, About, Blog
- Footer links: Terms, Privacy, Refund
- Close button (×) in top right
- Background overlay (closes menu on tap)

### Footer (All Pages)

**Layout:** 4-column (desktop), stacked (mobile)

```
┌──────────────────────────────────────────────────────────────────────┐
│  COLUMN 1          COLUMN 2          COLUMN 3          COLUMN 4      │
│  [Logo]            Conditions         Company            Legal        │
│  "Private          · Hair Loss        · How It Works     · Terms      │
│   healthcare,      · ED               · Pricing          · Privacy    │
│   delivered        · PE               · About            · Refund     │
│   to you."         · Weight           · Blog                          │
│                    · PCOS                                              │
│                                                                       │
│  [App Store] [Play Store]                                             │
│──────────────────────────────────────────────────────────────────────│
│  © 2026 Onlyou Healthcare Pvt. Ltd.  ·  Made in India 🇮🇳                │
│  onlyou.co.in (registered domain, per PROJECT-OVERVIEW.md Section 10) │
└──────────────────────────────────────────────────────────────────────┘
```

**Footer notes:**
- `onlyou.co.in` used for legal/regulatory filings and email domain (per PROJECT-OVERVIEW.md Section 10); 301 redirects to `onlyou.life`
- No social media links at MVP launch (add when active social presence established)
- App Store + Play Store download badges prominently in footer

---

## 22. Analytics & Tracking

### Analytics Provider

**Mixpanel** or **Amplitude** (same decision as patient app per APP-PATIENT.md Section 24.2 — decide at implementation). Alternative: **Plausible Analytics** (privacy-first, no cookie banner needed, GDPR/DPDPA friendly).

### Events to Track

| Event | Properties | Purpose |
|---|---|---|
| `page_view` | page_path, referrer, device_type, utm_source/medium/campaign | Traffic analysis |
| `cta_clicked` | cta_text, cta_location (hero/section/footer), destination | Conversion funnel |
| `condition_card_clicked` | condition | Interest tracking |
| `pricing_viewed` | condition (if on condition page) | Purchase intent |
| `faq_expanded` | question_text, page_path | Content engagement |
| `app_download_clicked` | platform (ios/android), source_page | Conversion |
| `blog_post_read` | post_slug, category, read_percentage | Content engagement |
| `smart_banner_clicked` | — | App install attribution |
| `smart_banner_dismissed` | — | UX optimization |
| `social_share_clicked` | platform (whatsapp/twitter/facebook), content_type | Virality |

### UTM Parameter Handling

All CTAs linking to the app stores should pass UTM parameters for attribution:
- `utm_source=landing_page`
- `utm_medium=web`
- `utm_campaign=[page_slug]` (e.g., `hair-loss`, `homepage`)

These flow through to the app for install attribution (via app store campaign tracking or Adjust/Branch deep linking in Phase 2).

### Cookie Consent

For DPDPA compliance (per APP-PATIENT.md Section 25.3 principles):
- If using Mixpanel/Amplitude: cookie consent banner required
- If using Plausible: no cookies needed, no consent banner required
- Consent banner: simple, non-dark-pattern, with "Accept" and "Decline" (no pre-checked boxes)
- Declining analytics does not block any site functionality

### Google Search Console

- Verify site ownership via DNS TXT record on `onlyou.life`
- Submit sitemap (`https://onlyou.life/sitemap.xml`)
- Monitor Core Web Vitals, mobile usability, structured data validity
- Track search queries, impressions, CTR per condition page

---

## 23. Accessibility & Localization

### Accessibility (WCAG 2.1 AA Target)

| Requirement | Implementation |
|---|---|
| Keyboard navigation | All interactive elements focusable, visible focus rings |
| Screen reader | Semantic HTML, ARIA labels on interactive components, alt text on all images |
| Color contrast | Minimum 4.5:1 for body text, 3:1 for large text (headings, CTAs) |
| Focus management | Skip-to-content link, logical tab order, focus trap in modals |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` disables animations |
| Zoom support | Page remains usable at 200% zoom (no horizontal scroll) |
| Link text | Descriptive link text (no "click here") |
| Form inputs | Associated labels, error messages, required field indicators (not applicable at MVP — no forms on landing page except blog search) |

### Localization

**MVP:** English only (`lang="en"`, `hreflang="en-IN"`)

**Phase 2 additions:**
- Hindi (`/hi/` prefix or subdomain) — covers 40%+ of Indian internet users
- Language switcher in header
- Sanity CMS supports multi-language content natively
- Condition pages translated by medical content writer (not machine translation — medical accuracy is critical)
- RTL support not needed (Hindi is LTR)

---

## 24. Security & Privacy

### Landing Page Security

Since the landing page is a fully static site with no user authentication, no forms, and no API calls, the attack surface is minimal. Security measures:

| Measure | Implementation |
|---|---|
| HTTPS | Enforced via CloudFront + AWS ACM certificate; HTTP → HTTPS redirect |
| Content Security Policy | Strict CSP headers via CloudFront response headers policy |
| X-Frame-Options | `DENY` (prevent clickjacking) |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | Disable camera, microphone, geolocation (not needed on landing page) |
| Subresource Integrity | SRI hashes on any external script (e.g., analytics) |
| Rate limiting | Not needed for static site (CloudFront handles DDoS natively) |

### Privacy on Landing Page

- **No user data collection** — no login, no forms, no PII captured on landing page
- **Analytics only with consent** (if cookie-based analytics is used)
- **No third-party tracking pixels** — no Facebook Pixel, no Google Ads remarketing at MVP. Add with explicit consent mechanism in Phase 2.
- **No fingerprinting** — no canvas fingerprinting, no device ID collection
- **External links:** All links to external sites (App Store, Play Store) open in new tab with `rel="noopener noreferrer"`

---

## 25. Deployment & Hosting

### MVP Deployment (Static Export)

```
Build → Export to static HTML/CSS/JS → Upload to S3 → Serve via CloudFront
```

| Layer | Service | Details |
|---|---|---|
| Hosting | AWS S3 (Mumbai `ap-south-1`) | Static website hosting, SSE-S3 encryption at rest |
| CDN | AWS CloudFront | 17+ Indian edge locations, Brotli/gzip, custom domain, ACM cert |
| DNS | Route 53 | `onlyou.life` A record → CloudFront distribution |
| SSL | AWS ACM | Free, auto-renewing certificate for `onlyou.life` + `*.onlyou.life` |
| CI/CD | GitHub Actions | Push to `main` → build → deploy to S3 → invalidate CloudFront |

**Build command:** `pnpm --filter landing build` (runs `next build` which, with `output: 'export'` in `next.config.js`, automatically produces a fully static `out/` directory — no separate `next export` command needed; `next export` was deprecated in Next.js 13.3+)

**Estimated monthly cost:** <$5/month (S3 storage is cents, CloudFront free tier covers 1TB/month, Route 53 $0.50/zone)

### Blog ISR Migration (When Needed)

When blog content frequency requires ISR (content changes that need to reflect within minutes rather than waiting for a full rebuild), switch from `output: 'export'` to standard Next.js deployment:

**Option A: AWS Fargate** — Deploy Next.js app to Fargate alongside the API (per ARCHITECTURE.md). Cheapest option within existing infrastructure.

**Option B: Vercel** — Deploy only the landing page to Vercel. Simplest path, optimized for Next.js, built-in ISR support. Cost: Free tier (hobby) → Pro ($20/mo) if traffic warrants it.

**Decision:** Defer to implementation. Start with static S3 + CloudFront; migrate when blog publishing frequency exceeds 1 post/week.

### Subdomain Configuration

Per PROJECT-OVERVIEW.md Section 10 — domain strategy:

| Domain | Points To | Type |
|---|---|---|
| `onlyou.life` | CloudFront (landing page) | A record (alias) |
| `www.onlyou.life` | 301 redirect → `onlyou.life` | CNAME + redirect rule |
| `onlyou.co.in` | 301 redirect → `onlyou.life` | A record + redirect |
| `doctor.onlyou.life` | Doctor portal ALB/deployment | CNAME |
| `admin.onlyou.life` | Admin portal ALB/deployment | CNAME |
| `nurse.onlyou.life` | Nurse portal ALB/deployment | CNAME |
| `lab.onlyou.life` | Lab portal ALB/deployment | CNAME |
| `pharmacy.onlyou.life` | Pharmacy portal ALB/deployment | CNAME |

---

## 26. Content Guidelines & Tone of Voice

### Writing Principles

1. **Empathetic, not clinical** — "We understand these conditions are tough to talk about" not "Patients presenting with androgenetic alopecia"
2. **Empowering, not patronizing** — "Take control of your health" not "You need help"
3. **Direct, not salesy** — "Here's what's included" not "Sign up NOW for this AMAZING offer!!!"
4. **Honest, not exaggerated** — "Most patients see results in 3-6 months" not "Guaranteed hair regrowth in weeks"
5. **Discreet, not ashamed** — Normalize the conditions while respecting privacy concerns
6. **Indian English** — Use Indian spelling conventions (programme, colour — though healthcare content typically uses American medical terminology: tumor not tumour). Use ₹ for prices, Indian number formatting (1,00,000 not 100,000).

### Regulatory Content Rules

- **No specific drug claims** — do not claim "Finasteride stops hair loss"; instead say "Prescription DHT blockers can help slow hair loss in clinical studies"
- **No guaranteed outcomes** — always use "may", "can", "results vary"
- **No comparison to specific competitors by name** — describe category differences ("Unlike supplement brands..." not "Unlike Man Matters...")
- **No patient photos without consent** — use stock/illustration for MVP (Phase 2: Before/After gallery with consent infrastructure)
- **Include disclaimer** on every condition page: "This information is for educational purposes. Consult a healthcare provider for medical advice. Individual results may vary."
- **Schedule H medication note** on ED/PE pages: "These are prescription-only medications and will only be dispensed after evaluation by a licensed doctor."

### Terminology Glossary

| Use | Don't Use |
|---|---|
| "Treatment plan" | "Cure" |
| "Prescription medication" | "Pills", "drugs" |
| "Licensed doctor" | "Our doctor" (implies employment) |
| "Specialist" | "Expert" (legally loaded) |
| "Assessment" | "Diagnosis" (only doctors diagnose) |
| "Treatment delivered" | "Drugs delivered" |
| "Private healthcare" | "Secret healthcare" |
| "Discreet packaging" | "Hidden packaging" |

---

## 27. Error Pages & Edge Cases

### 404 Page (`not-found.tsx`)

- **Headline:** "This page doesn't exist"
- **Body:** "The page you're looking for may have been moved or doesn't exist. Try one of these instead:"
- Links to: Homepage, Conditions (all 5), Pricing, Blog
- Search bar (if blog search is implemented)
- Same header/footer as rest of site
- Friendly illustration (not a broken robot or sad face — maintain brand warmth)
- **Do NOT** redirect to homepage automatically (breaks user expectation, hurts SEO)

### 500 Error Page (`error.tsx`)

- **Headline:** "Something went wrong"
- **Body:** "We're working on fixing this. Please try refreshing the page."
- CTA: `[Go to Homepage]`
- **Note:** Extremely unlikely for a static site — this mainly catches ISR/SSR errors if deployed on Fargate/Vercel in future

### Edge Cases

| Scenario | Handling |
|---|---|
| JavaScript disabled | All critical content is server-rendered HTML; FAQ works without JS (though animations won't); site is fully usable |
| Slow connection (2G) | Critical CSS inlined, hero image preloaded, body fonts use `font-display: swap` |
| Very old browser (IE11) | Not supported (IE11 is <0.5% of Indian traffic); show "Please upgrade your browser" message via `<noscript>` or simple UA check |
| Screen reader | Full semantic HTML, ARIA labels, skip-to-content link |
| User navigates from portal subdomain | No cross-contamination; landing page is independent Next.js app with no shared cookies/sessions with portals |
| Sanity CMS down | Blog pages served from build-time static cache; only new/updated posts fail to render until CMS is back |
| CloudFront edge miss | Falls back to S3 origin in ap-south-1 (Mumbai); <100ms additional latency |

---

## 28. Testing Checklist

### Pre-Launch Manual Testing

**Device Testing (per onlyou-spec-resolved-v4.md Phase 11 checkpoint):**

| Device | Browser | Priority | Notes |
|---|---|---|---|
| Samsung Galaxy M13 | Chrome | P0 | Budget Android (target demographic) |
| Redmi Note 12 | Chrome, Samsung Internet | P0 | Most popular OEM in India |
| iPhone 13 | Safari | P0 | iOS baseline |
| iPhone SE (2nd gen) | Safari | P1 | Small screen iOS |
| iPad (any) | Safari | P1 | Tablet layout |
| Desktop | Chrome, Firefox, Edge | P1 | Desktop experience |

**Page-by-Page Checks:**

- [ ] Homepage: All sections render, CTA links work, FAQ accordion functions, trust badges visible
- [ ] All 5 condition pages: Content renders, pricing matches spec (onlyou-spec-resolved-v4.md Section 5), CTA links to correct app store
- [ ] Pricing page: All prices match spec exactly, Weight Management shows both tiers
- [ ] How It Works: Steps render, cross-links work
- [ ] About: Content renders, contact information present
- [ ] Terms/Privacy/Refund: Content renders, links from footer work
- [ ] Blog: Listing page loads, individual posts render, Sanity content displays
- [ ] 404 page: Navigate to `/nonexistent-page/` — custom 404 renders

**SEO Checks:**

- [ ] Every page has unique `<title>` and `<meta description>`
- [ ] Every page has single H1
- [ ] Heading hierarchy is correct (H1 → H2 → H3, no skips)
- [ ] Canonical URLs present on all pages
- [ ] Sitemap at `/sitemap.xml` includes all pages
- [ ] Robots.txt at `/robots.txt` allows crawling, references sitemap
- [ ] JSON-LD structured data passes Google Rich Results Test for: Organization, FAQPage (homepage + condition pages), MedicalCondition (condition pages), BreadcrumbList (all pages), Article (blog posts)
- [ ] Open Graph tags render correctly (test with Facebook Sharing Debugger, Twitter Card Validator)

**Performance Checks:**

- [ ] PageSpeed Insights score: ≥90 mobile, ≥95 desktop
- [ ] LCP <2.5s on 4G connection
- [ ] Total page weight <500KB (initial load)
- [ ] No layout shift (CLS <0.1)
- [ ] All images serve WebP with JPEG fallback
- [ ] Fonts load with `font-display: swap` (no invisible text flash)

**Cross-Reference Accuracy Checks (Critical):**

- [ ] All prices on landing page match onlyou-spec-resolved-v4.md Section 5 exactly
- [ ] Condition doctor types match PROJECT-OVERVIEW.md Section 4
- [ ] Photo/blood work requirements per condition match PROJECT-OVERVIEW.md Section 4
- [ ] Plan durations match PROJECT-OVERVIEW.md Section 5 (Monthly / Quarterly / 6-Month, no annual)
- [ ] Privacy claims match ARCHITECTURE.md Section 14 and APP-PATIENT.md Section 25
- [ ] Partner anonymization claims match PROJECT-OVERVIEW.md Section 7
- [ ] Subscription "what's included" matches PROJECT-OVERVIEW.md Section 5
- [ ] Blood work pricing note matches onlyou-spec-resolved-v4.md Section 5

**⚠️ Known Cross-System Issue — APP-PATIENT.md Pricing:** APP-PATIENT.md Section 11.1 contains stale/incorrect pricing from an earlier spec version (e.g., ED listed at ₹799/mo instead of ₹1,299/mo, PCOS at ₹1,199/mo instead of ₹1,499/mo, Weight Standard at ₹2,499/mo instead of ₹2,999/mo). The authoritative pricing source is **onlyou-spec-resolved-v4.md Section 5** and **PROJECT-OVERVIEW.md Section 5**, which both match this landing page spec. APP-PATIENT.md Section 11.1 must be corrected before development to prevent the patient app from showing different prices than the landing page.

### Phase 10 Checkpoint (per onlyou-spec-resolved-v4.md)

> **✅ Checkpoint:** Landing page live at `onlyou.life`, all 5 condition pages render with SEO meta tags, structured data validates in Google Rich Results Test, blog CMS functional.

---

## 29. Phase 2 Features (Deferred)

These are acknowledged, documented, and will be implemented after MVP launch:

| Feature | Dependency | Notes |
|---|---|---|
| Before/After gallery | Patient consent infrastructure in app | Requires photo consent flow, anonymization, admin approval per PORTAL-ADMIN.md |
| Patient testimonials | Real patients on platform | Text/video testimonials with consent |
| Hindi localization | Content translation + Sanity i18n | Medical content requires professional translation, not machine |
| Google Ads / Meta Ads | Campaign budget | Remarketing pixels with DPDPA-compliant consent |
| WhatsApp click-to-chat | Customer support staffing | Floating WhatsApp button linking to business WhatsApp |
| Live chat widget | Customer support staffing | Intercom/Crisp integration |
| Referral program landing page | Referral system in app (per onlyou-spec-resolved-v4.md Section 10) | "Refer a friend" page with unique referral link generation |
| Doctor profiles page | Doctor onboarding at scale | Show specialist credentials, photo, experience |
| Press / Media page | Media coverage | PR mentions, press kit download |
| Careers page | Hiring needs | Team growth page |
| Web-based assessment | Assessment engine ported to web | Currently app-only; web assessment for higher conversion from landing page (removes app download friction) |

---

*This is the complete Landing Page specification. All pricing, feature descriptions, privacy claims, and technical details are cross-referenced against PROJECT-OVERVIEW.md, onlyou-spec-resolved-v4.md, ARCHITECTURE.md, APP-PATIENT.md, PORTAL-DOCTOR.md, PORTAL-NURSE-FIXED.md, PORTAL-LAB-FIXED.md, PORTAL-PHARMACY.md, and PORTAL-ADMIN.md. Refer to this document as the single source of truth for all landing page implementation. Build during Phase 10 (Weeks 26-27) per the project timeline.*
