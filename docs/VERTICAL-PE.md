# VERTICAL-PE.md — Onlyou Premature Ejaculation Vertical Specification

> **Document type:** Vertical-specific master reference
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** PROJECT-OVERVIEW.md, APP-PATIENT.md, PORTAL-DOCTOR.md, PORTAL-NURSE-FIXED.md, PORTAL-ADMIN.md, PORTAL-LAB-FIXED.md, PORTAL-PHARMACY.md, LANDING-PAGE.md, BACKEND-PART1.md, BACKEND-PART2A.md, BACKEND-PART2B.md, BACKEND-PART3A.md, BACKEND-PART3B.md, ARCHITECTURE.md, onlyou-spec-resolved-v4.md

---

## 1. Condition Overview

**Condition:** Premature Ejaculation (PE)
**Internal enum value:** `PE`
**Build priority:** #3 of 5 verticals (Hair Loss → ED → PE → Weight → PCOS)
**Development phase:** Phase 7 (Weeks 19–22) — built alongside ED, reuses core infrastructure from Hair Loss + ED
**Condition accent color:** Applied per landing page condition card styling

**Target audience:** Men aged 18–60
*(Source: PROJECT-OVERVIEW.md Section 4, onlyou-spec-resolved-v4.md Section 6.1)*

**Doctor type:** Urologist / Andrologist / Sexual Medicine specialist (same pool as ED)
*(Source: PROJECT-OVERVIEW.md Section 4, onlyou-spec-resolved-v4.md Section 6.1)*

