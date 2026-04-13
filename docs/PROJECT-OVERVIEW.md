# ONLYOU — PROJECT OVERVIEW

> **What we're building, why we're building it, and what makes it different.**
> Source of truth: onlyou-spec-resolved-v4.md + Architecture Blueprint

---

## 1. WHAT IS ONLYOU?

Onlyou is a **subscription-based, vertically-integrated telehealth platform for India** that treats stigmatized chronic conditions. It is NOT a doctor booking app, NOT an online pharmacy, NOT a supplement store. It owns the **entire clinical journey** — from diagnosis to delivery to ongoing care — in one seamless experience.

**One subscription = AI assessment + doctor consultation + prescription + medication delivery + ongoing monitoring.**

### The One-Liner
> "The entire healthcare journey for conditions people are too embarrassed to visit a clinic for — delivered discreetly to your door, managed by real doctors."

---

## 2. WHY ARE WE BUILDING THIS?

### The Problem

Millions of Indians suffer from chronic conditions like hair loss, erectile dysfunction, premature ejaculation, weight issues, and PCOS. They won't walk into a clinic because of:

- **Shame & stigma** — a 28-year-old man won't ask a pharmacist for ED pills; a woman won't discuss PCOS with a male GP in a crowded clinic
- **Fragmented care** — Practo does bookings only, PharmEasy does delivery only, Man Matters sells supplements (not real treatment). Nobody owns the full loop.
- **Access barriers** — specialist dermatologists and urologists are concentrated in tier-1 cities. A man in Vizag has to travel to Hyderabad for a urologist visit.
- **Compliance failure** — chronic conditions need 6-12+ months of treatment. Without ongoing monitoring and easy refills, patients stop after 2 months.

### The Market

- India's telemedicine market: ₹5,300 Cr (2023) → projected ₹18,000+ Cr by 2027
- 60M+ Indian men experience hair loss; <5% seek treatment
- 52% of Indian men aged 40-70 experience some degree of ED
- 1 in 5 Indian women has PCOS
- India's obesity rate doubled in the last decade

### Why Now

- Post-COVID acceptance of telemedicine is permanent
- Telemedicine Practice Guidelines 2020 legalized async teleconsultation
- GLP-1 patent expiry (semaglutide) in India opens weight management market
- WhatsApp penetration (500M+ users) enables discreet healthcare communication
- UPI Autopay enables frictionless recurring subscriptions

---

## 3. WHAT MAKES ONLYOU DIFFERENT?

### vs. Practo / MFine / Tata 1mg Consultation
They are marketplaces — they connect you to a random doctor. No subscription, no medication delivery, no follow-up, no ongoing care plan. You get a 15-minute video call and a PDF prescription, then you're on your own.

### vs. Man Matters / Be Bodywise / Mars by GHC
They sell **supplements and cosmetics**, not prescription medication. Their "doctor consultation" is a rubber-stamp for selling branded products at 3x markup. No clinical AI, no ongoing monitoring, no lab work integration.

### vs. Apollo 24/7 / PharmEasy
They're **pharmacy delivery** services with bolted-on teleconsultation. No condition-specific workflows, no AI pre-assessment, no subscription model, no integrated lab work, no follow-up cadence.

### Onlyou's Moat
1. **Vertically integrated** — we own the doctor relationship, pharmacy fulfillment, and delivery (not a marketplace)
2. **AI-first clinical workflow** — Claude-powered pre-assessment means doctors review structured AI summaries, not raw questionnaires (10x throughput per doctor)
3. **Subscription on chronic conditions** — high LTV, naturally low churn (patients need 6-12 months of treatment)
4. **Discreet by design** — plain packaging, privacy-first UX, neutral app icon, anonymous IDs for pharmacy/lab partners
5. **Condition-specific everything** — questionnaires, AI prompts, prescription templates, follow-up cadences, and lab panels are all purpose-built per vertical

---

## 4. MVP VERTICALS (5)

