<!-- VERTICAL-PCOS-PART1: Sections 1–6 (Overview through AI Pre-Assessment) -->

# VERTICAL-PCOS.md — Onlyou PCOS Vertical Specification

> **Document type:** Vertical-specific master reference
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** PROJECT-OVERVIEW.md, APP-PATIENT.md, PORTAL-DOCTOR.md, PORTAL-NURSE-FIXED.md, PORTAL-ADMIN.md, PORTAL-LAB-FIXED.md, PORTAL-PHARMACY.md, LANDING-PAGE.md, BACKEND-PART1.md, BACKEND-PART2A.md, BACKEND-PART2B.md, BACKEND-PART3A.md, BACKEND-PART3B.md, ARCHITECTURE.md, onlyou-spec-resolved-v4.md

---

## 1. Condition Overview

**Condition:** Polycystic Ovary Syndrome (PCOS)
**Internal enum value:** `PCOS`
**Build priority:** #5 of 5 verticals (Hair Loss → ED → PE → Weight → PCOS)
**Development phase:** Phase 9 (Weeks 24–26) — final vertical, reuses core infrastructure from all prior verticals
**Condition accent color:** Applied per landing page condition card styling

**Target audience:** Women aged 18–40
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Doctor type:** Gynecologist / Endocrinologist
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Consultation type:** Async (questionnaire + optional photos — no video in MVP)
*(Source: PROJECT-OVERVIEW.md Section 12, Decision #1)*

**Photos required:** Optional (not mandatory for PCOS — purely questionnaire-based with blood work emphasis)
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Blood work:** Almost always (hormonal panel is critical for PCOS diagnosis and treatment monitoring)
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Time to visible results:** 3–6 months (hormonal regulation, cycle regularity improvement); some symptoms like acne/hirsutism take 6–12 months

**Regulatory classification:** Combined OCPs (Ethinyl estradiol + Drospirenone), Metformin, and Spironolactone are Schedule H in India — require prescription, can be prescribed via telemedicine under Telemedicine Practice Guidelines 2020. Clomiphene citrate (for ovulation induction) is also Schedule H.

**Unique feature:** Built-in period tracker in the patient app — records menstrual cycle data for doctor review, Rotterdam criteria monitoring, and treatment adjustment.
*(Source: APP-PATIENT.md Section 18)*

**Fertility branching:** The questionnaire includes a fertility intent question. Treatment templates are split into two tracks: "not trying to conceive" (hormonal regulation focus) and "trying to conceive" (ovulation induction, fertility-safe medications). This is a CRITICAL branching decision that affects prescription templates, medication choices, and counseling notes.
*(Source: onlyou-spec-resolved-v4.md Section 9, PORTAL-DOCTOR.md Section 12.3)*

---

## 2. Pricing

### 2.1 Subscription Plans

| Plan | Total Price | Per Month | Savings |
|------|------------|-----------|---------|
| Monthly | ₹1,499/month | ₹1,499 | — |
| Quarterly | ₹3,799/quarter | ₹1,266 | 16% |
| 6-Month | ₹6,999/6 months | ₹1,167 | 22% |

*(Source: onlyou-spec-resolved-v4.md Section 5 — authoritative pricing source)*

**"Starting from" price (marketing):** ₹1,167/mo (6-month plan per-month rate)
*(Source: LANDING-PAGE.md Section 9)*

### 2.2 What's Included in Every Subscription

1. AI-powered pre-assessment — Rotterdam criteria auto-check + hormonal risk analysis by Claude
2. Async doctor consultation — gynecologist/endocrinologist reviews case, asks follow-ups if needed
3. E-prescription — generated from PCOS-specific templates (fertility-aware), PDF stored in S3
4. Medication — discreet local delivery with OTP confirmation
5. Ongoing check-ins — 4-week, 3-month, 6-month cadence
6. First blood panel — PCOS Screen Panel (₹1,500 value) included when clinically indicated (almost always)
7. Built-in period tracker — cycle logging, symptom tracking, insights shared with doctor

*(Source: PROJECT-OVERVIEW.md Section 5, APP-PATIENT.md Section 18)*

### 2.3 Blood Work Pricing

| Panel | Price | When Used |
|-------|-------|-----------|
| PCOS Screen Panel (first) | **INCLUDED** in subscription | Almost always ordered — hormonal assessment critical for PCOS |
| Follow-up panels | ₹600–₹1,200 | Subset of initial panel, doctor selects tests |
| Patient self-upload | **Free** | Patient provides own recent results |

*(Source: onlyou-spec-resolved-v4.md Section 5, PORTAL-LAB-FIXED.md Section 24, PORTAL-DOCTOR.md Section 13.2)*

> **⚠️ Pre-existing Source Discrepancy — Blood Work Billing:** APP-PATIENT.md Section 13.1 states lab tests are "billed separately from the subscription." However, PROJECT-OVERVIEW.md Section 5, onlyou-spec-resolved-v4.md Section 5, and PORTAL-LAB-FIXED.md Section 24 all state "First panel: INCLUDED in subscription." This document follows the majority authoritative sources (first panel included). This discrepancy in APP-PATIENT.md should be resolved during implementation.

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
Selects "PCOS" from condition selector
        │
        ▼
Completes questionnaire (~32 questions, ~10–14 min)
  ├── Demographics & menstrual history
  ├── Symptoms (acne, hirsutism, weight gain, hair thinning)
  ├── Medical history & medications
  ├── Fertility intent (CRITICAL branching)
  ├── Lifestyle & stress
  └── Rotterdam criteria inputs (irregular periods, hyperandrogenism signs, ultrasound history)
        │
        ▼
Optional photo upload (acne/hirsutism documentation — if patient chooses)
        │
        ▼
AI pre-assessment (Claude analyzes → Rotterdam criteria check, phenotype classification, fertility-aware flags)
        │
        ▼
Selects plan & pays (Monthly/Quarterly/6-Month via Razorpay)
        │
        ▼
Doctor reviews case (gynecologist/endocrinologist sees AI summary + raw data → 5–10 min per case)
        │
        ├─── PRESCRIBES ──────────────────────────────────┐
        │    (fertility-aware template selection)          ▼
        │                                       Prescription → Pharmacy
        ├─── ORDERS BLOOD WORK ──┐              Pharmacy prepares → Ready
        │    (almost always)      ▼              Coordinator arranges delivery
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
        ├─── REFERS ──→ Fertility specialist / Endocrinologist (in-person)
        │
        └─── REFUNDS ──→ Full/partial refund if cannot treat
        │
        ▼
ONGOING CARE
  ├── Check-ins at 4 weeks / 3 months / 6 months
  ├── Period tracker data reviewed at each check-in
  └── Treatment adjusted based on cycle regularity + lab trends
```

*(Source: PROJECT-OVERVIEW.md Section 6, onlyou-spec-resolved-v4.md Section 9)*

### 3.2 Condition Selection Screen

**Screen:** `(tabs)/home/condition/[condition].tsx`

When patient selects PCOS:

1. **No gender selection needed** — PCOS is women-only
2. Hero section with condition illustration + tagline
3. Period tracker promotion: "Track your cycle for better care"
4. "How It Works" 3-step summary
5. "What You Get" checklist (doctor consultation, prescription, medication delivery, ongoing monitoring, period tracker, blood work, WhatsApp support)
6. Pricing cards (Monthly / Quarterly / 6-Month)
7. FAQ accordion (3–5 PCOS-specific questions)
8. Sticky CTA at bottom: `[Start Your Assessment — Free]`

**CTA behavior:**
- Not logged in → auth flow → return here
- Logged in + phone verified → navigate to `questionnaire/pcos`
- Phone not verified → phone verification first

*(Source: APP-PATIENT.md Section 5)*

---

## 4. Questionnaire (32 Questions, ~10–14 minutes)

### 4.1 Overview

| Attribute | Value |
|-----------|-------|
| Total questions | 32 (schema) — most patients answer 26–30 after skip logic |
| Estimated completion | 10–14 minutes |
| Scoring tool | Rotterdam criteria auto-check (need 2 of 3: oligo/anovulation, hyperandrogenism, polycystic ovaries) |
| Special logic | Fertility intent branching (not-trying vs. trying-to-conceive), pregnancy/breastfeeding hard exclusion, menstrual calendar input |
| Age gate | 18+ (under-18 blocked: "Our service is available for adults 18 and over.") |
| JSON schema file | `questionnaire/data/pcos.json` |

*(Source: APP-PATIENT.md Section 9.4, BACKEND-PART1.md Section 6.1)*

### Skip Logic Rules
- Q5 = "Yes" (currently pregnant) → HARD BLOCK: "PCOS treatment medications are not safe during pregnancy. Please consult your OB-GYN for prenatal care."
- Q6 = "Yes" (currently breastfeeding) → HARD BLOCK: "Some PCOS medications are not safe while breastfeeding. Please consult your doctor."
- Q3 = "Regular" → skip Q4 (cycles per year) — implied regular = 11–13 cycles
- Q3 = "On hormonal birth control" → skip Q4 (cannot assess natural pattern)
- Q11 = "No" (no previous PCOS diagnosis) → skip Q12 (previous treatments tried)
- Q13 = "None" (no current medications) → skip Q14 (medication list)
- Q19 = "Not trying to conceive" → skip Q20 (how long trying)
- Q22 = "No" (never had ultrasound) → skip Q23 (ultrasound findings)
- Q24 = "No family history" or "Not sure" → skip Q25 (family onset age)

Most patients answer **26–30 questions** after skip logic.

---

### SECTION 1: BASICS & MENSTRUAL HISTORY (6 questions)

**Q1: What is your age?**
- Type: Number input (18–40)
- Validation: <18 = blocked ("Our service is available for adults 18 and over."); >40 = warning: "PCOS management may differ for women over 40. Our specialists will assess your case." (not blocked)
- Required: Yes
- AI use: Age context for treatment planning. Younger patients (<25) may benefit from lifestyle-first approach. Older patients nearing perimenopause may have changing hormonal profiles. Fertility urgency increases with age.

**Q2: What is your weight and height?**
- Type: Dual number input — Weight (kg, 30–200 kg) + Height (cm, 120–200 cm)
- Required: Yes
- AI use: BMI auto-calculated and displayed to patient: "Your BMI: XX.X". BMI is critical for PCOS — affects treatment approach (lean PCOS vs. obese PCOS), insulin resistance risk, and medication selection. Uses WHO Asian cutoffs (23.0 overweight, 25.0 obese).

**Q3: How would you describe your menstrual periods?**
- Type: Single select
  - Regular (coming every 21–35 days)
  - Irregular (varying cycle length, sometimes skipping months)
  - Very irregular (fewer than 8 periods per year)
  - Absent (no period for 3+ months without pregnancy)
  - On hormonal birth control (periods controlled by medication)
- Required: Yes
- AI use: CRITICAL for Rotterdam criteria. Irregular/very irregular/absent = oligo/anovulation criterion MET. "On birth control" = cannot assess natural cycle pattern → note for doctor, may need 3-month washout to evaluate. Regular = oligo criterion NOT met (need 2 of 3 other criteria).

**Q4: [IF Q3 ≠ "Regular" and ≠ "On hormonal birth control"] How many periods have you had in the past 12 months?**
- Type: Number input (0–15)
- Skip: Only shown if Q3 = "Irregular", "Very irregular", or "Absent"
- AI use: Quantifies oligo/anovulation. <8 cycles/year = strong oligo/anovulation indicator. 0 = amenorrhea, may need hormonal evaluation for other causes (hypothalamic amenorrhea, premature ovarian failure).

**Q5: Are you currently pregnant?**
- Type: Single select — Yes / No / Not sure
- Required: Yes
- AI use: "Yes" = HARD BLOCK. "Not sure" = flag for doctor, recommend pregnancy test before starting medication. Pregnancy is an absolute contraindication for Spironolactone, combined OCPs, Metformin (relative), and most PCOS treatments.

**Q6: Are you currently breastfeeding?**
- Type: Single select — Yes / No
- Required: Yes
- AI use: "Yes" = HARD BLOCK. Many PCOS medications pass into breast milk. Doctor must evaluate on case-by-case basis — but for async telemedicine, the safer default is to block and recommend in-person consultation with OB-GYN.

*(Source: BACKEND-PART1.md Section 6.1, Section 6.3 — Rotterdam criteria logic)*

### SECTION 2: SYMPTOMS (6 questions)

**Q7: Which of these symptoms do you experience? (Select all that apply)**
- Type: Multi-select
  - Irregular or missed periods
  - Excess facial or body hair (hirsutism)
  - Severe acne (face, chest, or back)
  - Hair thinning or hair loss on the scalp
  - Unexplained weight gain (especially around the abdomen)
  - Difficulty losing weight
  - Darkened skin patches (neck, armpits, groin) — acanthosis nigricans
  - Mood swings, anxiety, or depression
  - Fatigue or low energy
  - None of these
- AI use: Symptom mapping to Rotterdam criteria and phenotype classification. Hirsutism + severe acne = clinical hyperandrogenism indicator. Acanthosis nigricans = insulin resistance marker. Hair thinning = androgenic alopecia component. Weight gain + difficulty losing = metabolic PCOS subtype. Mood/anxiety = consider mental health support referral.

**Q8: How severe is your acne?**
- Type: Single select
  - No acne
  - Mild — occasional breakouts
  - Moderate — regular breakouts, some scarring
  - Severe — persistent deep/cystic acne, significant scarring
- AI use: Severe acne = clinical hyperandrogenism criterion for Rotterdam. Contributes to phenotype classification. Severe cystic acne may warrant dermatology referral in addition to PCOS treatment. Isotretinoin is CONTRAINDICATED if trying to conceive.

**Q9: Do you experience excess hair growth in any of these areas? (Select all that apply)**
- Type: Multi-select
  - Upper lip
  - Chin/jawline
  - Chest
  - Upper back
  - Lower abdomen (below navel)
  - Inner thighs
  - No excess hair growth
- AI use: Any selection other than "No excess hair growth" = hirsutism indicator for clinical hyperandrogenism (Rotterdam criterion). Multiple areas affected = higher severity. Modified Ferriman-Gallwey score can be estimated from responses — score ≥8 is clinically significant for hyperandrogenism.

**Q10: Have you noticed hair thinning or hair loss on your scalp?**
- Type: Single select
  - No
  - Yes — mild thinning
  - Yes — moderate thinning, widening part
  - Yes — significant thinning or bald patches
- AI use: Androgenic alopecia is a clinical sign of hyperandrogenism in PCOS. If significant, consider cross-vertical flag for Hair Loss vertical (combined subscription potential). Ludwig scale classification may be relevant.

**Q11: Have you ever been formally diagnosed with PCOS by a doctor?**
- Type: Single select — Yes / No
- Required: Yes
- AI use: Prior diagnosis = patient already has some clinical confirmation. "No" = this may be first assessment — AI should be thorough in Rotterdam criteria evaluation. Prior diagnosis context helps the doctor understand the patient's history.

**Q12: [IF Q11 = "Yes"] What treatments have you tried before for PCOS? (Select all)**
- Type: Multi-select
  - Birth control pills (OCPs)
  - Metformin
  - Spironolactone
  - Clomiphene / Letrozole (for fertility)
  - Inositol / Myo-inositol supplements
  - Lifestyle changes (diet + exercise)
  - Ayurvedic / herbal treatments
  - None — diagnosed but never treated
- Skip: Only shown if Q11 = "Yes"
- AI use: Treatment history is CRITICAL for protocol selection. Failed OCP = consider alternative approach. Failed Metformin = dosing issue or consider add-on therapy. Prior fertility treatment = patient likely has reproductive concerns. Inositol = patient may be open to supplement-based approach.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Symptoms section grouping)*

### SECTION 3: MEDICAL HISTORY (5 questions)

**Q13: Are you currently taking any medications? (Select all)**
- Type: Multi-select
  - Birth control pills / hormonal contraceptives
  - Metformin
  - Thyroid medication
  - Antidepressants (SSRIs, SNRIs)
  - Blood pressure medication
  - Insulin
  - Diabetes medication (other than Metformin)
  - Supplements (Inositol, Vitamin D, etc.)
  - None
  - Other: [free text]
- AI use: Drug interaction screening. Current OCP use = cannot assess natural cycle patterns. Metformin = already on first-line PCOS treatment, assess efficacy. Thyroid medication = thyroid disorder as comorbidity (common with PCOS). Antidepressants = mental health context. Insulin = severe insulin resistance or Type 2 diabetes.

**Q14: [IF Q13 ≠ "None"] Please list all current medications and dosages:**
- Type: Free text
- Skip: Only shown if Q13 ≠ "None"
- AI use: Detailed medication review for interaction checking and treatment planning. Specific dosages help doctor assess whether current treatments are optimized.

**Q15: Do you have any of these medical conditions? (Select all that apply)**
- Type: Multi-select
  - Type 2 diabetes or pre-diabetes
  - Thyroid disorder (hyper or hypo)
  - High blood pressure
  - High cholesterol
  - Fatty liver disease (NAFLD)
  - Depression or anxiety (diagnosed)
  - Eating disorder (current or past)
  - Endometriosis
  - None of these
- AI use: Comorbidity assessment. Diabetes/pre-diabetes = Metformin priority, insulin resistance management critical. Thyroid disorder = common PCOS overlap, blood work should include thyroid panel. NAFLD = metabolic syndrome indicator. Endometriosis = affects fertility management approach. Eating disorder = flag for doctor, avoid weight-focused prescribing.

**Q16: Any known drug allergies?**
- Type: Free text / "None"
- Required: Yes
- AI use: Contraindication screening. Allergy to Metformin, Spironolactone, or specific OCPs = blocked from those treatments. Flag for doctor review.

**Q17: What is your blood pressure? (if known)**
- Type: Dual number input (systolic/diastolic) OR "Don't know"
- Required: No
- AI use: Hypertension = may contraindicate combined OCPs (estrogen increases cardiovascular risk in hypertensive patients). Blood pressure >140/90 = flag for doctor, recommend progestin-only approach or non-hormonal alternatives. Nurse will record vitals during blood collection visit.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Medical History section grouping)*

### SECTION 4: FERTILITY & REPRODUCTIVE GOALS (4 questions)

> **This section contains the CRITICAL fertility branching question that determines the entire treatment template path.**

**Q18: What are your main concerns with PCOS right now? (Select all)**
- Type: Multi-select
  - Irregular or missed periods
  - Difficulty getting pregnant
  - Acne
  - Excess hair growth (hirsutism)
  - Weight gain / difficulty losing weight
  - Hair thinning on scalp
  - Mood / emotional wellbeing
  - Long-term health risks (diabetes, heart disease)
  - General management / understanding my condition
- AI use: Prioritizes treatment approach. "Difficulty getting pregnant" = fertility-track templates. Multiple concerns = comprehensive template. "Long-term health risks" = patient education priority, metabolic monitoring emphasis.

**Q19: Are you currently trying to conceive?**
- Type: Single select
  - Yes — actively trying to get pregnant
  - Maybe — considering it in the next 12 months
  - No — not trying to conceive
- Required: Yes
- AI use: **CRITICAL BRANCHING DECISION.**
  - "Yes" or "Maybe" → FERTILITY TRACK: Avoid Spironolactone (teratogenic), avoid combined OCPs, avoid isotretinoin. Use Metformin + Lifestyle + Inositol + Folic acid. Consider Clomiphene/Letrozole for ovulation induction. Prominent fertility intent banner displayed to doctor.
  - "No" → STANDARD TRACK: Full medication range available (OCPs, Spironolactone, Metformin, etc.)

**Q20: [IF Q19 = "Yes"] How long have you been trying to conceive?**
- Type: Single select
  - Less than 6 months
  - 6–12 months
  - 1–2 years
  - More than 2 years
- Skip: Only shown if Q19 = "Yes"
- AI use: >12 months of trying = meets clinical definition of infertility. AI recommends fertility specialist referral. >2 years = stronger referral recommendation. <6 months = lifestyle optimization first may be appropriate.

**Q21: Have you ever been pregnant before?**
- Type: Single select
  - Yes — successful pregnancy
  - Yes — but had miscarriage(s)
  - No — never been pregnant
  - Prefer not to answer
- Required: Yes
- AI use: Pregnancy history informs fertility prognosis. Miscarriage history = may indicate progesterone deficiency or other hormonal factors. "Prefer not to answer" = treated as unknown, doctor should explore sensitively.

*(Source: onlyou-spec-resolved-v4.md Section 9, PORTAL-DOCTOR.md Section 6.2 — fertility intent banner)*

### SECTION 5: DIAGNOSTIC HISTORY (4 questions)

**Q22: Have you ever had a pelvic/transvaginal ultrasound?**
- Type: Single select — Yes / No
- Required: Yes
- AI use: Ultrasound findings are one of the 3 Rotterdam criteria. If "Yes" → ask about findings. If "No" → Rotterdam assessment limited to 2 criteria (oligo + hyperandrogenism), doctor may recommend ultrasound referral.

**Q23: [IF Q22 = "Yes"] What did the ultrasound show? (Select all that apply)**
- Type: Multi-select
  - Polycystic ovaries (multiple small follicles / "string of pearls")
  - Ovarian cysts
  - Normal / no abnormalities
  - Don't remember / not sure
- Skip: Only shown if Q22 = "Yes"
- AI use: "Polycystic ovaries" = Rotterdam polycystic ovary criterion MET. "Ovarian cysts" (non-polycystic) = different clinical picture, may need further imaging. "Normal" = polycystic criterion NOT met. "Don't remember" = treated as unknown, doctor may request imaging records.

**Q24: Does anyone in your family have PCOS, diabetes, or hormonal issues? (Select all)**
- Type: Multi-select
  - Mother with PCOS or irregular periods
  - Sister(s) with PCOS
  - Type 2 diabetes in immediate family (parents, siblings)
  - Thyroid disease in family
  - No family history
  - Not sure
- AI use: Family history of PCOS = genetic predisposition, validates clinical suspicion. Diabetes family history = higher insulin resistance risk, Metformin priority. Thyroid family history = thyroid panel priority in blood work.

**Q25: [IF family history selected] At approximately what age did symptoms start in your family members?**
- Type: Single select
  - Puberty / teenage years
  - 20s
  - 30s
  - Not sure
- Skip: Only shown if Q24 ≠ "No family history" and ≠ "Not sure"
- AI use: Early family onset = stronger genetic component, earlier intervention beneficial.

*(Source: BACKEND-PART1.md Section 6.3 — Rotterdam criteria checking)*

### SECTION 6: LIFESTYLE (5 questions)

**Q26: How would you describe your diet?**
- Type: Single select
  - Balanced — variety of foods, regular meals
  - Vegetarian / Vegan
  - High carb / lots of processed food
  - Restricted — currently dieting or limiting food groups
  - Irregular — skip meals often
  - Specific diet (keto, intermittent fasting, etc.)
- AI use: Diet is critical for PCOS management. High carb/processed = insulin resistance exacerbation. Vegetarian/vegan = B12, iron supplementation considerations. Restricted/irregular = assess for eating disorder risk. Lifestyle counseling notes customized based on diet type.

**Q27: How often do you exercise?**
- Type: Single select
  - Rarely / never
  - 1–2 times per week
  - 3–4 times per week
  - 5+ times per week / daily
- AI use: Exercise is a cornerstone of PCOS management regardless of BMI. Rarely/never = lifestyle modification emphasis in treatment plan. Regular exercise may reduce insulin resistance independent of weight loss.

**Q28: How would you rate your stress level over the past 6 months?**
- Type: Single select
  - Low — generally relaxed
  - Moderate — some stress but manageable
  - High — frequently stressed
  - Very high — constant significant stress
- AI use: High stress = cortisol elevation worsens PCOS symptoms, may contribute to cycle irregularity. Counseling note: stress management as adjunct to treatment. Consider mental health support referral if very high.

**Q29: How many hours of sleep do you typically get?**
- Type: Single select
  - Less than 5 hours
  - 5–6 hours
  - 6–7 hours
  - 7–8 hours
  - More than 8 hours
- AI use: Chronic sleep deprivation = hormonal disruption, worsens insulin resistance. Context for overall health assessment and lifestyle counseling.

**Q30: Do you smoke?**
- Type: Single select
  - No, never
  - Previously, but quit
  - Yes, occasionally
  - Yes, daily
- AI use: Smoking = increases cardiovascular risk (relevant for OCP prescribing). Smoking + combined OCP = increased thrombotic risk, especially if age >35. May affect Metformin efficacy. Counseling note: smoking cessation as part of treatment plan.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Lifestyle section grouping)*

### SECTION 7: TREATMENT GOALS (2 questions)

**Q31: What are your expectations from treatment? (Select all)**
- Type: Multi-select
  - Regular periods
  - Clear skin (reduce acne)
  - Reduce excess hair growth
  - Lose weight / easier weight management
  - Get pregnant / improve fertility
  - Improve overall hormonal health
  - Reduce long-term health risks
  - Not sure — want doctor's guidance
- AI use: Manages expectations. Maps to treatment priorities. "Get pregnant" = additional confirmation for fertility track. Multiple expectations = comprehensive template likely needed. Informs counseling notes and follow-up goal tracking.

**Q32: Is there anything else you'd like your doctor to know?**
- Type: Free text (optional, max 500 characters)
- AI use: Open-ended catch-all. May surface concerns not covered by structured questions. Doctor sees this in the questionnaire tab — useful for context that doesn't fit predefined categories.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Treatment Goals section grouping)*

---

### 4.2 Scoring

PCOS uses the **Rotterdam criteria** as its scoring mechanism (need 2 of 3 for PCOS likely):

```typescript
// Rotterdam Criteria for PCOS (need 2 of 3)
export function checkRotterdamCriteria(answers: Record<string, any>): {
  criteriaMetCount: number;
  oligo: boolean;         // Oligo/anovulation
  hyperandrogenism: boolean; // Clinical or biochemical hyperandrogenism
  polycystic: boolean;    // Polycystic ovaries on ultrasound
  isPCOSLikely: boolean;
} {
  const oligo = answers.irregular_periods === true || answers.cycles_per_year < 8;
  const hyperandrogenism = answers.acne_severe === true || answers.hirsutism === true || answers.elevated_androgens === true;
  const polycystic = answers.ultrasound_polycystic === true;
  const criteriaMetCount = [oligo, hyperandrogenism, polycystic].filter(Boolean).length;
  return { criteriaMetCount, oligo, hyperandrogenism, polycystic, isPCOSLikely: criteriaMetCount >= 2 };
}
```

**Questionnaire-to-criteria mapping:**
- **Oligo/anovulation:** Q3 = "Irregular", "Very irregular", or "Absent" → oligo = true. Also Q4 < 8 cycles/year → oligo = true.
- **Clinical hyperandrogenism:** Q8 = "Severe" → acne_severe = true. Q9 ≠ "No excess hair growth" (any area selected) → hirsutism = true. Either triggers hyperandrogenism = true. Biochemical hyperandrogenism (elevated_androgens) comes from lab results, not questionnaire.
- **Polycystic ovaries:** Q23 includes "Polycystic ovaries" → polycystic = true.

The `scoring.type` in the JSON schema is set to `"rotterdam"`.

*(Source: BACKEND-PART1.md Section 6.1, Section 6.3)*

### 4.3 Skip Logic Summary

| Condition | Question(s) Affected | Behavior |
|-----------|---------------------|----------|
| Q3 = "Regular" | Q4 | Skip (regular = implied 11–13 cycles) |
| Q3 = "On hormonal birth control" | Q4 | Skip (cannot assess natural pattern) |
| Q5 = "Yes" (pregnant) | All remaining | HARD BLOCK — cannot proceed |
| Q6 = "Yes" (breastfeeding) | All remaining | HARD BLOCK — cannot proceed |
| Q11 = "No" (no prior diagnosis) | Q12 | Skip |
| Q13 = "None" | Q14 | Skip |
| Q19 = "Not trying to conceive" | Q20 | Skip |
| Q22 = "No" (no ultrasound) | Q23 | Skip |
| Q24 = "No family history" / "Not sure" | Q25 | Skip |

Most patients answer **26–30 questions** after skip logic.

*(Source: APP-PATIENT.md Section 9.3, BACKEND-PART1.md Section 6.2)*

### 4.4 Questionnaire UX

- **One question per screen** — firm design decision, no multi-question forms
- `[Next →]` button (sticky bottom) — disabled until valid answer
- `[← Back]` button (top left)
- Progress bar: "Question 5 of 32" — adjusts dynamically when skip logic reduces total
- Save & resume: progress saved to local storage (Zustand persisted) after each answer, synced to backend every 3 questions
- Saved progress expires after 7 days
- Multi-device: loads last backend-synced state on new device with "Syncing your progress…" spinner
- BMI auto-calculated and displayed after Q2 is answered

*(Source: APP-PATIENT.md Section 9.3)*

### 4.5 Review Screen

**Screen:** `questionnaire/pcos/review.tsx`

After all questions answered:
- All answers listed, grouped by section (Basics & Menstrual History, Symptoms, Medical History, Fertility & Reproductive Goals, Diagnostic History, Lifestyle, Treatment Goals)
- Each answer tappable → navigate back to that question to edit
- Rotterdam criteria summary displayed: "Based on your answers, X of 3 Rotterdam criteria indicators are present."
- Consent checkbox (required): "By submitting, I confirm these answers are accurate and consent to a clinical assessment based on them."
- `[Submit Assessment]` button

**On submit:**
1. All answers sent to backend in one API call
2. Rotterdam criteria auto-check calculated server-side
3. Backend triggers AI assessment pipeline (BullMQ job)
4. Consultation record created with status `SUBMITTED`
5. Patient navigated to optional photo upload → plan selection

*(Source: APP-PATIENT.md Section 9.5)*

---

## 5. Photo Upload (Optional)

### 5.1 Overview

Unlike Hair Loss (4 required) and Weight Management (2 required), PCOS photos are **optional**. They can help the doctor assess clinical hyperandrogenism (acne severity, hirsutism patterns) but are not mandatory.

### 5.2 Optional Photo Types

| # | Subject | Label | When Useful |
|---|---------|-------|-------------|
| 1 | Face | "Facial Acne" | If patient reported moderate/severe acne |
| 2 | Chin/jawline | "Hirsutism — Face" | If patient reported facial hair growth |
| 3 | Abdomen | "Hirsutism — Body" | If patient reported body hair growth |

### 5.3 Photo Upload Flow

**Screen:** `photo-upload/pcos.tsx`

1. Screen shows message: "Photos are optional for PCOS assessment. Adding photos of acne or excess hair growth can help your doctor assess your symptoms more accurately."
2. Up to 3 optional photo slots displayed
3. Patient can upload any, all, or none
4. If at least 1 uploaded → grid preview with labels
5. `[Skip Photos]` button always available — proceeds to plan selection
6. `[Looks Good — Continue]` → proceed to plan selection (if photos uploaded)

### 5.4 Photo Technical Details

- Compressed client-side: max 1MB, max 1920px on longest side
- Storage: S3 presigned URL upload
- If presigned URL expires → request new one automatically

*(Source: APP-PATIENT.md Section 10, PROJECT-OVERVIEW.md Section 4)*

---

## 6. AI Pre-Assessment

### 6.1 Pipeline

1. Questionnaire submitted → consultation status: `SUBMITTED`
2. Rotterdam criteria auto-check calculated (server-side scoring)
3. BullMQ job queued for AI processing
4. Claude (Sonnet) processes questionnaire answers + Rotterdam score + optional photo metadata
5. AI assessment generated → consultation status: `AI_COMPLETE`
6. Case enters doctor queue

*(Source: BACKEND-PART1.md Section 8, PORTAL-DOCTOR.md Section 6)*

### 6.2 AI Assessment Output Structure

The AI assessment for PCOS includes:

**Standard fields (all verticals):**
- Classification + confidence level (high/medium/low)
- Attention level: LOW / MEDIUM / HIGH / CRITICAL (with rationale)
- Red flags list
- Contraindications matrix (per medication: safe ✅ / caution ⚠️ / blocked ⛔)
- Risk factors
- Recommended protocol (template name — fertility-aware)
- Full summary paragraph (2–3 paragraphs for the doctor)

**PCOS-specific extensions (`conditionSpecific` fields):**

| Field | Description | Example |
|-------|-------------|---------|
| `rotterdamCriteriaMet` | Checklist showing which 2 of 3 criteria are met | `{ oligo: true, hyperandrogenism: true, polycystic: false, count: 2 }` |
| `pcosPhenotype` | Phenotype classification: A, B, C, or D | "Phenotype B (hyperandrogenism + oligo/anovulation)" |
| `fertilityIntentBanner` | Patient's fertility status from Q19 | "Trying to conceive" |
| `insulinResistanceFlag` | Flag based on BMI + acanthosis nigricans + fasting glucose (if labs available) | "Probable — BMI 28.5, acanthosis nigricans reported" |

*(Source: PORTAL-DOCTOR.md Section 6.2, BACKEND-PART1.md Section 8.3)*

### 6.3 PCOS Phenotype Classification

| Phenotype | Criteria Met | Clinical Description |
|-----------|-------------|---------------------|
| A (Classic) | All 3 (oligo + hyperandrogenism + polycystic ovaries) | Most metabolically severe; highest insulin resistance risk |
| B (Classic) | Hyperandrogenism + oligo/anovulation | No polycystic ovaries on imaging; still metabolically significant |
| C (Ovulatory) | Hyperandrogenism + polycystic ovaries | Regular cycles; androgen-driven symptoms predominate |
| D (Non-hyperandrogenic) | Oligo/anovulation + polycystic ovaries | Mildest phenotype; lower metabolic risk |

*(Source: PORTAL-DOCTOR.md Section 6.2)*

### 6.4 AI Assessment Example (PCOS)

```
┌────────────────────────────────────────────────────────┐
│  🤖 AI Pre-Assessment                                  │
│  Generated: 20 Mar 2026, 3:15 PM                      │
│  Model: Claude 3.5 Sonnet | Confidence: 82%           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  CLASSIFICATION                                        │
│  Polycystic Ovary Syndrome                             │
│  Phenotype: B (Hyperandrogenism + Oligo/anovulation)   │
│  Confidence: 82%                                       │
│                                                        │
│  ROTTERDAM CRITERIA (2 of 3 met)                       │
│  ☑ Oligo/anovulation: 5 periods in past 12 months     │
│  ☑ Clinical hyperandrogenism: hirsutism + severe acne  │
│  ☐ Polycystic ovaries: No ultrasound performed         │
│                                                        │
│  🤰 FERTILITY INTENT: Trying to conceive               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Patient is actively trying to become pregnant.    │  │
│  │ Avoid: Spironolactone, isotretinoin, statins.     │  │
│  │ Consider: Lifestyle-first, Metformin, Ovulation   │  │
│  │ induction. Refer to fertility specialist if no    │  │
│  │ conception within 6 months of treatment.          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  🟡 ATTENTION LEVEL: MEDIUM                            │
│  Rationale: "Patient trying to conceive with            │
│  confirmed oligo/anovulation. Requires fertility-       │
│  aware treatment approach. BMI 28.5 — consider          │
│  weight management alongside hormonal treatment."       │
│                                                        │
│  ⚠️ RED FLAGS                                          │
│  • Trying to conceive — fertility-safe medications only│
│  • BMI 28.5 — overweight, insulin resistance probable  │
│  • 5 periods per year — significant oligo/anovulation  │
│                                                        │
│  💊 CONTRAINDICATIONS MATRIX                           │
│  ┌─────────────────┬───────┬────────┬──────────────┐  │
│  │ Medication      │ Safe  │ Caution│ Blocked      │  │
│  ├─────────────────┼───────┼────────┼──────────────┤  │
│  │ Metformin       │  ✅   │        │              │  │
│  │ Inositol        │  ✅   │        │              │  │
│  │ Folic Acid      │  ✅   │        │              │  │
│  │ Clomiphene      │  ✅   │        │              │  │
│  │ Combined OCP    │       │        │     ⛔       │  │
│  │ Spironolactone  │       │        │     ⛔       │  │
│  │ Isotretinoin    │       │        │     ⛔       │  │
│  └─────────────────┴───────┴────────┴──────────────┘  │
│                                                        │
│  📋 RECOMMENDED PROTOCOL                               │
│  Template: "Metformin + Lifestyle" (Trying to Conceive)│
│  "Recommend Metformin 500mg BID for insulin resistance │
│  management + lifestyle optimization + Folic acid for  │
│  preconception care. Consider Clomiphene for ovulation │
│  induction after 3 months if no conception with        │
│  lifestyle + Metformin alone."                         │
│                                                        │
│  📝 FULL SUMMARY                                       │
│  "26-year-old female presenting with irregular periods │
│   (5 per year), hirsutism (chin, upper lip, abdomen),  │
│   and severe cystic acne. BMI 28.5 (overweight per     │
│   WHO Asian cutoffs). Strong family history — mother    │
│   had PCOS and irregular periods. No prior ultrasound. │
│   Patient is actively trying to conceive (6 months).   │
│   Rotterdam criteria: 2/3 met (oligo + clinical        │
│   hyperandrogenism). Recommend fertility-track          │
│   protocol with Metformin and lifestyle-first approach. │
│   Refer to fertility specialist if no conception        │
│   within 6 months. Order PCOS Screen Panel for         │
│   hormonal baseline."                                   │
└────────────────────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 6.1)*

### 6.5 AI Prompt Construction

The AI prompt for PCOS includes:
- Patient age, city
- Full questionnaire responses (JSON)
- Calculated scores: Rotterdam criteria check result
- BMI (auto-calculated from Q2)
- Fertility intent (from Q19)
- Instruction to return structured JSON with classification, confidence, attention level, red flags, contraindications, risk factors, recommended protocol (fertility-aware), summary, and `conditionSpecific` fields (`rotterdamCriteriaMet`, `pcosPhenotype`, `fertilityIntentBanner`, `insulinResistanceFlag`)

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