**Consultation type:** Async (questionnaire only — no video, no photos in MVP)
*(Source: PROJECT-OVERVIEW.md Section 12, Decision #1)*

**Photos required:** None (privacy-first approach — PE is a purely questionnaire-based assessment, equally stigmatized as ED)
*(Source: onlyou-spec-resolved-v4.md Section 6.4)*

**Blood work:** Rarely (not clinically indicated for most PE cases; doctor orders only when thyroid disorder or prostatitis is suspected)
*(Source: PROJECT-OVERVIEW.md Section 4, onlyou-spec-resolved-v4.md Section 6.9)*

**Time to visible results:** 1–3 hours per dose (on-demand Dapoxetine works within 1–3 hours); 1–2 weeks for daily SSRIs (Paroxetine, Sertraline) to reach full effect

**Regulatory classification:** Dapoxetine is Schedule H in India — requires prescription, can be prescribed via telemedicine under Telemedicine Practice Guidelines 2020. SSRIs used off-label for PE (Paroxetine, Sertraline) are also Schedule H.
*(Source: onlyou-spec-resolved-v4.md Section 6.1)*

**Core treatments:** Dapoxetine (on-demand SSRI specifically approved for PE), daily low-dose SSRIs (Paroxetine, Sertraline), topical anesthetics (Lidocaine-Prilocaine cream/spray), behavioral techniques (start-stop, squeeze, Kegels)
*(Source: onlyou-spec-resolved-v4.md Section 6.1)*

**Comorbidity note:** PE + ED comorbidity is very common (~30–40%). If a patient reports ED symptoms during PE assessment, the AI flags comorbidity. Doctor can prescribe combined treatment (e.g., Tadalafil 5mg daily + Dapoxetine 30mg on-demand) under the PE subscription at PE pricing — patient does NOT need a separate ED subscription.
*(Source: onlyou-spec-resolved-v4.md Section 6.11)*

---

## 2. Pricing

### 2.1 Subscription Plans

| Plan | Total Price | Per Month | Savings |
|------|------------|-----------|---------|
| Monthly | ₹1,299/month | ₹1,299 | — |
| Quarterly | ₹3,299/quarter | ₹1,100 | 15% |
| 6-Month | ₹5,999/6 months | ₹1,000 | 23% |

*(Source: onlyou-spec-resolved-v4.md Section 5 — authoritative pricing source)*

Same as ED — same doctor pool, similar medication cost, same stigma premium.
*(Source: onlyou-spec-resolved-v4.md Section 6.2)*

**"Starting from" price (marketing):** ₹1,000/mo (6-month plan per-month rate)
*(Source: LANDING-PAGE.md Section 4.4)*

### 2.2 What's Included in Every Subscription

1. AI-powered pre-assessment — PEDT validated scoring + PE type classification + serotonin drug check by Claude
2. Async doctor consultation — urologist/andrologist/sexual medicine specialist reviews case, asks follow-ups if needed
3. E-prescription — generated from PE-specific templates, PDF stored in S3
4. Medication — discreet local delivery with OTP confirmation (MAXIMUM DISCRETION packaging)
5. Ongoing check-ins — 4-week, 3-month, 6-month cadence
6. Blood work — RARELY needed (only when thyroid or prostatitis suspected; included in subscription when ordered)

*(Source: PROJECT-OVERVIEW.md Section 5, onlyou-spec-resolved-v4.md Section 6.2)*

### 2.3 Blood Work Pricing

| Panel | Price | When Used |
|-------|-------|-----------|
| Thyroid Check (TSH, Free T3, Free T4) | ₹350 | Suspected thyroid-related PE |
| Hormonal (Testosterone, Prolactin) | ₹800 | Low libido co-present, acquired PE |
| Prostate (PSA, urine culture) | ₹500 | Suspected prostatitis |
| Combined (all above) | ₹1,500 | Complex acquired PE, multiple symptoms |
| Patient self-upload | **Free** | Patient provides own recent results |

*(Source: onlyou-spec-resolved-v4.md Section 6.9)*

> **Note:** Unlike Hair Loss and ED where a first blood panel is routinely included, PE blood work is uncommon and only ordered when the doctor suspects an underlying cause (thyroid, prostatitis, hormonal). When ordered, the first panel is included in the subscription.

### 2.4 Payment Implementation

- **Monthly & Quarterly:** Razorpay recurring subscription
- **6-Month:** One-time Razorpay payment (NOT a subscription — Razorpay subscriptions only support monthly and quarterly billing cycles)
- Payment methods: UPI (GPay, PhonePe, Paytm), Credit/Debit Card, Net Banking
- Wallet balance auto-applied at checkout (toggle to opt out)

*(Source: APP-PATIENT.md Section 11.2)*

---

## 3. Patient Journey (End-to-End)

### 3.1 High-Level Flow

```
Patient downloads app
        │
        ▼
Creates account (Email/Google/Apple + mandatory phone OTP)
        │
        ▼
Selects "Premature Ejaculation" from condition selector
        │
        ▼
Age gate (must be 18+)
        │
        ▼
Completes questionnaire (~26 questions, ~6–8 min, includes PEDT)
        │
        ▼
NO PHOTO UPLOAD (privacy-first — PE is questionnaire-only)
        │
        ▼
AI pre-assessment (Claude analyzes → PEDT scoring, PE type classification, serotonin check, ED comorbidity)
        │
        ▼
Selects plan & pays (Monthly/Quarterly/6-Month via Razorpay)
        │
        ▼
Doctor reviews case (urologist sees AI summary + raw data → 3–6 min per case)
        │
        ├─── PRESCRIBES ──────────────────────────────────┐
        │                                                  ▼
        ├─── ORDERS BLOOD WORK ──┐              Prescription → Pharmacy
        │    (rare — thyroid/    │              Pharmacy prepares → Ready
        │     prostatitis only)  ▼              Coordinator arranges delivery
        │              Nurse visits home         Delivery person → OTP → Delivered
        │              Collects blood
        │              Records vitals
        │              Delivers to lab
        │              Lab processes
        │              Results uploaded
        │              Doctor reviews
        │              Then prescribes ────────────────────┘
        │
        ├─── REQUESTS MORE INFO ──→ Chat message → Patient responds → Doctor re-reviews
        │
        ├─── REFERS ──→ Urologist (prostatitis) / Sex therapist / Partner clinic
        │
        └─── REFUNDS ──→ Full/partial refund if cannot treat
        │
        ▼
ONGOING CARE (check-ins at 4 weeks / 3 months / 6 months)
```

*(Source: PROJECT-OVERVIEW.md Section 6)*

### 3.2 Condition Selection Screen

**Screen:** `(tabs)/home/condition/[condition].tsx`

When patient selects Premature Ejaculation:

1. **Age gate first** — must be 18+; under 18 blocked ("Our service is available for adults 18 and over.")
2. **No gender selection** — PE vertical is male-only
3. Hero section with condition illustration + tagline emphasizing privacy and discretion
4. "How It Works" 3-step summary (emphasizing: no photos needed, no video, text-only)
5. "What You Get" checklist (doctor consultation, prescription, medication delivery, ongoing monitoring, WhatsApp support)
6. Pricing cards (Monthly / Quarterly / 6-Month)
7. FAQ accordion (3–5 PE-specific questions)
8. Sticky CTA at bottom: `[Start Your Assessment — Free]`
9. **Privacy callout:** "100% private. No photos required. No video calls. Your consultation is text-based only."

**CTA behavior:**
- Not logged in → auth flow → return here
- Logged in + phone verified → navigate to `questionnaire/pe`
- Phone not verified → phone verification first

*(Source: APP-PATIENT.md Section 5)*

### 3.3 Key Differences from Other Verticals

| Aspect | Hair Loss | ED | PE |
|--------|-----------|-----|-----|
| Photo upload | 4 mandatory photos | None | None |
| Gender branching | Male/Female | Male only | Male only |
| Scoring instrument | None (AI classifies) | IIEF-5 (5–25 scale) | PEDT (0–20 scale) |
| Critical safety check | Finasteride safety | Nitrate contraindication | Serotonin drug interaction |
| Doctor type | Dermatologist | Urologist/Andrologist | Urologist/Andrologist/Sexual Medicine |
| Blood work frequency | Sometimes | Sometimes | Rarely |
| Time to results | 3–6 months | 30–60 min (on-demand) | 1–3 hours (on-demand) / 1–2 weeks (daily) |
| Comorbidity screen | None | PE comorbidity | ED comorbidity |

---

## 4. Questionnaire (26 Questions, ~6–8 minutes)

### 4.1 Overview

| Attribute | Value |
|-----------|-------|
| Total questions | 26 (schema) — most patients answer 20–23 after skip logic |
| Estimated completion | 6–8 minutes |
| Scoring tool | PEDT (Premature Ejaculation Diagnostic Tool — 5 item version) |
| PEDT scored items | 5 questions (Q4–Q8), each scored 0–4, total range 0–20 |
| Special logic | Age gate (18+), serotonin drug screening, seizure check, liver/kidney check, ED comorbidity screen |
| JSON schema file | `questionnaire/data/pe.json` |

*(Source: onlyou-spec-resolved-v4.md Section 6.3, BACKEND-PART1.md Section 6.1)*

### Skip Logic Rules

- Q3 last option selected ("Also have difficulty getting/maintaining erections") → flags ED comorbidity (no skip, but flag)
- Q9 = "Since first sexual experience" → skip Q10 (onset trigger)
- Q18 = "None" (no medications) → skip Q19 (drug allergies still asked)
- Q24 = "None" (never tried PE treatments) → skip Q25

Most patients answer **20–23 questions** after skip logic.

*(Source: onlyou-spec-resolved-v4.md Section 6.3)*

---

### SECTION 1: BASICS (3 questions)

**Q1: What is your age?**
- Type: Number input (18–80)
- Validation: <18 = blocked ("Our service is available for adults 18 and over.")
- Required: Yes
- AI use: Age context for treatment. Lifelong PE more common in younger men. Age >50 with acquired PE may suggest prostatitis or thyroid cause.

**Q2: What is your biological sex?**
- Type: Auto-set Male. Females redirected.
- Required: Yes
- AI use: PE vertical is male-only.

**Q3: Which best describes your main concern?**
- Type: Single select
  - "I ejaculate too quickly during sex"
  - "I feel I have no control over when I ejaculate"
  - "My partner is dissatisfied with how long sex lasts"
  - "I sometimes ejaculate before or right after penetration"
  - "I avoid sex because of anxiety about ejaculating too quickly"
  - "I also have difficulty getting/maintaining erections" (→ flag ED comorbidity)
- Required: Yes
- AI use: Primary classification. "Also have ED" = combined ED+PE assessment needed. "Avoid sex" = significant anxiety component, counseling recommendation. "Before or right after penetration" = likely clinically significant PE.

*(Source: onlyou-spec-resolved-v4.md Section 6.3)*

### SECTION 2: PEDT — Premature Ejaculation Diagnostic Tool (5 questions — SCORED)

> **These 5 questions are the validated Premature Ejaculation Diagnostic Tool (PEDT).** Each is scored 0–4. Total score range: 0–20. This is the standard validated clinical instrument for PE assessment.

**Q4: How difficult is it for you to delay ejaculation?**
- Type: Single select (scored)
  - 0 — Not difficult at all
  - 1 — Somewhat difficult
  - 2 — Moderately difficult
  - 3 — Very difficult
  - 4 — Extremely difficult
- Scoring: Value = selected number (0–4)
- AI use: PEDT Item 1 — ejaculatory control self-assessment.

**Q5: Do you ejaculate before you want to?**
- Type: Single select (scored)
  - 0 — Almost never or never
  - 1 — Less than 25% of the time
  - 2 — About 50% of the time
  - 3 — More than 75% of the time
  - 4 — Almost always or always
- Scoring: Value = selected number (0–4)
- AI use: PEDT Item 2 — frequency of premature ejaculation.

**Q6: Do you ejaculate with very little stimulation?**
- Type: Single select (scored)
  - 0 — Almost never or never
  - 1 — Less than 25% of the time
  - 2 — About 50% of the time
  - 3 — More than 75% of the time
  - 4 — Almost always or always
- Scoring: Value = selected number (0–4)
- AI use: PEDT Item 3 — stimulation threshold. Low threshold = neurobiological component.

**Q7: Do you feel frustrated because of ejaculating before you want to?**
- Type: Single select (scored)
  - 0 — Not at all
  - 1 — Slightly
  - 2 — Moderately
  - 3 — Very
  - 4 — Extremely
- Scoring: Value = selected number (0–4)
- AI use: PEDT Item 4 — distress measure. Distress is a key diagnostic criterion for PE.

**Q8: How concerned are you that your time to ejaculation leaves your partner sexually unfulfilled?**
- Type: Single select (scored)
  - 0 — Not at all
  - 1 — Slightly
  - 2 — Moderately
  - 3 — Very
  - 4 — Extremely
- Scoring: Value = selected number (0–4)
- AI use: PEDT Item 5 — partner satisfaction concern. High scores = significant interpersonal distress.

*(Source: onlyou-spec-resolved-v4.md Section 6.3)*

### SECTION 3: TIMING & PATTERN (5 questions)

**Q9: How long has this been happening?**
- Type: Single select
  - Since my first sexual experience (lifelong PE)
  - Started at some point after initially normal ejaculation (acquired PE)
  - It varies — sometimes fine, sometimes too fast (variable PE)
  - Only with certain partners or situations (situational PE)
- AI use: **CRITICAL classification.** Lifelong = likely neurobiological (serotonin transporter), responds best to medication. Acquired = may have underlying cause (prostatitis, thyroid, ED, relationship issues). Variable = may not need medication, behavioral techniques may suffice. Situational = psychological component primary.

**Q10: [IF acquired] When did it start, and did anything change around that time?**
- Type: Free text
- Skip: Only shown if Q9 = "Started at some point after initially normal ejaculation"
- AI use: Identifies triggers — new relationship, stress, medical change, medication start. Helps doctor determine if acquired PE has a treatable underlying cause.

**Q11: How long does intercourse typically last (from penetration to ejaculation)?**
- Type: Single select
  - Less than 1 minute
  - 1–2 minutes
  - 2–3 minutes
  - 3–5 minutes
  - 5+ minutes but I still feel it's too quick
  - I'm not sure / varies a lot
- AI use: **IELT (Intravaginal Ejaculatory Latency Time) approximation.** <1 min with distress = clinically significant PE. 3–5 min = may be more about perception/expectations. This data feeds the AI's `estimated_ielt` field.

**Q12: Do you have difficulty getting or maintaining erections?**
- Type: Single select
  - No — erections are fine, it's only about ejaculating too fast
  - Sometimes I have erection issues too
  - Yes — I often lose my erection because I'm trying not to ejaculate
  - Yes — separate erection difficulty alongside PE
- AI use: **PE + ED comorbidity screen.** "Lose erection from trying not to ejaculate" = compensatory behavior (very common). "Separate erection difficulty" = independent ED requiring combined treatment (Tadalafil daily + Dapoxetine). "Sometimes" = monitor, may need combined approach if PE medication alone insufficient.

**Q13: Does the problem happen during masturbation too?**
- Type: Single select
  - Yes, also fast during masturbation
  - No, only during sex with a partner
  - I don't masturbate
- AI use: **Key differentiator.** "Only during sex" = likely performance anxiety/psychological component. "Also fast during masturbation" = likely neurobiological (serotonin transporter dysfunction). Informs AI's `psychological_component` classification.

*(Source: onlyou-spec-resolved-v4.md Section 6.3)*

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
- AI use: Prostatitis = can cause acquired PE (treat prostatitis first, flag for referral). Hyperthyroidism = known PE cause (blood work needed). Depression/anxiety = SSRIs may help both conditions. Heart condition = dapoxetine caution (orthostatic hypotension risk). Diabetes = context for overall health.

**Q15: Have you experienced any of these? (Select all)**
- Type: Multi-select
  - Pain or burning during ejaculation
  - Blood in semen
  - Frequent urination or urgency
  - Pain in genital area, pelvis, or lower back
  - None of these
- AI use: Pain during ejaculation or pelvic pain = possible prostatitis → urology referral may be needed. Blood in semen = flag HIGH for doctor review (hematospermia requires investigation). Frequent urination = prostatitis indicator. These are RED FLAG symptoms.

**Q16: Do you have a history of seizures or epilepsy?**
- Type: Single select
  - Yes
  - No
- AI use: **⛔ CRITICAL SAFETY QUESTION.** Dapoxetine is CONTRAINDICATED in patients with epilepsy/seizure history (lowers seizure threshold). SSRIs also require caution. "Yes" triggers seizure check = BLOCKED in AI assessment, doctor must use topical-only or behavioral pathway.

**Q17: Do you have any liver or kidney problems?**
- Type: Single select
  - Yes — liver problems
  - Yes — kidney problems
  - Yes — both
  - No
  - Not sure
- AI use: **Dapoxetine CONTRAINDICATED in moderate-severe hepatic impairment.** Dose adjustment needed for renal issues. "Yes — liver" or "both" = BLOCK dapoxetine. "Yes — kidney" = CAUTION, dose adjustment. "Not sure" = flagged for doctor verification.

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
- AI use: **⛔ CRITICAL SAFETY SCREENING — SEROTONIN SYNDROME RISK.**
  - **SSRIs/SNRIs = ABSOLUTE BLOCK for dapoxetine** (serotonin syndrome risk — potentially fatal)
  - **MAOIs = ABSOLUTE BLOCK** (serotonin syndrome risk — potentially fatal)
  - **Triptans = BLOCK for dapoxetine** (serotonin syndrome risk)
  - **Tramadol = BLOCK** (lowers seizure threshold + serotonin risk)
  - **Thioridazine = BLOCK** (QT prolongation risk)
  - **CYP3A4 inhibitors = BLOCK dapoxetine 60mg** (max 30mg if must prescribe)
  - Already on ED medication = note for combined therapy planning
  - St. John's Wort = serotonin interaction risk — caution
  - Any positive answer for SSRIs/MAOIs/triptans triggers RED BANNER in doctor portal

**Q19: Drug allergies?**
- Type: Free text / "None"
- Required: Yes
- AI use: Allergy to dapoxetine = blocked. Allergy to SSRIs = blocked from paroxetine/sertraline. Lidocaine allergy = blocked from topical.

*(Source: onlyou-spec-resolved-v4.md Section 6.3, 6.5)*

### SECTION 5: PSYCHOLOGICAL & RELATIONSHIP (4 questions)

**Q20: How is this affecting your relationships?**
- Type: Single select
  - Not in a relationship currently
  - Partner is understanding and supportive
  - It's causing tension in my relationship
  - I avoid relationships/intimacy because of this
  - My partner doesn't know it's a problem
- AI use: "Avoid relationships" or "causing tension" = significant distress, may benefit from counseling alongside medication. "Partner doesn't know" = communication skills component. Informs `psychological_component` assessment.

**Q21: Are you experiencing any of these? (Select all)**
- Type: Multi-select
  - Performance anxiety
  - Depression
  - Low self-esteem related to sexual performance
  - Avoidance of sexual situations
  - Relationship stress
  - Stress at work or life
  - None
- AI use: Psychological component assessment. Multiple factors = counseling recommendation alongside medication. Avoidance = significant impact on quality of life. Depression = SSRIs may treat both PE and depression simultaneously.

**Q22: Alcohol consumption?**
- Type: Single select
  - Never
  - Occasionally (1–2 times per month)
  - Regularly (1–2 times per week)
  - Daily
  - Heavy (3+ drinks per session, frequently)
- AI use: **Alcohol interacts with dapoxetine → increased risk of syncope (fainting).** Heavy drinking = dapoxetine CAUTION. Doctor should warn about alcohol interaction in counseling notes.

**Q23: Do you smoke or use recreational drugs?**
- Type: Single select
  - No
  - Smoke occasionally
  - Smoke daily
  - Use recreational drugs (specify)
- AI use: Recreational drugs may interact with SSRIs/dapoxetine. MDMA/ecstasy specifically = serotonin risk. Context for overall health assessment.

*(Source: onlyou-spec-resolved-v4.md Section 6.3)*

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
- AI use: Prior treatment response guides prescription. Failed behavioral = medication is a stronger case. Failed dapoxetine 30mg = try 60mg or switch to daily SSRI. Already on numbing cream and still insufficient = add oral medication. Prior herbal supplements = patient tried non-prescription first (common in India due to stigma). "None" = first-time patient, standard first-line protocol.

**Q25: [IF tried treatments] What happened?**
- Type: Free text
- Skip: Only shown if Q24 ≠ "None"
- AI use: Duration of use, perceived efficacy, side effects experienced, reason for stopping. Helps doctor avoid re-prescribing ineffective treatments. Important to capture if dapoxetine dose was adequate and taken correctly (timing, hydration).

**Q26: What are you hoping for?**
- Type: Single select
  - Lasting longer during sex
  - Better control over when I ejaculate
  - Reduced anxiety about sexual performance
  - Improving my relationship
  - All of the above
- Required: Yes
- AI use: Personalizes doctor communication and treatment emphasis. "Better control" = on-demand medication fits well. "Reduced anxiety" = behavioral + medication approach. "Improving relationship" = counseling referral consideration. "All of the above" = comprehensive treatment plan.

*(Source: onlyou-spec-resolved-v4.md Section 6.3)*

---

### 4.2 PEDT Scoring

The PEDT score is calculated by the backend scoring engine from Q4–Q8 responses:

```typescript
function calculatePEDT(answers: Record<string, number>): {
  score: number;
  classification: 'no_pe' | 'borderline' | 'pe_likely';
}
```

| Total Score | Classification |
|-------------|---------------|
| 0–8 | No PE (may not need treatment — manage expectations) |
| 9–10 | Borderline (consider treatment based on distress level) |
| 11–20 | PE Likely (treatment indicated) |

**Scoring rules:**
- Items Q4–Q8: each scored 0–4, direct value
- Total = sum of Q4 + Q5 + Q6 + Q7 + Q8
- Score is calculated server-side immediately after questionnaire submission
- Score and classification displayed in AI assessment and on doctor's case review
- PEDT ≤8 with significant distress (Q7/Q8 scores ≥3) = doctor may still prescribe based on clinical judgment

*(Source: onlyou-spec-resolved-v4.md Section 6.3, BACKEND-PART1.md Section 6.3)*

### 4.3 Skip Logic Summary

| Condition | Question(s) Affected | Behavior |
|-----------|---------------------|----------|
| Q9 = "Since first sexual experience" (lifelong) | Q10 | Skip onset trigger (lifelong = no onset event) |
| Q18 = "None" (no medications) | — | No skip (proceed normally) |
| Q24 = "None" (no prior treatments) | Q25 | Skip treatment results |

Most patients answer **20–23 questions** after skip logic.

*(Source: onlyou-spec-resolved-v4.md Section 6.3)*

### 4.4 Questionnaire UX

- **One question per screen** — firm design decision, no multi-question forms
- `[Next →]` button (sticky bottom) — disabled until valid answer
- `[← Back]` button (top left)
- Progress bar: "Question 5 of 26" — adjusts dynamically when skip logic reduces total
- Save & resume: progress saved to local storage (Zustand persisted) after each answer, synced to backend every 3 questions
- Saved progress expires after 7 days
- Multi-device: loads last backend-synced state on new device with "Syncing your progress…" spinner
- **Privacy reassurance banner** (shown at start of PEDT section): "Your answers are confidential and shared only with your prescribing doctor."
- **PEDT section header:** "The next 5 questions use a standard clinical assessment tool. Please answer honestly — there are no right or wrong answers."

*(Source: APP-PATIENT.md Section 9.3)*

### 4.5 Review Screen

**Screen:** `questionnaire/pe/review.tsx`

After all questions answered:
- All answers listed, grouped by section
- PEDT score displayed: "Your PEDT Score: [X]/20 — [Classification]"
- Each answer tappable → navigate back to that question to edit
- Consent checkbox (required): "By submitting, I confirm these answers are accurate and consent to a clinical assessment based on them."
- `[Submit Assessment]` button

**On submit:**
1. All answers sent to backend in one API call
2. PEDT score calculated server-side
3. Backend triggers AI assessment pipeline (BullMQ job)
4. Consultation record created with status `SUBMITTED`
5. Patient navigated to plan selection (NO photo upload step for PE)

*(Source: APP-PATIENT.md Section 9.5)*

---

## 5. Photo Upload

**PE does NOT require photo upload.** This is a deliberate privacy-first design decision. PE is equally stigmatized as ED, and assessment is entirely questionnaire-based.

After questionnaire submission, the patient proceeds directly to plan selection and payment. The photo upload step in the patient journey flow is skipped entirely for PE consultations.

The `photoRequired` field in the PE questionnaire JSON schema is set to `false`.

*(Source: onlyou-spec-resolved-v4.md Section 6.4)*

---

## 6. AI Pre-Assessment

### 6.1 Pipeline

1. Questionnaire submitted → consultation status: `SUBMITTED`
2. PEDT score calculated by scoring engine
3. BullMQ job queued for AI processing
4. Claude (Sonnet) processes questionnaire answers + PEDT score (no photos for PE)
5. AI assessment generated → consultation status: `AI_COMPLETE`
6. Case enters doctor queue

*(Source: BACKEND-PART1.md Section 8, PORTAL-DOCTOR.md Section 6)*

### 6.2 AI Assessment Output Structure

The AI assessment for PE includes:

**Standard fields (all verticals):**
- Classification + confidence level (high/medium/low)
- Attention level: LOW / MEDIUM / HIGH / CRITICAL (with rationale)
- Red flags list
- Contraindications matrix (per medication: safe ✅ / caution ⚠️ / blocked ⛔)
- Risk factors
- Recommended protocol (template name)
- Full summary paragraph (2–3 paragraphs for the doctor)

**PE-specific extensions (`conditionSpecific` fields):**

| Field | Description | Example |
|-------|-------------|---------|
| `pedtScore` | Calculated PEDT total score (0–20) | 15 |
| `pedtClassification` | Classification from score | "PE Likely" |
| `peType` | Lifelong / Acquired / Variable / Situational | "Lifelong" |
| `estimatedIelt` | IELT estimate from questionnaire | "<1 min" |
| `comorbidEd` | Whether ED comorbidity detected | true / false |
| `psychologicalComponent` | None / Mild / Significant / Primary | "Mild" |
| `serotoninDrugCheck` | Clear / BLOCKED | "Clear" |
| `seizureCheck` | Clear / BLOCKED | "Clear" |
| `prostatitis_suspected` | Whether prostatitis suspected | false |

*(Source: PORTAL-DOCTOR.md Section 6.2, onlyou-spec-resolved-v4.md Section 6.5)*

### 6.3 Classification Categories

| Classification | Description | Attention | Action |
|---------------|-------------|-----------|--------|
| `lifelong_pe` | Since first sexual experience, consistent | LOW | Dapoxetine or daily SSRI |
| `acquired_pe` | Developed after period of normal ejaculation | MEDIUM | Investigate cause, treat + medication |
| `variable_pe` | Inconsistent, sometimes normal | LOW | Behavioral techniques ± medication |
| `situational_pe` | Only in certain contexts | LOW-MED | Likely psychological, behavioral ± medication |
| `pe_with_ed` | PE comorbid with erectile dysfunction | MEDIUM | Combined treatment needed |
| `psychological_pe` | Primarily performance anxiety/relationship | MEDIUM | Medication + counseling recommendation |
| `prostatitis_suspected` | Pelvic pain, urinary symptoms + PE | HIGH | Urology referral, may need in-person |
| `thyroid_suspected` | Thyroid disorder + PE | HIGH | Blood work (thyroid) first |
| `medication_interaction` | On SSRIs/MAOIs/triptans — cannot prescribe dapoxetine | HIGH | Alternative treatment pathway (topical) |
| `serotonin_risk` | Multiple serotonergic drugs | CRITICAL | Cannot prescribe dapoxetine. Careful review. |

*(Source: onlyou-spec-resolved-v4.md Section 6.5)*

### 6.4 Red Flags (any = HIGH or CRITICAL attention)

- Currently taking SSRIs, SNRIs, MAOIs, triptans, or tramadol (CRITICAL — serotonin syndrome risk with dapoxetine)
- History of seizures/epilepsy (dapoxetine contraindicated)
- Moderate-severe liver disease (dapoxetine contraindicated)
- History of syncope/fainting (dapoxetine increases risk)
- Pain during ejaculation or blood in semen (may indicate prostatitis/infection)
- Cardiac issues (dapoxetine has orthostatic hypotension risk)
- Severe depression or suicidal ideation
- Age <18
- PEDT score ≤8 without significant distress (may not need treatment)

*(Source: onlyou-spec-resolved-v4.md Section 6.5)*

### 6.5 Contraindication Matrix

| Check | Source | Action |
|-------|--------|--------|
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

*(Source: onlyou-spec-resolved-v4.md Section 6.5)*

### 6.6 Serotonin Drug Interaction RED BANNER

When the AI detects serotonergic medication use (Q18 = SSRIs/SNRIs/MAOIs/Triptans), it generates a highly visible contraindication alert:

```
┌────────────────────────────────────────────────────────────────┐
│  ⚠️ PATIENT ON SEROTONERGIC MEDICATION — DAPOXETINE           │
│     CONTRAINDICATED                                            │
│                                                                │
│  Patient reports use of [medication class/name].               │
│                                                                │
│  Dapoxetine CANNOT be prescribed to patients on               │
│  SSRIs, SNRIs, MAOIs, or triptans.                            │
│                                                                │
│  Risk: Serotonin syndrome (potentially fatal).                │
│                                                                │
│  DO NOT prescribe dapoxetine.                                  │
│                                                                │
│  Consider: Topical lidocaine-prilocaine cream,                │
│  Behavioral techniques, or Referral.                          │
└────────────────────────────────────────────────────────────────┘
```

This banner is displayed:
- At the TOP of the AI Assessment tab (above all other content)
- In RED background with white text
- Cannot be dismissed — persists throughout the case review
- Also triggers HIGH or CRITICAL attention level automatically

Additionally, if seizure history is detected:

```
┌────────────────────────────────────────────────────────────────┐
│  ⚠️ SEIZURE HISTORY — DAPOXETINE CONTRAINDICATED              │
│                                                                │
│  Patient reports history of seizures/epilepsy.                │
│  Dapoxetine lowers the seizure threshold.                     │
│                                                                │
│  DO NOT prescribe dapoxetine.                                  │
│  Consider: Topical treatment only.                             │
└────────────────────────────────────────────────────────────────┘
```

*(Source: onlyou-spec-resolved-v4.md Section 6.7, PORTAL-DOCTOR.md Section 6.2)*

### 6.7 AI Assessment Example (PE)

```
┌────────────────────────────────────────────────────┐
│  🤖 AI Pre-Assessment                              │
│  Generated: 25 Jan 2026, 2:30 PM                  │
│  Model: Claude 3.5 Sonnet | Confidence: 85%       │
├────────────────────────────────────────────────────┤
│                                                    │
│  PEDT SCORE                                        │
│  Score: 15/20 — PE Likely                          │
│  ████████████████░░░░                              │
│                                                    │
│  CLASSIFICATION                                    │
│  Lifelong PE — Neurobiological                     │
│  Confidence: 85%                                   │
│                                                    │
│  🟢 ATTENTION LEVEL: LOW                           │
│  Rationale: "Classic lifelong PE presentation.     │
│  No serotonergic medications. No seizure history.  │
│  No liver/kidney issues. No contraindications to   │
│  dapoxetine. Standard first-line treatment."       │
│                                                    │
│  PE TYPE: Lifelong                                 │
│  ESTIMATED IELT: <1 minute                         │
│  COMORBID ED: No                                   │
│  PSYCHOLOGICAL COMPONENT: Mild                     │
│  SEROTONIN CHECK: ✅ Clear                         │
│  SEIZURE CHECK: ✅ Clear                           │
│                                                    │
│  CONTRAINDICATIONS                                 │
│  ┌─────────────────────┬────────┐                  │
│  │ Dapoxetine 30mg     │  ✅    │                  │
│  │ Dapoxetine 60mg     │  ✅    │                  │
│  │ Paroxetine          │  ✅    │                  │
│  │ Sertraline          │  ✅    │                  │
│  │ Lidocaine-Prilocaine│  ✅    │                  │
│  └─────────────────────┴────────┘                  │
│                                                    │
│  RED FLAGS: None                                   │
│                                                    │
│  RISK FACTORS                                      │
│  • Mild performance anxiety                        │
│  • Partner unaware of concern                      │
│                                                    │
│  RECOMMENDED PROTOCOL                              │
│  On-Demand Dapoxetine 30mg                         │
│                                                    │
│  SUMMARY                                           │
│  "28-year-old male presenting with lifelong PE.    │
│   PEDT score 15 (PE likely). Reports consistent    │
│   ejaculation within less than 1 minute since      │
│   first sexual experience. Also occurs during      │
│   masturbation, suggesting neurobiological basis.   │
│   No ED comorbidity. No serotonergic medications,  │
│   no seizure history, no liver/kidney issues. Mild │
│   performance anxiety and partner unaware of       │
│   concern. Recommend on-demand dapoxetine 30mg     │
│   as first-line. Behavioral technique instruction  │
│   may complement. Reassess at 4-week follow-up."   │
└────────────────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 6.1)*

### 6.8 AI Prompt Construction

The AI prompt for PE includes:
- Patient age, biological sex
- Full questionnaire responses (JSON)
- Calculated PEDT score and classification
- Instruction to return structured JSON with classification, confidence, attention level, red flags, contraindications, risk factors, recommended protocol, summary, and `conditionSpecific` fields (`pedtScore`, `pedtClassification`, `peType`, `estimatedIelt`, `comorbidEd`, `psychologicalComponent`, `serotoninDrugCheck`, `seizureCheck`, `prostatitis_suspected`)

*(Source: BACKEND-PART1.md Section 8.2, 8.3)*

### 6.9 AI Failure Handling

| Scenario | Doctor Portal Display |
|----------|----------------------|
| Complete failure | "⏳ AI Processing" badge (gray) → after timeout: "AI assessment unavailable. Please review manually." + `[Retry AI Assessment]` button |
| Partial assessment | "⚠️ AI assessment generated with warnings: [missing data points]" |
| Max retries (3) | "AI assessment could not be completed. Please proceed with manual review." |

*(Source: PORTAL-DOCTOR.md Section 6.3)*

### 6.10 AI Disclaimer

Displayed at bottom of AI Assessment tab in doctor portal:

> "This AI pre-assessment is a clinical decision support tool generated by Claude AI. It does not constitute medical advice. The prescribing physician retains full clinical responsibility for all treatment decisions. AI confidence levels reflect pattern matching against training data and should not be interpreted as diagnostic certainty."

*(Source: PORTAL-DOCTOR.md Section 6.4)*

---

## 7. Doctor Review

### 7.1 Case Queue Appearance

PE cases appear in the doctor's case queue with:
- Patient name, age, city
- Condition badge: "PE" (color-coded)
- Time since submission
- AI attention level badge: 🟢 Low / 🟡 Medium / 🔴 High / ⛔ Critical
- Status badge
- 1-line AI summary snippet
- PEDT score badge (e.g., "PEDT: 15/20")

**Example mobile card:**
```
┌─────────────────────────────────────────┐
│  Patient S., 28M, Delhi        2h 10m  │
│  ┌──────┐  ┌──────────┐  ┌──────────┐  │
│  │  PE  │  │🟢  Low   │  │   New    │  │
│  └──────┘  └──────────┘  └──────────┘  │
│  PEDT: 15/20 (PE Likely)               │
│  "Lifelong PE, <1min IELT, no meds,   │
│   dapoxetine 30mg recommended."        │
└─────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 4.5)*

