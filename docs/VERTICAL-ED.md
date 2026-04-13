# VERTICAL-ED.md — Onlyou Erectile Dysfunction Vertical Specification

> **Document type:** Vertical-specific master reference
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** PROJECT-OVERVIEW.md, APP-PATIENT.md, PORTAL-DOCTOR.md, PORTAL-NURSE-FIXED.md, PORTAL-ADMIN.md, PORTAL-LAB-FIXED.md, PORTAL-PHARMACY.md, LANDING-PAGE.md, BACKEND-PART1.md, BACKEND-PART2A.md, BACKEND-PART2B.md, BACKEND-PART3A.md, BACKEND-PART3B.md, ARCHITECTURE.md, onlyou-spec-resolved-v4.md

---

## 1. Condition Overview

**Condition:** Erectile Dysfunction (ED)
**Internal enum value:** `ED`
**Build priority:** #2 of 5 verticals (Hair Loss → ED → PE → Weight → PCOS)
**Development phase:** Phase 7 (Weeks 19–22) — second vertical, reuses core infrastructure from Hair Loss
**Condition accent color:** Applied per landing page condition card styling

**Target audience:** Men aged 25–60
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Doctor type:** Urologist / Andrologist
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Consultation type:** Async (questionnaire only — no video, no photos in MVP)
*(Source: PROJECT-OVERVIEW.md Section 12, Decision #1)*

**Photos required:** None (privacy-first approach — ED is a purely questionnaire-based assessment)
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Blood work:** Sometimes (not always clinically indicated; doctor decides per case, especially when cardiovascular risk factors present)
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Time to visible results:** 1–4 weeks (on-demand PDE5 inhibitors work within 30–60 minutes per dose; daily Tadalafil takes 5–7 days to reach steady state)

**Regulatory classification:** Sildenafil and Tadalafil are Schedule H in India — require prescription, can be prescribed via telemedicine under Telemedicine Practice Guidelines 2020.
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Comorbidity note:** ED + PE comorbidity is very common (~30–40%). If a patient reports PE symptoms during ED assessment, the AI flags comorbidity. Doctor can prescribe combined treatment (e.g., Tadalafil daily + Dapoxetine on-demand) under the ED subscription at ED pricing — patient does NOT need a separate PE subscription.
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

**"Starting from" price (marketing):** ₹1,000/mo (6-month plan per-month rate)
*(Source: LANDING-PAGE.md Section 4.4)*

### 2.2 What's Included in Every Subscription

1. AI-powered pre-assessment — IIEF-5 validated scoring + cardiovascular risk analysis by Claude
2. Async doctor consultation — urologist/andrologist reviews case, asks follow-ups if needed
3. E-prescription — generated from ED-specific templates, PDF stored in S3
4. Medication — discreet local delivery with OTP confirmation (MAXIMUM DISCRETION packaging)
5. Ongoing check-ins — 4-week, 3-month, 6-month cadence
6. First blood panel — included when clinically indicated (Basic Health Check: ₹800 value)

*(Source: PROJECT-OVERVIEW.md Section 5)*

### 2.3 Blood Work Pricing

| Panel | Price | When Used |
|-------|-------|-----------|
| Basic Health Check (first) | **INCLUDED** in subscription | When clinically indicated by doctor (cardiovascular risk factors present) |
| Follow-up panels | ₹600–₹1,200 | Subset of initial panel, doctor selects tests |
| Patient self-upload | **Free** | Patient provides own recent results |

*(Source: onlyou-spec-resolved-v4.md Section 5, APP-PATIENT.md Section 13.1, PORTAL-LAB-FIXED.md Section 24)*

> **⚠️ Pre-existing Source Discrepancy — Blood Work Billing:** APP-PATIENT.md Section 13.1 states lab tests are "billed separately from the subscription — they are NOT included in the monthly/quarterly/6-month plan price." However, PROJECT-OVERVIEW.md Section 5, onlyou-spec-resolved-v4.md Section 5, and PORTAL-LAB-FIXED.md Section 24 all state "First panel: INCLUDED in subscription." This document follows the majority authoritative sources (first panel included). This discrepancy in APP-PATIENT.md should be resolved during implementation.

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
Selects "Erectile Dysfunction" from condition selector
        │
        ▼
Age gate (must be 18+)
        │
        ▼
Completes questionnaire (~28 questions, ~8–12 min, includes IIEF-5)
        │
        ▼
NO PHOTO UPLOAD (privacy-first — ED is questionnaire-only)
        │
        ▼
AI pre-assessment (Claude analyzes → IIEF-5 scoring, CV risk, nitrate check, etiology)
        │
        ▼
Selects plan & pays (Monthly/Quarterly/6-Month via Razorpay)
        │
        ▼
Doctor reviews case (urologist sees AI summary + raw data → 3–8 min per case)
        │
        ├─── PRESCRIBES ──────────────────────────────────┐
        │                                                  ▼
        ├─── ORDERS BLOOD WORK ──┐              Prescription → Pharmacy
        │                        ▼              Pharmacy prepares → Ready
        │              Nurse visits home         Coordinator arranges delivery
        │              Collects blood            Delivery person → OTP → Delivered
        │              Records vitals
        │              Delivers to lab
        │              Lab processes
        │              Results uploaded
        │              Doctor reviews
        │              Then prescribes ────────────────────┘
        │
        ├─── REQUESTS MORE INFO ──→ Chat message → Patient responds → Doctor re-reviews
        │
        ├─── REFERS ──→ Partner clinic / specialist near patient
        │
        └─── REFUNDS ──→ Full/partial refund if cannot treat (e.g., nitrate user)
        │
        ▼
ONGOING CARE (check-ins at 4 weeks / 3 months / 6 months)
```

*(Source: PROJECT-OVERVIEW.md Section 6)*

### 3.2 Condition Selection Screen

**Screen:** `(tabs)/home/condition/[condition].tsx`

When patient selects Erectile Dysfunction:

1. **Age gate first** — must be 18+; under 18 blocked ("Our service is available for adults 18 and over.")
2. **No gender selection** — ED vertical is male-only (unlike Hair Loss which has M/F branching)
3. Hero section with condition illustration + tagline emphasizing privacy
4. "How It Works" 3-step summary (emphasizing: no photos needed, no video, text-only)
5. "What You Get" checklist (doctor consultation, prescription, medication delivery, ongoing monitoring, WhatsApp support)
6. Pricing cards (Monthly / Quarterly / 6-Month)
7. FAQ accordion (3–5 ED-specific questions)
8. Sticky CTA at bottom: `[Start Your Assessment — Free]`
9. **Privacy callout:** "100% private. No photos required. No video calls. Your consultation is text-based only."

**CTA behavior:**
- Not logged in → auth flow → return here
- Logged in + phone verified → navigate to `questionnaire/ed`
- Phone not verified → phone verification first

*(Source: APP-PATIENT.md Section 5)*

### 3.3 Key Differences from Hair Loss Journey

| Aspect | Hair Loss | ED |
|--------|-----------|-----|
| Photo upload | 4 mandatory photos | None (privacy-first) |
| Gender branching | Male/Female | Male only |
| Scoring instrument | None (AI classifies) | IIEF-5 (validated, 5–25 scale) |
| Critical safety check | Finasteride safety | Nitrate contraindication (life-threatening) |
| Doctor type | Dermatologist | Urologist/Andrologist |
| Time to results | 3–6 months | 30–60 minutes (on-demand) / 5–7 days (daily) |

---

## 4. Questionnaire (28 Questions, ~8–12 minutes)

### 4.1 Overview

| Attribute | Value |
|-----------|-------|
| Total questions | 28 (schema) — most patients answer 24–26 after skip logic |
| Estimated completion | 8–12 minutes |
| Scoring tool | IIEF-5 (International Index of Erectile Function — 5 item version) |
| IIEF-5 scored items | 5 questions (Q10–Q14), each scored 1–5, total range 5–25 |
| Special logic | Age gate (18+), nitrate screening, cardiovascular risk flagging, PE comorbidity screen |
| JSON schema file | `questionnaire/data/ed.json` |

*(Source: APP-PATIENT.md Section 9.4, BACKEND-PART1.md Section 6.1, 6.3)*

### Skip Logic Rules
- Q4 = "None of these" → skip Q5 (medication details for cardiovascular conditions)
- Q7 = "None" → skip Q8 (details of current medications)
- Q6 = "No" (no nitrate use) → skip nitrate medication detail question
- Q20 = "No" (no PE symptoms) → skip Q21 (PE frequency/severity)
- Q25 = "None — this is my first treatment" → skip Q26 (treatment results)

Most patients answer **24–26 questions** after skip logic.

---

### SECTION 1: BASICS (3 questions)

**Q1: What is your age?**
- Type: Number input (18–80)
- Validation: <18 = blocked ("Our service is available for adults 18 and over.")
- Required: Yes
- AI use: Age context for treatment planning. Under 40 with ED: may indicate psychogenic cause, consider lifestyle factors. Over 50: higher likelihood of organic etiology, cardiovascular risk assessment more critical. Over 65: PDE5 inhibitor starting doses may need adjustment.

**Q2: What city do you live in?**
- Type: City search / dropdown
- Required: Yes
- AI use: Geographic context for delivery logistics and partner lab/pharmacy availability.

**Q3: What is your relationship status?**
- Type: Single select
  - Single
  - In a relationship
  - Married
  - Prefer not to say
- Required: Yes
- AI use: Psychosocial context. Relationship dynamics can impact ED etiology assessment (performance anxiety more common in new relationships). Informs counseling approach (partner involvement in treatment can improve outcomes).

*(Source: BACKEND-PART1.md Section 6.1 — JSON schema)*

### SECTION 2: MEDICAL HISTORY (6 questions)

**Q4: Do you have any of these medical conditions? (Select all that apply)**
- Type: Multi-select
  - Diabetes (Type 1 or Type 2)
  - High blood pressure (hypertension)
  - Heart disease or previous heart attack
  - High cholesterol
  - Peripheral vascular disease
  - Neurological condition (multiple sclerosis, Parkinson's, spinal cord injury)
  - Depression or anxiety (diagnosed)
  - Prostate condition (BPH, prostatitis, prostate cancer)
  - Peyronie's disease (penile curvature)
  - Kidney disease
  - Liver disease
  - None of these
- AI use: CRITICAL for cardiovascular risk assessment. Diabetes = most common organic cause of ED (neuropathy + vasculopathy). Hypertension = both a cause and a treatment consideration (blood pressure interaction with PDE5 inhibitors). Heart disease = requires careful dose selection, nitrate screening essential. Depression = may be cause or consequence of ED, SSRIs can worsen ED. Peyronie's = may need specialist referral. Multiple conditions = higher severity classification, may need blood work before prescribing.

**Q5: [IF cardiovascular conditions selected] Please provide more details about your cardiovascular health:**
- Type: Multi-select
  - Currently on blood pressure medication
  - Had a heart attack in the past 6 months
  - Have chest pain (angina) with physical activity
  - Had a stroke in the past 6 months
  - Have an irregular heartbeat (arrhythmia)
  - Had heart surgery or stent placement
  - None of the above apply
- Skip: Only shown if Q4 includes diabetes, high blood pressure, heart disease, high cholesterol, or peripheral vascular disease
- AI use: Heart attack/stroke within 6 months = PDE5 inhibitor CONTRAINDICATION (unstable cardiovascular status). Angina with activity = nitrate use likely → CRITICAL nitrate screening required. This question directly feeds the cardiovascular risk panel in the AI assessment.

**Q6: Do you use any nitrate medications? (e.g., nitroglycerin, isosorbide mononitrate, isosorbide dinitrate, amyl nitrite/"poppers")**
- Type: Single select
  - Yes — I take nitrate medication regularly
  - Yes — I use nitrate medication occasionally (as needed)
  - Yes — I use recreational nitrites ("poppers")
  - No — I do not use any nitrate products
  - Not sure
- **⛔ CRITICAL SAFETY QUESTION** — Any "Yes" answer triggers ABSOLUTE CONTRAINDICATION flag
- AI use: **Nitrate use + PDE5 inhibitors = potentially fatal hypotension.** This is the single most critical safety screening question in the entire ED questionnaire. ANY positive answer triggers the AI to generate a RED BANNER absolute contraindication alert. "Not sure" = flagged for doctor verification before any PDE5 inhibitor prescription.

**Q7: Are you currently taking any medications? (Select all)**
- Type: Multi-select
  - Blood pressure medications (ACE inhibitors, ARBs, beta-blockers, calcium channel blockers)
  - Alpha-blockers (tamsulosin, alfuzosin, doxazosin — for prostate/blood pressure)
  - Antidepressants (SSRIs: fluoxetine, sertraline, paroxetine, escitalopram)
  - Anti-anxiety medication (benzodiazepines, buspirone)
  - Testosterone replacement therapy
  - Finasteride or dutasteride (for hair loss or prostate)
  - Anticoagulants (blood thinners)
  - HIV protease inhibitors
  - Antifungals (ketoconazole, itraconazole)
  - PDE5 inhibitors already (Sildenafil/Viagra, Tadalafil/Cialis)
  - None
  - Other: [free text]
- AI use: Alpha-blockers = PDE5 inhibitor dose adjustment needed (start lower dose, separate timing). SSRIs = common cause of ED, switching antidepressant may help. Already on PDE5 inhibitor = patient has prior treatment history, assess response and consider dose/drug change. HIV protease inhibitors and azole antifungals = significant drug interactions with PDE5 inhibitors (reduced metabolism, increased drug levels). Testosterone therapy = may address underlying hormonal cause.

**Q8: [IF taking medications] Please list any other medications not mentioned above:**
- Type: Free text
- Skip: Only shown if Q7 ≠ "None"
- AI use: Catch-all for unlisted medications. Doctor reviews for additional drug interactions.

**Q9: Any known drug allergies?**
- Type: Free text / "None"
- Required: Yes
- AI use: Contraindication screening. Allergy to Sildenafil or Tadalafil = blocked from those specific PDE5 inhibitors. Sulfonamide allergy noted (rare cross-reactivity concerns with some formulations).

*(Source: PORTAL-DOCTOR.md Section 7.1 — Medical History section grouping)*

### SECTION 3: IIEF-5 ASSESSMENT (5 questions — SCORED)

> **These 5 questions are the validated International Index of Erectile Function — 5 item version (IIEF-5).** Each is scored 1–5 (or 0 if not applicable). Total score range: 5–25. Wording follows the validated instrument verbatim.

**Q10: Over the past 6 months, how do you rate your confidence that you could get and keep an erection?**
- Type: Single select (scored)
  - 1 — Very low
  - 2 — Low
  - 3 — Moderate
  - 4 — High
  - 5 — Very high
- Scoring: Value = selected number (1–5)
- AI use: IIEF-5 Item 1 — confidence component. Low confidence often indicates psychogenic component.

**Q11: When you had erections with sexual stimulation, how often were your erections hard enough for penetration?**
- Type: Single select (scored)
  - 0 — No sexual activity
  - 1 — Almost never or never
  - 2 — A few times (much less than half the time)
  - 3 — Sometimes (about half the time)
  - 4 — Most times (much more than half the time)
  - 5 — Almost always or always
- Scoring: Value = selected number (0–5); 0 treated as 1 for scoring purposes
- AI use: IIEF-5 Item 2 — erection hardness frequency. Core measure of erectile function.

**Q12: During sexual intercourse, how often were you able to maintain your erection after you had penetrated your partner?**
- Type: Single select (scored)
  - 0 — Did not attempt intercourse
  - 1 — Almost never or never
  - 2 — A few times (much less than half the time)
  - 3 — Sometimes (about half the time)
  - 4 — Most times (much more than half the time)
  - 5 — Almost always or always
- Scoring: Value = selected number (0–5); 0 treated as 1 for scoring purposes
- AI use: IIEF-5 Item 3 — maintenance ability. Difficulty maintaining (but not getting) erection may suggest venous leak or anxiety component.

**Q13: During sexual intercourse, how difficult was it to maintain your erection to completion of intercourse?**
- Type: Single select (scored)
  - 0 — Did not attempt intercourse
  - 1 — Extremely difficult
  - 2 — Very difficult
  - 3 — Difficult
  - 4 — Slightly difficult
  - 5 — Not difficult
- Scoring: Value = selected number (0–5); 0 treated as 1 for scoring purposes
- AI use: IIEF-5 Item 4 — maintenance difficulty. Complements Item 3 for comprehensive maintenance assessment.

**Q14: When you attempted sexual intercourse, how often was it satisfactory for you?**
- Type: Single select (scored)
  - 0 — Did not attempt intercourse
  - 1 — Almost never or never
  - 2 — A few times (much less than half the time)
  - 3 — Sometimes (about half the time)
  - 4 — Most times (much more than half the time)
  - 5 — Almost always or always
- Scoring: Value = selected number (0–5); 0 treated as 1 for scoring purposes
- AI use: IIEF-5 Item 5 — intercourse satisfaction. Overall functional outcome measure.

*(Source: BACKEND-PART1.md Section 6.3 — IIEF-5 scoring engine)*

### SECTION 4: SYMPTOM DETAILS (4 questions)

**Q15: How long have you been experiencing erectile difficulties?**
- Type: Single select
  - Less than 3 months
  - 3–6 months
  - 6–12 months
  - 1–2 years
  - 2–5 years
  - More than 5 years
  - Lifelong (always had this issue)
- AI use: Duration context. <3 months + sudden onset = likely psychogenic or medication-related. Gradual onset over years = likely organic (vascular, metabolic). "Lifelong" = primary ED, may need specialized assessment and possibly psychosexual therapy referral.

**Q16: Did your erectile difficulties start gradually or suddenly?**
- Type: Single select
  - Gradually (slowly got worse over time)
  - Suddenly (was fine, then started having problems)
  - Not sure
- AI use: CRITICAL for etiology classification. Gradual = organic cause (progressive vascular or neurological). Sudden = psychogenic cause (relationship change, stress, performance anxiety) OR medication-related (new antidepressant, antihypertensive). Informs AI etiology assessment confidence.

**Q17: Do you still get erections in the morning or during sleep?**
- Type: Single select
  - Yes — regularly
  - Yes — sometimes
  - Rarely
  - Never
  - Not sure
- AI use: CRITICAL discriminator. Preserved nocturnal/morning erections = strong indicator of psychogenic ED (hardware works, software issue). Absent nocturnal erections = organic ED (vascular, neurological, or hormonal). This question significantly influences the AI's organic vs. psychogenic confidence rating.

**Q18: Do you experience erection difficulties in specific situations only?**
- Type: Single select
  - Only with a partner (fine with masturbation)
  - Only during intercourse (fine with foreplay)
  - In all situations
  - Only with new partners
  - Varies — no clear pattern
- AI use: Situational ED = strong psychogenic indicator. "Only with partner" + preserved morning erections = high confidence psychogenic. "All situations" + gradual onset + no morning erections = high confidence organic. "Only with new partners" = performance anxiety component.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Symptom Details section grouping)*

### SECTION 5: LIFESTYLE & RISK FACTORS (5 questions)

**Q19: How would you rate your stress level over the past 6 months?**
- Type: Single select
  - Low — generally relaxed
  - Moderate — some stress but manageable
  - High — frequently stressed
  - Very high — constant significant stress
- AI use: High/very high stress = significant psychogenic ED risk factor. Also contributes to cardiovascular risk assessment. Counseling note: stress management as adjunct to treatment.

**Q20: Do you experience premature ejaculation (ejaculating sooner than you or your partner would like)?**
- Type: Single select
  - No
  - Yes — sometimes
  - Yes — frequently
  - Yes — almost always
- AI use: **COMORBIDITY SCREEN.** ED + PE co-occurs in ~30–40% of cases. "Yes — frequently" or "Yes — almost always" triggers comorbidity flag in AI assessment. Doctor can prescribe combined treatment (Tadalafil daily + Dapoxetine on-demand) under ED subscription without needing separate PE subscription.

**Q21: [IF PE symptoms] How much does premature ejaculation bother you?**
- Type: Single select
  - Not at all — it's not a concern
  - Somewhat — I'd like it to improve
  - Very much — it significantly affects my sexual satisfaction
- Skip: Only shown if Q20 ≠ "No"
- AI use: Severity of PE distress. "Very much" = doctor should consider combined ED+PE treatment protocol. Informs whether PE is incidental or a primary concern.

**Q22: Do you smoke?**
- Type: Single select
  - No, never
  - Previously, but quit
  - Yes, occasionally
  - Yes, daily
- AI use: Smoking = major ED risk factor (endothelial dysfunction, reduced nitric oxide production). Smoking cessation counseling should be part of treatment plan. Also contributes to cardiovascular risk panel.

**Q23: How often do you drink alcohol?**
- Type: Single select
  - Never
  - Occasionally (1–2 times per month)
  - Regularly (1–2 times per week)
  - Frequently (3+ times per week)
  - Daily
- AI use: Frequent/daily alcohol = both acute and chronic ED contributor. Acute: alcohol-induced ED common. Chronic: neuropathy, liver damage, testosterone suppression. Counseling note: reducing alcohol may improve ED significantly.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Lifestyle section grouping)*

### SECTION 6: PSYCHOLOGICAL & RELATIONSHIP (3 questions)

**Q24: Have you experienced any of these in the past 6 months? (Select all)**
- Type: Multi-select
  - Significant relationship stress or conflict
  - Work-related stress or burnout
  - Depression or low mood
  - Anxiety (general or performance-related)
  - Grief or bereavement
  - Financial stress
  - Sleep problems or insomnia
  - None of these
- AI use: Psychogenic etiology indicators. Multiple psychological stressors = strong psychogenic component. Performance anxiety specifically = very common ED cause in younger men. Depression = may be cause or consequence of ED, also may indicate SSRI use (which itself causes ED). Counseling note: psychological support recommendation if multiple items selected.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Psychological section grouping)*

### SECTION 7: TREATMENT HISTORY & GOALS (4 questions)

**Q25: Have you tried any ED treatments before? (Select all)**
- Type: Multi-select
  - Sildenafil (Viagra / generic)
  - Tadalafil (Cialis / generic)
  - Vardenafil (Levitra)
  - Avanafil (Stendra)
  - Alprostadil (injection or urethral)
  - Vacuum erection device (penis pump)
  - Testosterone therapy
  - Herbal supplements (ashwagandha, shilajit, ginseng, etc.)
  - Psychosexual therapy or counseling
  - None — this is my first treatment
- AI use: Prior treatment history is CRITICAL for protocol selection. Failed Sildenafil 50mg = consider increasing to 100mg or switching to Tadalafil. Failed both Sildenafil and Tadalafil = consider non-PDE5 options or specialist referral. Prior testosterone therapy = hormonal workup may be needed. Prior herbal supplements = patient tried non-prescription first (common in India due to stigma). "None" = first-time patient, standard first-line protocol.

**Q26: [IF tried treatments] How would you describe the results?**
- Type: Free text
- Skip: Only shown if Q25 ≠ "None — this is my first treatment"
- AI use: Duration of use, perceived efficacy, side effects experienced, reason for stopping. Helps doctor avoid re-prescribing ineffective treatments. Important to capture if previous PDE5 inhibitor doses were adequate and taken correctly (timing, food interactions).

**Q27: What is your primary goal with treatment?**
- Type: Single select
  - Reliable erections for sexual intercourse
  - Improved confidence in sexual situations
  - Both — better erections and more confidence
  - Understand the underlying cause
  - Not sure — want doctor's recommendation
- AI use: Manages expectations. "Reliable erections" = on-demand PDE5 inhibitor may suffice. "Improved confidence" = daily Tadalafil may provide better psychological benefit (always in system, no timing pressure). "Understand cause" = blood work and comprehensive assessment priority. Informs counseling notes and treatment goal documentation.

**Q28: Is there anything else you'd like your doctor to know?**
- Type: Free text (optional)
- Required: No
- AI use: Open-ended catch-all. Patients often disclose sensitive details here that they didn't feel comfortable selecting in structured questions. Doctor reviews directly.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Treatment Goals section grouping)*

---

### 4.2 IIEF-5 Scoring

The IIEF-5 score is calculated by the backend scoring engine from Q10–Q14 responses:

```typescript
function calculateIIEF5(answers: Record<string, number>): {
  score: number;
  severity: 'severe' | 'moderate' | 'mild_to_moderate' | 'mild' | 'no_ed';
}
```

| Total Score | Severity Classification |
|-------------|------------------------|
| 5–7 | Severe ED |
| 8–11 | Moderate ED |
| 12–16 | Mild-to-Moderate ED |
| 17–21 | Mild ED |
| 22–25 | No ED (normal erectile function) |

**Scoring rules:**
- Items Q11–Q14: if answer = 0 ("No sexual activity" / "Did not attempt"), score as 1
- Total = sum of Q10 + Q11 + Q12 + Q13 + Q14
- Score is calculated server-side immediately after questionnaire submission
- Score and severity displayed in AI assessment and on doctor's case review

*(Source: BACKEND-PART1.md Section 6.3)*

### 4.3 Skip Logic Summary

| Condition | Question(s) Affected | Behavior |
|-----------|---------------------|----------|
| Q4 = "None of these" | Q5 | Skip cardiovascular details |
| Q6 = "No" | — | No skip (proceed normally) |
| Q7 = "None" | Q8 | Skip additional medication details |
| Q20 = "No" (no PE) | Q21 | Skip PE severity |
| Q25 = "None — first treatment" | Q26 | Skip treatment results |

Most patients answer **24–26 questions** after skip logic.

*(Source: APP-PATIENT.md Section 9.3, BACKEND-PART1.md Section 6.2)*

### 4.4 Questionnaire UX

- **One question per screen** — firm design decision, no multi-question forms
- `[Next →]` button (sticky bottom) — disabled until valid answer
- `[← Back]` button (top left)
- Progress bar: "Question 5 of 28" — adjusts dynamically when skip logic reduces total
- Save & resume: progress saved to local storage (Zustand persisted) after each answer, synced to backend every 3 questions
- Saved progress expires after 7 days
- Multi-device: loads last backend-synced state on new device with "Syncing your progress…" spinner
- **Privacy reassurance banner** (shown at start of IIEF-5 section): "Your answers are confidential and shared only with your prescribing doctor."

*(Source: APP-PATIENT.md Section 9.3)*

### 4.5 Review Screen

**Screen:** `questionnaire/ed/review.tsx`

After all questions answered:
- All answers listed, grouped by section
- IIEF-5 score displayed: "Your IIEF-5 Score: [X]/25 — [Severity]"
- Each answer tappable → navigate back to that question to edit
- Consent checkbox (required): "By submitting, I confirm these answers are accurate and consent to a clinical assessment based on them."
- `[Submit Assessment]` button

**On submit:**
1. All answers sent to backend in one API call
2. IIEF-5 score calculated server-side
3. Backend triggers AI assessment pipeline (BullMQ job)
4. Consultation record created with status `SUBMITTED`
5. Patient navigated to plan selection (NO photo upload step for ED)

*(Source: APP-PATIENT.md Section 9.5)*

---

## 5. Photo Upload

**ED does NOT require photo upload.** This is a deliberate privacy-first design decision. ED assessment is entirely questionnaire-based.

After questionnaire submission, the patient proceeds directly to plan selection and payment. The photo upload step in the patient journey flow is skipped entirely for ED consultations.

The `photoRequired` field in the ED questionnaire JSON schema is set to `false`.

*(Source: PROJECT-OVERVIEW.md Section 4)*

---

## 6. AI Pre-Assessment

### 6.1 Pipeline

1. Questionnaire submitted → consultation status: `SUBMITTED`
2. IIEF-5 score calculated by scoring engine
3. BullMQ job queued for AI processing
4. Claude (Sonnet) processes questionnaire answers + IIEF-5 score (no photos for ED)
5. AI assessment generated → consultation status: `AI_COMPLETE`
6. Case enters doctor queue

*(Source: BACKEND-PART1.md Section 8, PORTAL-DOCTOR.md Section 6)*

### 6.2 AI Assessment Output Structure

The AI assessment for ED includes:

**Standard fields (all verticals):**
- Classification + confidence level (high/medium/low)
- Attention level: LOW / MEDIUM / HIGH / CRITICAL (with rationale)
- Red flags list
- Contraindications matrix (per medication: safe ✅ / caution ⚠️ / blocked ⛔)
- Risk factors
- Recommended protocol (template name)
- Full summary paragraph (2–3 paragraphs for the doctor)

**ED-specific extensions (`conditionSpecific` fields):**

| Field | Description | Example |
|-------|-------------|---------|
| `iief5Score` | Calculated IIEF-5 total score (5–25) | 14 |
| `iief5Severity` | Severity classification from score | "Mild-to-Moderate ED" |
| `cardiovascularRisk` | Low / Medium / High (composite assessment from medical history + lifestyle) | "Medium" |
| `nitrateCheck` | Clear / Flagged / Absolute Contraindication (with medication name if flagged) | "Absolute Contraindication — Isosorbide mononitrate" |
| `etiologyAssessment` | Organic / Psychogenic / Mixed (with confidence %) | "Mixed (Organic 60%, Psychogenic 40%)" |

*(Source: PORTAL-DOCTOR.md Section 6.2, BACKEND-PART1.md Section 8.3)*

### 6.3 Nitrate Contraindication RED BANNER

When the AI detects nitrate use (Q6 = any "Yes" answer), it generates a highly visible absolute contraindication alert:

```
┌────────────────────────────────────────────────────────────────┐
│  ⛔ ABSOLUTE CONTRAINDICATION — NITRATE USE DETECTED           │
│                                                                │
│  Patient reports use of [medication name].                     │
│                                                                │
│  PDE5 inhibitors (Sildenafil, Tadalafil) are ABSOLUTELY       │
│  CONTRAINDICATED with nitrates.                                │
│                                                                │
│  Risk: Severe, potentially fatal hypotension.                  │
│                                                                │
│  DO NOT prescribe PDE5 inhibitors.                             │
│                                                                │
│  Consider: Alprostadil, Vacuum devices, or Referral.           │
└────────────────────────────────────────────────────────────────┘
```

This banner is displayed:
- At the TOP of the AI Assessment tab (above all other content)
- In RED background with white text
- Cannot be dismissed — persists throughout the case review
- Also triggers CRITICAL attention level automatically

*(Source: PORTAL-DOCTOR.md Section 6.2)*

### 6.4 AI Assessment Example (ED)

```
┌────────────────────────────────────────────────────┐
│  🤖 AI Pre-Assessment                              │
│  Generated: 20 Jan 2026, 3:15 PM                  │
│  Model: Claude 3.5 Sonnet | Confidence: 82%       │
├────────────────────────────────────────────────────┤
│                                                    │
│  IIEF-5 SCORE                                      │
│  Score: 14/25 — Mild-to-Moderate ED                │
│  ████████████░░░░░░░░░░░░░                         │
│                                                    │
│  CLASSIFICATION                                    │
│  Mixed Etiology ED (Organic 60%, Psychogenic 40%) │
│  Confidence: 82%                                   │
│                                                    │
│  🟡 ATTENTION LEVEL: MEDIUM                        │
│  Rationale: "Patient has controlled hypertension   │
│  and moderate stress. IIEF-5 indicates mild-to-    │
│  moderate dysfunction. No nitrate use. Standard    │
│  PDE5 inhibitor safe with BP monitoring."          │
│                                                    │
│  CARDIOVASCULAR RISK: MEDIUM                       │
│  • Controlled hypertension (on ACE inhibitor)      │
│  • Occasional smoker                               │
│  • Sedentary lifestyle                             │
│  • No diabetes, no cardiac events                  │
│                                                    │
│  NITRATE CHECK: ✅ CLEAR                            │
│  No nitrate or nitrite use reported                │
│                                                    │
│  ETIOLOGY ASSESSMENT                               │
│  Organic factors: Hypertension, smoking,           │
│  gradual onset, reduced morning erections          │
│  Psychogenic factors: High stress, performance     │
│  anxiety noted, situational component              │
│                                                    │
│  ⚠️ RED FLAGS                                      │
│  • Controlled hypertension — monitor BP with       │
│    PDE5 inhibitor                                  │
│  • Occasional smoking — cessation counseling       │
│                                                    │
│  💊 CONTRAINDICATIONS MATRIX                       │
│  ┌──────────────┬───────┬────────┬──────────────┐ │
│  │ Medication   │ Safe  │ Caution│ Blocked      │ │
│  ├──────────────┼───────┼────────┼──────────────┤ │
│  │ Sildenafil   │  ✅   │        │              │ │
│  │ Tadalafil    │  ✅   │        │              │ │
│  │ Tadalafil 5mg│  ✅   │        │              │ │
│  │ Dapoxetine   │  ✅   │        │              │ │
│  └──────────────┴───────┴────────┴──────────────┘ │
│                                                    │
│  PE COMORBIDITY: Not detected                      │
│                                                    │
│  📋 RECOMMENDED PROTOCOL                           │
│  "On-Demand Tadalafil 10mg recommended. Patient    │
│  prefers spontaneity (no timing pressure). Start   │
│  10mg, titrate to 20mg if needed. Consider daily   │
│  5mg if frequency >2x/week. Recommend Basic Health │
│  Check given cardiovascular risk factors."         │
│                                                    │
│  📝 FULL SUMMARY                                   │
│  "42-year-old male with 18-month history of        │
│   gradually worsening erectile function. IIEF-5    │
│   score 14 (mild-to-moderate). Controlled          │
│   hypertension on Ramipril 5mg, occasional smoker, │
│   sedentary. Morning erections reduced but not     │
│   absent. Some situational variation suggesting    │
│   mixed etiology. No nitrate use. No prior ED      │
│   treatment. No drug allergies. Recommend starting │
│   on-demand Tadalafil 10mg with Basic Health Check │
│   (testosterone, glucose, lipid panel). Smoking    │
│   cessation and exercise counseling advised."      │
└────────────────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 6.1)*