| # | Vertical | Target | Doctor Type | Photos | Blood Work | Monthly Price |
|---|---|---|---|---|---|---|
| 1 | **Hair Loss** | Men 18-45, Women AGA | Dermatologist / Trichologist | 4 required | Sometimes | ₹999 |
| 2 | **ED (Erectile Dysfunction)** | Men 25-60 | Urologist / Andrologist | None | Sometimes | ₹1,299 |
| 3 | **PE (Premature Ejaculation)** | Men 18-60 | Urologist / Andrologist / Sexual Medicine | None | Rarely | ₹1,299 |
| 4 | **Weight Management** | M&F 18-55, BMI ≥25 | Endocrinologist / IM | 2 required | Usually | ₹2,999 (Standard) / ₹9,999 (GLP-1) |
| 5 | **PCOS** | Women 18-40 | Gynecologist / Endocrinologist | Optional | Almost always | ₹1,499 |

### Deferred to Phase 2
- TRT (Testosterone Replacement Therapy) — requires nurse-administered injections
- Menopause/Perimenopause — requires HRT expertise and DEXA scan referrals

### Build Order (Priority)
Hair Loss → ED → PE → Weight → PCOS

---

## 5. THE SUBSCRIPTION MODEL

### What's Included in Every Subscription
1. **AI-powered pre-assessment** — condition-specific questionnaire analyzed by Claude
2. **Async doctor consultation** — specialist reviews case, asks follow-ups if needed
3. **E-prescription** — generated from condition-specific templates, PDF stored
4. **Medication** — discreet local delivery with OTP confirmation
5. **Ongoing check-ins** — 4-week, 3-month, 6-month cadence
6. **First blood panel** — included when clinically indicated (not all verticals need it)

### Plan Durations (All Verticals)
- **Monthly** — full price, maximum flexibility
- **Quarterly** — 15-17% savings
- **6-Month** — 22-25% savings
- No annual plans

### Pricing Summary

| Vertical | Monthly | Quarterly | 6-Month |
|---|---|---|---|
| Hair Loss | ₹999/mo | ₹2,499/qtr (₹833/mo) | ₹4,499/6mo (₹750/mo) |
| ED | ₹1,299/mo | ₹3,299/qtr (₹1,100/mo) | ₹5,999/6mo (₹1,000/mo) |
| PE | ₹1,299/mo | ₹3,299/qtr (₹1,100/mo) | ₹5,999/6mo (₹1,000/mo) |
| Weight (Standard) | ₹2,999/mo | ₹7,999/qtr (₹2,666/mo) | ₹14,999/6mo (₹2,500/mo) |
| Weight (GLP-1) | ₹9,999/mo | ₹24,999/qtr (₹8,333/mo) | ₹44,999/6mo (₹7,500/mo) |
| PCOS | ₹1,499/mo | ₹3,799/qtr (₹1,266/mo) | ₹6,999/6mo (₹1,167/mo) |

---

## 6. CORE USER JOURNEY (HIGH-LEVEL)

```
PATIENT DOWNLOADS APP
        │
        ▼
CREATES ACCOUNT (Email/Google/Apple + mandatory phone OTP verification)
        │
        ▼
SELECTS CONDITION (Hair Loss / ED / PE / Weight / PCOS)
        │
        ▼
COMPLETES QUESTIONNAIRE (condition-specific, 20-35 questions, ~8-12 min)
        │
        ▼
UPLOADS PHOTOS (if required by vertical)
        │
        ▼
AI PRE-ASSESSMENT (Claude analyzes → classification, risk flags, contraindications)
        │
        ▼
SELECTS PLAN & PAYS (Monthly/Quarterly/6-Month via Razorpay)
        │
        ▼
DOCTOR REVIEWS CASE (specialist sees AI summary + raw data → 3-8 min per case)
        │
        ├─── PRESCRIBES ──────────────────────────────┐
        │                                              ▼
        ├─── ORDERS BLOOD WORK ──┐          Prescription → Pharmacy
        │                        ▼          Pharmacy prepares → Ready
        │              Nurse visits home     Coordinator arranges delivery
        │              Collects blood        Delivery person → OTP → Delivered
        │              Records vitals        
        │              Delivers to lab       
        │              Lab processes         
        │              Results uploaded      
        │              Doctor reviews        
        │              Then prescribes ──────────────────┘
        │
        ├─── REQUESTS MORE INFO ──→ Chat message → Patient responds → Doctor re-reviews
        │
        ├─── REFERS ──→ Partner clinic near patient
        │
        └─── REFUNDS ──→ Full/partial refund if cannot treat
        
        │
        ▼
ONGOING CARE (check-ins at 4 weeks / 3 months / 6 months, auto-reorder on subscription renewal)
```

---