### 7.2 Case Review Layout (Desktop 3-Panel)

**LEFT (30%) — Patient Summary:**
- Name, age, city, phone (masked)
- Government ID status
- Active subscriptions (PE shown)
- Consultation history
- Current medications
- Allergies

**CENTER (45%) — Clinical Data Tabs:**
- **Tab: AI Assessment** (default open) — PEDT score, PE type, IELT estimate, serotonin check, seizure check, ED comorbidity, psychological assessment, flags, contraindications, recommended protocol
- **Tab: Questionnaire** — collapsible sections with flagged answers highlighted
- **Tab: Photos** — NOT SHOWN for PE (tab hidden or disabled)
- **Tab: Lab Results** — if any exist (rare for PE — only thyroid/prostate panels)
- **Tab: Messages** — chat thread with patient

**CENTER PANEL — PE-Specific Additions:**
- **PEDT Score Badge:** Large display — "PEDT: 15/20 — PE Likely"
- **PE Type Classification:** Lifelong / Acquired / Variable / Situational — prominently shown
- **IELT Estimate:** Approximate intravaginal latency time from questionnaire
- **ED Comorbidity Banner:** If patient reports ED symptoms → "⚠️ COMORBID ED REPORTED — Consider combined treatment"
- **Serotonin Drug Check Banner:** If patient on SSRIs/MAOIs/triptans → LARGE RED BANNER (see Section 6.6)
- **Seizure Check Banner:** If positive → RED BANNER (see Section 6.6)
- **No photo gallery** — expanded questionnaire display
- **Psychological Assessment Panel:** Summary of relationship impact, anxiety, avoidance behaviors