### 6.5 AI Prompt Construction

The AI prompt for ED includes:
- Patient age, city, relationship status
- Full questionnaire responses (JSON)
- Calculated IIEF-5 score and severity classification
- Instruction to return structured JSON with classification, confidence, attention level, red flags, contraindications, risk factors, recommended protocol, summary, and `conditionSpecific` fields (`iief5Score`, `iief5Severity`, `cardiovascularRisk`, `nitrateCheck`, `etiologyAssessment`)

*(Source: BACKEND-PART1.md Section 8.2, 8.3)*

### 6.6 AI Failure Handling

| Scenario | Doctor Portal Display |
|----------|----------------------|
| Complete failure | "⏳ AI Processing" badge (gray) → after timeout: "AI assessment unavailable. Please review manually." + `[Retry AI Assessment]` button |
| Partial assessment | "⚠️ AI assessment generated with warnings: [missing data points]" |
| Max retries (3) | "AI assessment could not be completed. Please proceed with manual review." |

*(Source: PORTAL-DOCTOR.md Section 6.3)*

### 6.7 AI Disclaimer

Displayed at bottom of AI Assessment tab in doctor portal:

> "This AI pre-assessment is a clinical decision support tool generated by Claude AI. It does not constitute medical advice. The prescribing physician retains full clinical responsibility for all treatment decisions. AI confidence levels reflect pattern matching against training data and should not be interpreted as diagnostic certainty."