## 7. SYSTEM ACTORS & INTERFACES

| # | Actor | Interface | URL/Platform | Primary Device |
|---|---|---|---|---|
| 1 | **Patient** | Mobile App | App Store + Play Store | Mobile (React Native Expo) |
| 2 | **Public/Prospect** | Landing Page | `onlyou.life` | Web (responsive) |
| 3 | **Doctor** | Doctor Dashboard | `doctor.onlyou.life` | Desktop-first, mobile-responsive |
| 4 | **Admin/Coordinator** | Admin Dashboard | `admin.onlyou.life` | Mobile-first (founder manages from phone) |
| 5 | **Nurse** | Nurse Portal | `nurse.onlyou.life` | Mobile-only PWA (always on the road) |
| 6 | **Lab Technician** | Lab Portal | `lab.onlyou.life` | Mobile-first PWA (tablet/phone at counter) |
| 7 | **Pharmacy Staff** | Pharmacy Portal | `pharmacy.onlyou.life` | Mobile-first PWA (phone at counter) |
| 8 | **Delivery Person** | SMS Link | Single-use per delivery | Mobile web page (no portal) |

### Privacy Architecture
- **Lab partners** see: anonymous patient ID, tests ordered, sample details. They do NOT see patient name, phone, address, or diagnosis.
- **Pharmacy partners** see: anonymous patient ID, prescription (medications + dosages), doctor name. They do NOT see diagnosis, questionnaire data, or patient address.
- **Delivery person** sees: pickup address (pharmacy), delivery address (patient), patient phone, package ID. No medication names or diagnosis.
- **Nurses** see: patient name, address, tests to collect. No diagnosis or questionnaire data.

---

## 8. MVP CONSTRAINTS (What We're NOT Building)

| Feature | Status | Rationale |
|---|---|---|
| Video consultation | Scaffolded but muted (auto-skips) | No video infrastructure needed for async model |
| Nurse injection administration | Scaffolded but muted (fields exist, feature flagged) | Requires regulatory approval + cold chain for some medications |
| Third-party lab APIs | Not built | Partner diagnostic centres with portal instead |
| Shiprocket/Delhivery integration | Not built | Local delivery (Rapido/Dunzo/own person) |
| Cold chain tracking | Not built | Manual insulated bag for GLP-1 if needed |
| Face-match identity verification | Not built | Government ID photo upload only |
| ABHA ID integration | Not built | Not mandated, no clear value for MVP |
| GPS check-in for nurses | Not built | Phase 2 |
| Own pharmacy (drug license) | Not built | Partner pharmacy model for MVP |
| TRT vertical | Not built | Requires injection infrastructure |
| Menopause vertical | Not built | Requires HRT expertise + DEXA scans |

### Scale Triggers (When to Automate)
- **100+ orders/month** → Integrate Shiprocket/Delhivery for delivery automation
- **Multi-city launch** → Lab APIs (Thyrocare, SRL), cold chain tracking
- **500+ patients** → Extract notification service to separate process
- **2,000+ patients** → PDF generation to Lambda, consider read replicas
- **5,000+ patients** → Evaluate microservice extraction for high-traffic modules

---

## 9. TEAM & ROLES

### Development Team (MVP)
- **Non-technical founder** — all code written by Claude AI via Cursor IDE or Antigravity IDE
- No prior coding experience; Claude handles all code generation, debugging, and iteration
- Founder's role: describe what to build, test by using the app, report what's wrong or missing
- Development machine: Windows laptop
- iOS builds: EAS Build (cloud) → TestFlight (Apple Developer Account)
- Android builds: Local Expo dev client + Android emulator/physical device
- Web portals: localhost + browser DevTools
- Backend: Local Docker (PostgreSQL + Redis) or cloud dev DB
- Testing: 100% manual — click through every flow, visually verify, report issues back to Claude

### Operational Team (Launch)
- **Founder/Coordinator** — uses admin dashboard, manages partner relationships, arranges deliveries
- **Doctors** — contracted specialists (per-case or retainer), use doctor dashboard
- **Nurses** — field staff for blood collection, use nurse portal
- **Partner Labs** — existing diagnostic centres, use lab portal
- **Partner Pharmacies** — existing pharmacies, use pharmacy portal

---

## 10. DOMAIN STRATEGY