**RIGHT (25%) — Actions Panel:**

| Action | What Happens |
|--------|--------------|
| **Prescribe** | Opens prescription builder (PE templates) |
| **Order Blood Work** | Opens lab order form (Thyroid Check / Hormonal / Prostate / Combined) |
| **Request More Info** | Opens message composer → status: AWAITING_PATIENT_RESPONSE |
| **Refer** | Opens referral modal (urologist for prostatitis / sex therapist / partner clinic) |
| **Refund** | Initiates refund flow |
| **Close Case** | Marks consultation complete |

*(Source: PORTAL-DOCTOR.md Sections 4–11, onlyou-spec-resolved-v4.md Section 6.7)*

### 7.3 Photos Tab — PE

**NOT APPLICABLE.** PE consultations do not include photos. The Photos tab is hidden or shows "No photos required for this condition type." in the doctor portal for PE cases.

### 7.4 Questionnaire Tab — Flagged Answers

- Amber background + ⚠️ icon = caution (e.g., "Heart condition — dapoxetine caution for orthostatic hypotension")
- Red background + ⛔ icon = critical flag (e.g., "On SSRIs — dapoxetine CONTRAINDICATED" or "Seizure history — dapoxetine CONTRAINDICATED")
- Quick-jump: clicking a red flag in AI Assessment tab scrolls Questionnaire tab to the flagged answer