*(Source: PORTAL-DOCTOR.md Section 6.4)*

---

## 7. Doctor Review

### 7.1 Case Queue Appearance

ED cases appear in the doctor's case queue with:
- Patient name, age, city
- Condition badge: "ED" (color-coded)
- Time since submission
- AI attention level badge: 🟢 Low / 🟡 Medium / 🔴 High / ⛔ Critical
- Status badge
- 1-line AI summary snippet
- IIEF-5 score badge (e.g., "IIEF-5: 14/25")

**Example mobile card:**
```
┌─────────────────────────────────────────┐
│  Patient K., 42M, Mumbai       1h 45m  │
│  ┌──────┐  ┌──────────┐  ┌──────────┐  │
│  │  ED  │  │🟡 Medium │  │   New    │  │
│  └──────┘  └──────────┘  └──────────┘  │
│  IIEF-5: 14/25 (Mild-Moderate)         │
│  "Mixed etiology, controlled HTN,      │
│   no nitrates. Tadalafil recommended." │
└─────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 4.5)*

### 7.2 Case Review Layout (Desktop 3-Panel)

**LEFT (30%) — Patient Summary:**
- Name, age, city, phone (masked)
- Government ID status
- Active subscriptions (ED shown)
- Consultation history
- Current medications
- Allergies

**CENTER (45%) — Clinical Data Tabs:**
- **Tab: AI Assessment** (default open) — IIEF-5 score, CV risk, nitrate check, etiology, flags, contraindications, recommended protocol
- **Tab: Questionnaire** — collapsible sections with flagged answers highlighted
- **Tab: Photos** — NOT SHOWN for ED (tab hidden or disabled)
- **Tab: Lab Results** — if any exist (inline PDF viewer, abnormals highlighted)
- **Tab: Messages** — chat thread with patient

**RIGHT (25%) — Actions Panel:**

| Action | What Happens |
|--------|--------------|
| **Prescribe** | Opens prescription builder (ED templates) |
| **Order Blood Work** | Opens lab order form (select Basic Health Check) |
| **Request More Info** | Opens message composer → status: AWAITING_PATIENT_RESPONSE |
| **Refer** | Opens referral modal (partner clinic / specialist) |
| **Refund** | Initiates refund flow |
| **Close Case** | Marks consultation complete |

*(Source: PORTAL-DOCTOR.md Sections 4–11, onlyou-spec-resolved-v4.md Section 4.2)*

### 7.3 Photos Tab — ED

**NOT APPLICABLE.** ED consultations do not include photos. The Photos tab is hidden or shows "No photos required for this condition type." in the doctor portal for ED cases.

### 7.4 Questionnaire Tab — Flagged Answers

- Amber background + ⚠️ icon = caution (e.g., "On alpha-blockers — PDE5 inhibitor dose adjustment needed")
- Red background + ⛔ icon = critical flag (e.g., "Uses nitrate medication — PDE5 inhibitors CONTRAINDICATED")
- Quick-jump: clicking a red flag in AI Assessment tab scrolls Questionnaire tab to the flagged answer

*(Source: PORTAL-DOCTOR.md Section 7.2)*

---

## 8. Prescription Templates

### 8.1 Available Templates

| Template | Key Medications |
|----------|----------------|
| **On-Demand Sildenafil 50mg** | Sildenafil 50mg PRN |
| **On-Demand Sildenafil 100mg** | Sildenafil 100mg PRN |
| **On-Demand Tadalafil 10mg** | Tadalafil 10mg PRN |
| **On-Demand Tadalafil 20mg** | Tadalafil 20mg PRN |
| **Daily Tadalafil 5mg** | Tadalafil 5mg daily |
| **Conservative** | Lifestyle counseling + L-Arginine + Zinc |
| **Custom** | Doctor manually selects medications |

*(Source: PORTAL-DOCTOR.md Section 12.3, onlyou-spec-resolved-v4.md Section 4.2)*

### 8.2 On-Demand Sildenafil 50mg Template Example

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Sildenafil | 50mg | As needed (PRN), 30–60 min before sexual activity | 3 months | Max 1 dose per 24 hours |

### 8.3 On-Demand Tadalafil 10mg Template Example

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Tadalafil | 10mg | As needed (PRN), 30 min before sexual activity | 3 months | Effective for up to 36 hours; max 1 dose per 24 hours |

### 8.4 Daily Tadalafil 5mg Template Example

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Tadalafil | 5mg | 1x daily (same time each day) | 3 months | Takes 5–7 days to reach steady state; no timing around sexual activity needed |

### 8.5 Conservative Template Example

| Recommendation | Dosage / Details | Frequency | Duration | Notes |
|----------------|-----------------|-----------|----------|-------|
| Lifestyle modifications | Exercise 150 min/week, smoking cessation, alcohol reduction, weight management | — | Ongoing | Primary intervention for mild ED with modifiable risk factors |
| L-Arginine | 2,500mg | 1x daily | 3 months | Precursor to nitric oxide; may improve mild ED |
| Zinc | 30mg | 1x daily | 3 months | Supports testosterone production |

### 8.6 Counseling Notes (Pre-filled from Template — On-Demand PDE5 Inhibitor)

- Take on an empty stomach or after a light meal for fastest onset (high-fat meals delay Sildenafil absorption by up to 1 hour; Tadalafil less affected)
- Allow 30–60 minutes before sexual activity (Sildenafil); 30 minutes (Tadalafil)
- Sexual stimulation is still required — the medication enhances natural arousal, it does not create automatic erections
- Do NOT take more than one dose in 24 hours
- Common side effects: headache, flushing, nasal congestion, indigestion — usually mild and temporary
- Seek immediate medical attention if you experience: erection lasting more than 4 hours (priapism), sudden vision or hearing changes, chest pain
- Do NOT combine with nitrate medications or recreational nitrites ("poppers") — risk of dangerous blood pressure drop
- Avoid grapefruit juice (increases drug levels)
- Give the medication 4–6 attempts before judging effectiveness — first-time response may not be optimal
- Tadalafil (if prescribed): remains effective for up to 36 hours, offering a wider window of spontaneity

### 8.7 Counseling Notes (Daily Tadalafil 5mg)

- Take at the same time every day, with or without food
- It takes 5–7 days of daily use to reach steady-state levels in your body
- Once at steady state, you can be spontaneous without timing around sexual activity
- Do NOT skip doses — consistent daily use is required for this protocol
- Common side effects: headache, back pain, muscle aches, nasal congestion — usually mild
- Same safety warnings as on-demand: no nitrates, seek help for priapism, report vision/hearing changes
- This protocol is especially effective if you have sex more than twice per week or prefer not to plan around medication timing

### 8.8 Prescription Builder Fields

- **Template selector:** Dropdown with all ED templates
- **Medication list:** Pre-filled from template, fully editable (drug name, dosage, frequency, duration, instructions)
- **Custom medications:** `[+ Add Medication]` to add any medication manually (including Dapoxetine if PE comorbidity detected)
- **Counseling notes:** Pre-filled condition-specific text, editable
- **Regulatory information (auto-populated):** Doctor name, NMC registration number, patient details, diagnosis ("Erectile Dysfunction"), date
- **Digital signature:** Click/tap to sign
- **Preview:** PDF preview before submission
- **Submit:** Generates PDF → stores in S3 → creates Order record → notifies coordinator + patient

*(Source: PORTAL-DOCTOR.md Section 12.2, 12.3)*

---

## 9. Blood Work

### 9.1 Basic Health Check Panel (ED)

| Test | Purpose |
|------|---------|
| Testosterone (total + free) | Low testosterone is a common organic cause of ED |
| Fasting glucose | Diabetes screening (major ED risk factor) |
| HbA1c | Long-term glucose control (diabetes monitoring) |
| Lipid panel (total cholesterol, HDL, LDL, triglycerides) | Cardiovascular risk assessment, dyslipidemia screening |

**Panel price:** ₹800
**First panel:** INCLUDED in subscription when clinically indicated
**Follow-up panels:** ₹600–₹1,200 (subset of initial, doctor selects specific tests)
**Self-upload:** Free (patient provides own recent lab work)

*(Source: PORTAL-DOCTOR.md Section 13.2, PORTAL-LAB-FIXED.md Section 24)*

### 9.2 When Blood Work Is Ordered

Blood work is NOT routine for all ED patients. Doctor orders when:
- Cardiovascular risk factors present (hypertension, diabetes, smoking, obesity)
- Suspected hormonal cause (low libido, fatigue, age >50)
- IIEF-5 score indicates severe ED (score ≤11)
- Patient has not had recent blood work (within 12 months)
- Organic etiology suspected and no recent metabolic workup

### 9.3 Blood Work Flow

1. Doctor orders blood work from case review → selects "Basic Health Check"
2. Patient notified: "Your doctor has ordered blood tests. Please book a home collection or upload your own results."
3. **Option A — Home collection:**
   - Patient books time slot in app
   - Nurse assigned by coordinator
   - Nurse visits home → verifies identity → records vitals (BP, pulse, SpO2) → collects blood
   - Nurse delivers sample to partner lab
   - Lab processes → results uploaded
   - Doctor reviews results → may adjust prescription
4. **Option B — Self-upload:**
   - Patient uploads PDF/photo of recent lab results
   - Status: `RESULTS_UPLOADED` (self)
   - Doctor reviews uploaded results

*(Source: APP-PATIENT.md Section 13, PORTAL-NURSE-FIXED.md, PORTAL-LAB-FIXED.md)*

### 9.4 Blood Work Tracking (Patient App)

```
┌─────────────────────────────────────┐
│  🔬 Blood Work — ED                  │
│  Panel: Basic Health Check           │
│                                      │
│  ✅ Ordered (5 Feb, 11:00 AM)        │
│  ✅ Slot Booked (5 Feb, 3:00 PM)     │
│  🔵 Nurse Assigned                    │
│  ⚪ Sample Collected                  │
│  ⚪ Sample Received at Lab            │
│  ⚪ Processing Started                │
│  ⚪ Results Ready                     │
│  ⚪ Doctor Reviewed                   │
│                                      │
│  Nurse: Anita R. — arriving ~3 PM   │
│  [Call Nurse] [Reschedule]           │
└─────────────────────────────────────┘
```

*(Source: APP-PATIENT.md Section 6.1)*

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

| Medication | Quantity | Estimated Cost |
|------------|----------|---------------|
| Sildenafil 50mg | 4–8 tablets | ₹200–₹400 |
| Sildenafil 100mg | 4–8 tablets | ₹300–₹600 |
| Tadalafil 10mg | 4–8 tablets | ₹400–₹700 |
| Tadalafil 20mg | 4–8 tablets | ₹600–₹1,000 |
| Tadalafil 5mg (daily) | 30 tablets | ₹800–₹1,200 |

> **Note:** Medication cost is included in the subscription price. Patients do not pay separately for medication — it is part of the all-inclusive subscription model.

### 10.3 Delivery Tracking (Patient App)

```
┌─────────────────────────────────────┐
│  📦 Treatment Kit — ED               │
│  Tadalafil 10mg                      │
│                                      │
│  ✅ Prescription Created (4 Feb)      │
│  ✅ Sent to Pharmacy (4 Feb)          │
│  ✅ Pharmacy Preparing (5 Feb)        │
│  🔵 Ready for Pickup                  │
│  ⚪ Out for Delivery                  │
│  ⚪ Delivered                          │
│                                      │
│  Pharmacy: Apollo Pharmacy, Koramangala │
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
- **ED-specific privacy emphasis:** Given the stigma surrounding ED in India, packaging discretion is even more critical than for other verticals. The package must be indistinguishable from any other Onlyou delivery.

