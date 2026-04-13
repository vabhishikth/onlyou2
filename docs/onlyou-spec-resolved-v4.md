# ONLYOU PLATFORM — RESOLVED SPECIFICATION (v4)
## Single Source of Truth — All Conflicts Resolved

> **This document supersedes all previous specs.** When any conflict exists between this document and earlier materials (Notion Dev Bible, Notion User Flow, or v3 .md specs), this document wins.
>
> **Based on:** v3 .md spec files (master + 4 verticals) as foundation, with conflict resolutions applied per founder decisions dated Feb 27, 2026.

---

# TABLE OF CONTENTS

1. [Conflict Resolution Log](#1-conflict-resolution-log)
2. [Platform Overview (Updated)](#2-platform-overview)
3. [Tech Stack & Project Structure](#3-tech-stack--project-structure)
4. [Portal & Dashboard Deep Dive](#4-portal--dashboard-deep-dive)
5. [Updated Pricing (All Verticals)](#5-updated-pricing)
6. [PE (Premature Ejaculation) Vertical Specification — NEW](#6-pe-premature-ejaculation-vertical-specification)
7. [Nurse System (Replacing Phlebotomist)](#7-nurse-system)
8. [Video Consultation System (Muted for MVP)](#8-video-consultation-system)
9. [Updated Build Order](#9-updated-build-order)
10. [What Stays Unchanged from v3 .md Specs](#10-what-stays-unchanged)

---

# 1. CONFLICT RESOLUTION LOG

Every conflict between the Notion Dev Bible, Notion User Flow, and v3 .md specs — resolved with rationale.

## CRITICAL CONFLICTS

### 1.1 Async vs. Video Consultation
| Source | Said |
|---|---|
| User Flow | Video mandatory for Schedule H drugs — hardcoded |
| .md specs | Async only (text + photos) |

**RESOLUTION:** Video consultation is architecturally included but **muted for MVP testing**. The system has a video consultation step in the workflow, but it **auto-completes immediately** (marks consultation as "video completed") and moves to the next phase. This allows:
- The data model and UI scaffolding to exist
- Testing of the full flow without video infrastructure
- A developer to implement real video later without restructuring
- No legal risk during closed testing phase

**Implementation:** `Consultation.videoStatus` field exists with values: `NOT_REQUIRED | PENDING | SCHEDULED | IN_PROGRESS | COMPLETED | SKIPPED_TESTING`. For MVP, auto-set to `SKIPPED_TESTING` immediately after doctor review triggers video step. Add a feature flag `VIDEO_CONSULTATION_ENABLED = false` in environment config. See Section 8 for full video system architecture.

### 1.2 Pricing
| Vertical | Dev Bible | v3 .md Specs | **v4 FINAL** |
|---|---|---|---|
| Hair Loss | ₹999/mo | ₹999/mo | **₹999/mo** |
| ED | ₹799/mo | ₹1,299/mo | **₹1,299/mo** |
| PE (NEW) | — | — | **₹1,299/mo** |
| Weight Mgmt (Standard) | ₹2,499/mo | ₹2,999/mo | **₹2,999/mo** |
| Weight Mgmt (Premium/GLP-1) | — | ₹9,999/mo | **₹9,999/mo** |
| PCOS | ₹1,199/mo | ₹1,499/mo | **₹1,499/mo** |

**v3 .md spec pricing is final.** PE matches ED pricing (same doctor type, similar medication cost).

### 1.3 Verticals Scope
| Source | Verticals |
|---|---|
| User Flow | ED, TRT, PCOS, Menopause, GLP-1 Weight |
| Dev Bible | Hair Loss, Sexual Health (ED+PE), PCOS, Weight |
| v3 .md specs | Hair Loss, ED, Weight, PCOS |

**RESOLUTION — MVP verticals (5):**
1. Hair Loss (men/women)
2. ED (Erectile Dysfunction)
3. **PE (Premature Ejaculation) — NEW, spec in Section 6**
4. Weight Management (Standard + Premium GLP-1 tier)
5. PCOS (Women's Health)

**Deferred to Phase 2:** TRT (Testosterone Replacement Therapy), Menopause/Perimenopause

**Rationale:** PE is high-demand, low-complexity (oral medication, same doctor type as ED, no injections, no blood work typically needed). TRT requires nurse-administered injections (not ready for MVP). Menopause requires HRT expertise and DEXA scan referrals (complex ops).

### 1.4 Nurse vs. Phlebotomist
| Source | Role |
|---|---|
| User Flow | "Priya the nurse" — blood draws, vitals, injections, video bridges, proof of administration |
| v3 .md specs | "Phlebotomist" — blood draws only, deliver to lab |

**RESOLUTION:** Use **Nurse** (male or female). The nurse replaces the phlebotomist entirely. Expanded scope:

**MVP (active):**
- Blood draws (all phlebotomist functions)
- Record vitals (BP, pulse, SpO2) at every visit
- Navigate to patient, call patient
- Running late / patient unavailable flows
- Deliver samples to lab
- Basic patient education (medication usage guidance)

**Built but muted (scaffolding for Phase 2):**
- Injection administration (GLP-1, future TRT)
- Proof of Administration (timestamped photo, digital signature, post-injection vitals)
- Three-way video bridge with doctor
- 30-minute post-injection observation timer

**Portal:** `nurse.onlyou.life` (was `collect.onlyou.life`)

Full nurse system spec in Section 7.

### 1.5 Pharmacy Complexity
| Source | Model |
|---|---|
| Dev Bible | Own pharmacy — inventory, batch tracking, FEFO, QC, purchase orders |
| v3 .md specs | Partner pharmacy portal — see orders, prepare, mark ready |
| User Flow | Partner pharmacy with cold storage |

**RESOLUTION:** Partner pharmacy with simple portal (v3 .md spec model). No own inventory management for MVP.

**Rationale:** Running your own pharmacy requires Drug License (DL), separate compliance, inventory systems, and staff. Partner pharmacy model lets you launch faster, test demand, then build your own pharmacy operations at scale.

## MODERATE CONFLICTS

### 1.6 AI Timing
| Source | Approach |
|---|---|
| User Flow | Real-time during questionnaire (reads answers as patient fills them) |
| v3 .md specs | After submission (patient submits → backend packages → Claude API → store) |

**RESOLUTION:** AI runs **after submission** (v3 .md spec approach).

**Rationale:** Real-time mid-questionnaire AI is complex (streaming, partial data handling, WebSocket for live updates), adds latency to each question, and the clinical benefit is minimal — the only real-time benefit is emergency interruption (suicidal ideation, chest pain), which can be handled by simple front-end logic checking specific question answers against hardcoded rules, not AI.

**Emergency interrupt logic (front-end, no AI needed):**
- If patient answers "suicidal thoughts" → immediately show emergency numbers (112, 988, KIRAN helpline 1800-599-0019)
- If patient answers "chest pain during activity" (ED vertical) → show "Please call 112 or visit nearest ER"
- These are hardcoded checks in the questionnaire engine, not AI calls.

### 1.7 Dashboard Structure
| Source | Dashboards |
|---|---|
| Dev Bible | 5: Doctor, Nurse, Pharmacy, Admin, Marketing Landing |
| v3 .md specs | 6: Landing, Doctor, Admin, Lab, Collection, Pharmacy |

**RESOLUTION — 7 portals (deep dive in Section 4):**

| # | Portal | URL | Users | Device |
|---|---|---|---|---|
| 1 | Patient App | App Store + Play Store | Patients | Mobile (React Native) |
| 2 | Landing Page | `onlyou.life` | Public | Web (responsive) |
| 3 | Doctor Dashboard | `doctor.onlyou.life` | Doctors | Web (desktop-first, mobile-responsive) |
| 4 | Admin Dashboard | `admin.onlyou.life` | Coordinator (founder) | Web (mobile-first) |
| 5 | Nurse Portal | `nurse.onlyou.life` | Nurses | Web PWA (mobile-only design) |
| 6 | Lab Portal | `lab.onlyou.life` | Diagnostic centre staff | Web PWA (mobile-first) |
| 7 | Pharmacy Portal | `pharmacy.onlyou.life` | Pharmacy partner staff | Web PWA (mobile-first) |

**Delivery person:** No portal. Gets a single-use SMS link per delivery with pickup/delivery addresses, patient phone, and OTP entry field.

### 1.8 Identity Verification (Selfie + Face Match)
**RESOLUTION:** Muted for MVP. Government ID upload only (Aadhaar/PAN/DL photo). No selfie, no face-matching. Add placeholder in profile flow for future implementation.

### 1.9 ABHA ID Integration
**RESOLUTION:** Not needed for MVP. Not built, not scaffolded. Add when/if government mandates it or it provides clear value.

### 1.10 Blood Work Self-Upload
**RESOLUTION:** YES — patients can upload their own lab results PDF. From v3 .md specs:
- When doctor orders blood work, patient sees two options: "Book home collection" OR "I already have results — upload"
- Upload goes to `RESULTS_UPLOADED` status → doctor reviews
- Saves operational cost when patient has recent bloodwork

### 1.11 Subscription Durations
**RESOLUTION:** All verticals use **Monthly / Quarterly / 6-Month** plans. No annual plans.

### 1.12 Cold Chain / Delivery
**RESOLUTION:** No cold chain for MVP. Standard local delivery (Rapido/Dunzo/own delivery person) for all medications. GLP-1 injectables (premium weight tier) require cold chain — defer to Phase 2 when that tier is actively marketed. For MVP testing with GLP-1, use own delivery with insulated bag (manual process, not system-tracked).

### 1.13 Phase 2 Features (from User Flow, not in MVP)
The following are acknowledged, documented, but NOT built:
- GPS check-in for nurses on arrival
- Bluetooth temperature loggers on packages
- SNOMED-CT codes on medications
- Immutable/tamper-proof prescription storage (blockchain hashing)
- Three-way video bridge (patient + nurse + doctor)
- Testosterone level trend charts
- Next injection countdown widget
- ABHA ID integration
- Face-match identity verification
- Cold chain tracking system

---

# 2. PLATFORM OVERVIEW

**Onlyou** — Indian telehealth platform for stigmatized chronic conditions.

**5 MVP Verticals:**

| # | Vertical | Target | Doctor Type | Consultation | Photos | Blood Work | Priority |
|---|---|---|---|---|---|---|---|
| 1 | Hair Loss | Men 18-45, Women AGA | Dermatologist / Trichologist | Async | 4 required | Sometimes | 🥇 |
| 2 | ED | Men 25-60 | Urologist / Andrologist | Async | None | Sometimes | 🥈 |
| 3 | PE | Men 18-60 | Urologist / Andrologist / Sexual Medicine | Async | None | Rarely | 🥉 |
| 4 | Weight Mgmt | M&F 18-55, BMI ≥25 | Endocrinologist / IM | Async | 2 required | Usually | 4th |
| 5 | PCOS | Women 18-40 | Gynecologist / Endocrinologist | Async | Optional | Almost always | 5th |

**Subscription includes:** AI pre-assessment + async doctor consultation + prescription + medication (local delivery) + ongoing check-ins + first blood panel (if clinically needed)

**MVP constraints:**
- NO third-party lab APIs → Partner diagnostic centres, portal-tracked
- NO Shiprocket/Delhivery → Local delivery (Rapido/Dunzo/own person), coordinator-tracked
- NO video consultation (muted, auto-skips) → Async text + photos
- NO cold chain tracking → Manual insulated bag for GLP-1 if needed
- NO face-match verification → Government ID photo only
- NO ABHA integration
- Scale to APIs/automation at 100+ orders/month or multi-city

---

# 3. TECH STACK & PROJECT STRUCTURE

> **Note:** For full tech stack decision rationale, see ARCHITECTURE.md. This section shows the project layout.
> Key decisions: tRPC (not GraphQL), Turborepo monorepo, separate Next.js app per portal (not single app with middleware), NestJS + Fastify adapter, SSE (not WebSockets).

```
onlyou/
├── turbo.json                    → Turborepo pipeline config
├── pnpm-workspace.yaml           → Workspace definitions
├── .npmrc                        → node-linker=hoisted (React Native requirement)
│
├── apps/
│   ├── api/                      → NestJS + Fastify + tRPC + Prisma + PostgreSQL + Redis
│   │   ├── src/
│   │   │   ├── trpc/                   → tRPC router definitions (all 7 TS clients)
│   │   │   ├── rest/                   → REST controllers (webhooks, delivery SMS link)
│   │   │   ├── auth/                   → Email/Google/Apple + WhatsApp OTP + JWT (6 roles)
│   │   │   ├── users/
│   │   │   ├── questionnaire/          → Shared engine + per-condition JSON data files
│   │   │   ├── photos/                 → S3 presigned URLs
│   │   │   ├── ai/                     → Claude API (per-condition prompts)
│   │   │   ├── consultations/          → Lifecycle + video status (muted)
│   │   │   ├── prescriptions/          → Builder + PDF generation (@react-pdf/renderer)
│   │   │   ├── referrals/
│   │   │   ├── payments/               → Razorpay (one-time + subscriptions)
│   │   │   ├── orders/                 → Medication orders + delivery tracking + OTP
│   │   │   ├── lab-orders/             → Blood work lifecycle + sample tracking
│   │   │   ├── nurse/                  → Assignments, vitals, injection admin (muted)
│   │   │   ├── notifications/          → FCM + Gupshup (WhatsApp/SMS) + Email
│   │   │   ├── messaging/              → Doctor-patient async chat + SSE gateway
│   │   │   ├── wallet/                 → Credits, refunds, promo codes
│   │   │   ├── admin/                  → Partner management, SLA engine, analytics
│   │   │   └── jobs/                   → BullMQ queues (renewals, SLA, AI, PDF, reminders)
│   │   ├── prisma/schema.prisma
│   │   └── test/
│   │
│   ├── mobile/                   → React Native Expo (patient app only)
│   │   ├── src/
│   │   │   ├── app/                    → Expo Router (file-based routing)
│   │   │   │   ├── (auth)/             → Login, signup, OTP verification
│   │   │   │   ├── (tabs)/             → Main tab navigator (home, explore, activity, messages, profile)
│   │   │   │   ├── questionnaire/      → Dynamic engine rendering from JSON schema
│   │   │   │   ├── photo-upload/       → Guided camera with overlays
│   │   │   │   ├── treatment/          → Plan selection, payment
│   │   │   │   ├── lab-booking/        → Slot selection + self-upload
│   │   │   │   └── lab-results/        → Summary + PDF viewer
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── stores/                 → Zustand state management
│   │   └── eas.json
│   │
│   ├── doctor-portal/            → doctor.onlyou.life (Next.js 14 + Tailwind + shadcn/ui)
│   ├── admin-portal/             → admin.onlyou.life (Next.js 14 + Tailwind + shadcn/ui)
│   ├── nurse-portal/             → nurse.onlyou.life (Next.js PWA — mobile-only)
│   ├── lab-portal/               → lab.onlyou.life (Next.js PWA — mobile-first)
│   ├── pharmacy-portal/          → pharmacy.onlyou.life (Next.js PWA — mobile-first)
│   └── landing/                  → onlyou.life (Next.js SSG — marketing + SEO pages)
│
├── packages/
│   ├── ui/                       → Shared Tailwind + shadcn/ui components
│   ├── api-client/               → tRPC client factory + shared query hooks
│   ├── types/                    → Zod schemas + TypeScript types + enums
│   └── config/                   → ESLint, TypeScript, Prettier shared configs
│
├── CLAUDE.md                     → AI coding assistant instructions
└── checkpoint.md                 → Current build progress tracker
```

**Key architectural decisions reflected above:**
- **Separate Next.js app per portal** — independent deployment, security isolation, 30-50% smaller per-portal bundles. NOT a single Next.js app with middleware routing.
- **tRPC for all 7 TypeScript clients** — 40-50% less boilerplate than GraphQL, zero code generation, end-to-end type safety. REST endpoints only for external integrations (Razorpay webhooks, delivery person SMS link).
- **NestJS + Fastify adapter** — 2x JSON serialization performance over Express, same NestJS ecosystem.
- **SSE + Redis Pub/Sub for real-time** — no sticky sessions on ECS Fargate, covers 95% of use cases.
- **BullMQ for background jobs** — subscription renewals, SLA checks, AI assessment pipeline, PDF generation, notification dispatch, scheduled reminders.

**Domain Strategy:**
- Primary: `onlyou.life` (patient-facing brand)
- Secondary: `onlyou.co.in` (301 redirect, legal/regulatory, email domain)
- Each subdomain points to its own Next.js deployment (separate apps, not middleware-routed)

---

# 4. PORTAL & DASHBOARD DEEP DIVE

> This section defines every screen, every tab, and every action for all 7 interfaces. This is the definitive reference for what gets built.

## 4.1 Patient App (React Native Expo)

**Platform:** iOS + Android via Expo
**Auth:** Email / Google / Apple sign-up + **mandatory phone OTP verification** → JWT
**Bottom Navigation:** 5 tabs

### Tab 1: Home
**Purpose:** At-a-glance status of everything active

**Content (top to bottom):**
- **Greeting:** "Hi [First Name]" + date
- **Active Tracking Banner(s):** If any active lab orders or deliveries exist, show cards:
  - 🔬 "Blood Test — Sample being processed" → tap opens tracking stepper
  - 📦 "Treatment Kit — Out for delivery" → tap opens tracking stepper
  - Each card shows current status + last updated time
- **Active Treatment Card(s):** Per subscribed vertical:
  - Condition name + icon
  - Current status (e.g., "Treatment active — Day 45")
  - Next check-in date
  - Quick actions: "Message Doctor" / "View Prescription" / "Reorder"
- **Medication Reminders:** Today's medications with check-off (Taken / Skipped / Remind Later)
- **Quick Actions Grid:** "Start New Assessment" / "Upload Lab Results" / "Contact Support"

### Tab 2: Explore
**Purpose:** Browse and start new verticals

**Content:**
- Condition cards: Hair Loss | ED | PE | Weight | PCOS
- Each card: illustration, tagline, "Start Assessment" CTA
- If already subscribed to a vertical, card shows "Active" badge instead

### Tab 3: Activity (My Care)
**Purpose:** Unified tracking for all orders and lab work

**Two sections:**
1. **Active Items** (top) — cards with live status steppers:
   - Blood work orders (vertical stepper: Ordered → Slot Booked → Nurse Assigned → Sample Collected → At Lab → Results Ready → Doctor Reviewed)
   - Medication deliveries (vertical stepper: Prescription Created → Sent to Pharmacy → Preparing → Ready → Out for Delivery → Delivered)
   - Each step shows ✅ done / 🔵 current / ⚪ upcoming + timestamps
2. **Completed Items** (below) — collapsed list, most recent first
   - Past deliveries, past lab results
   - Tap to view details / PDFs

**Patient actions per status:** As defined in v3 master spec Section 4.4 (reschedule, cancel, view PDF, enter delivery OTP, etc.)

### Tab 4: Messages
**Purpose:** Chat with care team

**Content:**
- Conversation list per consultation/vertical
- Chat interface with text, photo attachments
- Read receipts
- Canned quick replies for common questions

### Tab 5: Profile
**Purpose:** Account management

**Content:**
- Personal info (name, DOB, address, government ID)
- **My Subscriptions:** Per vertical — plan details, next billing date, pause/cancel/change plan
- **My Prescriptions:** List of all prescriptions with PDF download
- **My Orders:** Order history with status
- **My Lab Results:** All results with PDF download
- **Payment Methods:** Saved cards, UPI
- **Wallet:** Balance, transaction history
- **Notification Preferences:** Toggle push/WhatsApp/SMS/email + discreet mode
- **Address Book:** Manage delivery + collection addresses
- **Help & Support**
- **Legal:** Terms, Privacy Policy, Refund Policy

### Key Patient Flows (cross-tab):

**New Assessment Flow:**
Explore → Select Condition → Questionnaire (one Q per screen, skip logic, save progress) → Photo Upload (if required) → Review Summary → Consent → Select Plan (Monthly/Quarterly/6-Month) → Razorpay Payment → Confirmation → Home (shows "Under Review" status)

**Lab Booking Flow:**
Home/Activity (doctor ordered tests) → "Book Home Collection" or "Upload Own Results" → If booking: select date + time slot + confirm address → Confirmation → Tracking stepper appears in Activity tab

**Delivery Confirmation Flow:**
Activity (Out for Delivery) → See delivery person name/phone/ETA → On arrival: enter 4-digit OTP → Confirmed → Usage instructions appear

---

## 4.2 Doctor Dashboard (`doctor.onlyou.life`)

**Auth:** Phone OTP → JWT (role: doctor)
**Design:** Desktop-first with mobile responsiveness. Doctors primarily use laptops/desktops.
**Layout:** Sidebar navigation (desktop) / Bottom navigation (mobile)

### Screen 1: Case Queue (default landing)

**Desktop layout:** Full-width list/table
**Mobile layout:** Scrollable card list

**Filter chips (top):** All | Hair Loss | ED | PE | Weight | PCOS
**Status filters:** New | In Review | Awaiting Patient Response | Lab Results Ready | Follow-Up Due | Completed | Referred
**Sort:** Newest first (default) | Oldest first | Highest attention level first | Longest waiting

**Each case card shows:**
- Patient name, age, sex, city
- Condition badge (color-coded)
- Time since submission
- AI attention level badge: 🟢 Low | 🟡 Medium | 🔴 High | ⛔ Critical
- Status badge
- Brief AI summary snippet (1 line)

**Actions from queue:**
- Tap/click → opens Case Review
- Quick-assign (desktop: right-click; mobile: swipe left)
- Badge counts on each filter

### Screen 2: Case Review (opens when selecting a case)

**Desktop layout:** 3-panel
- LEFT (30%): Patient summary sidebar
- CENTER (45%): Clinical data tabs
- RIGHT (25%): Actions panel

**Mobile layout:** Single column scroll with sticky action bar at bottom

**LEFT PANEL — Patient Summary:**
- Name, age, sex, city, phone (masked)
- Government ID status (verified / pending)
- Active subscriptions (which verticals)
- Consultation history (previous consultations, if any)
- Current medications (from questionnaire)
- Allergies

**CENTER PANEL — Tabs:**

**Tab: AI Assessment** (default open)
- Classification + confidence level
- Red flags (highlighted in red)
- Contraindications matrix (per medication: safe ✅ / caution ⚠️ / blocked ⛔)
- Risk factors
- Recommended protocol
- Doctor attention level with rationale
- Full AI summary paragraph
- Condition-specific extensions:
  - Hair Loss: Norwood scale assessment, finasteride safety check
  - ED: IIEF-5 score + severity, cardiovascular risk panel, nitrate check (RED BANNER if positive), etiology assessment
  - PE: PEDT score + classification, IELT estimate, comorbid ED check
  - Weight: BMI + category (WHO Asian), metabolic risk, eating disorder flag, GLP-1 eligibility
  - PCOS: Rotterdam criteria checklist (2/3), phenotype, fertility intent banner, insulin resistance flag

**Tab: Questionnaire**
- Collapsible sections matching questionnaire structure
- Each answer displayed with the question
- Flagged answers highlighted (answers that triggered AI red flags)

**Tab: Photos** (Hair Loss, Weight — not ED/PE)
- Grid view (2x2 for hair loss, 2x1 for weight)
- Click to zoom (lightbox)
- For follow-ups: side-by-side comparison with date labels, slider overlay

**Tab: Lab Results** (if any exist)
- Inline PDF viewer
- Abnormal flags highlighted (from lab upload)
- Critical values in red with timestamp
- Historical results comparison (if multiple panels)

**Tab: Messages**
- Chat thread with this patient
- Canned response selector
- Attachment capability (photos, PDFs)

**RIGHT PANEL — Actions:**

| Action | What Happens |
|---|---|
| **Prescribe** | Opens prescription builder (see below) |
| **Order Blood Work** | Opens lab order form (select panel, add notes) → triggers Section 7 flow |
| **Request More Info** | Opens message composer → case status → 🟠 Awaiting Patient Response |
| **Refer** | Opens referral modal (partner clinic near patient, reason, notes) |
| **Refund** | Initiates refund flow (full/partial, reason) |
| **Close Case** | Marks consultation complete |

**Prescription Builder (full-screen modal / sheet):**
- **Template selector:** Condition-specific templates (from v3 specs)
  - Hair Loss: Standard / Minoxidil Only / Conservative / Combination Plus / Advanced / Female AGA / Custom
  - ED: On-Demand Sildenafil 50mg / 100mg / Tadalafil 10mg / 20mg / Daily Tadalafil 5mg / Conservative / Custom
  - PE: On-Demand Dapoxetine 30mg / 60mg / Daily Paroxetine / Daily + On-Demand Combo / Behavioral + Medication / Custom
  - Weight: Lifestyle Only / Standard Orlistat / Metformin Add-On / GLP-1 Standard / GLP-1 + Metformin / Custom
  - PCOS (not trying): Cycle Regulation / Anti-Androgen / Insulin Focused / Comprehensive / Lean / Natural / Progestin Only
  - PCOS (trying): Lifestyle First / Ovulation Induction / Metformin + Lifestyle / Refer Fertility
- **Medication list:** Pre-filled from template, editable. Drug name, dosage, frequency, duration, instructions.
- **Custom medications:** Add any medication manually
- **Counseling notes:** Pre-filled condition-specific text, editable
- **Regulatory fields (auto-populated):** Doctor name, NMC registration number, patient details, diagnosis, date
- **Digital signature:** Tap/click to sign
- **Preview:** PDF preview before submission
- **Submit:** Generates PDF, stores in S3, creates Order record, notifies coordinator + patient

### Screen 3: My Patients
- Searchable patient directory
- Filter by condition, status, last visit date
- Tap to view full patient history (all consultations, prescriptions, lab results, messages)

### Screen 4: Stats
- Cases reviewed (today / week / month)
- Average review time
- Cases by condition breakdown
- Cases by outcome (prescribed / referred / blood work ordered)
- Patient feedback ratings

### Screen 5: Profile/Settings
- Personal info, NMC number, specializations
- Availability schedule
- Notification preferences
- Canned message management

---

## 4.3 Admin/Coordinator Dashboard (`admin.onlyou.life`)

**Auth:** Phone OTP → JWT (role: admin)
**Design:** Mobile-first. The coordinator (founder) will often manage from phone.
**Layout:** Bottom navigation (mobile) / Sidebar (desktop)

**This is the nerve center.** The coordinator sees and manages everything.

### Bottom Nav (Mobile): Overview | Lab Orders | Deliveries | Partners | Settings

### Tab: Overview
**Purpose:** Real-time operational snapshot

**Metrics cards (top):**
- Active patients (total)
- Consultations pending review
- Lab orders in progress
- Deliveries in progress
- SLA breaches (red badge)
- Today's revenue

**Activity feed (below):** Real-time feed of system events:
- "New consultation submitted — Hair Loss — Rahul M."
- "Lab results uploaded — PCOS — Sneha K."
- "Delivery confirmed (OTP verified) — ED — Amit S."
- "⚠️ SLA BREACH: Lab results overdue 48hrs — Order #1234"
- "⚠️ PHARMACY ISSUE: Stock unavailable — Order #5678"

**Each feed item is tappable** → opens relevant detail view

### Tab: Lab Orders
**Purpose:** Manage entire blood work pipeline

**Sub-tabs/Filters:** All | Needs Assignment | In Progress | Results Pending | Overdue | Completed

**Each order card shows:**
- Patient name, condition, tests ordered
- Status badge (color-coded)
- Assigned nurse (or "Unassigned" in red)
- Assigned lab
- Time since last status change
- SLA indicator (green/yellow/red)

**Card actions (tap to expand):**
- **Assign Nurse:** Dropdown of available nurses (filtered by city/area + availability)
- **Assign Lab:** Dropdown of partner diagnostic centres
- **View Timeline:** Full status history with timestamps
- **Escalate:** Manual escalation (sends urgent notification to relevant party)
- **Cancel Order:** With reason
- **Create Recollection:** If sample issue (auto-creates new order, original linked)

**SLA Alerts Section (sticky top when breaches exist):**
Red banner: "3 SLA breaches requiring attention"
- Patient didn't book slot (7+ days): "Remind patient or cancel"
- Nurse not assigned (2+ hours after booking): "Assign now"
- Lab results overdue (48+ hours): "Contact lab"
- Doctor hasn't reviewed (24+ hours): "Remind doctor"

### Tab: Deliveries
**Purpose:** Manage medication delivery pipeline

**Sub-tabs/Filters:** All | New (needs pharmacy) | At Pharmacy | Ready for Pickup | In Transit | Completed | Issues

**Each order card shows:**
- Patient name (or anonymous ID), condition
- Medications prescribed
- Pharmacy assigned (or "Unassigned")
- Delivery person (or "Unassigned")
- Status badge
- Time since last status change

**Card actions (tap to expand):**
- **Send to Pharmacy:** Select partner pharmacy from dropdown → prescription appears in their portal
- **Arrange Delivery:** Enter delivery person name, phone, method (Rapido/Dunzo/Own/Other), estimated delivery time → system generates delivery OTP → SMS link sent to delivery person
- **View Timeline:** Full status history
- **Mark Delivered (manual override):** For cases where OTP system has issues — requires reason + confirmation
- **Handle Issue:** Pharmacy stock issue → find alternative pharmacy or contact doctor for substitute
- **Delivery Failed:** Reschedule delivery
- **Create Replacement:** For wrong/damaged medication

**Monthly Auto-Reorder Section:**
- List of upcoming auto-reorders (subscription renewals triggering new orders)
- "Pause auto-reorder" per patient if doctor paused treatment or check-in overdue
- "Process now" to manually trigger reorder ahead of schedule

### Tab: Partners
**Purpose:** Manage all external partners

**Sub-tabs:** Nurses | Diagnostic Centres | Pharmacies | Clinics (Referral)

**Nurses:**
- List with: Name, phone, city, serviceable areas, daily capacity, completed/failed collection counts, rating, active/inactive toggle
- Add new nurse: name, phone, certification, certification document upload, available days, available hours, max daily collections, serviceable pincodes
- Edit / Deactivate

**Diagnostic Centres:**
- List with: Name, city, tests offered, avg turnaround, rating, active/inactive
- Add new: name, address, phone, contact person, portal login phone, tests offered, pricing, panel pricing
- Edit / Deactivate

**Pharmacies:**
- List with: Name, city, medications stocked, operating hours, rating, active/inactive
- Add new: name, address, phone, contact person, portal login phone, medications typically stocked, operating hours
- Edit / Deactivate

**Referral Clinics:**
- List with: Name, city, specializations, negotiated rate, rating, active/inactive
- Add new: name, address, phone, specializations, capabilities, negotiated rate, max daily capacity
- Edit / Deactivate

### Tab: Settings
**Purpose:** System configuration

- **User Management:** View all users by role, activate/deactivate accounts
- **Subscription Plans:** View/edit pricing for all verticals and durations
- **Questionnaire Management:** View active questionnaire schemas (editing = code deploy for MVP)
- **Notification Templates:** View/edit SMS, WhatsApp, email, push templates
- **Feature Flags:** Toggle `VIDEO_CONSULTATION_ENABLED`, `GLP1_COLD_CHAIN_TRACKING`, etc.
- **Financial:** Revenue summary, payment history, refund log, wallet transactions
- **Audit Log:** Searchable log of all system actions (who did what, when, to which record)
- **SLA Configuration:** Edit thresholds for all SLA rules

### Desktop Additions:
- Split view: list on left, detail on right (for Lab Orders and Deliveries)
- Dashboard overview with charts (daily orders, revenue trend, SLA compliance %)
- Bulk actions (assign nurse to multiple orders, send multiple prescriptions to same pharmacy)

---

## 4.4 Nurse Portal (`nurse.onlyou.life`)

**Auth:** Phone OTP → JWT (role: nurse)
**Design:** Mobile-only. Nurses are always on the road. No desktop layout needed.
**PWA:** Installable, offline-capable for viewing today's assignments
**Layout:** Single-screen focused design (no tabs needed for MVP)

### Main Screen: Today's Assignments

```
┌─────────────────────────────────────┐
│  Today's Visits (3)           [📅]  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔵 8:00-10:00 AM            │    │
│  │ Rahul M. — Banjara Hills    │    │
│  │ Tests: TSH, CBC, Ferritin   │    │
│  │ Special: Fasting required   │    │
│  │ [Navigate 📍] [Call 📞]      │    │
│  │ [Start Visit ▶️]             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ⚪ 10:00-12:00 PM           │    │
│  │ Priya S. — Jubilee Hills    │    │
│  │ Tests: Testosterone, LH     │    │
│  │ [Navigate 📍] [Call 📞]      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ✅ COMPLETED 9:15 AM        │    │
│  │ Amit K. — Madhapur          │    │
│  │ 3 tubes collected            │    │
│  │ Vitals: BP 120/80, Pulse 72 │    │
│  │ [Deliver to Lab 🏥]         │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Running Late 🕐]  [Help ❓]       │
└─────────────────────────────────────┘
```

### Visit Flow (when nurse taps "Start Visit"):

**Step 1: Arrive & Verify**
- Confirm patient identity (name match)
- Optional: GPS capture (Phase 2)

**Step 2: Record Vitals** ← NEW (not in phlebotomist spec)
- Blood Pressure: systolic/diastolic input
- Pulse: BPM input
- SpO2: percentage input (if pulse oximeter available)
- Weight: kg input (if scale available — especially for Weight Management patients)
- Notes: free text
- All vitals stored in new `NurseVisitVitals` record linked to LabOrder

**Step 3: Collect Sample**
- Tube count input (number)
- Any collection notes
- Tap **"Mark Collected"** → status `SAMPLE_COLLECTED`
- Patient gets push notification

**Step 4: Complete Visit**
- Summary screen showing vitals + collection details
- **"Complete Visit"** button

### Other Actions:

**Running Late:**
- Tap → enter new ETA → patient auto-notified, coordinator sees delay flag

**Patient Unavailable:**
- Reason selector: Not home / No answer / Reschedule requested / Wrong address / Other
- Status → `COLLECTION_FAILED`
- Coordinator gets urgent alert, patient gets "We missed you" notification

**Deliver to Lab:**
- Select diagnostic centre from list (filtered by nearby/assigned)
- Confirm tube count being delivered
- Status → `DELIVERED_TO_LAB`
- Lab portal notified

**Offline Mode:**
- If network drops: show cached today's assignments
- Queue status updates to sync when back online
- Show offline indicator banner

### Phase 2 Additions (built but muted):

**Injection Administration Flow:**
- Medication verification (scan barcode or confirm manually)
- Pre-injection vitals check
- Injection confirmation
- **Proof of Administration:**
  - Timestamped photo (camera capture)
  - Digital signature (patient signs on screen)
  - Post-injection vitals (BP, pulse)
  - 30-minute observation timer with checklist
  - Any adverse reaction notes
- Three-way video bridge button (connects patient + nurse + doctor)

---

## 4.5 Lab Portal (`lab.onlyou.life`)

**Auth:** Phone OTP → JWT (role: lab)
**Design:** Mobile-first (lab technicians use tablets/phones at the counter)
**PWA:** Installable
**Layout:** Bottom navigation with 3 tabs

**IMPORTANT:** Lab portal shows **anonymized patient IDs**, not patient names. Lab staff do not need to know who the patient is — they only need to know what tests to run.

### Tab 1: Incoming
**Purpose:** Samples arriving from nurses

**List of incoming samples:**
- Sample ID (e.g., "ONY-2026-0045")
- Tests ordered (list)
- Delivered by (nurse name)
- Delivery time
- Tube count expected

**Action:** Big **"Mark Received"** button per sample
- Confirm tube count received matches expected
- If mismatch → flag discrepancy (coordinator notified)
- Status → `SAMPLE_RECEIVED`
- Patient notified: "Lab received your sample"

### Tab 2: Processing
**Purpose:** Track samples being processed

**List of in-progress samples:**
- Sample ID, tests, received time
- **"Mark Processing Started"** button (if not yet clicked)
- Status shows: Received / Processing

### Tab 3: Upload Results
**Purpose:** Upload completed test results

**Flow:**
1. Select sample from list of processing/completed samples
2. Upload PDF (camera capture or file picker)
3. **Flag each test result:** For each test in the panel:
   - Test name
   - Result value (optional text input)
   - Status: Normal ✅ / Abnormal ⚠️ / Critical 🔴
4. **"Submit Results"** button
5. Status → `RESULTS_READY`
6. Notifications sent: Doctor (🟣 badge) + Patient (push + WhatsApp + email with PDF) + Coordinator

**Critical value handling:** If ANY test marked "Critical":
- System sends URGENT notification to doctor + coordinator immediately
- Doctor's queue shows 🔴 CRITICAL badge
- Patient gets: "Important results detected. Your doctor is being notified urgently."

### Additional Actions:

**Report Issue:** Available on any sample card
- Reason: Insufficient sample / Hemolyzed / Wrong tube / Mislabeled / Other
- Status → `SAMPLE_ISSUE`
- Coordinator gets URGENT alert
- System auto-creates new lab order for recollection (no charge to patient)

---

## 4.6 Pharmacy Portal (`pharmacy.onlyou.life`)

**Auth:** Phone OTP → JWT (role: pharmacy)
**Design:** Mobile-first (pharmacy staff use phones at the counter)
**PWA:** Installable
**Layout:** Bottom navigation with 3 tabs

**IMPORTANT:** Pharmacy sees patient by anonymous ID (e.g., "ONY-P-0045"), NOT patient name. They see the prescription (medication names, dosages, quantities) but not the diagnosis or questionnaire data.

### Tab 1: New Orders
**Purpose:** Incoming prescriptions to prepare

**Each order card shows:**
- Order ID
- Patient anonymous ID
- Medication list with quantities
- Prescription PDF (tap to view)
- Doctor name + NMC number (for verification)
- Received time

**Action:** Big **"Start Preparing"** button
- Status → `PREPARING`
- Coordinator notified

### Tab 2: Preparing
**Purpose:** Orders being packed

**Each order card shows:**
- Same info as above
- "Started preparing" timestamp

**Action:** **"Ready for Pickup"** button
- Status → `READY`
- Coordinator notified: "Order ready at [pharmacy name]"

### Tab 3: Ready / Picked Up
**Purpose:** Completed orders awaiting or already picked up by delivery person

**Each order card shows:**
- Same info + ready timestamp
- Pickup status: Awaiting / Picked Up
- Delivery person name (once assigned by coordinator)

### Issue Reporting:

**"Stock Issue"** button (available on any order in New or Preparing):
- Select which medication(s) unavailable
- Add notes (partial availability, expected restock date)
- Status → `PHARMACY_ISSUE`
- Coordinator gets alert → either finds alternative pharmacy or contacts doctor for substitute
- Patient sees: "There's a slight delay preparing your medication."

---

## 4.7 Landing Page (`onlyou.life`)

**Design:** Responsive web, SEO-optimized
**Framework:** Next.js 14 with SSG (Static Site Generation) for SEO pages

### Pages:

**Homepage (`/`):**
- Hero section: Calm, wellness-brand aesthetic (soft blues/greens), headline, CTA "Start Your Assessment"
- Trust badges: Licensed doctors, Licensed pharmacy, 100% discreet, Encrypted data
- "How It Works" — 3 steps: Answer Questions → Doctor Reviews → Treatment Delivered
- Verticals section: 5 condition cards with brief descriptions
- Transparent pricing section
- Before/After gallery (with consent — Phase 2)
- Testimonials (Phase 2)
- FAQ accordion
- Footer: Legal links, contact, social media

**Condition Pages (`/hair-loss`, `/erectile-dysfunction`, `/premature-ejaculation`, `/weight-management`, `/pcos`):**
- SEO-optimized long-form content (2,000-3,000 words)
- Covers: What is it, causes, symptoms, treatments, how Onlyou helps, pricing, FAQ
- CTA: "Start Your [Condition] Assessment" → links to app download or web assessment
- Structured data (JSON-LD) for Google rich results

**Legal Pages:**
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy
- `/refund` — Refund Policy
- `/about` — About Onlyou

**Blog (`/blog`):**
- Sanity CMS integration for content management
- SEO-targeted articles
- Condition-specific categories

---

## 4.8 Delivery Person Interface

**NOT a portal.** Delivery person receives a **single-use SMS link** per delivery.

**Link opens a mobile-optimized web page showing:**
- Pickup address (pharmacy) with "Navigate" button (opens Google Maps)
- Delivery address (patient) with "Navigate" button
- Patient phone number (tap to call)
- Medication package ID
- **"Confirm Pickup"** button (marks order as picked up)
- **"Enter Delivery OTP"** field — patient gives 4-digit code, delivery person enters it
  - Valid OTP → "Delivery Confirmed ✅" → status `DELIVERED`
  - Invalid OTP → "Incorrect code, try again" (3 attempts, then contact coordinator)
- **"Delivery Failed"** button → reason selector (not home / wrong address / unreachable / other)

**Link expires after delivery confirmation or 24 hours, whichever comes first.**

---

# 5. UPDATED PRICING

## All Verticals: Monthly / Quarterly / 6-Month

### Hair Loss
| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹999/month | ₹999 | — |
| Quarterly | ₹2,499/quarter | ₹833 | 17% |
| 6-Month | ₹4,499/6 months | ₹750 | 25% |

### ED (Erectile Dysfunction)
| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹1,299/month | ₹1,299 | — |
| Quarterly | ₹3,299/quarter | ₹1,100 | 15% |
| 6-Month | ₹5,999/6 months | ₹1,000 | 23% |

### PE (Premature Ejaculation)
| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹1,299/month | ₹1,299 | — |
| Quarterly | ₹3,299/quarter | ₹1,100 | 15% |
| 6-Month | ₹5,999/6 months | ₹1,000 | 23% |

### Weight Management — Standard Tier
| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹2,999/month | ₹2,999 | — |
| Quarterly | ₹7,999/quarter | ₹2,666 | 11% |
| 6-Month | ₹14,999/6 months | ₹2,500 | 17% |

### Weight Management — Premium GLP-1 Tier
| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹9,999/month | ₹9,999 | — |
| Quarterly | ₹24,999/quarter | ₹8,333 | 17% |
| 6-Month | ₹44,999/6 months | ₹7,500 | 25% |

### PCOS (Women's Health)
| Plan | Price | Per Month | Savings |
|---|---|---|---|
| Monthly | ₹1,499/month | ₹1,499 | — |
| Quarterly | ₹3,799/quarter | ₹1,266 | 16% |
| 6-Month | ₹6,999/6 months | ₹1,167 | 22% |

### Blood Work Pricing
- First panel: **INCLUDED** in subscription (for verticals where blood work is clinically indicated)
- Follow-up panels: ₹800-4,500 depending on panel (charged separately via Razorpay)
- Patient self-upload: **Free** (no collection, no lab cost)

---

# 6. PE (PREMATURE EJACULATION) VERTICAL SPECIFICATION

> **NEW VERTICAL — not in any previous spec. Written to match the depth and format of the ED, Hair Loss, Weight, and PCOS specs.**

## 6.1 Condition Overview

**Target:** Men 18-60
**Doctor type:** Urologist / Andrologist / Sexual Medicine specialist (same pool as ED)
**Consultation type:** Async (questionnaire only — NO photos required)
**Core treatments:** Dapoxetine (on-demand SSRI for PE), daily low-dose SSRIs (Paroxetine, Sertraline), topical anesthetics (lidocaine/prilocaine), behavioral techniques
**Key differentiator:** Same privacy-first approach as ED — no photos, no video, maximum discretion. Often co-exists with ED; system handles comorbidity.
**Regulatory note:** Dapoxetine is Schedule H in India — requires prescription, can be prescribed via telemedicine. SSRIs used off-label for PE are also Schedule H.

## 6.2 Pricing

| Plan | Price | Includes |
|---|---|---|
| Monthly | ₹1,299/month | Consultation + medication + discreet delivery |
| Quarterly | ₹3,299/quarter (₹1,100/mo) | Same + 15% savings |
| 6-Month | ₹5,999/6 months (₹1,000/mo) | Same + 23% savings |

Same as ED — same doctor pool, similar medication cost, same stigma premium.

## 6.3 Questionnaire (26 Questions, ~6-8 minutes)

### Skip Logic Rules
- Q4 = "No ED symptoms" → skip Q5 (ED co-morbidity)
- Q9 = "Since first sexual experience" → skip Q10 (onset trigger)
- Q18 = "No medications" → skip Q19
- Q22 = "Never tried" → skip Q23, Q24

Most patients answer 20-23 questions after skip logic.

---

### SECTION 1: BASICS (3 questions)

**Q1: What is your age?**
- Type: Number input (18-80)
- Validation: <18 = blocked
- AI use: Age context for treatment. Lifelong PE more common in younger men.

**Q2: What is your biological sex?**
- Type: Auto-set Male. Females redirected.

**Q3: Which best describes your main concern?**
- Type: Single select
  - "I ejaculate too quickly during sex"
  - "I feel I have no control over when I ejaculate"
  - "My partner is dissatisfied with how long sex lasts"
  - "I sometimes ejaculate before or right after penetration"
  - "I avoid sex because of anxiety about ejaculating too quickly"
  - "I also have difficulty getting/maintaining erections" (→ flag ED comorbidity)
- AI use: Primary classification. "Also have ED" = combined ED+PE assessment. "Avoid sex" = significant anxiety component.

### SECTION 2: PEDT — Premature Ejaculation Diagnostic Tool (5 questions)

Standard validated clinical tool. Include all 5 questions:

**Q4: How difficult is it for you to delay ejaculation?**
- Type: Scale 0-4 — Not difficult (0) / Somewhat (1) / Moderately (2) / Very (3) / Extremely (4)

**Q5: Do you ejaculate before you want to?**
- Type: Scale 0-4 — Almost never (0) / <25% of time (1) / ~50% (2) / >75% (3) / Almost always (4)

**Q6: Do you ejaculate with very little stimulation?**
- Type: Scale 0-4 — Same scale

**Q7: Do you feel frustrated because of ejaculating before you want to?**
- Type: Scale 0-4 — Not at all (0) / Slightly (1) / Moderately (2) / Very (3) / Extremely (4)

**Q8: How concerned are you that your time to ejaculation leaves your partner sexually unfulfilled?**
- Type: Scale 0-4 — Not at all (0) → Extremely (4)

**PEDT Scoring (calculated by system):**
- Sum of Q4-Q8 (0-20)
- ≤8: No PE (may not need treatment — manage expectations)
- 9-10: Borderline (consider treatment based on distress)
- ≥11: PE likely (treatment indicated)
- AI use: Primary diagnostic measure. Score <9 with distress = may still benefit from counseling.

### SECTION 3: TIMING & PATTERN (5 questions)

**Q9: How long has this been happening?**
- Type: Single select
  - Since my first sexual experience (lifelong PE)
  - Started at some point after initially normal ejaculation (acquired PE)
  - It varies — sometimes fine, sometimes too fast (variable PE)
  - Only with certain partners or situations (situational PE)
- AI use: CRITICAL classification.
  - Lifelong = likely neurobiological (serotonin transporter), responds best to medication
  - Acquired = may have underlying cause (prostatitis, thyroid, ED, relationship issues)
  - Variable = may not need medication, behavioral techniques may suffice
  - Situational = psychological component primary

**Q10: [IF acquired] When did it start, and did anything change around that time?**
- Type: Free text
- AI use: Identifies triggers — new relationship, stress, medical change, medication start.

**Q11: How long does intercourse typically last (from penetration to ejaculation)?**
- Type: Single select
  - Less than 1 minute
  - 1-2 minutes
  - 2-3 minutes
  - 3-5 minutes
  - 5+ minutes but I still feel it's too quick
  - I'm not sure / varies a lot
- AI use: IELT (Intravaginal Ejaculatory Latency Time) approximation. <1 min with distress = clinically significant PE. 3-5 min = may be more about perception/expectations.

**Q12: Do you have difficulty getting or maintaining erections?**
- Type: Single select
  - No — erections are fine, it's only about ejaculating too fast
  - Sometimes I have erection issues too
  - Yes — I often lose my erection because I'm trying not to ejaculate
  - Yes — separate erection difficulty alongside PE
- AI use: PE + ED comorbidity is VERY common. "Lose erection from trying not to ejaculate" = compensatory behavior. May need combined ED+PE treatment (e.g., tadalafil daily + dapoxetine).

**Q13: Does the problem happen during masturbation too?**
- Type: Single select — Yes, also fast / No, only during sex / I don't masturbate
- AI use: "Only during sex" = likely performance anxiety/psychological. "Also fast during masturbation" = likely neurobiological.

### SECTION 4: MEDICAL SCREENING (6 questions)

**Q14: Do you have any of these conditions? (Select all)**
- Type: Multi-select
  - Prostatitis / chronic pelvic pain
  - Thyroid disorder (hyper or hypo)
  - Diabetes
  - Urinary tract infections (recurrent)
  - Depression or anxiety (diagnosed)
  - Chronic pain condition
  - Neurological condition
  - Heart condition
  - None of these
- AI use: Prostatitis = can cause acquired PE (treat prostatitis first). Hyperthyroidism = known PE cause. Depression/anxiety = SSRIs may help both.

**Q15: Have you experienced any of these? (Select all)**
- Type: Multi-select
  - Pain or burning during ejaculation
  - Blood in semen
  - Frequent urination or urgency
  - Pain in genital area, pelvis, or lower back
  - None of these
- AI use: Pain during ejaculation or pelvic pain = possible prostatitis → urology referral may be needed. Blood in semen = flag for doctor.

**Q16: Do you have a history of seizures or epilepsy?**
- Type: Single select — Yes / No
- AI use: Dapoxetine is CONTRAINDICATED in patients with epilepsy/seizure history. SSRIs also require caution.

**Q17: Do you have any liver or kidney problems?**
- Type: Single select — Yes / No / Not sure
- AI use: Dapoxetine contraindicated in moderate-severe hepatic impairment. Dose adjustment for renal issues.

**Q18: Are you currently taking any medications? (Select all)**
- Type: Multi-select
  - Antidepressants (SSRIs, SNRIs, TCAs, MAOIs)
  - Anti-anxiety medications
  - Blood thinners (warfarin)
  - Triptans (for migraines)
  - Tramadol or other opioids
  - ED medications (sildenafil, tadalafil)
  - St. John's Wort (herbal supplement)
  - Thioridazine
  - CYP3A4 inhibitors (ketoconazole, ritonavir, etc.)
  - None
  - Other: [free text]
- AI use:
  - **SSRIs/SNRIs = ABSOLUTE BLOCK for dapoxetine** (serotonin syndrome risk)
  - **MAOIs = ABSOLUTE BLOCK** (serotonin syndrome, potentially fatal)
  - **Triptans = BLOCK for dapoxetine** (serotonin syndrome)
  - **Tramadol = BLOCK** (lowers seizure threshold + serotonin risk)
  - **Thioridazine = BLOCK** (QT prolongation)
  - Already on ED medication = note for combined therapy planning
  - St. John's Wort = serotonin interaction risk

**Q19: Drug allergies?**
- Type: Free text / None

### SECTION 5: PSYCHOLOGICAL & RELATIONSHIP (4 questions)

**Q20: How is this affecting your relationships?**
- Type: Single select
  - Not in a relationship currently
  - Partner is understanding and supportive
  - It's causing tension in my relationship
  - I avoid relationships/intimacy because of this
  - My partner doesn't know it's a problem
- AI use: "Avoid relationships" or "causing tension" = significant distress, may benefit from counseling alongside medication. "Partner doesn't know" = communication skills component.

**Q21: Are you experiencing any of these? (Select all)**
- Type: Multi-select
  - Performance anxiety
  - Depression
  - Low self-esteem related to sexual performance
  - Avoidance of sexual situations
  - Relationship stress
  - Stress at work or life
  - None
- AI use: Psychological component assessment. Multiple factors = counseling recommendation alongside medication.

**Q22: Alcohol consumption?**
- Type: Single select — Never / Occasionally / Regularly / Daily / Heavy
- AI use: Alcohol interacts with dapoxetine → increased risk of syncope (fainting). Heavy drinking = dapoxetine caution.

**Q23: Do you smoke or use recreational drugs?**
- Type: Single select — No / Smoke occasionally / Smoke daily / Use recreational drugs (specify)
- AI use: Recreational drugs may interact with SSRIs/dapoxetine. Context for overall health.

### SECTION 6: TREATMENT HISTORY (3 questions)

**Q24: Have you tried any PE treatments? (Select all)**
- Type: Multi-select
  - Numbing creams/sprays (lidocaine, benzocaine)
  - "Delay" condoms (thicker/numbing)
  - Dapoxetine (Priligy/Duralast)
  - Antidepressants for PE (paroxetine, sertraline)
  - Behavioral techniques (start-stop, squeeze)
  - Counseling/sex therapy
  - Herbal/ayurvedic supplements
  - None
- AI use: Prior treatment response guides prescription. Failed behavioral = medication stronger case. Failed dapoxetine = try daily SSRI. Already on numbing cream and still insufficient = add oral medication.

**Q25: [IF tried treatments] What happened?**
- Type: Free text
- AI use: Duration, efficacy, side effects.

**Q26: What are you hoping for?**
- Type: Single select
  - Lasting longer during sex
  - Better control over when I ejaculate
  - Reduced anxiety about sexual performance
  - Improving my relationship
  - All of the above
- AI use: Personalizes doctor communication and treatment emphasis.

---

## 6.4 Photo Upload

**NO PHOTOS REQUIRED.** Same privacy-first approach as ED. PE is equally stigmatized. Questionnaire + PEDT score provides sufficient clinical data.

---

## 6.5 AI Pre-Assessment — PE Specific

### Classification Categories

| Classification | Description | Attention | Action |
|---|---|---|---|
| `lifelong_pe` | Since first sexual experience, consistent | LOW | Dapoxetine or daily SSRI |
| `acquired_pe` | Developed after period of normal ejaculation | MEDIUM | Investigate cause, treat + medication |
| `variable_pe` | Inconsistent, sometimes normal | LOW | Behavioral techniques ± medication |
| `situational_pe` | Only in certain contexts | LOW-MED | Likely psychological, behavioral ± medication |
| `pe_with_ed` | PE comorbid with erectile dysfunction | MEDIUM | Combined treatment needed |
| `psychological_pe` | Primarily performance anxiety/relationship | MEDIUM | Medication + counseling recommendation |
| `prostatitis_suspected` | Pelvic pain, urinary symptoms + PE | HIGH | Urology referral, may need in-person |
| `thyroid_suspected` | Thyroid disorder + PE | HIGH | Blood work (thyroid) first |
| `medication_interaction` | On SSRIs/MAOIs/triptans — cannot prescribe dapoxetine | HIGH | Alternative treatment pathway |
| `serotonin_risk` | Multiple serotonergic drugs | CRITICAL | Cannot prescribe dapoxetine. Careful review. |

### Red Flags (any = HIGH or CRITICAL)
- Currently taking SSRIs, SNRIs, MAOIs, triptans, or tramadol (CRITICAL — serotonin syndrome risk with dapoxetine)
- History of seizures/epilepsy (dapoxetine contraindicated)
- Moderate-severe liver disease (dapoxetine contraindicated)
- History of syncope/fainting (dapoxetine increases risk)
- Pain during ejaculation or blood in semen (may indicate prostatitis/infection)
- Blood in semen
- Cardiac issues (dapoxetine has orthostatic hypotension risk)
- Severe depression or suicidal ideation
- Age <18
- PEDT score ≤8 without significant distress (may not need treatment)

### Contraindication Matrix

| Check | Source | Action |
|---|---|---|
| **SSRIs/SNRIs/MAOIs** | Q18 | **ABSOLUTE BLOCK for dapoxetine.** Consider behavioral + topical only, or refer. |
| **Triptans** | Q18 | **BLOCK dapoxetine.** Serotonin syndrome risk. |
| **Tramadol** | Q18 | **BLOCK dapoxetine.** Seizure + serotonin risk. |
| **Thioridazine** | Q18 | **BLOCK dapoxetine.** QT prolongation. |
| **CYP3A4 inhibitors** | Q18 | **BLOCK dapoxetine 60mg.** Max 30mg if must prescribe. |
| Seizure history | Q16 | **BLOCK dapoxetine.** Consider topical only. |
| Moderate-severe liver disease | Q17 | **BLOCK dapoxetine.** |
| Severe kidney disease | Q17 | **CAUTION.** Dose adjustment. |
| Heart conditions | Q14 | **CAUTION.** Orthostatic hypotension risk. |
| Heavy alcohol use | Q22 | **CAUTION.** Increased syncope risk with dapoxetine. |
| History of syncope | (screen in Q14) | **CAUTION.** May need lower dose or alternative. |

### AI Output Extensions for PE

```typescript
interface PEAssessment extends AIAssessment {
  pedt_score: number;              // 0-20
  pedt_classification: string;     // no_pe / borderline / pe_likely
  pe_type: string;                 // lifelong / acquired / variable / situational
  estimated_ielt: string;          // <1min / 1-2min / 2-3min / 3-5min / 5+min
  comorbid_ed: boolean;
  psychological_component: 'none' | 'mild' | 'significant' | 'primary';
  serotonin_drug_check: 'clear' | 'BLOCKED';
  seizure_check: 'clear' | 'BLOCKED';
  prostatitis_suspected: boolean;
}
```

---

## 6.6 Prescription Templates

| Template | Medications | When |
|---|---|---|
| **On-Demand Dapoxetine 30mg** | Dapoxetine 30mg, take 1-3 hours before anticipated sexual activity, max once per 24 hours. Take with water, food optional. | First-line for lifelong PE. No serotonergic drug interactions. |
| **On-Demand Dapoxetine 60mg** | Dapoxetine 60mg, same instructions | 30mg insufficient after 4+ attempts, no CYP3A4 inhibitors |
| **Daily Paroxetine** | Paroxetine 10mg daily → increase to 20mg after 2 weeks if tolerated | Acquired PE, or patient prefers daily medication, or PE with comorbid depression/anxiety |
| **Daily Sertraline** | Sertraline 25mg daily → increase to 50mg after 2 weeks | Alternative to paroxetine, better side effect profile for some |
| **Combined Dapoxetine + Topical** | Dapoxetine 30mg on-demand + Lidocaine-Prilocaine cream (apply 15-20 min before, wash before contact) | Dapoxetine alone insufficient |
| **Topical Only** | Lidocaine-Prilocaine cream/spray | Dapoxetine contraindicated (on SSRIs, seizure history, liver disease) |
| **Combined ED+PE** | Tadalafil 5mg daily + Dapoxetine 30mg on-demand | PE comorbid with ED — tadalafil for erections, dapoxetine for ejaculation control |
| **Behavioral + Medication** | Dapoxetine 30mg on-demand + behavioral technique instruction sheet | Significant psychological component, wants holistic approach |
| **Custom** | Doctor builds from scratch | Complex cases |

**All prescriptions include standard counseling text:**
- Do NOT combine dapoxetine with alcohol (increased risk of fainting)
- Do NOT take dapoxetine if you've taken any SSRI, SNRI, MAOI, or triptan in the last 14 days
- Stay hydrated when taking dapoxetine
- Common side effects: nausea, dizziness, headache — usually mild, improve with use
- If you feel faint or dizzy after taking dapoxetine, sit or lie down immediately
- Dapoxetine does not cause an automatic delay — it improves control over time
- Behavioral techniques (start-stop, squeeze) complement medication

---

## 6.7 Doctor Review — PE Specific

### Center Panel Additions
- **PEDT Score Badge:** Large display — "PEDT: 15/20 — PE Likely"
- **PE Type Classification:** Lifelong / Acquired / Variable / Situational — prominently shown
- **IELT Estimate:** Approximate intravaginal latency time from questionnaire
- **ED Comorbidity Banner:** If patient reports ED symptoms → "⚠️ COMORBID ED REPORTED — Consider combined treatment"
- **Serotonin Drug Check Banner:** If patient on SSRIs/MAOIs/triptans → LARGE RED BANNER: "⚠️ PATIENT ON SEROTONERGIC MEDICATION — DAPOXETINE CONTRAINDICATED"
- **Seizure Check Banner:** If positive → RED BANNER: "⚠️ SEIZURE HISTORY — DAPOXETINE CONTRAINDICATED"
- **No photo gallery** — expanded questionnaire display
- **Psychological Assessment Panel:** Summary of relationship impact, anxiety, avoidance behaviors

### Follow-Up Cadence
- Initial prescription → 4-week check-in (how often used? working? side effects?) → dose adjustment if needed → 3-month review → 6-month review → annual
- Check-ins are questionnaire-based (abbreviated PEDT + usage frequency + side effects + satisfaction)
- No photos needed
- No blood work typically needed (unless thyroid or prostatitis suspected)

### Canned Messages (PE)
- "I've prescribed dapoxetine 30mg for you. Take it 1-3 hours before sexual activity with plenty of water. Give it 4-6 attempts before judging effectiveness."
- "Based on your responses, I'd recommend starting with daily low-dose paroxetine for more consistent control."
- "Your symptoms suggest an underlying anxiety component. I recommend combining medication with techniques I'll share with you."
- "I'd like to check your thyroid levels — thyroid imbalance can contribute to ejaculation timing."
- "I'm increasing your dose to 60mg as the 30mg hasn't been sufficient. Same instructions apply."
- "Since you also have erection concerns, I'm adding daily tadalafil alongside your PE medication."
- "Since you're currently on an SSRI, I cannot prescribe dapoxetine. I've prescribed a topical numbing cream as an alternative."

---

## 6.8 Referral Edge Cases — PE Specific

| Scenario | Action | Patient Message |
|---|---|---|
| Patient on SSRIs/MAOIs | CANNOT prescribe dapoxetine. Topical cream only, or refer. | "Your current antidepressant interacts with PE medication. I've prescribed a topical option that's safe to use alongside it." |
| Seizure history | CANNOT prescribe dapoxetine. Topical only. | "For your safety, I've prescribed a topical treatment. Oral PE medications aren't suitable with your history." |
| Prostatitis suspected | Refer to urologist for prostatitis evaluation first | "Your symptoms suggest a prostate issue that may be causing your PE. Let's address that first." |
| Thyroid suspected | Order TSH panel first | "Let's check your thyroid — it could be contributing to this." |
| Primary psychological PE (no organic factors) | Prescribe medication + strongly recommend sex therapy/counseling | "Medication will help, but working with a counselor will give you the best long-term results." |
| PE + severe ED | May need ED treatment first (erection enables PE treatment to work) | "Let's first ensure reliable erections, then address ejaculation timing." |
| PEDT ≤8, low distress | May not need treatment — reassure and educate | "Based on your assessment, your ejaculation timing is within normal range. Let's discuss your expectations." |
| Patient wants specific brand | Clinical judgment prevails | Doctor evaluates appropriateness |
| Relationship in crisis | Medication + couples counseling referral | "I'll prescribe medication to help, and I'd recommend working with a couples counselor as well." |
| Severe liver disease | BLOCK all oral PE meds. Topical only. | "For your safety, I've prescribed a topical option." |

---

## 6.9 Blood Work Panels (PE)

> PE rarely requires blood work. Only ordered when doctor suspects underlying cause.

| Panel | Tests | Cost | When |
|---|---|---|---|
| Thyroid Check | TSH, Free T3, Free T4 | ₹350 | Suspected thyroid-related PE |
| Hormonal | Testosterone, Prolactin | ₹800 | Low libido co-present, acquired PE |
| Prostate | PSA, urine culture | ₹500 | Suspected prostatitis |
| Combined | All above | ₹1,500 | Complex acquired PE, multiple symptoms |

---

## 6.10 Medication Fulfillment

| Medication | Quantity (30 days) | Approx. Cost |
|---|---|---|
| Dapoxetine 30mg (on-demand, 8 tablets) | 8 tablets | ₹300-500 |
| Dapoxetine 60mg (on-demand, 8 tablets) | 8 tablets | ₹500-800 |
| Paroxetine 10mg daily | 30 tablets | ₹100-200 |
| Sertraline 25mg daily | 30 tablets | ₹100-200 |
| Lidocaine-Prilocaine cream | 1 tube (30g) | ₹150-300 |

**Packaging:** MAXIMUM DISCRETION — identical to ED. Plain box, "Onlyou" only, no medication names, no condition hints. Generic "Health & Wellness" on any visible label.
**Delivery:** Local delivery (Rapido/Dunzo/own). OTP-verified. Same-day or next-day.

---

## 6.11 Cross-Vertical Awareness

**PE + ED comorbidity is VERY common** (~30-40% of PE patients also have ED).

System behavior:
- If patient starts PE assessment and reports ED symptoms (Q3 or Q12), the AI flags comorbidity
- Doctor can prescribe combined treatment (e.g., Tadalafil daily + Dapoxetine on-demand) from a single consultation
- Patient does NOT need a separate ED subscription — combined treatment is covered under PE subscription at PE pricing
- If patient later wants to start a separate ED-only subscription (different medications), standard ED pricing applies
- The doctor dashboard shows comorbidity status prominently in both vertical views

---

# 7. NURSE SYSTEM

## 7.1 Role Definition

**Title:** Nurse (Gender: male or female)
**Replaces:** Phlebotomist role from v3 specs

**Qualifications:** GNM (General Nursing and Midwifery) or BSc Nursing, with phlebotomy training. Certification document stored in system.

**Scope for MVP:**
- Home visit blood collection (all functions from v3 phlebotomist spec)
- Patient vitals recording (BP, pulse, SpO2, weight)
- Basic patient education (medication usage, when to call doctor)
- Sample transport to diagnostic centre

**Scope for Phase 2 (scaffolded now):**
- Injection administration (GLP-1, TRT)
- Proof of Administration documentation
- Three-way video bridge with doctor
- Post-injection observation
- Wound care / dressing changes
- Comprehensive patient assessment

## 7.2 Data Model

### Nurse (replaces Phlebotomist)
```
id, name, phone, email?, gender,
qualification: enum (GNM, BSC_NURSING, ANM, OTHER),
certificationDocUrl, certificationNumber,
availableDays[], availableTimeStart, availableTimeEnd,
maxDailyVisits,
currentCity, serviceableAreas[] (pincodes),
completedVisits, failedVisits, rating,
canAdministerInjections: boolean,    // Phase 2
isActive, createdAt, updatedAt
```

### NurseVisit (NEW — every home visit gets a record)
```
id, nurseId, patientId, labOrderId?,
visitType: enum (BLOOD_COLLECTION, INJECTION_ADMIN, VITALS_ONLY, FOLLOW_UP),
scheduledDate, scheduledTimeSlot,
visitAddress, visitCity, visitPincode,

// Status
status: enum (SCHEDULED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED),

// Vitals (recorded at every visit)
vitals: {
  bloodPressureSystolic: number?,
  bloodPressureDiastolic: number?,
  pulseRate: number?,
  spO2: number?,
  weight: number?,
  temperature: number?,
  notes: string?
},

// Blood Collection (if applicable)
tubeCount: number?,
collectionNotes: string?,

// Injection Admin (Phase 2 — muted)
medicationAdministered: string?,
injectionSite: string?,
proofOfAdminPhotoUrl: string?,
patientSignatureUrl: string?,
postInjectionVitals: Json?,
observationMinutes: number?,
adverseReactionNotes: string?,

// Timestamps
scheduledAt, enRouteAt?, arrivedAt?, inProgressAt?,
completedAt?, failedAt?, failedReason?,
cancelledAt?, cancelledReason?,

createdAt, updatedAt
```

## 7.3 Portal Scope — `nurse.onlyou.life`

Defined in Section 4.4 above. Key difference from old phlebotomist portal:
- **Vitals recording step** added to every visit flow
- **Visit types** beyond just blood collection (future-proofed)
- **NurseVisit record** created for every visit (audit trail)
- **Qualification tracking** in nurse profile

---

# 8. VIDEO CONSULTATION SYSTEM (Muted for MVP)

## 8.1 Architecture (scaffolded, not active)

### Data Model Addition to Consultation:
```
Consultation {
  ...existing fields...

  // Video consultation (Phase 2)
  videoStatus: enum (NOT_REQUIRED, PENDING, SCHEDULED, IN_PROGRESS, COMPLETED, SKIPPED_TESTING),
  videoScheduledAt: DateTime?,
  videoStartedAt: DateTime?,
  videoEndedAt: DateTime?,
  videoDurationMinutes: number?,
  videoProvider: string?,           // "daily.co" / "twilio" / "agora" — TBD
  videoRoomId: string?,
  videoRecordingUrl: string?,       // if recorded
}
```

### Feature Flag:
```
VIDEO_CONSULTATION_ENABLED = false   // env variable
```

### MVP Behavior:
When a consultation reaches the "video consultation" step in the workflow:
1. System checks `VIDEO_CONSULTATION_ENABLED`
2. If `false`: automatically set `videoStatus = SKIPPED_TESTING` with current timestamp
3. Proceed to next step (prescription generation / treatment plan delivery)
4. Log: "Video consultation auto-skipped (testing mode)"

### Phase 2 Behavior (when flag = true):
1. After doctor reviews case and decides to proceed → `videoStatus = PENDING`
2. Patient picks available slot → `videoStatus = SCHEDULED`
3. Both join video room → `videoStatus = IN_PROGRESS`
4. Doctor ends call → `videoStatus = COMPLETED`
5. System unlocks prescription builder
6. For Schedule H drugs: prescription CANNOT be generated until `videoStatus = COMPLETED`

---

# 9. UPDATED BUILD ORDER

Adjusted from v3 to include PE vertical, nurse system, video scaffolding, and 6-month plans.

### Phase 1: Foundation (Week 1-3)
1. Auth (Email/Google/Apple social login for patients + WhatsApp OTP primary with SMS fallback + JWT + CASL.js RBAC + 6 roles: patient, doctor, admin, nurse, lab, pharmacy)
2. User profiles (all types including Nurse model)
3. S3 file upload (photos, documents, prescriptions)
4. Feature flag system (`VIDEO_CONSULTATION_ENABLED`, etc.)

**✅ Checkpoint:** Can register via Google/Apple/email, verify phone with OTP, receive JWT, and log in as each of the 6 roles. Upload a file to S3 and get a download URL.

### Phase 2: Core Clinical — Hair Loss First (Week 3-8)
5. Questionnaire engine (shared, renders from JSON schema)
6. Hair Loss questionnaire data file (25 questions + skip logic)
7. AI module + Hair Loss prompt + Claude API integration
8. Consultation lifecycle (including muted video status auto-skip)
9. Photo module (upload, S3 storage, quality checks)
10. Prescription builder + PDF generation

**✅ Checkpoint:** Can complete full Hair Loss questionnaire in mobile app, see AI assessment in backend, and view generated prescription PDF.

### Phase 3: Doctor Dashboard (Week 8-11)
11. Case Queue (filters, sort, status badges, attention levels)
12. Case Review (3-panel layout, all tabs)
13. Prescription templates (Hair Loss first)
14. Doctor-patient messaging
15. Doctor stats page

**✅ Checkpoint:** Doctor can log in, see submitted Hair Loss cases in queue, open case review with AI assessment, prescribe from template, and send a message to patient.

### Phase 4: Blood Work & Nurse System (Week 11-14)
16. Partner management (nurses, diagnostic centres, pharmacies, clinics)
17. Lab order lifecycle (full status flow from ORDERED → CLOSED)
18. Nurse portal (`nurse.onlyou.life`) — assignments, vitals, collection, deliver to lab
19. Lab portal (`lab.onlyou.life`) — receive, process, upload results
20. Patient lab booking (slot selection + self-upload option)
21. SLA escalation engine (all thresholds)

**✅ Checkpoint:** Admin can create partner records, assign nurse to lab order. Nurse can log into portal, see assignment, record vitals, mark sample collected. Lab staff can receive sample and upload results. Doctor sees results in case review.

### Phase 5: Delivery & Payment (Week 14-17)
22. Razorpay integration (one-time payments + subscriptions + 6-month plans)
23. Pharmacy portal (`pharmacy.onlyou.life`) — receive, prepare, ready
24. Delivery system (coordinator arranges, SMS link for delivery person, OTP confirmation)
25. Order tracking (full status flow)
26. Auto-reorder on subscription renewal
27. Wallet & refund system
28. Admin dashboard (`admin.onlyou.life`) — all tabs (overview, lab orders, deliveries, partners, settings)

**✅ Checkpoint:** Can complete Razorpay test payment, see order in pharmacy portal, mark ready, generate delivery SMS link, enter OTP to confirm delivery. Admin dashboard shows full pipeline overview.

### Phase 6: Patient App Tracking (Week 17-19)
29. Activity tab (unified blood work + delivery steppers)
30. Home tab (active treatments, reminders, tracking banners)
31. Profile tab (subscriptions, orders, prescriptions, lab results, wallet, settings)
32. Cancel/reschedule flows
33. Notification system (FCM push, Gupshup WhatsApp/SMS, email — all events, all channels, preferences + discreet mode)

**✅ Checkpoint:** Full Hair Loss patient journey end-to-end: sign up → questionnaire → AI → payment → doctor prescribes → pharmacy prepares → delivery confirmed → patient sees everything in Activity tab with steppers. Push/WhatsApp notifications fire at each step.

### Phase 7: ED + PE Verticals (Week 19-22)
34. ED questionnaire (28 questions + IIEF-5 scoring)
35. ED AI prompt + classification
36. ED prescription templates
37. ED doctor review additions (IIEF-5 badge, cardiovascular risk, nitrate banner)
38. PE questionnaire (26 questions + PEDT scoring) — NEW
39. PE AI prompt + classification — NEW
40. PE prescription templates — NEW
41. PE doctor review additions (PEDT badge, serotonin check banner) — NEW
42. ED+PE comorbidity handling — NEW

**✅ Checkpoint:** Can complete ED and PE questionnaires, see IIEF-5 and PEDT scores in doctor dashboard, prescribe from ED/PE templates, and handle combined ED+PE case with comorbidity banners.

### Phase 8: Weight Management Vertical (Week 22-24)
43. Weight questionnaire (30 questions + BMI calculation)
44. Weight AI prompt + classification
45. Weight prescription templates (Standard + GLP-1 premium)
46. Weight doctor review additions (BMI display, metabolic risk, eating disorder flag)
47. Weight-specific blood work panels

**✅ Checkpoint:** Weight questionnaire with BMI auto-calculation works, AI classifies into Standard vs GLP-1 tier, doctor can prescribe both Standard and Premium templates, weight-specific blood panels orderable.

### Phase 9: PCOS Vertical (Week 24-26)
48. PCOS questionnaire (32 questions + Rotterdam criteria check)
49. PCOS AI prompt + classification
50. PCOS prescription templates (not-trying vs. trying-to-conceive branches)
51. PCOS doctor review additions (Rotterdam checklist, fertility intent banner, menstrual calendar)
52. PCOS-specific blood work panels
53. Period tracker in patient app

**✅ Checkpoint:** PCOS questionnaire with Rotterdam criteria auto-check works, fertility-intent branching produces correct templates, period tracker records and displays cycle data. All 5 verticals now functional end-to-end.

### Phase 10: Landing Page & SEO (Week 26-27)
54. Homepage
55. Condition pages (5: hair-loss, ED, PE, weight, PCOS)
56. Legal pages (terms, privacy, refund, about)
57. Sanity CMS setup for blog
58. SEO optimization (meta tags, structured data, sitemap)

**✅ Checkpoint:** Landing page live at `onlyou.life`, all 5 condition pages render with SEO meta tags, structured data validates in Google Rich Results Test, blog CMS functional.

### Phase 11: Polish & Launch (Week 27-29)
59. Notification templates finalization (all events × all channels)
60. Cross-platform QA (iOS + Android + all web portals)
61. Performance optimization
62. Security audit
63. Load testing
64. App Store + Play Store submission
65. Production deployment + monitoring setup

**✅ Checkpoint:** All portals pass manual QA on target devices (Android: Samsung M13, Redmi Note 12; iOS: via TestFlight). Security audit passes. Load test handles 50 concurrent users. Apps submitted to App Store + Play Store. Production deployed with monitoring alerts configured.

**Total estimated timeline: ~29 weeks**

---

# 10. WHAT STAYS UNCHANGED

> **DOCUMENT HIERARCHY (for AI coding assistants and developers):**
> When conflicts exist between documents, follow this precedence:
> 1. **ARCHITECTURE.md** — governs all tech stack, infrastructure, project structure, and database design decisions
> 2. **This document (onlyou-spec-resolved-v4.md)** — governs all clinical workflows, UI specifications, questionnaires, pricing, and business logic
> 3. **PROJECT-OVERVIEW.md** — high-level summary; defer to the above two for specifics
> 4. **Condition-specific specs** (hair-loss.md, ed.md, weight.md, pcos.md) — authoritative for their respective verticals
> 5. **CLAUDE.md** — development conventions, override rules, and coding instructions
>
> If v4 spec Section 3 (project structure) conflicts with ARCHITECTURE.md Section 4, **ARCHITECTURE.md wins** — Section 3 here is a summary view.

The following from the v3 .md spec files remain the authoritative reference and are NOT repeated here. This document only covers what CHANGED or was ADDED:

**From `onlyou-spec-master.md` (v3):**
- Section 3: Shared User Journey (auth, profile, questionnaire engine, payment flow) — except video is muted
- Section 4: Patient Tracking Screens (status steppers, status mappings) — unchanged
- Section 5: Doctor Dashboard base structure — enhanced in this doc Section 4.2
- Section 6: AI Pre-Assessment Framework (pipeline, shared schema, routing) — unchanged
- Section 7: Blood Work & Diagnostics — unchanged except "phlebotomist" → "nurse" throughout
- Section 8: Medication Fulfillment — unchanged (already says no Shiprocket, local delivery)
- Section 9: Referral & Retention System — unchanged
- Section 10: Refund & Wallet — unchanged
- Section 11: Notification System — unchanged (all event tables, channels, preferences)
- Section 12: Payment & Subscription — updated pricing in this doc Section 5
- Section 13: Database Schema — additions noted in this doc (Nurse, NurseVisit, PE fields)
- Section 14: Security & Compliance — unchanged
- Mobile-First Dashboard Requirements — unchanged (PWA, bottom nav, responsive breakpoints, performance targets)
- Domain Strategy — updated: `collect.onlyou.life` → `nurse.onlyou.life`

**From condition-specific specs:**
- `onlyou-spec-hair-loss.md` — fully unchanged
- `onlyou-spec-erectile-dysfunction.md` — fully unchanged
- `onlyou-spec-weight-management.md` — fully unchanged
- `onlyou-spec-pcos.md` — fully unchanged

**All four condition specs remain authoritative** for their respective verticals. This document adds:
- PE vertical (Section 6) — new
- Updated pricing with 6-month plans (Section 5) — replaces annual plans
- Nurse system replacing phlebotomist (Section 7) — new
- Video consultation scaffolding (Section 8) — new
- Resolved conflicts (Section 1) — new
- Dashboard deep dive (Section 4) — enhanced from all sources

---

*End of Onlyou Resolved Specification v4. This is the single source of truth.*