*(Source: PORTAL-DOCTOR.md Section 7.2)*

---

## 8. Prescription Templates

### 8.1 Available Templates

| Template | Key Medications |
|----------|----------------|
| **On-Demand Dapoxetine 30mg** | Dapoxetine 30mg PRN (1–3 hours before) |
| **On-Demand Dapoxetine 60mg** | Dapoxetine 60mg PRN (1–3 hours before) |
| **Daily Paroxetine** | Paroxetine 10mg daily (SSRI off-label) |
| **Daily Sertraline** | Sertraline 25mg daily (SSRI off-label) |
| **Combined Dapoxetine + Topical** | Dapoxetine 30mg PRN + Lidocaine-Prilocaine cream |
| **Topical Only** | Lidocaine-Prilocaine cream/spray |
| **Combined ED+PE** | Tadalafil 5mg daily + Dapoxetine 30mg PRN |
| **Behavioral + Medication** | Dapoxetine 30mg PRN + behavioral technique instruction |
| **Custom** | Doctor manually selects medications |

*(Source: PORTAL-DOCTOR.md Section 12.3, onlyou-spec-resolved-v4.md Section 6.6)*

### 8.2 On-Demand Dapoxetine 30mg Template

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Dapoxetine | 30mg | As needed (PRN), 1–3 hours before anticipated sexual activity | 30 days (8 tablets) | Max 1 dose per 24 hours. Take with water, food optional. |

**When to use:** First-line for lifelong PE. No serotonergic drug interactions.

### 8.3 On-Demand Dapoxetine 60mg Template

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Dapoxetine | 60mg | As needed (PRN), 1–3 hours before anticipated sexual activity | 30 days (8 tablets) | Max 1 dose per 24 hours. Same precautions as 30mg. |

**When to use:** 30mg insufficient after 4+ attempts, no CYP3A4 inhibitors.

### 8.4 Daily Paroxetine Template

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Paroxetine | 10mg | Once daily (morning) | 30 days | Increase to 20mg after 2 weeks if tolerated and needed. Takes 1–2 weeks for full effect. |

**When to use:** Acquired PE, or patient prefers daily medication, or PE with comorbid depression/anxiety.

### 8.5 Daily Sertraline Template

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Sertraline | 25mg | Once daily | 30 days | Increase to 50mg after 2 weeks if tolerated. Alternative to paroxetine. |

**When to use:** Alternative to paroxetine, better side effect profile for some patients.

### 8.6 Combined Dapoxetine + Topical Template

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Dapoxetine | 30mg | On-demand, 1–3 hours before activity | 30 days (8 tablets) | Max 1 dose per 24 hours |
| Lidocaine-Prilocaine Cream 5% | Apply thin layer | 15–20 minutes before activity | 1 tube (30g) | Wash off before contact. Use condom to prevent partner numbness. |

**When to use:** Dapoxetine alone insufficient.

### 8.7 Topical Only Template

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Lidocaine-Prilocaine Cream 5% | Apply thin layer to glans | 15–20 minutes before sexual activity | 1 tube (30g) | Wash off before contact. Use condom to prevent partner numbness. Do not apply to broken skin. |

**When to use:** Dapoxetine contraindicated (patient on SSRIs, seizure history, liver disease).

### 8.8 Combined ED+PE Template

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Tadalafil | 5mg | Once daily (same time each day) | 30 days | Takes 5–7 days to reach steady state |
| Dapoxetine | 30mg | On-demand, 1–3 hours before activity | 30 days (8 tablets) | Max 1 dose per 24 hours |

**When to use:** PE comorbid with ED — tadalafil for erections, dapoxetine for ejaculation control. These are safe to combine.

### 8.9 Behavioral + Medication Template

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Dapoxetine | 30mg | On-demand | 30 days (8 tablets) | Standard dapoxetine instructions |

**Behavioral techniques instruction sheet included:**
1. **Start-Stop technique:** Stimulate until close to ejaculation, stop completely for 30 seconds, then resume. Repeat 3 times before allowing ejaculation.
2. **Squeeze technique:** At the point of no return, firmly squeeze the tip of the penis for 10–20 seconds until the urge subsides.
3. **Pelvic floor exercises (Kegels):** 10 contractions, 3 times daily.

**When to use:** Significant psychological component, patient wants holistic approach.

### 8.10 Counseling Notes (Standard — All Dapoxetine Prescriptions)

- Do NOT combine dapoxetine with alcohol (increased risk of fainting)
- Do NOT take dapoxetine if you've taken any SSRI, SNRI, MAOI, or triptan in the last 14 days
- Stay well hydrated when taking dapoxetine
- Common side effects: nausea, dizziness, headache — usually mild and improve with use
- If you feel faint or dizzy after taking dapoxetine, sit or lie down immediately
- Dapoxetine does not cause an automatic delay — it improves your control over time
- Give it 4–6 attempts before judging effectiveness — first-time response may not be optimal
- Behavioral techniques (start-stop, squeeze) complement medication and improve long-term results
- Do not take with grapefruit juice (increases drug levels)

### 8.11 Counseling Notes (Daily SSRI — Paroxetine/Sertraline)

- Take at the same time every day, with or without food
- Full effect takes 1–2 weeks of daily use
- Do NOT stop suddenly — taper off under doctor guidance (withdrawal effects possible)
- May cause initial drowsiness, decreased appetite, or mild nausea
- Sexual side effects (delayed ejaculation) are actually the therapeutic effect for PE
- Do NOT combine with other serotonergic medications
- If you experience significant mood changes, contact your doctor immediately

### 8.12 Prescription Builder Fields

- **Template selector:** Dropdown with all PE templates
- **Medication list:** Pre-filled from template, fully editable (drug name, dosage, frequency, duration, instructions)
- **Custom medications:** `[+ Add Medication]` to add any medication manually (including Tadalafil if ED comorbidity detected)
- **Counseling notes:** Pre-filled condition-specific text, editable
- **Behavioral techniques:** Checkbox to include behavioral technique instruction sheet (auto-included in Behavioral + Medication template)
- **Regulatory information (auto-populated):** Doctor name, NMC registration number, patient details, diagnosis ("Premature Ejaculation"), date
- **Digital signature:** Click/tap to sign
- **Preview:** PDF preview before submission
- **Submit:** Generates PDF → stores in S3 → creates Order record → notifies coordinator + patient

*(Source: PORTAL-DOCTOR.md Section 12.2, 12.3)*

---

## 9. Blood Work

### 9.1 PE Blood Work Panels

> **PE rarely requires blood work.** Only ordered when doctor suspects an underlying cause.

| Panel | Tests | Cost | When Ordered |
|-------|-------|------|-------------|
| Thyroid Check | TSH, Free T3, Free T4 | ₹350 | Suspected thyroid-related PE (hyperthyroidism) |
| Hormonal | Testosterone, Prolactin | ₹800 | Low libido co-present, acquired PE with suspected hormonal cause |
| Prostate | PSA, urine culture | ₹500 | Suspected prostatitis (pelvic pain, urinary symptoms) |
| Combined | All of the above | ₹1,500 | Complex acquired PE with multiple symptoms |

**First panel:** INCLUDED in subscription when clinically indicated
**Patient self-upload:** Free (patient provides own recent results)

*(Source: onlyou-spec-resolved-v4.md Section 6.9)*

### 9.2 When Blood Work Is Ordered

Blood work is NOT routine for PE patients. Doctor orders only when:
- Hyperthyroidism suspected (known PE cause — thyroid symptoms present)
- Prostatitis suspected (pelvic pain, urinary symptoms flagged in Q14/Q15)
- Low libido co-present alongside PE (hormonal evaluation warranted)
- Acquired PE with no obvious trigger (rule out thyroid, hormonal causes)
- Patient has not had recent blood work and has multiple risk factors

### 9.3 Blood Work Flow

Identical to ED blood work flow:
1. Doctor orders blood work from case review → selects appropriate panel
2. Patient notified: "Your doctor has ordered blood tests. Please book a home collection or upload your own results."
3. **Option A — Home collection:** Patient books → nurse visits → collects → delivers to lab → results uploaded → doctor reviews
4. **Option B — Self-upload:** Patient uploads PDF/photo → doctor reviews