*(Source: PROJECT-OVERVIEW.md Section 7, onlyou-spec-resolved-v4.md Section 6)*

### 10.5 Auto-Refill

- Medication auto-reorders on subscription renewal cycle
- No manual reorder needed for active subscribers
- **On-demand PDE5 inhibitors:** Refill quantity based on initial prescription (e.g., 8 tablets/month)
- **Daily Tadalafil 5mg:** 30-tablet refill every 30 days
- Monthly subscribers: auto-refill every 30 days
- Quarterly subscribers: auto-refill every 30 days (plan covers 3 cycles)
- 6-Month subscribers: auto-refill every 30 days (plan covers 6 cycles)

*(Source: PROJECT-OVERVIEW.md Section 6)*

---

## 11. Follow-Up Care & Check-Ins

### 11.1 Follow-Up Schedule

| Time Point | Type | Questionnaire | Photos | Purpose |
|------------|------|--------------|--------|---------|
| 4 weeks | Side effects + efficacy check | 10 questions (abbreviated IIEF-5 + usage + side effects) | No | Early side effect detection, efficacy assessment, dose adjustment |
| 3 months | Progress review | 12 questions (IIEF-5 + satisfaction + usage frequency) | No | Treatment response, consider protocol change |
| 6 months | Full assessment | 15 questions (full IIEF-5 + comprehensive review) | No | Long-term efficacy, cardiovascular re-assessment |
| 12 months | Annual review | Full questionnaire | No | Comprehensive annual review |

