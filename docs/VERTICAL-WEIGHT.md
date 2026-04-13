# VERTICAL-WEIGHT.md — Weight Management Vertical

> **Onlyou Telehealth Platform — Complete Weight Management Vertical Specification**
> Version: 1.1 · Date: 2026-03-02 · Status: Implementation-Ready (Verified)
> Authoritative pricing source: `onlyou-spec-resolved-v4.md` Section 5

---

## Table of Contents

1. [Condition Overview & Medical Context](#1-condition-overview--medical-context)
2. [Target Audience & Eligibility](#2-target-audience--eligibility)
3. [Build Priority & Development Phase](#3-build-priority--development-phase)
4. [Two-Tier System: Standard vs GLP-1 Premium](#4-two-tier-system-standard-vs-glp-1-premium)
5. [Subscription Plans & Pricing](#5-subscription-plans--pricing)
6. [Subscription Inclusions](#6-subscription-inclusions)
7. [Patient Journey — End to End](#7-patient-journey--end-to-end)
8. [Questionnaire Specification](#8-questionnaire-specification)
9. [BMI Calculation & WHO Asian Classification](#9-bmi-calculation--who-asian-classification)
10. [Photo Upload Specification](#10-photo-upload-specification)
11. [AI Assessment Extensions](#11-ai-assessment-extensions)
12. [Doctor Review & Prescription Templates](#12-doctor-review--prescription-templates)
13. [Medications & Pharmacy Handling](#13-medications--pharmacy-handling)
14. [Blood Work — Metabolic Panel](#14-blood-work--metabolic-panel)
15. [Follow-Up Cadence & Progress Tracking](#15-follow-up-cadence--progress-tracking)
16. [Landing Page & SEO Specification](#16-landing-page--seo-specification)
17. [Admin Portal — Weight Management Operations](#17-admin-portal--weight-management-operations)
18. [Backend Data Models & API Routes](#18-backend-data-models--api-routes)
19. [Cross-Portal Integration Matrix](#19-cross-portal-integration-matrix)
20. [Known Issues, Edge Cases & Testing Checklist](#20-known-issues-edge-cases--testing-checklist)

---

## 1. Condition Overview & Medical Context

### 1.1 What Is Being Treated

Onlyou's Weight Management vertical addresses **overweight and obesity** — chronic metabolic conditions characterised by excess body fat accumulation that increases risk for type 2 diabetes, cardiovascular disease, fatty liver disease, sleep apnoea, and joint problems. This vertical targets patients with a **BMI ≥ 25** (using WHO Asian cutoffs, which differ from Western standards) who seek medically supervised weight loss rather than fad diets or unregulated supplements.

The platform provides **prescription-grade pharmacotherapy** alongside lifestyle modification, supervised by endocrinologists or internal medicine physicians, delivered through Onlyou's asynchronous telehealth model.

### 1.2 Why It Fits Onlyou

Weight management is a **high-stigma, high-demand** condition in India:

- Patients feel embarrassed discussing weight in person, especially women and younger adults.
- Many patients have tried multiple approaches (gym memberships, Ayurvedic treatments, meal replacement shakes) without sustained results and are reluctant to "start again" in a clinical setting.
- Prescription weight-loss medications (Orlistat, Metformin off-label, and increasingly GLP-1 agonists) require medical supervision but don't need physical examination beyond BMI and basic metabolic screening.
- The async-first model lets patients complete assessments privately, receive medically appropriate treatment, and track progress through photo comparison — all without clinic visits.

### 1.3 Internal Enum & System Identifier

| Field | Value |
|-------|-------|
| Condition enum | `WEIGHT_MANAGEMENT` |
| URL slug | `weight-management` |
| Display name (patient-facing) | "Weight Management" |
| Display name (admin/doctor) | "Weight Management" |
| Condition badge colour | Use platform badge system (condition-specific colour TBD by design) |

> **Source:** PROJECT-OVERVIEW.md Section 4, APP-PATIENT.md Section 5

### 1.4 Consultation Model

| Parameter | Value |
|-----------|-------|
| Consultation type | **Async** (questionnaire + photos) |
| Doctor speciality | Endocrinologist / Internal Medicine |
| Photos required | 2 (full body front + full body side) |
| Blood work | Usually required (Metabolic Panel) |
| Time to visible results | 4–8 weeks (medication-dependent) |
| Prescription renewal | Auto-renewal with follow-up questionnaire at cadence milestones |

> **Source:** PROJECT-OVERVIEW.md Section 4 (Vertical Comparison Table)

---

## 2. Target Audience & Eligibility

### 2.1 Demographics

| Parameter | Value |
|-----------|-------|
| Gender | Male and Female (both) |
| Age range | 18–55 |
| Geography | India (initial launch) |
| BMI minimum | ≥ 25 (WHO Asian standard: ≥ 23 is overweight, ≥ 25 is Obese Class I) |

> **Source:** PROJECT-OVERVIEW.md Section 4

### 2.2 Eligibility Criteria

**Included:**
- Age 18–55 years
- BMI ≥ 25 (calculated from self-reported height and weight, verified via full-body photos)
- No active eating disorders (screened via questionnaire)
- Willing to commit to minimum 3-month treatment plan
- No contraindicated medications (screened via questionnaire)

**Excluded (flagged for doctor review, not auto-rejected):**
- BMI < 23 — system should NOT offer weight-loss medication. If a patient with normal BMI selects Weight Management, the questionnaire scoring flags them for doctor review with a note: "BMI within normal range. Assess for body dysmorphia or eating disorder before proceeding."
- BMI 23–24.9 — overweight by Asian standards but may not require pharmacotherapy. Doctor discretion.
- Age > 55 — not hard-rejected but flagged for additional cardiovascular risk assessment.
- Pregnant or breastfeeding — hard exclusion. Questionnaire asks this and blocks submission with message: "Weight loss medication is not safe during pregnancy or breastfeeding. Please consult your OB-GYN."
- Active eating disorder (anorexia, bulimia) — flagged if screening questions indicate risk. See Section 11 for AI eating disorder screening flag.

### 2.3 Gender-Specific Considerations

| Consideration | Male | Female |
|---------------|------|--------|
| Questionnaire questions | Same base set | Additional: menstrual regularity, PCOS history, pregnancy/breastfeeding |
| Photo requirements | Same (2 photos) | Same (2 photos) |
| Medication options | All available | Pregnancy-safe alternatives flagged |
| Cross-vertical flag | Check for ED comorbidity | Check for PCOS comorbidity — if PCOS detected, suggest PCOS vertical instead/additionally |

> **Note:** If a female patient's questionnaire responses indicate PCOS symptoms (irregular periods + BMI ≥ 25 + hirsutism), the AI assessment should flag: "PCOS indicators detected. Consider enrolling patient in PCOS vertical for targeted treatment." The doctor can then recommend switching or dual-enrolment.

---

## 3. Build Priority & Development Phase

### 3.1 Build Sequence

Weight Management is **#4 of 5 verticals** in the Onlyou build sequence:

| Priority | Vertical | Phase | Weeks |
|----------|----------|-------|-------|
| 1 | Hair Loss | Phase 6 | 16–18 |
| 2 | Erectile Dysfunction | Phase 7 | 19–21 |
| 3 | Premature Ejaculation | Phase 7 | 19–21 (shares with ED) |
| **4** | **Weight Management** | **Phase 8** | **22–24** |
| 5 | PCOS | Phase 8 | 22–24 (shares with Weight) |

> **Source:** onlyou-spec-resolved-v4.md Phase 8

### 3.2 Phase 8 Checkpoint — Definition of Done

The following must pass before Phase 8 is considered complete:

- [ ] Weight Management questionnaire with BMI auto-calculation works end-to-end
- [ ] AI correctly classifies patients into Standard vs GLP-1 tier based on BMI and comorbidity flags
- [ ] Doctor portal displays Weight-specific AI assessment fields (BMI classification, metabolic risk, GLP-1 eligibility)
- [ ] Doctor can prescribe using all 6 Weight prescription templates (including greyed-out GLP-1 templates)
- [ ] Weight-specific Metabolic Panel is orderable through lab portal
- [ ] Follow-up questionnaires trigger at correct cadence intervals (4 weeks, 3 months, 6 months)
- [ ] Photo comparison (side-by-side + slider overlay) works for full-body photos
- [ ] Landing page `/weight-management` renders with correct two-tier pricing table
- [ ] GLP-1 Premium tier shows "Coming Soon" badge in patient app and "Limited Availability" on landing page
- [ ] Subscription plans seed data matches authoritative pricing from onlyou-spec-resolved-v4.md Section 5

> **Source:** onlyou-spec-resolved-v4.md Phase 8 checkpoint

### 3.3 What Can Be Reused from Earlier Verticals

By the time Weight Management is built (Phase 8), the following infrastructure already exists from Hair Loss (Phase 6) and ED/PE (Phase 7):

| Component | Status by Phase 8 | Notes |
|-----------|-------------------|-------|
| Questionnaire engine | ✅ Built | Extend with BMI calculation logic |
| Photo upload pipeline | ✅ Built | Reuse — same S3 pipeline, different grid layout (2×1 vs 3×1) |
| AI assessment framework | ✅ Built | Add Weight-specific `conditionSpecific` fields |
| Prescription template system | ✅ Built | Add 6 new Weight templates |
| Lab panel ordering | ✅ Built | Add Metabolic Panel definition |
| Follow-up cadence engine | ✅ Built | Configure Weight-specific intervals |
| Photo comparison UI | ✅ Built | Reuse slider overlay — works with any photo count |
| Subscription billing (Razorpay) | ✅ Built | Add Weight plan IDs |
| Landing page template | ✅ Built | Clone and customise for Weight |

**New development required for Weight:**
- BMI auto-calculation from height + weight inputs (BACKEND-PART1.md Section 6.3)
- WHO Asian BMI classification logic (different cutoffs from Western standards)
- Two-tier plan selection UI (Standard vs GLP-1 Premium — unique to Weight)
- GLP-1 "Coming Soon" badge and waitlist system (unique to Weight at MVP)
- Eating disorder screening flag in AI assessment (unique to Weight)
- Metabolic risk assessment fields in AI output (unique to Weight)

---

## 4. Two-Tier System: Standard vs GLP-1 Premium

### 4.1 Overview

Weight Management is the **only Onlyou vertical with a two-tier pricing system**. All other verticals (Hair Loss, ED, PE, PCOS) have a single pricing tier. This reflects the significant cost difference between oral medications (Orlistat, Metformin) and injectable GLP-1 receptor agonists (Semaglutide, Liraglutide).

### 4.2 Tier Comparison

| Feature | Standard Tier | GLP-1 Premium Tier |
|---------|---------------|-------------------|
| Medications | Orlistat, Metformin, Phentermine | Semaglutide, Liraglutide injections |
| Doctor consultation | ✅ Included | ✅ Included |
| Questionnaire + AI assessment | ✅ Included | ✅ Included |
| Blood work (first panel) | ✅ Included when clinically indicated | ✅ Included when clinically indicated |
| Medication delivery | ✅ Standard shipping | ✅ Cold-chain shipping (2–8°C) |
| Nurse home visit for injection | ❌ Not applicable | ✅ Scaffolded but muted for MVP |
| Monthly price | ₹2,999 | ₹9,999 |
| Expected weight loss | 3–5% body weight in 3 months | 10–15% body weight in 6 months |
| MVP status | ✅ Fully available | ⚠️ Limited availability / Coming Soon |

### 4.3 GLP-1 Premium — MVP Status

At MVP launch, the GLP-1 Premium tier is available in **limited capacity**:

**Patient App behaviour:**
- Plan selection screen shows both tiers
- GLP-1 Premium cards display a **"Coming Soon"** badge overlay
- Tapping a GLP-1 plan shows a modal: "GLP-1 injectable treatment is launching soon. Join the waitlist to be notified when it's available in your area."
- Waitlist capture: name, email, phone, city — stored in `glp1_waitlist` table
- Patient can still select Standard tier and proceed normally

**Doctor Portal behaviour:**
- AI assessment includes GLP-1 eligibility field regardless of tier availability
- If AI marks patient as GLP-1 eligible, doctor sees the flag but prescribes Standard protocol for MVP
- GLP-1 prescription templates (#4 and #5) appear in the template list but are **greyed out** with tooltip: "GLP-1 prescriptions available when Premium tier launches"

**Landing Page behaviour:**
- Two-tier pricing table renders normally
- GLP-1 pricing card has **"Limited Availability"** badge
- Below GLP-1 card: "GLP-1 injectable treatment is currently in limited availability. Join the waitlist to be notified when it opens in your area."

> **Source:** APP-PATIENT.md Section 11.1, LANDING-PAGE.md Section 8, PORTAL-DOCTOR.md Section 12.3

---

## 5. Subscription Plans & Pricing

### 5.1 Authoritative Pricing Table

> ⚠️ **CRITICAL:** All pricing MUST match `onlyou-spec-resolved-v4.md` Section 5. This is the single source of truth. The `backend-errors-report.md` (Error #19) documents that BACKEND-PART3A Section 25 seed data had incorrect pricing and must be rewritten.

#### Standard Tier

| Plan | Total Price | Per-Month Rate | Savings vs Monthly |
|------|------------|----------------|-------------------|
| Monthly | ₹2,999/month | ₹2,999/mo | — |
| Quarterly | ₹7,999/quarter | ₹2,666/mo | 11% savings |
| 6-Month | ₹14,999/6 months | ₹2,500/mo | 17% savings |

#### GLP-1 Premium Tier

| Plan | Total Price | Per-Month Rate | Savings vs Monthly |
|------|------------|----------------|-------------------|
| Monthly | ₹9,999/month | ₹9,999/mo | — |
| Quarterly | ₹24,999/quarter | ₹8,333/mo | 17% savings |
| 6-Month | ₹44,999/6 months | ₹7,500/mo | 25% savings |

> **Source:** onlyou-spec-resolved-v4.md Section 5 (authoritative)

### 5.2 Marketing Price

The marketing price displayed on landing page hero, condition cards, and promotional material:

**"From ₹2,500/mo"**

This is the per-month rate of the **6-month Standard plan** (₹14,999 ÷ 6 = ₹2,500/mo).

### 5.3 Razorpay Plan Configuration

Each plan requires a corresponding Razorpay Plan ID. Plan IDs are created via Razorpay API and stored in the `subscription_plans` database table.

```
Razorpay plan naming convention:
  plan_weight_standard_monthly
  plan_weight_standard_quarterly
  plan_weight_standard_6month
  plan_weight_glp1_monthly
  plan_weight_glp1_quarterly
  plan_weight_glp1_6month
```

### 5.4 Seed Data Fix Required

Per `backend-errors-report.md` Error #19:

> **Problem:** BACKEND-PART3A Section 25 contains incorrect pricing in the `subscription_plans` seed data for all verticals including Weight Management.
>
> **Fix required:** Rewrite the seed data section to match the authoritative pricing from `onlyou-spec-resolved-v4.md` Section 5. The Weight Management seed data must include **both** Standard and GLP-1 Premium tiers (12 plan records total: 6 Standard + 6 GLP-1 Premium, covering monthly/quarterly/6-month for each).

```typescript
// Correct seed data for Weight Management plans
const weightPlans = [
  // Standard Tier
  { condition: 'WEIGHT_MANAGEMENT', tier: 'STANDARD', duration: 'MONTHLY',   priceInPaise: 299900, displayPrice: '₹2,999',  perMonthPrice: '₹2,999',  savings: null },
  { condition: 'WEIGHT_MANAGEMENT', tier: 'STANDARD', duration: 'QUARTERLY', priceInPaise: 799900, displayPrice: '₹7,999',  perMonthPrice: '₹2,666',  savings: '11%' },
  { condition: 'WEIGHT_MANAGEMENT', tier: 'STANDARD', duration: 'BIANNUAL',  priceInPaise: 1499900, displayPrice: '₹14,999', perMonthPrice: '₹2,500', savings: '17%' },
  // GLP-1 Premium Tier
  { condition: 'WEIGHT_MANAGEMENT', tier: 'GLP1_PREMIUM', duration: 'MONTHLY',   priceInPaise: 999900,  displayPrice: '₹9,999',  perMonthPrice: '₹9,999',  savings: null },
  { condition: 'WEIGHT_MANAGEMENT', tier: 'GLP1_PREMIUM', duration: 'QUARTERLY', priceInPaise: 2499900, displayPrice: '₹24,999', perMonthPrice: '₹8,333', savings: '17%' },
  { condition: 'WEIGHT_MANAGEMENT', tier: 'GLP1_PREMIUM', duration: 'BIANNUAL',  priceInPaise: 4499900, displayPrice: '₹44,999', perMonthPrice: '₹7,500', savings: '25%' },
];
```

> **Note:** `priceInPaise` uses Indian paise (1 rupee = 100 paise) as required by Razorpay. All amounts are integers to avoid floating-point issues.

---

## 6. Subscription Inclusions

### 6.1 What's Included — Standard Tier

| Inclusion | Details |
|-----------|---------|
| Doctor consultation | Async review by endocrinologist/internal medicine physician |
| AI-powered assessment | BMI classification, metabolic risk, eating disorder screening |
| Prescription | Doctor-selected from Standard templates (Orlistat, Metformin, Phentermine, Lifestyle-only) |
| Medication delivery | Monthly shipment to patient's address (standard courier) |
| First blood panel | Metabolic Panel (₹1,800 value) — included when clinically indicated |
| Follow-up assessments | Structured questionnaires at 4 weeks, 3 months, 6 months |
| Progress photos | Side-by-side comparison with slider overlay |
| Chat support | Async messaging with care team (nurse-triaged) |
| Prescription adjustments | Dose changes at follow-up milestones based on progress |

### 6.2 What's Included — GLP-1 Premium Tier (Phase 2)

Everything in Standard, plus:

| Inclusion | Details |
|-----------|---------|
| GLP-1 injectable medication | Semaglutide or Liraglutide (dose escalation schedule) |
| Cold-chain delivery | Insulated packaging, 2–8°C temperature-controlled shipping |
| Nurse home visit | Injection administration (scaffolded in system, muted for MVP) |
| Enhanced monitoring | More frequent check-ins during dose escalation phase |

### 6.3 What's NOT Included (Either Tier)

| Item | Cost | Notes |
|------|------|-------|
| Follow-up blood panels | ₹600–₹1,200 | Doctor selects subset of tests; patient pays per panel |
| Self-uploaded lab results | Free | Patient can upload results from external labs |
| Specialist referral | N/A | If doctor identifies condition requiring in-person care, patient is referred out |
| Nutritionist consultation | Not available at MVP | Future roadmap item |

> **Source:** PROJECT-OVERVIEW.md Section 5

---

## 7. Patient Journey — End to End

### 7.1 Journey Flow

```
Landing Page (/weight-management)
    │
    ▼
Sign Up / Login (OTP via SMS — MSG91)
    │
    ▼
Condition Selection: "Weight Management"
    │
    ▼
Questionnaire (~30 questions)
  ├── Demographics & medical history
  ├── Height + Weight → BMI auto-calculated
  ├── Eating habits & exercise frequency
  ├── Previous weight-loss attempts
  ├── Current medications
  ├── Female-specific: menstrual regularity, pregnancy/breastfeeding, PCOS history
  └── Eating disorder screening questions
    │
    ▼
Photo Upload (2 photos: front full-body + side full-body)
    │
    ▼
Plan Selection
  ├── Standard Tier: Monthly / Quarterly / 6-Month
  └── GLP-1 Premium: "Coming Soon" badge (MVP) — waitlist modal
    │
    ▼
Payment (Razorpay — UPI / Card / Net Banking)
    │
    ▼
Case Created → Enters Doctor Queue
    │
    ▼
AI Pre-Assessment Generated
  ├── BMI calculation + WHO Asian classification
  ├── Metabolic risk flags (diabetes, cardiovascular, fatty liver)
  ├── Eating disorder screening flag (if triggered)
  ├── GLP-1 eligibility assessment
  └── Suggested prescription template
    │
    ▼
Doctor Reviews Case (Async)
  ├── Reviews AI assessment, questionnaire answers, photos
  ├── Selects/modifies prescription template
  ├── Orders Metabolic Panel if clinically indicated
  └── Approves case
    │
    ▼
Patient Notified: "Your treatment plan is ready"
    │
    ▼
Lab Booking (if blood work ordered)
  ├── Patient selects preferred lab from partner list
  ├── Home collection or walk-in
  └── Results uploaded to case → Doctor reviews
    │
    ▼
Prescription Sent to Pharmacy
  ├── Pharmacy verifies stock + pricing
  ├── Medication dispensed + shipped
  └── Patient receives medication
    │
    ▼
Follow-Up Cycle Begins
  ├── 4 weeks: Side effects check (10 questions, no photos)
  ├── 3 months: Progress review (10 questions + 2 new photos)
  └── 6 months: Full re-assessment (15 questions + 2 new photos)
    │
    ▼
Subscription Auto-Renews or Patient Cancels
```

### 7.2 Key Decision Points

| Decision Point | Logic | Outcome |
|----------------|-------|---------|
| BMI < 23 | Normal weight | Flag for doctor review — "BMI within normal range" |
| BMI 23–24.9 | Overweight (Asian standard) | Proceed but flag — doctor may recommend lifestyle-only |
| BMI ≥ 25 | Obese Class I | Standard treatment pathway |
| BMI ≥ 30 with comorbidity | GLP-1 potentially eligible | AI flags eligibility (deferred at MVP) |
| BMI ≥ 35 | GLP-1 eligible regardless of comorbidity | AI flags eligibility (deferred at MVP) |
| Eating disorder indicators | Screening flag triggered | AI adds warning; doctor must assess before prescribing |
| Pregnant/breastfeeding | Hard exclusion | Questionnaire blocks submission |
| Female + irregular periods + hirsutism | PCOS indicators | AI suggests PCOS vertical consideration |

> **Source:** APP-PATIENT.md Sections 5, 9.4, 10, 11.1; PROJECT-OVERVIEW.md Section 6

---

## 8. Questionnaire Specification

### 8.1 Overview

| Parameter | Value |
|-----------|-------|
| Total questions | ~30 |
| Conditional branches | Yes (gender-specific, BMI-dependent) |
| Auto-calculated fields | BMI (from height + weight) |
| Scoring mechanism | BMI-based tier routing + eating disorder screening score |
| Estimated completion time | 8–10 minutes |

### 8.2 Question Categories

#### Section A: Demographics & Basics (Questions 1–6)

| # | Question | Type | Options/Validation | Purpose |
|---|----------|------|-------------------|---------|
| 1 | What is your age? | Number input | 18–55 range validation | Eligibility check |
| 2 | What is your gender? | Single select | Male / Female / Non-binary / Prefer not to say | Branch logic for female-specific questions |
| 3 | What is your height? | Number input (cm) | 120–220 cm | BMI calculation |
| 4 | What is your current weight? | Number input (kg) | 30–250 kg | BMI calculation |
| 5 | What is your goal weight? | Number input (kg) | Must be less than current weight | Treatment goal setting |
| 6 | What is your waist circumference? (optional) | Number input (cm) | 50–200 cm | Additional metabolic risk factor |

> **Auto-calculation trigger:** After Q3 and Q4 are answered, BMI is calculated in real-time and displayed to the patient: "Your BMI: XX.X (Classification: [Overweight/Obese Class I/Obese Class II])". See Section 9 for calculation logic.

#### Section B: Medical History (Questions 7–14)

| # | Question | Type | Options | Purpose |
|---|----------|------|---------|---------|
| 7 | Have you been diagnosed with any of the following? | Multi-select | Type 2 diabetes / Pre-diabetes / High blood pressure / High cholesterol / Fatty liver disease / Sleep apnoea / PCOS (female) / Thyroid disorder / None | Comorbidity assessment, GLP-1 eligibility |
| 8 | Are you currently taking any medications? | Yes/No → free text if Yes | Text field for medication names | Drug interaction check |
| 9 | Have you had any bariatric surgery? | Yes/No → type if Yes | Gastric bypass / Sleeve gastrectomy / Gastric band / Other | Treatment history |
| 10 | Do you have any known allergies to medications? | Yes/No → free text if Yes | Text field | Safety screening |
| 11 | Have you ever been diagnosed with an eating disorder? | Yes/No | — | Eating disorder screening (Part 1) |
| 12 | Do you have any kidney or liver disease? | Yes/No → specify if Yes | Text field | Metformin/Orlistat contraindication check |
| 13 | (Female only) Are you currently pregnant or breastfeeding? | Yes/No | — | Hard exclusion |
| 14 | (Female only) Are your menstrual periods regular? | Single select | Regular / Irregular / No periods / Prefer not to say | PCOS indicator |

#### Section C: Weight History & Lifestyle (Questions 15–22)

| # | Question | Type | Options | Purpose |
|---|----------|------|---------|---------|
| 15 | How long have you been overweight? | Single select | Less than 1 year / 1–3 years / 3–5 years / 5–10 years / More than 10 years / Since childhood | Chronicity assessment |
| 16 | Have you tried to lose weight before? | Yes/No | — | Treatment history |
| 17 | (If Q16 = Yes) What methods have you tried? | Multi-select | Diet changes / Exercise / Weight loss supplements / Prescription medication / Meal replacement / Ayurvedic/herbal / Intermittent fasting / Other | Previous approach assessment |
| 18 | How many meals do you eat per day? | Single select | 1 / 2 / 3 / 4+ / Irregular | Eating pattern baseline |
| 19 | How often do you eat outside or order food delivery? | Single select | Daily / 4–6 times/week / 2–3 times/week / Once a week / Rarely | Dietary habit assessment |
| 20 | How often do you exercise? | Single select | Never / 1–2 times/week / 3–4 times/week / 5+ times/week | Activity level baseline |
| 21 | What type of exercise do you do? | Multi-select (if Q20 ≠ Never) | Walking / Running / Gym/weights / Yoga / Swimming / Sports / Other | Activity type |
| 22 | How many hours do you sleep per night on average? | Single select | Less than 5 / 5–6 / 7–8 / More than 8 | Sleep assessment (impacts metabolism) |

#### Section D: Eating Disorder Screening (Questions 23–26)

These questions are based on validated eating disorder screening instruments and contribute to the AI eating disorder screening flag (see Section 11).

| # | Question | Type | Options | Purpose |
|---|----------|------|---------|---------|
| 23 | Do you ever feel you have lost control over how much you eat? | Single select | Never / Rarely / Sometimes / Often / Always | Binge eating indicator |
| 24 | Do you ever make yourself sick (vomit) after eating? | Single select | Never / Rarely / Sometimes / Often / Always | Purging indicator |
| 25 | Do you worry a lot about your body shape or weight? | Single select | Not at all / A little / Moderately / A lot / Extremely | Body image concern |
| 26 | Do you skip meals to try to control your weight? | Single select | Never / Rarely / Sometimes / Often / Always | Restrictive behaviour indicator |

> **Scoring logic:** The eating disorder screening flag is triggered based on multiple conditions — NOT simply "Often" or "Always" for all Q23–Q26. Q24 (self-induced vomiting) triggers on ANY non-"Never" response (including "Rarely"), and Q25+Q26 use a combined condition. See **Section 11.4** for the complete logic. Also triggers if Q11 (previous eating disorder diagnosis) = Yes.

#### Section E: Goals & Expectations (Questions 27–30)

| # | Question | Type | Options | Purpose |
|---|----------|------|---------|---------|
| 27 | What is your primary motivation for losing weight? | Multi-select | Health improvement / Appearance / Doctor's advice / Mobility / Confidence / Fertility / Other | Goal alignment |
| 28 | How much weight would you like to lose? | Single select | 5–10 kg / 10–20 kg / 20–30 kg / More than 30 kg / Not sure | Expectation calibration |
| 29 | Are you willing to make dietary changes as part of your treatment? | Single select | Yes, significant changes / Yes, moderate changes / Minimal changes only / Not sure | Compliance prediction |
| 30 | How did you hear about Onlyou? | Single select | Google search / Social media / Friend/family / Doctor referral / Other | Attribution (non-clinical) |

> **Source:** APP-PATIENT.md Section 9.4, BACKEND-PART1.md Section 6.3

---

## 9. BMI Calculation & WHO Asian Classification

### 9.1 BMI Calculation

BMI is calculated automatically from the patient's self-reported height and weight:

```
BMI = weight (kg) / [height (m)]²
```

**Implementation (BACKEND-PART1.md Section 6.3):**

```typescript
function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10; // Round to 1 decimal place
}
```

### 9.2 WHO Asian BMI Classification

> ⚠️ **CRITICAL:** Onlyou uses **WHO Asian BMI cutoffs**, which are LOWER than Western cutoffs. This is medically appropriate for the Indian population where metabolic risks manifest at lower BMI levels.

| BMI Range | Classification (WHO Asian) | Classification (WHO Western) | Onlyou Action |
|-----------|---------------------------|------------------------------|---------------|
| < 18.5 | Underweight | Underweight | Not eligible for weight loss treatment |
| 18.5–22.9 | Normal | Normal | Not eligible — flag if patient selected Weight Management |
| 23.0–24.9 | **Overweight** | Normal (Western: < 25 is normal) | Eligible — doctor discretion on pharmacotherapy vs lifestyle-only |
| 25.0–29.9 | **Obese Class I** | Overweight (Western: 25–29.9) | Standard treatment pathway |
| ≥ 30.0 | **Obese Class II** | Obese Class I (Western: 30–34.9) | Standard treatment + GLP-1 eligibility with comorbidity |
| ≥ 35.0 | Obese Class II+ | Obese Class II+ | GLP-1 eligible regardless of comorbidity |

> **Key difference:** The WHO Asian cutoff for "overweight" starts at **23.0**, not 25.0. The WHO Asian cutoff for "obese" starts at **25.0**, not 30.0. This is specifically because South Asian populations develop obesity-related diseases at lower BMI thresholds.
>
> ⚠️ **Backend discrepancy:** BACKEND-PART1.md Section 6.3 `calculateBMI()` returns **6** categories (splitting ≥30 into `obese_2` at 30–34.9 and `obese_3` at ≥35) with lowercase naming (`obese_1`), while PORTAL-DOCTOR.md Section 6.2 and this document use **5** categories with SCREAMING_SNAKE naming (`OBESE_CLASS_I`). The extra backend granularity (obese_2 vs obese_3) is useful for GLP-1 eligibility logic (≥35 eligible without comorbidity) but must be mapped to the 5-category display in the doctor portal. See Section 20.1 Known Issues for recommended fix.

### 9.3 BMI Display in Patient App

After the patient enters height and weight in the questionnaire, BMI is calculated in real-time and displayed:

```
┌─────────────────────────────────────────┐
│  Your BMI: 27.4                         │
│  Classification: Obese Class I          │
│                                         │
│  ──────────●────────────────            │
│  18.5  23.0  25.0   30.0   35.0        │
│  Normal  OW   Obese I  Obese II        │
│                                         │
│  ℹ️ Using WHO Asian classification,     │
│     which is medically appropriate      │
│     for the Indian population.          │
└─────────────────────────────────────────┘
```

### 9.4 BMI Storage

The calculated BMI and classification are stored as part of the questionnaire response and included in the AI assessment input:

```typescript
interface BMIData {
  heightCm: number;
  weightKg: number;
  bmi: number;                    // Calculated value, 1 decimal
  classification: BMIClassification;  // Enum: UNDERWEIGHT | NORMAL | OVERWEIGHT | OBESE_I | OBESE_II
  goalWeightKg: number;
  weightToLoseKg: number;         // currentWeight - goalWeight
}
```

---

## 10. Photo Upload Specification

### 10.1 Photo Requirements

| Parameter | Value |
|-----------|-------|
| Number of photos | **2** |
| Grid layout (doctor portal) | **2×1** (two photos side by side) |
| Photo 1 position | Front-facing full body ("Front") |
| Photo 2 position | Side profile ("Side") |

### 10.2 Photo Guidance for Patients

The photo upload screen displays the following instructions:

```
📸 Photo Guidelines — Weight Management

We need 2 photos to help your doctor assess your body composition.

Photo 1: Full Body — Front View
• Stand straight, arms at sides
• Face the camera directly
• Wear fitted clothing (avoid loose/baggy)
• Full body from head to feet must be visible

Photo 2: Full Body — Side View
• Turn 90° to your left or right
• Stand straight, natural posture
• Same clothing as Photo 1
• Full body from head to feet must be visible

Tips:
• Take photos in good lighting
• Use a plain background if possible
• Ask someone to take the photo, or use a timer
• Photos are private — only your doctor will see them

[Upload Photo 1: Front] [Upload Photo 2: Side]
```

### 10.3 Technical Specifications

| Parameter | Value |
|-----------|-------|
| Max file size | 10 MB per photo |
| Accepted formats | JPEG, PNG, HEIC (auto-converted to JPEG) |
| Minimum resolution | 800×600 px |
| Storage | AWS S3 (Mumbai region — ap-south-1) |
| Encryption | AES-256 at rest, TLS 1.2+ in transit |
| Retention | Per DPDPA 2023 — retained while subscription active + 90 days after cancellation, then auto-deleted |
| Access control | Signed URLs, 15-minute expiry, accessible only by assigned doctor + patient |

### 10.4 Doctor Portal Photo Display

In the doctor's case review screen, Weight Management photos are displayed in a **2×1 horizontal grid**:

```
┌─────────────────────┬─────────────────────┐
│                     │                     │
│    FRONT VIEW       │    SIDE VIEW        │
│                     │                     │
│    [Full body]      │    [Full body]      │
│                     │                     │
└─────────────────────┴─────────────────────┘
```

> **Comparison with other verticals:**
> - Hair Loss: 2×2 grid — 4 photos (Crown/Vertex, Hairline, Left Temple, Right Temple)
> - ED: 0 photos (no photos required)
> - PE: 0 photos (no photos required)
> - Weight: 2×1 grid — 2 photos (Front, Side)
> - PCOS: 0 photos (no photos required)

> **Source:** APP-PATIENT.md Section 10, PORTAL-DOCTOR.md Section 8.1

---

## 11. AI Assessment Extensions

### 11.1 Overview

The AI pre-assessment for Weight Management cases generates the same base assessment structure as other verticals (severity score, risk flags, treatment urgency) PLUS Weight-specific `conditionSpecific` fields.

### 11.2 Weight-Specific conditionSpecific Fields

```typescript
interface WeightConditionSpecific {
  // BMI Data
  bmiCalculation: {
    value: number;                        // e.g., 27.4
    classification: string;               // e.g., "Obese Class I (WHO Asian)"
    heightCm: number;
    weightKg: number;
    goalWeightKg: number;
    weightToLoseKg: number;
  };

  // Metabolic Risk Assessment
  metabolicRiskAssessment: {
    diabetesRisk: 'Low' | 'Moderate' | 'High';
    cardiovascularRisk: 'Low' | 'Moderate' | 'High';
    fattyLiverRisk: 'Low' | 'Moderate' | 'High';
    riskFactors: string[];                // e.g., ["BMI > 30", "Family history of diabetes", "Sedentary lifestyle"]
  };

  // Eating Disorder Screening
  eatingDisorderFlag: {
    triggered: boolean;
    message: string | null;               // "⚠️ Eating disorder risk indicators detected. Consider screening before prescribing weight-loss medication."
    triggerReasons: string[];             // e.g., ["Patient reports frequent loss of control over eating", "History of diagnosed eating disorder"]
  };

  // GLP-1 Eligibility
  glp1Eligibility: {
    status: 'Eligible' | 'Not eligible' | 'Borderline — doctor discretion';
    reason: string;                       // e.g., "BMI ≥ 35" or "BMI ≥ 30 with type 2 diabetes comorbidity"
    note: string;                         // "GLP-1 tier currently deferred. Standard protocol applies for MVP."
  };

  // Suggested Treatment Approach
  suggestedApproach: 'Lifestyle only' | 'Standard pharmacotherapy' | 'Intensive pharmacotherapy' | 'GLP-1 candidate';
}
```

### 11.3 AI Assessment Display in Doctor Portal

The doctor sees the following Weight-specific sections in the AI assessment tab:

```
┌─────────────────────────────────────────────────────────┐
│ AI PRE-ASSESSMENT — WEIGHT MANAGEMENT                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ BMI: 31.2 — Obese Class II (WHO Asian)                 │
│ Height: 168 cm | Weight: 88 kg | Goal: 72 kg           │
│ Weight to lose: 16 kg                                   │
│                                                         │
│ ── Metabolic Risk Assessment ──                         │
│ Diabetes risk:        HIGH   (HbA1c history, BMI > 30) │
│ Cardiovascular risk:  MODERATE (Hypertension, BMI > 30) │
│ Fatty liver risk:     MODERATE (BMI > 30, sedentary)    │
│                                                         │
│ Risk factors:                                           │
│ • BMI > 30                                             │
│ • Family history of type 2 diabetes                     │
│ • Sedentary lifestyle (exercise: never)                 │
│ • High outside food consumption (4–6 times/week)        │
│                                                         │
│ ── Eating Disorder Screening ──                         │
│ ✅ No eating disorder indicators detected               │
│                                                         │
│ ── GLP-1 Eligibility ──                                │
│ Status: Borderline — doctor discretion                  │
│ Reason: BMI ≥ 30 with diabetes comorbidity             │
│ Note: GLP-1 tier currently deferred. Standard protocol  │
│       applies for MVP.                                  │
│                                                         │
│ ── Suggested Template ──                                │
│ Template #3: Metformin Add-On                           │
│ Rationale: BMI > 30 with diabetes risk. Metformin       │
│ provides dual benefit for weight + glucose control.     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 11.4 Eating Disorder Screening — Detailed Logic

The eating disorder flag is triggered if ANY of the following conditions are met:

| Condition | Source |
|-----------|--------|
| Q11 = "Yes" (previously diagnosed with eating disorder) | Questionnaire Section B |
| Q23 (loss of control over eating) = "Often" or "Always" | Questionnaire Section D |
| Q24 (self-induced vomiting) = "Rarely" or higher (any non-"Never" response) | Questionnaire Section D |
| Q25 (body shape worry) = "Extremely" AND Q26 (skipping meals) = "Often" or "Always" | Questionnaire Section D combined |
| BMI < 23 AND patient selected Weight Management | BMI calculation + condition selection |

When the flag is triggered, the AI assessment displays:

```
⚠️ EATING DISORDER SCREENING FLAG

Eating disorder risk indicators detected. Consider screening before 
prescribing weight-loss medication.

Triggered by:
• [List of specific trigger reasons]

Recommendation: Conduct clinical assessment for eating disorder 
before initiating pharmacotherapy. Consider referral to psychiatrist 
or psychologist specialising in eating disorders if confirmed.
```

> **Source:** PORTAL-DOCTOR.md Section 6.2

### 11.5 GLP-1 Eligibility Logic

```
IF BMI ≥ 35:
    status = "Eligible"
    reason = "BMI ≥ 35"
ELSE IF BMI ≥ 30 AND has_comorbidity(diabetes OR hypertension OR dyslipidemia OR sleep_apnoea):
    status = "Eligible"
    reason = "BMI ≥ 30 with [comorbidity name]"
ELSE IF BMI ≥ 30 AND no_comorbidity:
    status = "Borderline — doctor discretion"
    reason = "BMI ≥ 30 without documented comorbidity"
ELSE:
    status = "Not eligible"
    reason = "BMI < 30"

// Always append for MVP:
note = "GLP-1 tier currently deferred. Standard protocol applies for MVP."
```

### 11.6 PCOS Cross-Vertical Flag

For female patients, if the following conditions are ALL met:
- BMI ≥ 25
- Q14 (menstrual regularity) = "Irregular"
- Q7 includes "PCOS"

The AI adds a cross-vertical suggestion:

```
ℹ️ PCOS indicators detected. Patient has BMI ≥ 25, irregular periods, 
and self-reported PCOS history. Consider enrolling in the PCOS vertical 
for targeted hormonal treatment alongside weight management.
```

---

## 12. Doctor Review & Prescription Templates

### 12.1 Case Queue Entry

Weight Management cases appear in the doctor queue with:

| Field | Display |
|-------|---------|
| Condition badge | "Weight" |
| Tier badge | "Standard" or "GLP-1 Premium" (when available) |
| BMI | Displayed prominently (e.g., "BMI: 31.2") |
| Priority indicators | Eating disorder flag (⚠️), High metabolic risk (🔴) |
| Time in queue | Standard SLA applies |

### 12.2 Doctor Review Workflow

1. **Open case** → View AI pre-assessment summary
2. **Review questionnaire** → Full answers with flagged responses highlighted
3. **Review photos** → 2×1 grid (front + side)
4. **Check metabolic risk** → Diabetes/CV/liver risk levels
5. **Check eating disorder flag** → If triggered, assess before prescribing
6. **Check GLP-1 eligibility** → Note for future reference (deferred at MVP)
7. **Select prescription template** → Choose from 6 templates (2 greyed out)
8. **Modify if needed** → Adjust medications, dosages, add notes
9. **Order blood work** → Metabolic Panel if clinically indicated
10. **Approve case** → Patient notified, prescription sent to pharmacy

### 12.3 Prescription Templates

#### Template #1: Lifestyle Only

| Field | Value |
|-------|-------|
| Template name | Lifestyle Only |
| When to use | BMI 23–24.9 (overweight, not obese) or patient preference for non-pharmacological approach |
| Medications | None |
| Instructions | Diet plan (calorie deficit guidance), Exercise regimen (150 min/week moderate activity), Behavioural counselling notes |
| Follow-up | 4 weeks: check compliance and weight change |

#### Template #2: Standard Orlistat

| Field | Value |
|-------|-------|
| Template name | Standard Orlistat |
| When to use | BMI ≥ 25, no diabetes/pre-diabetes, no contraindications to Orlistat |
| Medications | Orlistat 120mg capsules — 1 capsule TID (with each main meal containing fat); Multivitamin — 1 tablet daily at bedtime (≥2 hours after Orlistat, to replace fat-soluble vitamins) |
| Duration | Ongoing with subscription |
| Key counselling | Take with or within 1 hour of fat-containing meal. GI side effects (oily stools, flatulence) are common and reduce with lower fat intake. |

#### Template #3: Metformin Add-On

| Field | Value |
|-------|-------|
| Template name | Metformin Add-On |
| When to use | BMI ≥ 25 with diabetes risk factors (pre-diabetes, family history, HbA1c borderline) |
| Medications | Metformin XR 500mg — 1 tablet BID (with meals, titrate up from 500mg OD for first week); Orlistat 120mg — 1 capsule TID (with fat-containing meals); Multivitamin — 1 tablet daily at bedtime |
| Duration | Ongoing with subscription |
| Key counselling | Start Metformin at 500mg once daily for first week, then increase to 500mg twice daily. Report persistent GI symptoms. |
| Blood work required | Yes — check renal function (creatinine, eGFR) before starting Metformin |

#### Template #4: GLP-1 Standard *(Deferred — Greyed Out)*

| Field | Value |
|-------|-------|
| Template name | GLP-1 Standard |
| MVP status | **Greyed out** — tooltip: "GLP-1 prescriptions available when Premium tier launches" |
| When to use | BMI ≥ 30 with comorbidity OR BMI ≥ 35 |
| Medications | Semaglutide injection pen — dose escalation schedule: Week 1–4: 0.25mg/week → Week 5–8: 0.5mg/week → Week 9–12: 1.0mg/week → Week 13+: 2.4mg/week (maintenance) |
| Storage | Refrigerated 2–8°C |
| Administration | Subcutaneous injection, weekly |

#### Template #5: GLP-1 + Metformin *(Deferred — Greyed Out)*

| Field | Value |
|-------|-------|
| Template name | GLP-1 + Metformin |
| MVP status | **Greyed out** — tooltip: "GLP-1 prescriptions available when Premium tier launches" |
| When to use | BMI ≥ 30 with type 2 diabetes or significant insulin resistance |
| Medications | Semaglutide injection pen (same escalation as Template #4); Metformin XR 500mg — 1 tablet BID |
| Storage | Semaglutide: Refrigerated 2–8°C; Metformin: Room temperature |

#### Template #6: Custom

| Field | Value |
|-------|-------|
| Template name | Custom |
| When to use | When none of the above templates fit the patient's profile |
| Medications | Empty — doctor manually selects from medication catalogue |
| Notes | Doctor can combine any available Weight medications and add free-text instructions |

> **Source:** PORTAL-DOCTOR.md Section 12.3

---

## 13. Medications & Pharmacy Handling

### 13.1 Standard Tier Medications

| Medication | Formulation | Schedule | Storage | Notes |
|------------|------------|----------|---------|-------|
| Orlistat 120mg | Capsules | TID with meals | Room temperature, away from moisture | Most common first-line for Weight |
| Metformin XR 500mg | Extended-release tablets | BID with meals | Room temperature | Off-label for weight but widely used; dual benefit if diabetes risk |
| Phentermine 15mg | Tablets | Once daily, morning | Room temperature | **Schedule H1** — requires special endorsement on prescription; short-term use only (12 weeks max) |
| Multivitamin (fat-soluble) | Tablets | Once daily at bedtime | Room temperature | Required co-prescription with Orlistat (vitamins A, D, E, K depleted by fat malabsorption) |

### 13.2 GLP-1 Premium Tier Medications (Phase 2)

| Medication | Formulation | Schedule | Storage | Cold Chain Required |
|------------|------------|----------|---------|-------------------|
| Semaglutide 0.25mg/0.5mg/1mg/2.4mg | Pre-filled injection pen | Once weekly, subcutaneous | **2–8°C refrigerated** | ✅ Yes |
| Liraglutide 0.6mg/1.2mg/1.8mg | Pre-filled injection pen | Once daily, subcutaneous | **2–8°C refrigerated** | ✅ Yes |

### 13.3 Pharmacy Handling — Standard Tier

Standard workflow (same as other verticals):

1. Prescription received from doctor portal
2. Pharmacist verifies: medication availability, patient allergies, drug interactions
3. Medications dispensed and packaged
4. Shipped via standard courier to patient address
5. Patient receives SMS notification with tracking link

### 13.4 Pharmacy Handling — GLP-1 Premium Tier (Phase 2)

Special cold-chain requirements:

| Step | Requirement |
|------|------------|
| Storage | Pharmacy stores injection pens in dedicated pharmaceutical fridge at 2–8°C |
| Pre-shipping | Verify cold chain packaging available (insulated bag + gel ice packs) |
| Packaging | Place pen in insulated bag with temperature indicator strip |
| Handoff | Hand directly to cold-chain courier — do NOT leave unattended |
| Delivery window | Same-day or next-day delivery only — no standard courier |
| Patient instruction | Include leaflet: "Store in refrigerator. Do not freeze. Use within 28 days of first use (can be stored at room temperature below 30°C for up to 28 days if removed from fridge)." |

### 13.5 Schedule H1 Note — Phentermine

Phentermine is a **Schedule H1 controlled substance** in India. Pharmacy handling requirements:

- Prescription must include doctor's registration number
- Special endorsement required on prescription
- Cannot be dispensed more than once on same prescription
- Maximum 12-week supply per prescription
- Pharmacist must record in Schedule H1 register
- Cannot be delivered by standard courier in some states — verify state regulations

> **Source:** PORTAL-PHARMACY.md Section 23

### 13.6 Nurse Home Visit — GLP-1 Injections (Scaffolded, Muted for MVP)

The system architecture includes nurse visit scheduling for GLP-1 injection administration:

- Nurse portal has the ability to schedule home visits
- Visit types include "Injection Administration"
- For MVP, this feature is **scaffolded in the backend but muted in the UI**
- When GLP-1 tier launches, nurse visits can be activated without new development
- First injection should ideally be administered by nurse (patient education on self-injection technique)
- Subsequent injections: patient self-administers at home

> **Source:** PORTAL-NURSE-FIXED.md (nurse system scaffolded but muted for MVP)

---

## 14. Blood Work — Metabolic Panel

### 14.1 Panel Definition

| Panel Name | Metabolic Panel |
|------------|----------------|
| Condition | WEIGHT_MANAGEMENT |
| Panel code | `PANEL_METABOLIC` |
| Panel price | ₹1,800 |
| First panel | **INCLUDED** in subscription when clinically indicated |
| Follow-up panels | ₹600–₹1,200 (doctor selects subset of tests) |
| Self-upload | Free (patient uploads results from external lab) |

### 14.2 Tests Included in Metabolic Panel

| Test | Purpose | Normal Range (Reference) |
|------|---------|------------------------|
| HbA1c | Diabetes screening / monitoring | < 5.7% (normal), 5.7–6.4% (pre-diabetes), ≥ 6.5% (diabetes) |
| Fasting glucose | Diabetes screening | 70–100 mg/dL |
| Total cholesterol | Cardiovascular risk | < 200 mg/dL |
| HDL cholesterol | Cardiovascular risk (protective) | > 40 mg/dL (male), > 50 mg/dL (female) |
| LDL cholesterol | Cardiovascular risk | < 100 mg/dL |
| Triglycerides | Cardiovascular + metabolic risk | < 150 mg/dL |
| ALT (SGPT) | Liver function (fatty liver screening) | 7–56 U/L |
| AST (SGOT) | Liver function | 10–40 U/L |
| Bilirubin (total) | Liver function | 0.1–1.2 mg/dL |
| Creatinine | Kidney function (required before Metformin) | 0.7–1.3 mg/dL (male), 0.6–1.1 mg/dL (female) |
| BUN (Blood Urea Nitrogen) | Kidney function | 7–20 mg/dL |
| eGFR | Kidney function (calculated) | ≥ 60 mL/min/1.73m² |
| TSH | Thyroid function (rule out hypothyroidism as weight gain cause) | 0.4–4.0 mIU/L |

> **Total tests:** 13 individual tests in one panel

### 14.3 When Blood Work Is Ordered

| Scenario | Blood Work? | Panel |
|----------|-------------|-------|
| Initial assessment, BMI ≥ 25 | Usually yes | Full Metabolic Panel |
| Initial assessment, BMI 23–24.9 (overweight only) | Doctor discretion | May order TSH + fasting glucose only |
| Doctor prescribing Metformin | **Mandatory** | At minimum: creatinine + eGFR (kidney function) |
| Follow-up at 3 months | Doctor discretion | Subset: HbA1c + lipid panel + liver function |
| Follow-up at 6 months | Usually yes | Full Metabolic Panel repeat |
| Patient self-uploads lab results | N/A | Doctor reviews uploaded results — no charge |

### 14.4 Lab Portal Integration

The Metabolic Panel is defined in the lab portal system and orderable by doctors:

```typescript
{
  panelId: 'PANEL_METABOLIC',
  panelName: 'Metabolic Panel',
  condition: 'WEIGHT_MANAGEMENT',
  tests: [
    'HbA1c', 'Fasting Glucose',
    'Total Cholesterol', 'HDL', 'LDL', 'Triglycerides',
    'ALT', 'AST', 'Bilirubin',
    'Creatinine', 'BUN', 'eGFR',
    'TSH'
  ],
  price: 180000,  // ₹1,800 in paise
  sampleType: 'BLOOD',
  fastingRequired: true,
  fastingHours: 10,
  turnaroundHours: 24
}
```

### 14.5 Follow-Up Panel Pricing

Doctors can order subsets of the Metabolic Panel at follow-up visits:

| Subset | Tests | Price |
|--------|-------|-------|
| Diabetes check | HbA1c + Fasting glucose | ₹600 |
| Lipid check | Total cholesterol + HDL + LDL + Triglycerides | ₹800 |
| Liver check | ALT + AST + Bilirubin | ₹600 |
| Kidney check | Creatinine + BUN + eGFR | ₹600 |
| Thyroid check | TSH | ₹400 |
| Comprehensive follow-up | All 13 tests (full panel repeat) | ₹1,200 (discounted from ₹1,800) |

> **Source:** PORTAL-DOCTOR.md Section 13.2, PORTAL-LAB-FIXED.md Section 24, BACKEND-PART2A.md Section 12.5

---

## 15. Follow-Up Cadence & Progress Tracking

### 15.1 Follow-Up Schedule

| Milestone | Timing | Questionnaire Length | Photos Required | Blood Work |
|-----------|--------|---------------------|-----------------|------------|
| First follow-up | 4 weeks after treatment start | 10 questions | No | No (unless side effects reported) |
| Progress review | 3 months | 10 questions | Yes — 2 new photos | Doctor discretion (subset panel) |
| Full re-assessment | 6 months | 15 questions | Yes — 2 new photos | Usually yes (full panel repeat) |
| Ongoing (after 6 months) | Every 3 months | 10 questions | Yes — 2 new photos | Every 6 months (doctor discretion) |

> **Source:** APP-PATIENT.md Section 12.4

### 15.2 Follow-Up Questionnaire Content

#### 4-Week Follow-Up (10 questions)

| # | Question | Purpose |
|---|----------|---------|
| 1 | What is your current weight? | Track progress |
| 2 | Have you experienced any side effects from your medication? | Safety monitoring |
| 3 | (If yes) Which side effects? | Multi-select: nausea, diarrhea, oily stools, stomach cramps, headache, dizziness, flatulence, other |
| 4 | How severe are the side effects? | Mild / Moderate / Severe |
| 5 | Are you taking your medication as prescribed? | Compliance check |
| 6 | (If no) What is making it difficult? | Free text |
| 7 | Have you made dietary changes? | Yes, significant / Yes, some / No |
| 8 | How often are you exercising? | Same scale as initial questionnaire |
| 9 | How are you feeling overall about your treatment? | Very positive / Positive / Neutral / Negative / Very negative |
| 10 | Any additional concerns for your doctor? | Free text |

#### 3-Month Progress Review (10 questions + 2 photos)

Same as 4-week follow-up PLUS:
- Updated weight (auto-calculates weight change since start)
- 2 new photos (front + side) for comparison
- Additional question: "Has your waist measurement changed?" (optional cm input)

#### 6-Month Full Re-Assessment (15 questions + 2 photos)

Includes all 4-week questions PLUS:
- Comprehensive dietary habits reassessment (5 additional questions)
- Mental health check: "How has the weight loss journey affected your mood and self-image?"
- Goal reassessment: "Would you like to adjust your goal weight?"
- Continuation decision: "Would you like to continue your current treatment plan?"
- 2 new photos for comparison

### 15.3 Photo Comparison — Progress Tracking

When follow-up photos are submitted, the doctor portal provides two comparison modes:

**Mode 1: Side-by-Side View**
```
┌─────────────────────┬─────────────────────┐
│  BASELINE (Day 1)   │  FOLLOW-UP (Month 3)│
│                     │                     │
│  [Front photo]      │  [Front photo]      │
│                     │                     │
│  Weight: 88 kg      │  Weight: 82 kg      │
│  BMI: 31.2          │  BMI: 29.1          │
└─────────────────────┴─────────────────────┘
```

**Mode 2: Slider Overlay**
```
┌─────────────────────────────────────────────┐
│                                             │
│   [Photo overlay with draggable slider]     │
│                                             │
│   ◄────────────●──────────────►             │
│   Baseline          Follow-up               │
│                                             │
└─────────────────────────────────────────────┘
```

The photo comparison system is shared across all verticals and works with any number of photos. For Weight Management, comparison pairs are: Front↔Front, Side↔Side.

### 15.4 Weight Tracking Over Time

The doctor portal displays a weight trend chart for Weight Management patients:

```
Weight Progress
92 ─
90 ─
88 ─ ●
86 ─     ●
84 ─         ●
82 ─             ●
80 ─                 ●
    ─────────────────────
    Start  4wk  3mo  6mo
    
    Lost: 8 kg (9.1%)  |  BMI: 31.2 → 28.4
    Target: 72 kg      |  Remaining: 10 kg
```

---

## 16. Landing Page & SEO Specification

### 16.1 URL & Metadata

| Field | Value |
|-------|-------|
| URL | `https://onlyou.life/weight-management/` |
| Title tag | "Medical Weight Loss Online India — Prescription Treatment Plans from ₹2,500/mo \| Onlyou" |
| Meta description | "Lose weight with prescription medication supervised by doctors. Standard & GLP-1 treatment plans. BMI assessment + ongoing monitoring + medication delivery. From ₹2,500/mo." |
| H1 | "Medical weight loss — real medication, real doctors, real results" |
| Canonical URL | `https://onlyou.life/weight-management/` |
| Open Graph image | Custom hero image for Weight Management |

### 16.2 Target Keywords

| Priority | Keywords |
|----------|----------|
| Primary | weight loss treatment online India |
| Primary | medical weight loss India |
| Primary | GLP-1 weight loss India |
| Primary | semaglutide India |
| Secondary | prescription weight loss medication India |
| Secondary | Orlistat online India |
| Secondary | obesity treatment online |
| Secondary | BMI weight loss plan |
| Long-tail | doctor prescribed weight loss India |
| Long-tail | medical weight management consultation online |
| Long-tail | Ozempic alternative India |

### 16.3 Page Structure

```
[Navigation Bar]

[Hero Section]
  H1: "Medical weight loss — real medication, real doctors, real results"
  Subhead: "Prescription medication + ongoing doctor supervision + home delivery. 
            No fad diets. No empty promises."
  CTA: "Check Your BMI — Start Free Assessment"
  Trust badge: "Licensed doctors • DPDPA compliant • Home delivery"

[How It Works — 4 Steps]
  1. Complete online assessment (5 minutes)
  2. Doctor reviews your profile + BMI
  3. Get personalised prescription
  4. Medication delivered to your door

[Two-Tier Pricing Table]
  ┌───────────────────────┬────────────────────────────┐
  │  STANDARD             │  GLP-1 PREMIUM             │
  │                       │  ⚡ Limited Availability    │
  │  Oral medications     │  Injectable GLP-1 agonists │
  │  Orlistat + Metformin │  Semaglutide / Liraglutide │
  │                       │                            │
  │  From ₹2,500/mo       │  From ₹7,500/mo            │
  │                       │                            │
  │  Monthly: ₹2,999      │  Monthly: ₹9,999           │
  │  Quarterly: ₹7,999    │  Quarterly: ₹24,999        │
  │  6-Month: ₹14,999     │  6-Month: ₹44,999          │
  │                       │                            │
  │  [Start Now]          │  [Join Waitlist]           │
  └───────────────────────┴────────────────────────────┘

  Note below GLP-1 card: "GLP-1 injectable treatment is currently 
  in limited availability. Join the waitlist to be notified when 
  it opens in your area."

[What's Included]
  ✓ Doctor consultation
  ✓ AI-powered BMI assessment
  ✓ Prescription medication
  ✓ Blood work (when needed)
  ✓ Monthly medication delivery
  ✓ Ongoing progress monitoring
  ✓ Photo-based progress tracking

[Medical Conditions We Treat]
  • Overweight (BMI 23–24.9)
  • Obesity Class I (BMI 25–29.9)
  • Obesity Class II (BMI ≥ 30)
  • Weight-related comorbidities

[FAQ Section]
  Q: "What medications do you prescribe?"
  Q: "Is this safe?"
  Q: "How much weight can I expect to lose?"
  Q: "Do I need blood tests?"
  Q: "What is GLP-1 treatment?"
  Q: "Can I cancel anytime?"
  Q: "Is my information private?"

[Footer]
```

### 16.4 SEO Content Guidelines

- Page copy must be medically accurate and reviewed
- Avoid unsupported weight loss claims (e.g., "lose 20 kg in 2 weeks")
- Use WHO Asian BMI classifications, not Western standards
- Mention that treatment is prescription-only and doctor-supervised
- Include DPDPA compliance badge in footer
- FAQ schema markup for Google rich snippets
- Internal links to: Terms of Service, Privacy Policy, other condition pages

> **Source:** LANDING-PAGE.md Section 8

---

## 17. Admin Portal — Weight Management Operations

### 17.1 Subscription Plan Management

Admin portal route: `/settings/plans`

Weight Management plans appear in the plan management table alongside all other verticals. Admin can view and update pricing (changes apply to new subscriptions only — existing subscribers retain their locked-in price until renewal).

| Plan ID Pattern | Tier | Duration | Price |
|----------------|------|----------|-------|
| `weight_standard_monthly` | Standard | Monthly | ₹2,999 |
| `weight_standard_quarterly` | Standard | Quarterly | ₹7,999 |
| `weight_standard_6month` | Standard | 6-Month | ₹14,999 |
| `weight_glp1_monthly` | GLP-1 Premium | Monthly | ₹9,999 |
| `weight_glp1_quarterly` | GLP-1 Premium | Quarterly | ₹24,999 |
| `weight_glp1_6month` | GLP-1 Premium | 6-Month | ₹44,999 |

### 17.2 Case Queue — Weight Management Filter

The admin case queue includes a "Weight" condition filter badge:

- Admin can filter all cases by condition = "Weight Management"
- Case cards show: patient name, BMI, subscription tier (Standard/GLP-1), status, time in queue
- Priority cases highlighted: eating disorder flag, high metabolic risk, pending blood results

### 17.3 GLP-1 Waitlist Management

Admin portal includes a GLP-1 waitlist management section:

| Feature | Details |
|---------|---------|
| Route | `/admin/waitlist/glp1` |
| Data displayed | Name, email, phone, city, sign-up date |
| Actions | Export CSV, Send notification (when GLP-1 launches), Remove from list |
| Metrics | Total waitlist sign-ups, Sign-ups by city, Weekly growth |

### 17.4 Analytics Dashboard — Weight Vertical

Weight Management KPIs visible in admin dashboard:

| Metric | Description |
|--------|-------------|
| Active subscribers (Standard) | Count of active Standard tier subscriptions |
| Active subscribers (GLP-1) | Count of active GLP-1 tier subscriptions (0 at MVP) |
| GLP-1 waitlist size | Total waitlist sign-ups |
| Average BMI at enrolment | Mean BMI of new Weight patients |
| Average weight loss at 3 months | Mean kg lost (for patients with 3-month follow-up data) |
| Blood work completion rate | % of patients who completed ordered Metabolic Panel |
| Eating disorder flag rate | % of cases with eating disorder screening flag |
| Churn rate (Standard) | Monthly subscription cancellation rate |

> **Source:** PORTAL-ADMIN.md Section 24

---

## 18. Backend Data Models & API Routes

### 18.1 Database Schema Extensions for Weight

#### subscription_plans table (Weight entries)

```sql
-- Standard Tier
INSERT INTO subscription_plans (condition, tier, duration, price_paise, display_price, per_month_price, savings_percent, active) VALUES
('WEIGHT_MANAGEMENT', 'STANDARD', 'MONTHLY',   299900,  '₹2,999',  '₹2,999', NULL, true),
('WEIGHT_MANAGEMENT', 'STANDARD', 'QUARTERLY', 799900,  '₹7,999',  '₹2,666', 11,   true),
('WEIGHT_MANAGEMENT', 'STANDARD', 'BIANNUAL',  1499900, '₹14,999', '₹2,500', 17,   true);

-- GLP-1 Premium Tier (active = false at MVP, set to true when tier launches)
INSERT INTO subscription_plans (condition, tier, duration, price_paise, display_price, per_month_price, savings_percent, active) VALUES
('WEIGHT_MANAGEMENT', 'GLP1_PREMIUM', 'MONTHLY',   999900,  '₹9,999',  '₹9,999', NULL, false),
('WEIGHT_MANAGEMENT', 'GLP1_PREMIUM', 'QUARTERLY', 2499900, '₹24,999', '₹8,333', 17,   false),
('WEIGHT_MANAGEMENT', 'GLP1_PREMIUM', 'BIANNUAL',  4499900, '₹44,999', '₹7,500', 25,   false);
```

#### condition_config table (Weight entry)

```sql
INSERT INTO condition_config (
  condition, display_name, slug, consultation_type, doctor_speciality,
  photos_required, photo_count, blood_work_default, time_to_results,
  questionnaire_count, has_tiers, marketing_price, active
) VALUES (
  'WEIGHT_MANAGEMENT', 'Weight Management', 'weight-management',
  'ASYNC', 'Endocrinologist / Internal Medicine',
  true, 2, 'USUALLY', '4-8 weeks',
  30, true, '₹2,500/mo', true
);
```

#### glp1_waitlist table (new table for Weight)

```sql
CREATE TABLE glp1_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'WAITING',  -- WAITING | NOTIFIED | CONVERTED | REMOVED
  UNIQUE(email)
);
```

### 18.2 Questionnaire Engine — BMI Extension

The questionnaire engine (BACKEND-PART1.md Section 6.3) needs a BMI calculation hook:

```typescript
// Triggered after height and weight questions are answered
interface QuestionnaireHook {
  condition: 'WEIGHT_MANAGEMENT';
  trigger: 'AFTER_QUESTION';
  triggerQuestionIds: ['height_cm', 'weight_kg'];
  action: 'CALCULATE_BMI';
  output: {
    field: 'calculated_bmi';
    display: true;       // Show to patient in real-time
    storeInResponse: true; // Include in questionnaire response payload
  };
}
```

### 18.3 API Routes — Weight-Specific

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/questionnaire/weight/submit` | Submit Weight questionnaire (includes BMI calculation) |
| GET | `/api/plans/weight-management` | Get Weight subscription plans (both tiers) |
| POST | `/api/waitlist/glp1` | Join GLP-1 waitlist |
| GET | `/api/waitlist/glp1` | Admin: list waitlist entries |
| POST | `/api/waitlist/glp1/notify` | Admin: send notification to waitlist |
| GET | `/api/cases/:caseId/weight-progress` | Get weight trend data for a case |
| GET | `/api/panels/PANEL_METABOLIC` | Get Metabolic Panel definition and pricing |

### 18.4 Enum Extensions

```typescript
// Condition enum (add WEIGHT_MANAGEMENT)
enum Condition {
  HAIR_LOSS = 'HAIR_LOSS',
  ERECTILE_DYSFUNCTION = 'ERECTILE_DYSFUNCTION',
  PREMATURE_EJACULATION = 'PREMATURE_EJACULATION',
  WEIGHT_MANAGEMENT = 'WEIGHT_MANAGEMENT',
  PCOS = 'PCOS',
}

// Subscription tier enum (add GLP1_PREMIUM)
enum SubscriptionTier {
  STANDARD = 'STANDARD',
  GLP1_PREMIUM = 'GLP1_PREMIUM',
}

// BMI classification enum (new)
// ⚠️ NOTE: BACKEND-PART1.md calculateBMI() uses 6 lowercase categories
// (underweight, normal, overweight, obese_1, obese_2, obese_3).
// This enum uses 5 SCREAMING_SNAKE categories matching PORTAL-DOCTOR.md.
// The backend's obese_2 + obese_3 both map to OBESE_CLASS_II here.
// A mapping function is needed in the AI assessment module.
enum BMIClassification {
  UNDERWEIGHT = 'UNDERWEIGHT',       // < 18.5
  NORMAL = 'NORMAL',                 // 18.5–22.9
  OVERWEIGHT = 'OVERWEIGHT',         // 23.0–24.9 (WHO Asian)
  OBESE_CLASS_I = 'OBESE_CLASS_I',   // 25.0–29.9 (WHO Asian)
  OBESE_CLASS_II = 'OBESE_CLASS_II', // ≥ 30.0 (WHO Asian)
}

// Panel code enum (add PANEL_METABOLIC)
enum LabPanel {
  PANEL_HAIR = 'PANEL_HAIR',
  PANEL_METABOLIC = 'PANEL_METABOLIC',
  // ... others
}

// GLP-1 waitlist status
enum WaitlistStatus {
  WAITING = 'WAITING',
  NOTIFIED = 'NOTIFIED',
  CONVERTED = 'CONVERTED',
  REMOVED = 'REMOVED',
}
```

---

## 19. Cross-Portal Integration Matrix

### 19.1 How Weight Management Touches Each Portal

| Portal | Weight-Specific Functionality | Reference |
|--------|------------------------------|-----------|
| **Patient App** | Condition selection → Weight questionnaire with BMI auto-calc → 2 photo upload → Two-tier plan selection (Standard + GLP-1 Coming Soon) → Follow-up questionnaires with weight tracking | APP-PATIENT.md Sections 5, 9.4, 10, 11.1, 12.4 |
| **Doctor Portal** | AI assessment with BMI/metabolic risk/eating disorder flag/GLP-1 eligibility → 2×1 photo grid → 6 prescription templates (2 greyed out) → Metabolic Panel ordering → Weight progress chart | PORTAL-DOCTOR.md Sections 6.2, 8.1, 12.3, 13.2 |
| **Nurse Portal** | Case triage for Weight cases → GLP-1 injection home visits (scaffolded, muted) → Follow-up scheduling | PORTAL-NURSE-FIXED.md |
| **Admin Portal** | 12 subscription plan records (6 Standard + 6 GLP-1) → GLP-1 waitlist management → Weight KPI dashboard → Case queue filter | PORTAL-ADMIN.md Section 24 |
| **Lab Portal** | Metabolic Panel definition (13 tests, ₹1,800) → Follow-up subset panels → Lab partner ordering → Result upload | PORTAL-LAB-FIXED.md Section 24 |
| **Pharmacy Portal** | Standard medications (Orlistat, Metformin, Phentermine, Multivitamin) → Schedule H1 handling for Phentermine → GLP-1 cold-chain handling (Phase 2) | PORTAL-PHARMACY.md Section 23 |
| **Landing Page** | `/weight-management/` with two-tier pricing table → GLP-1 waitlist capture → SEO optimisation | LANDING-PAGE.md Section 8 |
| **Backend** | BMI calculation engine → WHO Asian classification → Questionnaire scoring → AI assessment extensions → Waitlist API → Weight progress tracking | BACKEND-PART1.md Section 6.3, BACKEND-PART2A.md Section 12.5 |

### 19.2 Data Flow Diagram

```
Patient App                    Backend                     Doctor Portal
───────────                    ───────                     ─────────────
Questionnaire ──────────────► BMI Calculation
  (height, weight)             + Classification
                                    │
Photos (2) ─────────────────► S3 Upload ──────────────────► Photo Grid (2×1)
                                    │
Plan Selection ─────────────► Razorpay Subscription
                                    │
                               AI Assessment ──────────────► Assessment Tab
                               • BMI + classification          (metabolic risk,
                               • Metabolic risk                 eating disorder flag,
                               • Eating disorder screen         GLP-1 eligibility)
                               • GLP-1 eligibility
                                    │
                                    ├──────────────────────► Prescription Templates
                                    │                        (6 templates, 2 greyed)
                                    │
                                    ├──────────────────────► Lab Portal
                                    │                        (Metabolic Panel order)
                                    │
                                    └──────────────────────► Pharmacy Portal
                                                             (Medication dispensing)
```

### 19.3 Shared vs Weight-Unique Components

| Component | Shared with Other Verticals | Weight-Unique |
|-----------|---------------------------|---------------|
| Auth (OTP login) | ✅ Shared | — |
| Questionnaire engine | ✅ Shared | BMI auto-calculation hook |
| Photo upload pipeline | ✅ Shared | Different photo count (2 vs 3 vs 0) |
| AI assessment framework | ✅ Shared | conditionSpecific: BMI, metabolic risk, eating disorder, GLP-1 |
| Prescription templates | ✅ Shared framework | 6 Weight-specific templates (2 deferred) |
| Lab panel ordering | ✅ Shared | Metabolic Panel definition |
| Follow-up engine | ✅ Shared | Weight-specific cadence intervals |
| Photo comparison UI | ✅ Shared | Works with any photo count |
| Subscription billing | ✅ Shared | Two-tier system (unique to Weight) |
| Landing page template | ✅ Shared | Two-tier pricing table (unique to Weight) |
| GLP-1 waitlist | — | ✅ Entirely new (Weight only) |
| Cold-chain pharmacy | — | ✅ New workflow (Weight GLP-1 only) |
| Nurse injection visits | — | ✅ Scaffolded for Weight GLP-1 |

---

## 20. Known Issues, Edge Cases & Testing Checklist

### 20.1 Known Issues from backend-errors-report.md

| Error # | Description | Impact on Weight | Fix Required |
|---------|-------------|-----------------|-------------|
| #19 | Seed data pricing wrong for all verticals in BACKEND-PART3A Section 25 | Weight Standard + GLP-1 pricing may be incorrect in seed data | Rewrite seed data to match onlyou-spec-resolved-v4.md Section 5 prices (see Section 5.4 of this document) |
| General | Missing PE blood panels in some backend docs | Confirms need to verify all panel definitions exist in lab system, including Weight's Metabolic Panel | Ensure PANEL_METABOLIC is defined in lab panel seed data |
| **NEW** | BACKEND-PART2A `getPricing()` uses condition key `WEIGHT` instead of `WEIGHT_MANAGEMENT` | The Razorpay payments module condition key does not match the canonical `Condition` enum used everywhere else (`WEIGHT_MANAGEMENT`). Code that passes the enum value directly to `getPricing()` will fail lookup. | Rename key in `getPricing()` from `WEIGHT` to `WEIGHT_MANAGEMENT`, or add mapping layer |
| **NEW** | BACKEND-PART2A `getPricing()` only includes Standard tier pricing for Weight | GLP-1 Premium tier plans have no pricing entry in the payments module. When GLP-1 launches, `getPricing()` cannot resolve GLP-1 plan amounts. | Add GLP-1 Premium pricing entries: MONTHLY 999900, QUARTERLY 2499900, SIX_MONTH 4499900 (in paisa) |
| **NEW** | BACKEND-PART1.md `calculateBMI()` returns 6 categories (`obese_1`, `obese_2`, `obese_3`) but PORTAL-DOCTOR.md Section 6.2 defines only 5 (`Obese Class I`, `Obese Class II`). Category names also differ: backend uses `obese_1` (lowercase) while this document and doctor portal use `OBESE_CLASS_I` (SCREAMING_SNAKE). | BMI classification mismatch between backend function and frontend display. The backend's `obese_2` (30–34.9) and `obese_3` (≥35) map to the doctor portal's single `Obese Class II` (≥30). | Either align backend to 5 categories matching the doctor portal, or add mapping in AI assessment module. Standardise naming convention (recommend SCREAMING_SNAKE per Prisma enum convention). |

### 20.2 Edge Cases

| Edge Case | Expected Behaviour |
|-----------|-------------------|
| Patient enters BMI < 18.5 (underweight) | Questionnaire submission blocked. Message: "Based on your BMI, weight loss treatment is not appropriate. If you have concerns about your weight, please consult your doctor in person." |
| Patient enters BMI 18.5–22.9 (normal weight) | Questionnaire submits but AI flags: "BMI within normal range. Assess for body dysmorphia or eating disorder before proceeding." Doctor must review before treatment. |
| Patient enters height/weight that produces BMI > 70 | Validation error: "Please check your height and weight entries." (Likely data entry error) |
| Female patient indicates pregnancy | Questionnaire blocked immediately. Message: "Weight loss medication is not safe during pregnancy or breastfeeding. Please consult your OB-GYN." |
| Eating disorder flag + BMI ≥ 30 | Both flags shown to doctor. Eating disorder assessment takes priority — doctor should not prescribe weight loss medication until eating disorder is addressed. |
| Patient selects GLP-1 plan at MVP | Plan card shows "Coming Soon" badge. Tapping shows waitlist modal. Patient cannot proceed with GLP-1 — must select Standard or join waitlist. |
| Doctor tries to use GLP-1 template at MVP | Templates #4 and #5 are greyed out with tooltip. Doctor cannot select them. Must use templates #1–#3 or #6 (Custom). |
| Patient loses weight to BMI < 23 during treatment | Follow-up questionnaire auto-calculates new BMI. Doctor reviews — may recommend tapering medication and transitioning to maintenance/lifestyle-only. |
| Phentermine prescribed in state with delivery restrictions | Pharmacy portal flags Schedule H1 restriction. Pharmacist must verify state regulations before shipping. May require patient to collect in person. |
| Patient uploads lab results from external lab | Self-upload flow: patient uploads PDF/image of results → appears in doctor portal → doctor reviews and manually enters key values → no charge to patient. |
| GLP-1 injection pen temperature breach during delivery | Cold-chain delivery tracking shows temperature excursion alert. Pharmacy must re-ship with new pen. Patient advised not to use temperature-compromised medication. |
| Patient with PCOS indicators enrolls in Weight (not PCOS) | AI flags cross-vertical recommendation. Doctor can suggest switching to PCOS vertical or dual-enrolment (if supported). Patient is not auto-switched. |

### 20.3 Testing Checklist

#### Questionnaire & BMI

- [ ] Height input accepts valid range (120–220 cm) and rejects out-of-range
- [ ] Weight input accepts valid range (30–250 kg) and rejects out-of-range
- [ ] BMI calculates correctly for various height/weight combinations
- [ ] BMI classification uses WHO Asian cutoffs (23.0 overweight, 25.0 obese)
- [ ] BMI displays in real-time after height + weight entered
- [ ] BMI visual indicator (bar chart) renders correctly
- [ ] Female-specific questions (Q13, Q14) only appear when gender = Female
- [ ] Pregnancy = Yes blocks questionnaire submission with correct message
- [ ] Eating disorder screening questions score correctly
- [ ] Questionnaire submission includes calculated BMI in payload
- [ ] Goal weight validation: must be less than current weight

#### AI Assessment

- [ ] conditionSpecific fields include all Weight-specific data
- [ ] Metabolic risk assessment generates correct risk levels based on questionnaire answers
- [ ] Eating disorder flag triggers on correct conditions (see Section 11.4)
- [ ] Eating disorder flag does NOT trigger for normal responses
- [ ] GLP-1 eligibility logic follows correct BMI + comorbidity rules
- [ ] GLP-1 eligibility always includes "deferred for MVP" note
- [ ] PCOS cross-vertical flag triggers for female patients with correct criteria
- [ ] Suggested prescription template aligns with BMI classification and risk factors

#### Photos

- [ ] Photo upload accepts 2 photos (front + side)
- [ ] Photo upload rejects submission with only 1 photo
- [ ] Photos display in 2×1 grid in doctor portal
- [ ] Photo comparison (side-by-side + slider) works for follow-up photos
- [ ] Photos are encrypted at rest (AES-256) and in transit (TLS 1.2+)
- [ ] Signed URLs expire after 15 minutes

#### Subscription & Pricing

- [ ] Patient app shows 6 Standard plan cards with correct prices
- [ ] GLP-1 plan cards show "Coming Soon" badge
- [ ] Tapping GLP-1 card shows waitlist modal (not payment flow)
- [ ] Waitlist modal captures name, email, phone, city
- [ ] Waitlist submission creates record in glp1_waitlist table
- [ ] Standard plan selection proceeds to Razorpay checkout
- [ ] Razorpay webhook correctly activates subscription
- [ ] All prices match onlyou-spec-resolved-v4.md Section 5

#### Prescription & Pharmacy

- [ ] All 6 prescription templates load correctly
- [ ] Templates #4 and #5 are greyed out with correct tooltip
- [ ] Doctor can modify template medications before approving
- [ ] Prescription correctly routes to pharmacy portal
- [ ] Phentermine prescription includes Schedule H1 flag
- [ ] Pharmacy receives correct medication list and quantities
- [ ] Standard tier medications ship via normal courier

#### Blood Work

- [ ] Metabolic Panel (PANEL_METABOLIC) is orderable by doctor
- [ ] Panel includes all 13 tests
- [ ] Panel price displays as ₹1,800
- [ ] First panel is included in subscription (no additional charge)
- [ ] Follow-up subset panels orderable at correct prices
- [ ] Lab results upload flow works correctly
- [ ] Self-upload option available and free

#### Follow-Up

- [ ] 4-week follow-up notification triggers at correct time
- [ ] 4-week follow-up questionnaire has 10 questions, no photo requirement
- [ ] 3-month follow-up notification triggers at correct time
- [ ] 3-month follow-up includes photo upload requirement
- [ ] 6-month follow-up notification triggers at correct time
- [ ] 6-month follow-up has 15 questions + photo requirement
- [ ] Weight progress chart renders correctly in doctor portal
- [ ] Weight change calculations are accurate (current vs baseline)

#### Landing Page

- [ ] `/weight-management/` renders correctly
- [ ] Title tag, meta description, H1 match specification
- [ ] Two-tier pricing table displays with correct prices
- [ ] GLP-1 card has "Limited Availability" badge
- [ ] Waitlist note appears below GLP-1 pricing card
- [ ] CTA buttons work (Standard → assessment flow, GLP-1 → waitlist)
- [ ] FAQ section renders with schema markup
- [ ] Mobile responsive layout works correctly
- [ ] Page passes Core Web Vitals (LCP < 2.5s, CLS < 0.1)

#### Admin

- [ ] 12 Weight plan records appear in plan management (6 Standard + 6 GLP-1)
- [ ] GLP-1 plans show as inactive at MVP
- [ ] Price changes apply to new subscriptions only
- [ ] GLP-1 waitlist management page renders
- [ ] Waitlist CSV export works
- [ ] Weight KPIs appear in analytics dashboard
- [ ] Case queue filter for "Weight" works correctly

---

## Cross-Reference Index

| Topic | Source Document | Section |
|-------|----------------|---------|
| Vertical definition & comparison | PROJECT-OVERVIEW.md | Section 4 |
| Subscription inclusions | PROJECT-OVERVIEW.md | Section 5 |
| Patient journey overview | PROJECT-OVERVIEW.md | Section 6 |
| Condition selection UI | APP-PATIENT.md | Section 5 |
| Questionnaire specification | APP-PATIENT.md | Section 9.4 |
| Photo upload specification | APP-PATIENT.md | Section 10 |
| Plan selection (two-tier) | APP-PATIENT.md | Section 11.1 |
| Follow-up cadence | APP-PATIENT.md | Section 12.4 |
| Lab booking flow | APP-PATIENT.md | Section 13 |
| AI assessment extensions | PORTAL-DOCTOR.md | Section 6.2 |
| Photo display grid | PORTAL-DOCTOR.md | Section 8.1 |
| Prescription templates | PORTAL-DOCTOR.md | Section 12.3 |
| Blood panel ordering | PORTAL-DOCTOR.md | Section 13.2 |
| Lab panel definition | PORTAL-LAB-FIXED.md | Section 24 |
| Medication catalogue | PORTAL-PHARMACY.md | Section 23 |
| Admin plan management | PORTAL-ADMIN.md | Section 24 |
| Landing page specification | LANDING-PAGE.md | Section 8 |
| BMI calculation logic | BACKEND-PART1.md | Section 6.3 |
| Lab test pricing | BACKEND-PART2A.md | Section 12.5 |
| Authoritative pricing | onlyou-spec-resolved-v4.md | Section 5 |
| Build phase & checkpoint | onlyou-spec-resolved-v4.md | Phase 8 |
| Seed data pricing error | backend-errors-report.md | Error #19 |
| getPricing() condition key mismatch | BACKEND-PART2A.md | Section 14 (`WEIGHT` vs `WEIGHT_MANAGEMENT`) |
| getPricing() missing GLP-1 tier | BACKEND-PART2A.md | Section 14 (only Standard pricing present) |
| BMI category count mismatch | BACKEND-PART1.md vs PORTAL-DOCTOR.md | Section 6.3 vs Section 6.2 (6 vs 5 categories) |
| Architecture & infrastructure | ARCHITECTURE.md | Full document |

---

*End of VERTICAL-WEIGHT.md — Weight Management Vertical Specification*
*Document follows the structure established by VERTICAL-HAIR-LOSS.md*
*All pricing verified against onlyou-spec-resolved-v4.md Section 5 (authoritative source)*
*v1.1 — Verified 2026-03-02: Cross-referenced against all 15+ project documents. 5 corrections applied (Hair Loss photo grid, eating disorder screening summary, 3 new backend discrepancies flagged).*