*(Source: APP-PATIENT.md Section 13, PORTAL-NURSE-FIXED.md, PORTAL-LAB-FIXED.md)*

---

## 10. Medication Delivery

### 10.1 Delivery Flow

1. Prescription created by doctor → Order record created
2. Prescription sent to partner pharmacy (via pharmacy portal)
3. Pharmacy receives order → prepares medication
4. Pharmacy marks "Ready for Pickup"
5. Coordinator arranges delivery
6. Delivery out for delivery → patient notified
7. Delivery person arrives → patient confirms with OTP
8. Delivered ✅

### 10.2 Medication Pricing (Estimated Pharmacy Cost)

| Medication | Quantity (30 days) | Estimated Cost |
|------------|-------------------|---------------|
| Dapoxetine 30mg (on-demand) | 8 tablets | ₹300–₹500 |
| Dapoxetine 60mg (on-demand) | 8 tablets | ₹500–₹800 |
| Paroxetine 10mg (daily) | 30 tablets | ₹100–₹200 |
| Sertraline 25mg (daily) | 30 tablets | ₹100–₹200 |
| Lidocaine-Prilocaine cream 5% | 1 tube (30g) | ₹150–₹300 |

> **Note:** Medication cost is included in the subscription price. Patients do not pay separately for medication — it is part of the all-inclusive subscription model.

*(Source: onlyou-spec-resolved-v4.md Section 6.10)*

### 10.3 Delivery Tracking (Patient App)

```
┌─────────────────────────────────────┐
│  📦 Treatment Kit — PE               │
│  Dapoxetine 30mg                     │
│                                      │
│  ✅ Prescription Created (24 Jan)    │
│  ✅ Sent to Pharmacy (24 Jan)        │
│  ✅ Pharmacy Preparing (25 Jan)      │
│  🔵 Ready for Pickup                 │
│  ⚪ Out for Delivery                 │
│  ⚪ Delivered                         │
│                                      │
│  Pharmacy: Apollo Pharmacy, Indiranagar │
│  [Track] [Contact Support]          │
└─────────────────────────────────────┘
```

*(Source: APP-PATIENT.md Section 6.1)*

### 10.4 Privacy & Packaging — MAXIMUM DISCRETION

- **Plain packaging** — no condition or medication names visible externally
- **"Onlyou" branding ONLY** on the box — no other text, no pharmacy name, no medication hints
- No indication of condition on any external surface
- Anonymous patient IDs used for pharmacy/lab partners — they never see the condition name
- Delivery confirmed via OTP — only the patient can receive the package
- **PE-specific privacy emphasis:** Given the stigma surrounding PE in India, packaging discretion is critical. The package must be indistinguishable from any other Onlyou delivery. Generic "Health & Wellness" on any visible label.

*(Source: PROJECT-OVERVIEW.md Section 7, onlyou-spec-resolved-v4.md Section 6.10)*

### 10.5 Auto-Refill

- Medication auto-reorders on subscription renewal cycle
- No manual reorder needed for active subscribers
- **On-demand Dapoxetine:** Refill quantity based on initial prescription (e.g., 8 tablets/month)
- **Daily SSRIs (Paroxetine/Sertraline):** 30-tablet refill every 30 days
- **Topical cream:** 1 tube per 30 days
- Monthly subscribers: auto-refill every 30 days
- Quarterly subscribers: auto-refill every 30 days (plan covers 3 cycles)
- 6-Month subscribers: auto-refill every 30 days (plan covers 6 cycles)

*(Source: PROJECT-OVERVIEW.md Section 6)*

---

## 11. Follow-Up Care & Check-Ins

### 11.1 Follow-Up Schedule

| Time Point | Type | Questionnaire | Photos | Purpose |
|------------|------|--------------|--------|---------|
| 4 weeks | Side effects + efficacy check | 10 questions (abbreviated PEDT + usage frequency + side effects) | No | Early side effect detection, efficacy assessment, dose adjustment |
| 3 months | Progress review | 12 questions (PEDT + satisfaction + usage + relationship impact) | No | Treatment response, consider protocol change |
| 6 months | Full assessment | 15 questions (full PEDT + comprehensive review) | No | Long-term efficacy, psychological re-assessment |
| 12 months | Annual review | Full questionnaire | No | Comprehensive annual review |

**Note:** PE follow-ups NEVER require photos. Blood work is not typically needed at follow-ups unless thyroid or prostatitis was initially suspected.

*(Source: onlyou-spec-resolved-v4.md Section 6.7)*

### 11.2 Follow-Up Patient Flow

1. Notification sent when follow-up is due
2. Home tab shows "Check-in Due" card with `[Start Check-in]` CTA
3. Abbreviated questionnaire (10–15 questions) — reuses questionnaire engine with follow-up JSON schema
4. NO photo step
5. Doctor reviews → may adjust prescription (dose change, medication switch, add behavioral component)

*(Source: APP-PATIENT.md Section 12.4)*

### 11.3 Follow-Up in Doctor Queue

Follow-up cases appear with distinct markers:
- **Badge:** "Follow-Up" badge (blue) instead of "New" badge
- **AI Assessment:** Includes delta analysis comparing initial vs. follow-up PEDT scores
- **Photos tab:** Hidden (no photos in PE)
- **Questionnaire tab:** Shows "changes only" toggle by default + PEDT score comparison

*(Source: PORTAL-DOCTOR.md Section 24.2)*

### 11.4 Follow-Up AI Delta Analysis

```
┌────────────────────────────────────────────────────┐
│  📊 PROGRESS ANALYSIS (vs. Initial Assessment)     │
│                                                    │
│  Overall trajectory: ✅ Improving                  │
│                                                    │
│  • PEDT Score: 15 → 10 (-5 improvement)            │
│  • Classification: PE Likely → Borderline          │
│  • Medication used: 5 times in past 4 weeks        │
│  • IELT improvement: <1 min → 2–3 min             │
│  • Side effects: Mild nausea (1 occasion)          │
│  • Satisfaction: 2/5 → 4/5                         │
│  • Relationship impact: Improved                   │
│                                                    │
│  RECOMMENDATION:                                    │
│  "Significant improvement. PEDT improved by 5      │
│   points. IELT increased from <1 min to 2-3 min.  │
│   Current dapoxetine 30mg appears effective.       │
│   Continue current protocol. If patient desires    │
│   further improvement, consider increasing to      │
│   60mg or adding behavioral techniques."           │
└────────────────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 24.3)*

### 11.5 Follow-Up PEDT Score Tracking

Doctor sees PEDT score trend over time:

```
┌──────────────────────────────────────────────────────┐
│  PEDT Score History                                  │
│                                                      │
│  Initial (20 Jan 2026):    15/20 (PE Likely)         │
│  4-week (17 Feb 2026):     12/20 (PE Likely)   ↓ -3 │
│  3-month (20 Apr 2026):    10/20 (Borderline)  ↓ -2 │
│                                                      │
│  Trend: ✅ Consistent improvement                    │
└──────────────────────────────────────────────────────┘
```

---

## 12. Messaging

### 12.1 Patient ↔ Doctor Chat

Accessible from Messages tab in the patient app. PE-specific quick reply chips:

| Chip Label | Pre-filled Message |
|------------|-------------------|
| "Didn't work" | "Hi Doctor, I tried the medication but it didn't seem to help. Can we discuss?" |
| "Side effects" | "Hi Doctor, I'm experiencing side effects from my medication. Can we discuss?" |
| "Dose question" | "Hi Doctor, I have a question about my dosage or timing." |
| "Want daily option" | "Hi Doctor, I'd like to discuss switching to a daily medication instead of on-demand." |
| "Need a refill" | "Hi Doctor, I'm running low on medication and need a refill." |
| "Schedule check-in" | "Hi Doctor, I'd like to schedule my next check-in." |

Quick replies are condition-specific — PE shows different options than other verticals.

*(Source: APP-PATIENT.md Section 7)*

### 12.2 Doctor Canned Messages (PE-Specific)

Examples from doctor portal:

- "I've prescribed dapoxetine 30mg for you. Take it 1-3 hours before sexual activity with plenty of water. Give it 4-6 attempts before judging effectiveness."
- "Based on your responses, I'd recommend starting with daily low-dose paroxetine for more consistent control."
- "Your symptoms suggest an underlying anxiety component. I recommend combining medication with techniques I'll share with you."
- "I'd like to check your thyroid levels — thyroid imbalance can contribute to ejaculation timing."
- "I'm increasing your dose to 60mg as the 30mg hasn't been sufficient. Same instructions apply."
- "Since you also have erection concerns, I'm adding daily tadalafil alongside your PE medication."
- "Since you're currently on an SSRI, I cannot prescribe dapoxetine. I've prescribed a topical numbing cream as an alternative."

Doctors can create up to 20 custom canned messages (max 30-char label, max 500-char body). Placeholders: `{patient_name}`, `{medication}`.

*(Source: onlyou-spec-resolved-v4.md Section 6.7, PORTAL-DOCTOR.md Section 20)*

---

## 13. SLA Thresholds

| SLA | Threshold | Escalation |
|-----|-----------|------------|
| First review | 24 hours from `AI_COMPLETE` → not yet `ASSIGNED` | Notification to doctor + admin |
| Case action | 48 hours from `ASSIGNED` → no action taken | Notification to doctor + admin; admin may reassign |
| Info response | 72 hours from patient responding → doctor hasn't re-reviewed | Notification to doctor |
| Lab results review | 24 hours from lab results uploaded → doctor hasn't opened | Notification to doctor + admin |

SLA checks run every 15 minutes via BullMQ `sla-check` repeatable job.

**SLA indicator on case cards:** 🟢 Green (within SLA) / 🟡 Amber (within 2 hours of breach) / 🔴 Red (breached)

*(Source: PORTAL-DOCTOR.md Section 23.3)*

---

## 14. Notifications

### 14.1 Patient Notifications (PE Journey)

| Event | Push (FCM) | WhatsApp/SMS | Email |
|-------|-----------|--------------|-------|
| Questionnaire submitted | ✅ "Assessment submitted" | — | — |
| AI assessment complete | — (internal) | — | — |
| Doctor assigned | ✅ "A specialist is reviewing your case" | ✅ | — |
| Prescription created | ✅ "Your treatment plan is ready" | ✅ | ✅ |
| Doctor requests more info | ✅ "Your doctor needs more information" | ✅ | — |
| Blood work ordered (rare) | ✅ "Blood tests ordered — book collection" | ✅ | — |
| Nurse assigned | ✅ "Nurse [Name] assigned for collection" | ✅ | — |
| Lab results ready | ✅ "Your lab results are ready" | ✅ | — |
| Doctor reviewed results | ✅ "Doctor has reviewed your results" | ✅ | — |
| Medication dispatched | ✅ "Your treatment is on its way" | ✅ | — |
| Delivery OTP | — | ✅ (OTP code) | — |
| Delivered | ✅ "Package delivered" | — | — |
| 4-week check-in due | ✅ "Time for your check-in" | ✅ | ✅ |
| 3-month check-in due | ✅ "Progress review time" | ✅ | ✅ |
| 6-month check-in due | ✅ "Full assessment due" | ✅ | ✅ |
| Subscription renewal reminder | ✅ "Renewal in 3 days" | ✅ | ✅ |
| Payment failed | ✅ "Payment failed — update payment" | ✅ | ✅ |

**PE-specific notification privacy:**
- Notification channel preferences are user-configurable
- **"Discreet mode" ON BY DEFAULT for PE** (same as ED — unlike Hair Loss where it's optional) — push notification content shows "You have an update from Onlyou" without mentioning "PE" or "premature ejaculation"
- WhatsApp/SMS messages use condition-neutral language: "Your treatment" instead of "Your PE treatment"

*(Source: PORTAL-ADMIN.md Section 25, APP-PATIENT.md, PROJECT-OVERVIEW.md Section 6)*

---

## 15. Landing Page — PE Condition Page

### 15.1 URL & SEO

- **URL:** `https://onlyou.life/premature-ejaculation/`
- **Title tag:** `PE Treatment Online India — Prescription Medication for Premature Ejaculation from ₹1,000/mo | Onlyou`
- **Meta description:** `Private premature ejaculation treatment from licensed specialists. Dapoxetine & other prescription options. No clinic visit. AI assessment + doctor + discreet delivery. From ₹1,000/mo.`
- **H1:** `Premature ejaculation treatment — private, effective, delivered`
- **Canonical:** `https://onlyou.life/premature-ejaculation/`