| Domain | Purpose |
|---|---|
| `onlyou.life` | Primary patient-facing brand, landing page |
| `doctor.onlyou.life` | Doctor dashboard |
| `admin.onlyou.life` | Admin/coordinator dashboard |
| `nurse.onlyou.life` | Nurse portal |
| `lab.onlyou.life` | Lab portal |
| `pharmacy.onlyou.life` | Pharmacy portal |
| `onlyou.co.in` | 301 redirect to onlyou.life, used for legal/regulatory filings, email domain |

---

## 11. TIMELINE

**Total estimated build: ~29 weeks**

> **Note:** Timeline estimated for non-technical founder with all code written by Claude AI (via Cursor/Antigravity IDE). Each phase ends with a testable checkpoint — see v4 spec Section 9 for checkpoint criteria. Founder tests by using the app (clicking through flows, checking visuals), not by reading code. Continuous testing on Android (instant iteration) with periodic iOS verification via TestFlight.

| Phase | Weeks | Focus |
|---|---|---|
| 1. Foundation | 1-3 | Auth, user profiles, S3, feature flags |
| 2. Core Clinical (Hair Loss) | 3-8 | Questionnaire engine, AI, consultation lifecycle, photos, prescriptions |
| 3. Doctor Dashboard | 8-11 | Case queue, case review, prescription builder, messaging |
| 4. Blood Work & Nurse System | 11-14 | Partner mgmt, lab orders, nurse portal, lab portal, SLA engine |
| 5. Delivery & Payment | 14-17 | Razorpay, pharmacy portal, delivery system, orders, wallet, admin dashboard |
| 6. Patient App Tracking | 17-19 | Activity tab, home tab, profile, notifications |
| 7. ED + PE Verticals | 19-22 | ED questionnaire/AI/templates, PE questionnaire/AI/templates, comorbidity |
| 8. Weight Management | 22-24 | Weight questionnaire/AI/templates, GLP-1 tier |
| 9. PCOS | 24-26 | PCOS questionnaire/AI/templates, period tracker |
| 10. Landing Page & SEO | 26-27 | Homepage, condition pages, legal pages, blog setup |
| 11. Polish & Launch | 27-29 | QA, security audit, load testing, app store submission, deployment |

---

## 12. KEY DECISIONS LOG

These are final decisions made during v4 spec resolution. They cannot be revisited without founder approval.

| # | Decision | Chosen | Rejected | Rationale |
|---|---|---|---|---|
| 1 | Consultation model | Async (text + photos) | Video (muted) | Simpler, faster, no video infra needed |
| 2 | Pharmacy model | Partner pharmacy | Own pharmacy | No Drug License needed, launch faster |
| 3 | AI timing | After questionnaire submission | Real-time during questionnaire | Simpler, clinical benefit minimal |
| 4 | Field staff role | Nurse (expanded) | Phlebotomist (limited) | Future-proofed for injections |
| 5 | Subscription plans | Monthly / Quarterly / 6-Month | Annual | No annual — too long commitment for new platform |
| 6 | Delivery model | Local (Rapido/Dunzo/own) | Shiprocket/Delhivery | Single-city MVP, coordinator-managed |
| 7 | Identity verification | Gov ID photo only | Selfie + face match | Simpler for MVP, add later |
| 8 | ABHA integration | Not built | Built | No mandate, no clear value |
| 9 | Blood work upload | Patient can self-upload | Must use platform lab | Saves ops cost when patient has recent results |
| 10 | Cold chain | Manual insulated bag | System-tracked cold chain | Only needed for GLP-1, defer to Phase 2 |
| 11 | API protocol | tRPC (internal) + REST (external) | GraphQL | 40-50% less boilerplate, zero codegen |
| 12 | Portal architecture | Separate Next.js apps per subdomain | Single Next.js with middleware routing | Independent deployment, security isolation |
| 13 | Real-time | SSE + Redis Pub/Sub | WebSockets (Socket.io) | No sticky sessions on Fargate |
| 14 | Auth | Custom NestJS JWT + WhatsApp OTP | Clerk/Auth0/Firebase Auth | Full DPDPA control, cheapest at scale |
| 15 | Auth (patient) | Email/Google/Apple + mandatory phone OTP | Phone OTP only | Better onboarding UX, phone still mandatory for prescriptions |

---

*This document provides the high-level "what and why." For detailed specifications, see the individual portal, vertical, workflow, and architecture documents.*