**Note:** ED follow-ups NEVER require photos (unlike Hair Loss which adds progress photos at 3 and 6 months).

*(Source: PORTAL-DOCTOR.md Section 24.1, APP-PATIENT.md Section 12.4)*

### 11.2 Follow-Up Patient Flow

1. Notification sent when follow-up is due
2. Home tab shows "Check-in Due" card with `[Start Check-in]` CTA
3. Abbreviated questionnaire (10–15 questions) — reuses questionnaire engine with follow-up JSON schema
4. NO photo step
5. Doctor reviews → may adjust prescription (dose change, medication switch)

*(Source: APP-PATIENT.md Section 12.4)*

### 11.3 Follow-Up in Doctor Queue

Follow-up cases appear with distinct markers:
- **Badge:** "Follow-Up" badge (blue) instead of "New" badge
- **AI Assessment:** Includes delta analysis comparing initial vs. follow-up IIEF-5 scores
- **Photos tab:** Hidden (no photos in ED)
- **Questionnaire tab:** Shows "changes only" toggle by default + IIEF-5 score comparison

*(Source: PORTAL-DOCTOR.md Section 24.2)*

### 11.4 Follow-Up AI Delta Analysis

```
┌────────────────────────────────────────────────────┐
│  📊 PROGRESS ANALYSIS (vs. Initial Assessment)     │
│                                                    │
│  Overall trajectory: ✅ Improving                  │
│                                                    │
│  • IIEF-5 Score: 14 → 19 (+5 improvement)         │
│  • Severity: Mild-Moderate → Mild                  │
│  • Medication used: 6 times in past 4 weeks        │
│  • Successful intercourse: 5 of 6 attempts         │
│  • Side effects: Mild headache (2 occasions)       │
│  • Satisfaction: 3/5 → 4/5                         │
│                                                    │
│  RECOMMENDATION:                                    │
│  "Significant improvement in erectile function.    │
│  IIEF-5 improved by 5 points. Current Tadalafil   │
│  10mg on-demand appears effective. Consider        │
│  continuing current protocol. If patient desires   │
│  greater spontaneity, daily 5mg may be discussed." │
└────────────────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 24.3)*

### 11.5 Follow-Up IIEF-5 Score Tracking

Doctor sees IIEF-5 score trend over time:

```
┌──────────────────────────────────────────────────────┐
│  IIEF-5 Score History                                │
│                                                      │
│  Initial (15 Jan 2026):    14/25 (Mild-Moderate)     │
│  4-week (12 Feb 2026):     17/25 (Mild)        ↑ +3  │
│  3-month (15 Apr 2026):    19/25 (Mild)        ↑ +2  │
│                                                      │
│  Trend: ✅ Consistent improvement                    │
└──────────────────────────────────────────────────────┘
```

### 11.6 Follow-Up Questionnaire Comparison

Doctor sees both initial and follow-up responses:

```
┌──────────────────────────────────────────────────────┐
│  Q: When you had erections with sexual stimulation,  │
│  how often were they hard enough for penetration?    │
│                                                      │
│  Initial (15 Jan 2026):   "Sometimes (half the time)"│
│  Follow-up (12 Feb 2026): "Most times"               │
│                            ↑ Changed ✅              │
└──────────────────────────────────────────────────────┘
```

- Changed answers: green "Changed ✅" badge
- Unchanged answers: shown normally
- "Show changes only" toggle to filter to changed answers

*(Source: PORTAL-DOCTOR.md Section 7.3)*

---

## 12. Messaging

### 12.1 Patient ↔ Doctor Chat

Accessible from Messages tab in the patient app. ED-specific quick reply chips:

| Chip Label | Pre-filled Message |
|------------|-------------------|
| "Didn't work" | "Hi Doctor, I tried the medication but it didn't seem to work. Can we discuss?" |
| "Side effects" | "Hi Doctor, I'm experiencing side effects from my medication. Can we discuss?" |
| "Dose question" | "Hi Doctor, I have a question about my dosage or when to take my medication." |
| "Want to try daily" | "Hi Doctor, I'd like to discuss switching to daily medication instead of on-demand." |
| "Need a refill" | "Hi Doctor, I'm running low on medication and need a refill." |
| "Schedule check-in" | "Hi Doctor, I'd like to schedule my next check-in." |

Quick replies are condition-specific — ED shows different options than other verticals.

*(Source: APP-PATIENT.md Section 7)*

### 12.2 Doctor Canned Messages (ED-Specific)

Examples from doctor portal:

- "I've prescribed [medication] for you. Take it [timing] before sexual activity. Give it 4–6 attempts before judging effectiveness."
- "Based on your cardiovascular risk factors, I'd like to order blood work before prescribing."
- "Your symptoms suggest a psychological component. Medication will help, but counseling may provide additional benefit."
- "Since you're on nitrates, I cannot prescribe PDE5 inhibitors. Let's discuss alternative options."
- "I'm adjusting your dose to [new dose] as the current dose hasn't been sufficient."
- "The headache/flushing you're experiencing is a common side effect that usually improves after a few uses."
- "Try taking the medication on an empty stomach for faster onset."

Doctors can create up to 20 custom canned messages (max 30-char label, max 500-char body). Placeholders: `{patient_name}`, `{medication}`.

*(Source: PORTAL-DOCTOR.md Section 20)*

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

### 14.1 Patient Notifications (ED Journey)

| Event | Push (FCM) | WhatsApp/SMS | Email |
|-------|-----------|--------------|-------|
| Questionnaire submitted | ✅ "Assessment submitted" | — | — |
| AI assessment complete | — (internal) | — | — |
| Doctor assigned | ✅ "A specialist is reviewing your case" | ✅ | — |
| Prescription created | ✅ "Your treatment plan is ready" | ✅ | ✅ |
| Doctor requests more info | ✅ "Your doctor needs more information" | ✅ | — |
| Blood work ordered | ✅ "Blood tests ordered — book collection" | ✅ | — |
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

**ED-specific notification privacy:**
- Notification channel preferences are user-configurable
- **"Discreet mode" ON BY DEFAULT for ED** (unlike Hair Loss where it's optional) — push notification content shows "You have an update from Onlyou" without mentioning "ED" or "erectile dysfunction"
- WhatsApp/SMS messages use condition-neutral language: "Your treatment" instead of "Your ED treatment"

*(Source: PORTAL-ADMIN.md Section 25, APP-PATIENT.md, PROJECT-OVERVIEW.md Section 6)*

---

## 15. Landing Page — ED Condition Page

### 15.1 URL & SEO

- **URL:** `https://onlyou.life/erectile-dysfunction/`
- **Title tag:** `ED Treatment Online India — Prescription Medication Delivered Discreetly from ₹1,000/mo | Onlyou`
- **Meta description:** `Get private ED treatment from licensed urologists. Prescription Sildenafil, Tadalafil & more. No clinic visit needed. AI assessment + doctor consultation + discreet delivery. From ₹1,000/mo.`
- **H1:** `Private, effective ED treatment — no clinic visit needed`
- **Canonical:** `https://onlyou.life/erectile-dysfunction/`