*(Source: LANDING-PAGE.md Section 7)*

### 15.2 Target Keywords

- **Primary:** "premature ejaculation treatment online India", "PE treatment home delivery"
- **Secondary:** "dapoxetine online India", "premature ejaculation doctor online", "PE pills prescription"
- **Long-tail:** "premature ejaculation medication delivery India", "private PE treatment from home", "dapoxetine prescription online India"

*(Source: LANDING-PAGE.md Section 7)*

### 15.3 Condition Page Structure (12 Sections)

1. **Condition Hero** — H1, condition description (2–3 sentences), "Start Your Private Assessment" CTA, condition accent color background, privacy emphasis
2. **What Is Premature Ejaculation?** — 300–500 words, educational, empathetic tone, de-stigmatizing language, prevalence data (PE affects ~30% of men globally, lifelong PE affects ~5%)
3. **Types of PE** — Lifelong (neurobiological), Acquired (developed later), Variable, Situational — simple explanations without medical jargon
4. **Causes & Risk Factors** — Neurobiological (serotonin), Psychological (anxiety, stress), Physical (prostatitis, thyroid), Relationship factors
5. **How Onlyou Treats PE** — 3-step recap emphasizing: NO photos needed, NO video calls, fully text-based private consultation
6. **Treatments We Prescribe** — "On-demand medications (Dapoxetine), Daily therapy (SSRIs), Topical treatments, Behavioral techniques" (NOT specific brand names/dosages — that's the doctor's decision)
7. **Why Onlyou?** — 4 differentiators: Maximum privacy (no photos, no video), Licensed specialists, AI-powered assessment (PEDT scoring), Discreet delivery
8. **Pricing** — PE pricing table (Monthly / Quarterly / 6-Month)
9. **What's Included** — AI assessment with PEDT scoring, specialist consultation, prescription, medication delivery, ongoing check-ins, behavioral technique guidance
10. **FAQ** — 8–10 PE-specific questions
11. **CTA** — "Start Your Private Assessment" → app download link
12. **Related Conditions** — Cross-links to ED and other condition pages

*(Source: LANDING-PAGE.md Section 10)*

### 15.4 SEO Content

- Each condition page: 2,000–3,000 words of SEO-optimized long-form content
- Structured data: `MedicalCondition`, `FAQPage`, `Product` (subscription plan with pricing as `Offer`), `BreadcrumbList`

*(Source: LANDING-PAGE.md Section 10, onlyou-spec-resolved-v4.md Section 4.7)*

### 15.5 Structured Data Example

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalCondition",
  "name": "Premature Ejaculation",
  "alternateName": "PE",
  "description": "Premature ejaculation is a condition where ejaculation occurs sooner than desired during sexual activity, causing distress to one or both partners.",
  "possibleTreatment": [
    {
      "@type": "MedicalTherapy",
      "name": "Dapoxetine",
      "drugClass": "Short-acting SSRI"
    },
    {
      "@type": "MedicalTherapy",
      "name": "Paroxetine",
      "drugClass": "SSRI (off-label)"
    },
    {
      "@type": "MedicalTherapy",
      "name": "Lidocaine-Prilocaine",
      "drugClass": "Topical anesthetic"
    }
  ]
}
```

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://onlyou.life/" },
    { "@type": "ListItem", "position": 2, "name": "Premature Ejaculation", "item": "https://onlyou.life/premature-ejaculation/" }
  ]
}
```

*(Source: LANDING-PAGE.md Section 18)*

---

## 16. Admin Operations (PE)

### 16.1 Subscription Plan Management

**Route:** `/settings/plans` in admin portal

PE plan editor:
- Monthly: ₹1,299
- Quarterly: ₹3,299
- 6-Month: ₹5,999

Price changes apply to new subscriptions only. Existing subscriptions keep current pricing. All changes logged in audit trail.

*(Source: PORTAL-ADMIN.md Section 24)*

### 16.2 Case Queue Filter

Admin/coordinator can filter the case queue by "PE" condition badge to view all PE cases.

Filter chips: All | Hair Loss | ED | **PE** | Weight | PCOS

*(Source: onlyou-spec-resolved-v4.md Section 4.2)*

### 16.3 PE-Specific Admin Alerts

- **Serotonin interaction cases:** Admin dashboard shows a count of cases where serotonin drug interaction was flagged — these require special attention to ensure doctors are not prescribing dapoxetine to patients on SSRIs/MAOIs
- **Referral rate monitoring:** PE vertical may have higher referral rates for patients needing urology evaluation (prostatitis) or sex therapy

---

## 17. Referral Edge Cases — PE Specific

| Scenario | Action | Patient Message |
|----------|--------|----------------|
| Patient on SSRIs/MAOIs | CANNOT prescribe dapoxetine. Topical cream only, or refer. | "Your current antidepressant interacts with PE medication. I've prescribed a topical option that's safe to use alongside it." |
| Seizure history | CANNOT prescribe dapoxetine. Topical only. | "For your safety, I've prescribed a topical treatment. Oral PE medications aren't suitable with your history." |
| Prostatitis suspected | Refer to urologist for prostatitis evaluation first | "Your symptoms suggest a prostate issue that may be causing your PE. Let's address that first." |
| Thyroid suspected | Order TSH panel first | "Let's check your thyroid — it could be contributing to this." |
| Primary psychological PE | Prescribe medication + strongly recommend sex therapy/counseling | "Medication will help, but working with a counselor will give you the best long-term results." |
| PE + severe ED | May need ED treatment first (erection enables PE treatment) | "Let's first ensure reliable erections, then address ejaculation timing." |
| PEDT ≤8, low distress | May not need treatment — reassure and educate | "Based on your assessment, your ejaculation timing is within normal range. Let's discuss your expectations." |
| Patient wants specific brand | Clinical judgment prevails | Doctor evaluates appropriateness |
| Relationship in crisis | Medication + couples counseling referral | "I'll prescribe medication to help, and I'd recommend working with a couples counselor as well." |
| Severe liver disease | BLOCK all oral PE meds. Topical only. | "For your safety, I've prescribed a topical option." |

*(Source: onlyou-spec-resolved-v4.md Section 6.8)*

---

## 18. Database Schema (PE-Relevant)

### 18.1 Key Enums

```
enum ConditionType {
  HAIR_LOSS
  ED
  PE
  WEIGHT_MANAGEMENT
  PCOS
}
```

### 18.2 Consultation Record Fields (PE)

| Field | Type | PE-Specific Notes |
|-------|------|-------------------|
| `conditionType` | `ConditionType` | `PE` |
| `questionnaireResponseId` | UUID | Links to 26-question PE questionnaire (see Section 4) |
| `aiAssessmentId` | UUID | Contains `pedtScore`, `pedtClassification`, `peType`, `estimatedIelt`, `comorbidEd`, `psychologicalComponent`, `serotoninDrugCheck`, `seizureCheck`, `prostatitis_suspected` in `conditionSpecific` JSON |
| `photos` | Photo[] | **EMPTY** — PE does not require photos |
| `prescriptionTemplateUsed` | String | One of: On-Demand Dapoxetine 30mg, On-Demand Dapoxetine 60mg, Daily Paroxetine, Daily Sertraline, Combined Dapoxetine + Topical, Topical Only, Combined ED+PE, Behavioral + Medication, Custom |

### 18.3 AI Assessment `conditionSpecific` JSON Schema (PE)

```json
{
  "pedtScore": 15,
  "pedtClassification": "PE Likely",
  "peType": "Lifelong",
  "estimatedIelt": "<1 min",
  "comorbidEd": false,
  "psychologicalComponent": "Mild",
  "serotoninDrugCheck": "Clear",
  "seizureCheck": "Clear",
  "prostatitis_suspected": false
}
```

*(Source: onlyou-spec-resolved-v4.md Section 6.5, BACKEND-PART1.md Section 8.3)*

---

## 19. Testing Checklist

### 19.1 End-to-End Flow (from Phase 7 Checkpoint)

> **✅ Phase 7 Checkpoint:** Can complete ED and PE questionnaires, see IIEF-5 and PEDT scores in doctor dashboard, prescribe from ED/PE templates, and handle combined ED+PE case with comorbidity banners.

*(Source: onlyou-spec-resolved-v4.md — Phase 7)*

### 19.2 Critical Test Cases

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| C1 | Create consultation | Patient app → select PE → complete questionnaire | Consultation created, PEDT score calculated, status: SUBMITTED |
| C2 | No photo upload | After questionnaire → should proceed directly to plan selection | Photo upload step skipped entirely |
| C3 | PEDT scoring | Complete PEDT questions with known answers | Score calculated correctly, classification assigned (e.g., 15 = PE Likely) |
| C4 | AI assessment | After submission → wait for AI processing | Assessment generated (PEDT, PE type, IELT, serotonin check, comorbidity), status: AI_COMPLETE |
| C5 | Serotonin drug interaction | Q18 = "Antidepressants (SSRIs)" | RED BANNER displayed, HIGH attention level, dapoxetine blocked in contraindications matrix |
| C6 | Seizure contraindication | Q16 = "Yes" | RED BANNER displayed, dapoxetine blocked |
| C7 | Doctor receives case | Doctor portal → check caseload | New PE case appears in "New" tab with AI assessment, Photos tab hidden |
| C8 | Prescription created | Doctor portal → open case → select PE template → sign | Prescription PDF generated, status: PRESCRIPTION_CREATED |
| C9 | Lab order created (rare) | Doctor portal → order blood work → select Thyroid Check | Lab order created, patient notified |
| C10 | ED comorbidity flag | Q12 = "Yes — separate erection difficulty" | AI assessment includes ED comorbidity flag with banner |
| C11 | Discreet notifications | Check push notification content | Condition name NOT shown in push notification body (discreet mode default) |
| C12 | Combined ED+PE template | Doctor selects Combined ED+PE template | Both Tadalafil and Dapoxetine appear in prescription |

*(Source: BACKEND-PART3B.md — Testing section)*

### 19.3 PE-Specific Edge Cases

| Test | Scenario | Expected Behavior |
|------|----------|-------------------|
| SSRI patient | Patient on fluoxetine → doctor cannot prescribe dapoxetine | Doctor sees RED BANNER, prescribes Topical Only template |
| Under-18 blocked | User enters age 17 | Blocked with message: "Our service is available for adults 18 and over." |
| PEDT ≤8 | Patient scores 6 on PEDT (No PE) | AI assessment notes: "PEDT score within normal range. Patient may benefit from reassurance and expectation management." Doctor can still prescribe if clinical judgment warrants. |
| Liver disease | Patient reports liver problems | AI flags: dapoxetine contraindicated, topical only pathway |
| PE + ED comorbidity | Patient reports erection difficulties alongside PE | AI flags comorbidity, recommends Combined ED+PE template |
| Prostatitis suspected | Q15 = "Pain during ejaculation" + "Pelvic pain" | AI sets attention: HIGH, recommends urology referral |
| Heavy alcohol use | Q22 = "Heavy" | AI flags caution: "Increased syncope risk with dapoxetine — warn patient about alcohol interaction" |
| Lifelong PE, no contraindications | Classic presentation, all clear | Straightforward case: dapoxetine 30mg recommended, attention LOW |
| CYP3A4 inhibitor | Patient on ketoconazole | Dapoxetine 60mg blocked, max 30mg allowed |

---

## 20. Differentiation vs. Competitors

| Feature | Onlyou (PE) | Man Matters | Practo | Apollo 24/7 |
|---------|-------------|-------------|--------|-------------|
| Prescription Dapoxetine | ✅ 30mg and 60mg | ❌ Supplements only | ✅ One-off prescription | ✅ One-off prescription |
| Daily SSRI option | ✅ Paroxetine, Sertraline (off-label) | ❌ | ✅ One-off | ✅ One-off |
| AI pre-assessment | ✅ Claude-powered PEDT + PE type classification | ❌ | ❌ | ❌ |
| PEDT validated scoring | ✅ Automated scoring with classification | ❌ | ❌ | ❌ |
| Serotonin interaction screening | ✅ Automated with RED BANNER alert | ❌ | ❌ | ❌ |
| No photos required | ✅ Privacy-first, questionnaire only | ✅ | ✅ | ✅ |
| Subscription model | ✅ Ongoing care included | ✅ Product subscription | ❌ | ❌ |
| ED comorbidity handling | ✅ Combined ED+PE under single subscription | ❌ | ❌ | ❌ |
| Behavioral technique guidance | ✅ Included in prescription (start-stop, squeeze, Kegels) | ❌ | ❌ | ❌ |
| Follow-up cadence | ✅ 4w / 3m / 6m structured with PEDT tracking | ❌ | ❌ | ❌ |
| Discreet delivery | ✅ MAXIMUM DISCRETION — plain packaging, OTP | ❌ Branded packaging | N/A | ❌ Branded |
| Specialist type | Urologist / Andrologist / Sexual Medicine | Generic "wellness expert" | Random doctor | Random doctor |

*(Source: PROJECT-OVERVIEW.md Section 3)*

---

## 21. Cross-Reference Index

This section maps every PE-specific detail to its authoritative source document.

| Topic | Primary Source | Section |
|-------|---------------|---------|
| Pricing (authoritative) | onlyou-spec-resolved-v4.md | Section 5 |
| Target audience & doctor type | PROJECT-OVERVIEW.md | Section 4 |
| PE vertical specification (master) | onlyou-spec-resolved-v4.md | Section 6 (all subsections) |
| Subscription inclusions | PROJECT-OVERVIEW.md | Section 5 |
| Patient journey (high-level) | PROJECT-OVERVIEW.md | Section 6 |
| Condition selection screen | APP-PATIENT.md | Section 5 |
| Questionnaire engine | APP-PATIENT.md | Section 9 |
| PEDT scoring specification | onlyou-spec-resolved-v4.md | Section 6.3 |
| Plan selection & payment | APP-PATIENT.md | Section 11 |
| Follow-up cadence (patient) | APP-PATIENT.md | Section 12.4 |
| Lab booking & tracking | APP-PATIENT.md | Section 13 |
| Activity tab (steppers) | APP-PATIENT.md | Section 6 |
| Messaging (patient side) | APP-PATIENT.md | Section 7 |
| AI assessment layout | PORTAL-DOCTOR.md | Section 6 |
| AI extensions (PE) | PORTAL-DOCTOR.md | Section 6.2 |
| Serotonin check banner | PORTAL-DOCTOR.md | Section 6.2 |
| Questionnaire tab (doctor) | PORTAL-DOCTOR.md | Section 7 |
| Prescription builder | PORTAL-DOCTOR.md | Section 12 |
| Prescription templates (PE) | PORTAL-DOCTOR.md | Section 12.3 |
| Follow-up handling (doctor) | PORTAL-DOCTOR.md | Section 24 |
| SLA thresholds | PORTAL-DOCTOR.md | Section 23.3 |
| Canned messages | PORTAL-DOCTOR.md | Section 20 |
| Blood work panels (PE) | onlyou-spec-resolved-v4.md | Section 6.9 |
| Medication fulfillment | onlyou-spec-resolved-v4.md | Section 6.10 |
| Nurse visit flow | PORTAL-NURSE-FIXED.md | Main flow |
| Admin plan management | PORTAL-ADMIN.md | Section 24 |
| Landing page (condition page) | LANDING-PAGE.md | Section 7 |
| SEO & structured data | LANDING-PAGE.md | Sections 7, 10, 18 |
| Questionnaire JSON schema | BACKEND-PART1.md | Section 6.1 |
| PE prescription templates (code) | BACKEND-PART1.md | Section 10.3 |
| AI prompt construction | BACKEND-PART1.md | Section 8.2 |
| AI output extensions (PE) | onlyou-spec-resolved-v4.md | Section 6.5 |
| Database schema | BACKEND-PART2A.md | Prisma models |
| Comorbidity handling (PE+ED) | onlyou-spec-resolved-v4.md | Section 6.11 |
| Referral edge cases | onlyou-spec-resolved-v4.md | Section 6.8 |
| Build phase & checkpoint | onlyou-spec-resolved-v4.md | Phase 7 (Weeks 19–22) |
| Testing checklist | BACKEND-PART3B.md | Test cases |
| Competitor differentiation | PROJECT-OVERVIEW.md | Section 3 |
| Privacy & packaging | PROJECT-OVERVIEW.md | Section 7 |
| Pharmacy medications list | PORTAL-PHARMACY.md | Section 23 |

---

*End of VERTICAL-PE.md*