*(Source: LANDING-PAGE.md Section 6)*

### 15.2 Target Keywords

- **Primary:** "ED treatment online India", "erectile dysfunction treatment home delivery"
- **Secondary:** "sildenafil online India", "tadalafil prescription online", "urologist online consultation ED", "erectile dysfunction treatment men"
- **Long-tail:** "ED doctor consultation from home India", "discreet ED medication delivery", "erectile dysfunction pills online India"

*(Source: LANDING-PAGE.md Section 6)*

### 15.3 Condition Page Structure (12 Sections)

1. **Condition Hero** — H1, condition description (2–3 sentences), "Start Your Private Assessment" CTA, condition accent color background, privacy emphasis
2. **What Is Erectile Dysfunction?** — 300–500 words, educational, empathetic tone, de-stigmatizing language, prevalence in India (estimated 50% of men over 40)
3. **Causes & Risk Factors** — Organic (vascular, neurological, hormonal, medication-induced), Psychogenic (anxiety, stress, depression), Mixed etiology explanation
4. **Symptoms** — "Do you experience any of these?" framing (difficulty getting erections, difficulty maintaining, reduced confidence, avoiding intimacy)
5. **How Onlyou Treats ED** — 3-step recap emphasizing: NO photos needed, NO video calls, fully text-based private consultation
6. **Treatments We Prescribe** — "On-demand medications (PDE5 inhibitors), Daily low-dose therapy, Lifestyle optimization" (NOT specific brand names/dosages — that's the doctor's decision)
7. **Why Onlyou?** — 4 differentiators: Maximum privacy (no photos, no video), Licensed urologists, AI-powered assessment, Discreet delivery
8. **Pricing** — ED pricing table (Monthly / Quarterly / 6-Month)
9. **What's Included** — AI assessment with IIEF-5 scoring, urologist consultation, prescription, medication delivery, ongoing check-ins, first blood panel when indicated
10. **FAQ** — 8–10 ED-specific questions
11. **CTA** — "Start Your Private Assessment" → app download link
12. **Related Conditions** — Cross-links to PE and other condition pages

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
  "name": "Erectile Dysfunction",
  "alternateName": "ED",
  "description": "Erectile dysfunction is the persistent inability to achieve or maintain an erection sufficient for satisfactory sexual performance.",
  "possibleTreatment": [
    {
      "@type": "MedicalTherapy",
      "name": "Sildenafil",
      "drugClass": "PDE5 inhibitor"
    },
    {
      "@type": "MedicalTherapy",
      "name": "Tadalafil",
      "drugClass": "PDE5 inhibitor"
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
    { "@type": "ListItem", "position": 2, "name": "Erectile Dysfunction", "item": "https://onlyou.life/erectile-dysfunction/" }
  ]
}
```

*(Source: LANDING-PAGE.md Section 18)*

---

## 16. Admin Operations (ED)

### 16.1 Subscription Plan Management

**Route:** `/settings/plans` in admin portal

ED plan editor:
- Monthly: ₹1,299
- Quarterly: ₹3,299
- 6-Month: ₹5,999

Price changes apply to new subscriptions only. Existing subscriptions keep current pricing. All changes logged in audit trail.

*(Source: PORTAL-ADMIN.md Section 24)*

### 16.2 Case Queue Filter

Admin/coordinator can filter the case queue by "ED" condition badge to view all ED cases.

Filter chips: All | Hair Loss | **ED** | PE | Weight | PCOS

*(Source: onlyou-spec-resolved-v4.md Section 4.2)*

### 16.3 ED-Specific Admin Alerts

- **Nitrate contraindication cases:** Admin dashboard shows a count of cases where nitrate contraindication was flagged — these require special attention to ensure doctors are not prescribing PDE5 inhibitors
- **Refund rate monitoring:** ED vertical may have higher refund rates if patients are nitrate users and cannot be treated with standard PDE5 inhibitors

---

## 17. Database Schema (ED-Relevant)

### 17.1 Key Enums

```
enum ConditionType {
  HAIR_LOSS
  ED
  PE
  WEIGHT_MANAGEMENT
  PCOS
}
```

### 17.2 Consultation Record Fields (ED)

| Field | Type | ED-Specific Notes |
|-------|------|-------------------|
| `conditionType` | `ConditionType` | `ED` |
| `questionnaireResponseId` | UUID | Links to 28-question ED questionnaire (see Section 4) |
| `aiAssessmentId` | UUID | Contains `iief5Score`, `iief5Severity`, `cardiovascularRisk`, `nitrateCheck`, `etiologyAssessment` in `conditionSpecific` JSON |
| `photos` | Photo[] | **EMPTY** — ED does not require photos |
| `prescriptionTemplateUsed` | String | One of: On-Demand Sildenafil 50mg, On-Demand Sildenafil 100mg, On-Demand Tadalafil 10mg, On-Demand Tadalafil 20mg, Daily Tadalafil 5mg, Conservative, Custom |

### 17.3 AI Assessment `conditionSpecific` JSON Schema (ED)

```json
{
  "iief5Score": 14,
  "iief5Severity": "Mild-to-Moderate ED",
  "cardiovascularRisk": "Medium",
  "nitrateCheck": "Clear",
  "etiologyAssessment": {
    "classification": "Mixed",
    "organicConfidence": 60,
    "psychogenicConfidence": 40,
    "factors": {
      "organic": ["controlled hypertension", "occasional smoking", "reduced morning erections"],
      "psychogenic": ["high work stress", "performance anxiety", "situational variation"]
    }
  }
}
```

*(Source: BACKEND-PART1.md Section 8.3)*

---

## 18. Testing Checklist

### 18.1 End-to-End Flow (from Phase 7 Checkpoint)

> **✅ Phase 7 Checkpoint:** Full ED patient journey end-to-end: sign up → questionnaire (with IIEF-5 scoring) → AI assessment (no photos) → payment → doctor prescribes → pharmacy prepares → delivery confirmed → patient sees everything in Activity tab with steppers. Nitrate contraindication flow tested. Push/WhatsApp notifications fire at each step.

*(Source: onlyou-spec-resolved-v4.md — Phase 7)*

### 18.2 Critical Test Cases

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| C1 | Create consultation | Patient app → select ED → complete questionnaire | Consultation created, IIEF-5 score calculated, status: SUBMITTED |
| C2 | No photo upload | After questionnaire → should proceed directly to plan selection | Photo upload step skipped entirely |
| C3 | IIEF-5 scoring | Complete IIEF-5 questions with known answers | Score calculated correctly, severity classified (e.g., 14 = Mild-Moderate) |
| C4 | AI assessment | After submission → wait for AI processing | Assessment generated (IIEF-5, CV risk, nitrate check, etiology), status: AI_COMPLETE |
| C5 | Nitrate contraindication | Q6 = "Yes — nitrate medication" | RED BANNER displayed, CRITICAL attention level, PDE5 inhibitors blocked in contraindications matrix |
| C6 | Doctor receives case | Doctor portal → check caseload | New ED case appears in "New" tab with AI assessment, Photos tab hidden |
| C7 | Prescription created | Doctor portal → open case → select ED template → sign | Prescription PDF generated, status: PRESCRIPTION_CREATED |
| C8 | Lab order created | Doctor portal → order blood work → select Basic Health Check | Lab order created, patient notified |
| C9 | PE comorbidity flag | Q20 = "Yes — frequently" | AI assessment includes PE comorbidity flag |
| C10 | Discreet notifications | Check push notification content | Condition name NOT shown in push notification body (discreet mode default) |

*(Source: BACKEND-PART3B.md — Testing section)*

### 18.3 ED-Specific Edge Cases

| Test | Scenario | Expected Behavior |
|------|----------|-------------------|
| Nitrate user refund | Patient reports nitrate use, doctor cannot prescribe PDE5i | Doctor initiates refund flow, patient receives full refund, referral offered |
| Under-18 blocked | User enters age 17 | Blocked with message: "Our service is available for adults 18 and over." |
| IIEF-5 = 22–25 | Patient scores "No ED" on IIEF-5 | AI assessment notes: "IIEF-5 score within normal range. Patient may benefit from reassurance. Consider lifestyle counseling." Doctor can still prescribe if clinical judgment warrants. |
| Alpha-blocker interaction | Patient reports alpha-blocker use | AI flags caution: "Start PDE5 inhibitor at lower dose, separate dosing by 4+ hours" |
| PE comorbidity treatment | Doctor adds Dapoxetine to ED prescription | Custom template allows adding PE medication under ED subscription |
| Severe ED + CV risk | IIEF-5 ≤7 + multiple cardiovascular risk factors | AI sets attention: HIGH, recommends blood work before prescribing |

---

## 19. Differentiation vs. Competitors

| Feature | Onlyou (ED) | Man Matters | Practo | Apollo 24/7 |
|---------|-------------|-------------|--------|-------------|
| Prescription PDE5 inhibitors | ✅ Sildenafil, Tadalafil (multiple doses) | ❌ Supplements only (Shilajit, etc.) | ✅ One-off prescription | ✅ One-off prescription |
| AI pre-assessment | ✅ Claude-powered IIEF-5 + CV risk + etiology | ❌ | ❌ | ❌ |
| IIEF-5 validated scoring | ✅ Automated scoring with severity classification | ❌ | ❌ | ❌ |
| Nitrate contraindication screening | ✅ Automated with RED BANNER alert | ❌ | ❌ | ❌ |
| No photos required | ✅ Privacy-first, questionnaire only | ✅ | ✅ | ✅ |
| Subscription model | ✅ Ongoing care included | ✅ Product subscription | ❌ | ❌ |
| Integrated lab work | ✅ Basic Health Check (testosterone, glucose, lipids) | ❌ | ❌ | ❌ |
| Follow-up cadence | ✅ 4w / 3m / 6m structured with IIEF-5 tracking | ❌ | ❌ | ❌ |
| PE comorbidity treatment | ✅ Combined ED+PE under single subscription | ❌ | ❌ | ❌ |
| Discreet delivery | ✅ MAXIMUM DISCRETION — plain packaging, OTP | ❌ Branded packaging | N/A | ❌ Branded |
| Specialist type | Urologist / Andrologist | Generic "wellness expert" | Random doctor | Random doctor |

*(Source: PROJECT-OVERVIEW.md Section 3)*

---

## 20. Cross-Reference Index

This section maps every ED-specific detail to its authoritative source document.

| Topic | Primary Source | Section |
|-------|---------------|---------|
| Pricing (authoritative) | onlyou-spec-resolved-v4.md | Section 5 |
| Target audience & doctor type | PROJECT-OVERVIEW.md | Section 4 |
| Subscription inclusions | PROJECT-OVERVIEW.md | Section 5 |
| Patient journey (high-level) | PROJECT-OVERVIEW.md | Section 6 |
| Condition selection screen | APP-PATIENT.md | Section 5 |
| Questionnaire engine | APP-PATIENT.md | Section 9 |
| IIEF-5 scoring specification | BACKEND-PART1.md | Section 6.3 |
| Plan selection & payment | APP-PATIENT.md | Section 11 |
| Follow-up cadence (patient) | APP-PATIENT.md | Section 12.4 |
| Lab booking & tracking | APP-PATIENT.md | Section 13 |
| Activity tab (steppers) | APP-PATIENT.md | Section 6 |
| Messaging (patient side) | APP-PATIENT.md | Section 7 |
| AI assessment layout | PORTAL-DOCTOR.md | Section 6 |
| AI extensions (ED) | PORTAL-DOCTOR.md | Section 6.2 |
| Nitrate contraindication banner | PORTAL-DOCTOR.md | Section 6.2 |
| Questionnaire tab (doctor) | PORTAL-DOCTOR.md | Section 7 |
| Prescription builder | PORTAL-DOCTOR.md | Section 12 |
| Prescription templates (ED) | PORTAL-DOCTOR.md | Section 12.3 |
| Follow-up handling (doctor) | PORTAL-DOCTOR.md | Section 24 |
| SLA thresholds | PORTAL-DOCTOR.md | Section 23.3 |
| Canned messages | PORTAL-DOCTOR.md | Section 20 |
| Lab test panels (ED) | PORTAL-DOCTOR.md | Section 13.2 |
| Lab panel pricing | PORTAL-LAB-FIXED.md | Section 24 |
| Nurse visit flow | PORTAL-NURSE-FIXED.md | Main flow |
| Admin plan management | PORTAL-ADMIN.md | Section 24 |
| Landing page (condition page) | LANDING-PAGE.md | Section 6 |
| SEO & structured data | LANDING-PAGE.md | Sections 6, 10, 18 |
| Questionnaire JSON schema | BACKEND-PART1.md | Section 6.1 |
| AI prompt construction | BACKEND-PART1.md | Section 8.2 |
| AI output extensions | BACKEND-PART1.md | Section 8.3 |
| Database schema | BACKEND-PART2A.md | Prisma models |
| Comorbidity handling (ED+PE) | onlyou-spec-resolved-v4.md | Section 6.11 |
| Build phase & checkpoint | onlyou-spec-resolved-v4.md | Phase 7 (Weeks 19–22) |
| Testing checklist | BACKEND-PART3B.md | Test cases |
| Competitor differentiation | PROJECT-OVERVIEW.md | Section 3 |
| Privacy & packaging | PROJECT-OVERVIEW.md | Section 7 |

---

*End of VERTICAL-ED.md*
