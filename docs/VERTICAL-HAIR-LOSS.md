# VERTICAL-HAIR-LOSS.md — Onlyou Hair Loss Vertical Specification

> **Document type:** Vertical-specific master reference
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** PROJECT-OVERVIEW.md, APP-PATIENT.md, PORTAL-DOCTOR.md, PORTAL-NURSE-FIXED.md, PORTAL-ADMIN.md, PORTAL-LAB-FIXED.md, PORTAL-PHARMACY.md, LANDING-PAGE.md, BACKEND-PART1.md, BACKEND-PART2A.md, BACKEND-PART2B.md, BACKEND-PART3A.md, BACKEND-PART3B.md, ARCHITECTURE.md, onlyou-spec-resolved-v4.md

---

## 1. Condition Overview

**Condition:** Hair Loss (Androgenetic Alopecia — AGA)
**Internal enum value:** `HAIR_LOSS`
**Build priority:** #1 of 5 verticals (Hair Loss → ED → PE → Weight → PCOS)
**Development phase:** Phase 6 (Weeks 16–19) — first vertical with full end-to-end journey
**Condition accent color:** Applied per landing page condition card styling

**Target audience:** Men aged 18–45, Women with Androgenetic Alopecia (AGA)
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Doctor type:** Dermatologist / Trichologist
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Consultation type:** Async (questionnaire + photos — no video in MVP)
*(Source: PROJECT-OVERVIEW.md Section 12, Decision #1)*

**Photos required:** 4 mandatory
*(Source: PROJECT-OVERVIEW.md Section 4, APP-PATIENT.md Section 5)*

**Blood work:** Sometimes (not always clinically indicated; doctor decides per case)
*(Source: PROJECT-OVERVIEW.md Section 4)*

**Time to visible results:** 3–6 months
*(Source: LANDING-PAGE.md Section 4.6, FAQ #8)*

**Regulatory classification:** Finasteride and Minoxidil (prescription-strength) are Schedule H in India — require prescription, can be prescribed via telemedicine under Telemedicine Practice Guidelines 2020.

---

## 2. Pricing

### 2.1 Subscription Plans

| Plan | Total Price | Per Month | Savings |
|------|------------|-----------|---------|
| Monthly | ₹999/month | ₹999 | — |
| Quarterly | ₹2,499/quarter | ₹833 | 17% |
| 6-Month | ₹4,499/6 months | ₹750 | 25% |

*(Source: onlyou-spec-resolved-v4.md Section 5 — authoritative pricing source)*

**"Starting from" price (marketing):** ₹750/mo (6-month plan per-month rate)
*(Source: LANDING-PAGE.md Section 4.4)*

### 2.2 What's Included in Every Subscription

1. AI-powered pre-assessment — condition-specific questionnaire analyzed by Claude
2. Async doctor consultation — dermatologist/trichologist reviews case, asks follow-ups if needed
3. E-prescription — generated from hair loss–specific templates, PDF stored in S3
4. Medication — discreet local delivery with OTP confirmation
5. Ongoing check-ins — 4-week, 3-month, 6-month cadence
6. First blood panel — included when clinically indicated (Extended Hair Panel: ₹1,200 value)

*(Source: PROJECT-OVERVIEW.md Section 5)*

### 2.3 Blood Work Pricing

| Panel | Price | When Used |
|-------|-------|-----------|
| Extended Hair Panel (first) | **INCLUDED** in subscription | When clinically indicated by doctor |
| Follow-up panels | ₹600–₹1,200 | Subset of initial panel, doctor selects tests |
| Patient self-upload | **Free** | Patient provides own recent results |

*(Source: onlyou-spec-resolved-v4.md Section 5, APP-PATIENT.md Section 13.1, PORTAL-LAB-FIXED.md Section 24)*

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
Selects "Hair Loss" from condition selector
        │
        ▼
Gender selection (Male / Female) — affects branching
        │
        ▼
Completes questionnaire (~25 questions, ~8–12 min)
        │
        ▼
Uploads 4 photos (top of head, hairline, crown, problem areas)
        │
        ▼
AI pre-assessment (Claude analyzes → Norwood/Ludwig classification, risk flags, contraindications)
        │
        ▼
Selects plan & pays (Monthly/Quarterly/6-Month via Razorpay)
        │
        ▼
Doctor reviews case (dermatologist sees AI summary + raw data → 3–8 min per case)
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
        ├─── REFERS ──→ Partner clinic near patient
        │
        └─── REFUNDS ──→ Full/partial refund if cannot treat
        │
        ▼
ONGOING CARE (check-ins at 4 weeks / 3 months / 6 months)
```

*(Source: PROJECT-OVERVIEW.md Section 6)*

### 3.2 Condition Selection Screen

**Screen:** `(tabs)/home/condition/[condition].tsx`

When patient selects Hair Loss:

1. **Gender selection first** (Male / Female) — affects questionnaire branching, photo requirements, and treatment options
2. Male patients: Norwood scale reference images shown
3. Female patients: Ludwig scale reference images shown
4. Hero section with condition illustration + tagline
5. "How It Works" 3-step summary
6. "What You Get" checklist (doctor consultation, prescription, medication delivery, ongoing monitoring, WhatsApp support)
7. Pricing cards (Monthly / Quarterly / 6-Month)
8. FAQ accordion (3–5 hair loss–specific questions)
9. Sticky CTA at bottom: `[Start Your Assessment — Free]`

**CTA behavior:**
- Not logged in → auth flow → return here
- Logged in + phone verified → navigate to `questionnaire/hair-loss`
- Phone not verified → phone verification first

*(Source: APP-PATIENT.md Section 5)*

---

## 4. Questionnaire (28 Questions, ~8–12 minutes)

### 4.1 Overview

| Attribute | Value |
|-----------|-------|
| Total questions | 28 (schema) — most patients answer 23–25 after skip logic |
| Estimated completion | 8–12 minutes |
| Scoring tool | None (no validated scoring instrument — uses Norwood/Ludwig classification from AI) |
| Special logic | Gender branching (M/F), family history weighting, under-25 finasteride caution |
| Age gate | None (but under-25 flagged for finasteride caution by AI) |
| JSON schema file | `questionnaire/data/hair-loss.json` |

*(Source: APP-PATIENT.md Section 9.4, BACKEND-PART1.md Section 6.1)*

> **⚠️ Source Discrepancy — Question Count:** APP-PATIENT.md Section 9.4 says "~25" and BACKEND-PART1.md Section 6.1 says `totalQuestions: 25`. This detailed specification expands the count to 28 by creating a separate "Basics" section (Q1–Q3: age, sex, pattern) that the original docs likely counted within "Medical History". The JSON schema file (`hair-loss.json`) should be updated to `totalQuestions: 28` during implementation. After skip logic, most patients answer 23–25 questions, which aligns with the original "~25" approximation.

### Skip Logic Rules
- Q2 = "Female" → Q3 shows female options (part widening, diffuse) instead of male options (receding hairline, crown)
- Q2 = "Female" → skip Q22–Q25 (Sexual Health section — males only)
- Q5 = "No family history" or "Not sure" → skip Q6 (family onset age)
- Q23 = "Not concerned" → skip Q24 (topical-only preference)
- Q26 = "None — this is my first treatment" → skip Q27 (treatment results)

Most **male** patients answer 23–25 questions after skip logic.
Most **female** patients answer 19–21 questions after skip logic.

---

### SECTION 1: BASICS (3 questions)

**Q1: What is your age?**
- Type: Number input (18–80)
- Validation: <18 = blocked ("Our service is available for adults 18 and over.")
- Required: Yes
- AI use: Age context for treatment planning. Under 25: caution with finasteride (ongoing development of secondary sexual characteristics). Over 50: consider broader hormonal workup.

**Q2: What is your biological sex?**
- Type: Single select — Male / Female
- Required: Yes
- AI use: CRITICAL branching. Male → Norwood classification, finasteride/dutasteride eligible. Female → Ludwig classification, spironolactone pathway, finasteride generally avoided (teratogenicity risk in women of childbearing age).

**Q3: Where are you noticing hair loss?**
- Type: Single select
- **Male options:**
  - "Receding hairline"
  - "Thinning at the crown/vertex"
  - "Overall thinning across the top"
  - "Both hairline and crown"
  - "Specific patches or bald spots"
- **Female options** (shown if Q2 = Female):
  - "Widening part line"
  - "Overall thinning across the top"
  - "Diffuse thinning all over"
  - "Thinning at the temples"
  - "Specific patches or bald spots"
- AI use: Pattern identification. Male receding hairline + crown = classic AGA (Norwood III-V). "Specific patches" = possible alopecia areata → flag for doctor (may need dermatology referral, different treatment pathway). Female widening part = classic Ludwig pattern.

*(Source: BACKEND-PART1.md Section 6.1 — JSON schema)*

### SECTION 2: MEDICAL HISTORY (6 questions)

**Q4: Do you have any of these medical conditions? (Select all that apply)**
- Type: Multi-select
  - Thyroid disorder (hyper or hypo)
  - Diabetes
  - Anemia or iron deficiency
  - Autoimmune condition (lupus, rheumatoid arthritis, etc.)
  - Polycystic ovary syndrome (PCOS) [shown only if Q2 = Female]
  - Skin conditions (psoriasis, eczema, seborrheic dermatitis)
  - High blood pressure
  - Heart condition
  - Depression or anxiety (diagnosed)
  - None of these
- AI use: Thyroid = common reversible cause of hair loss → blood work priority. Anemia/iron deficiency = ferritin check critical. Autoimmune = possible alopecia areata or telogen effluvium, may need specialist. PCOS in females = hormonal hair loss, different treatment approach. Depression/anxiety = note for finasteride counseling (rare mood side effects reported).

**Q5: Does anyone in your family experience hair loss? (Select all that apply)**
- Type: Multi-select
  - Father
  - Mother
  - Brother(s)
  - Sister(s)
  - Maternal grandfather
  - Maternal uncle(s)
  - Paternal grandfather
  - No family history of hair loss
  - Not sure
- AI use: Family history is the strongest predictor of AGA. Maternal grandfather pattern = especially predictive for male AGA. Multiple affected family members = higher genetic loading, likely AGA, better response to early treatment. No family history + sudden onset = investigate other causes (telogen effluvium, autoimmune, nutritional).

**Q6: [IF family history selected] At what age did your family members start losing hair?**
- Type: Single select
  - Before 25
  - 25–35
  - 35–50
  - After 50
  - Not sure
- Skip: Only shown if Q5 ≠ "No family history" and ≠ "Not sure"
- AI use: Early family onset (<25) = aggressive genetic pattern, recommend starting treatment early. Late onset = slower progression expected.

**Q7: Have you had any of these in the past 6 months? (Select all)**
- Type: Multi-select
  - Major surgery or illness
  - Significant weight loss (>5 kg)
  - High fever or serious infection
  - Childbirth [shown only if Q2 = Female]
  - Stopped or started birth control [shown only if Q2 = Female]
  - Major emotional stress or trauma
  - Started a new medication
  - Crash diet or extreme calorie restriction
  - None of these
- AI use: Any of these = telogen effluvium trigger. Telogen effluvium is temporary and self-resolving (3–6 months) but often co-exists with AGA. If multiple triggers present, hair loss may be mixed etiology. Childbirth = postpartum telogen effluvium (reassure patient, usually resolves by 12 months).

**Q8: Are you currently taking any medications? (Select all)**
- Type: Multi-select
  - Blood thinners (warfarin, heparin)
  - Beta-blockers (atenolol, propranolol)
  - Antidepressants (SSRIs, lithium)
  - Retinoids (isotretinoin/Accutane, tretinoin)
  - Chemotherapy drugs
  - Hormonal contraceptives [shown only if Q2 = Female]
  - Testosterone or anabolic steroids
  - Thyroid medication
  - Blood pressure medication
  - Finasteride or dutasteride (already taking)
  - Minoxidil (already using)
  - None
  - Other: [free text]
- AI use: Blood thinners = minoxidil caution (both affect blood pressure). Beta-blockers = can cause hair loss themselves. Retinoids = known hair loss side effect, may be reversible. Testosterone/steroids = can accelerate AGA. Already on finasteride/minoxidil = patient has prior treatment history → ask about response. SSRIs = note for drug interaction screening.

**Q9: Any known drug allergies?**
- Type: Free text / "None"
- Required: Yes
- AI use: Contraindication screening. Allergy to finasteride or minoxidil = blocked from those treatments.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Medical History section grouping)*

### SECTION 3: CURRENT SYMPTOMS (7 questions)

**Q10: How long have you been experiencing hair loss?**
- Type: Single select
  - Less than 3 months
  - 3–6 months
  - 6–12 months
  - 1–2 years
  - 2–5 years
  - More than 5 years
- AI use: Duration context. <3 months = may be acute telogen effluvium (check Q7 triggers). >2 years with gradual progression = classic AGA pattern. Sudden onset at any duration = investigate non-AGA causes.

**Q11: How would you rate the severity of your hair loss?**
- Type: Single select
  - Mild — barely noticeable, only I notice it
  - Moderate — noticeable thinning, others may notice
  - Severe — significant thinning or bald areas, clearly visible
  - Very severe — extensive hair loss
- AI use: Self-assessment severity. Combined with photo analysis for Norwood/Ludwig staging. Discrepancy between self-assessment and photos = body dysmorphia consideration (rare).

**Q12: Is your hair loss getting worse, stable, or improving?**
- Type: Single select
  - Getting worse (actively progressing)
  - Stable (hasn't changed recently)
  - Improving (was worse before)
  - Not sure
- AI use: Active progression = stronger case for treatment. Stable = may benefit from maintenance therapy to prevent further loss. Improving = if not on treatment, may be telogen effluvium resolving.

**Q13: Do you experience any of these scalp symptoms? (Select all)**
- Type: Multi-select
  - Itching
  - Flaking or dandruff
  - Scalp pain or tenderness
  - Redness or inflammation
  - Oiliness
  - Bumps or pimples on scalp
  - None of these
- AI use: Itching + flaking = seborrheic dermatitis component (ketoconazole shampoo priority). Scalp pain/tenderness = possible scarring alopecia → flag HIGH, may need biopsy referral. Redness/inflammation = active inflammatory process, ketoconazole + consider topical steroid. Bumps = folliculitis, different treatment.

**Q14: Are you noticing increased hair shedding? (e.g., in shower, pillow, brushing)**
- Type: Single select
  - Yes — significantly more than usual
  - Yes — somewhat more than usual
  - No — about normal shedding, but hair is thinning
  - Not sure
- AI use: Increased shedding = active telogen effluvium component. "Normal shedding but thinning" = miniaturization (classic AGA mechanism). Distinguishing shedding vs. thinning helps AI classify the hair loss type.

**Q15: Have you noticed changes in hair texture or quality?**
- Type: Single select
  - Yes — hair feels thinner and finer
  - Yes — hair is drier or more brittle
  - Yes — hair has changed color
  - No changes in texture
- AI use: Thinner/finer = miniaturization (hallmark of AGA). Dry/brittle = possible nutritional deficiency or thyroid issue. Color change = rare, may indicate mineral deficiency.

**Q16: Are you losing hair from other areas too? (eyebrows, beard, body hair)**
- Type: Single select — Yes / No
- AI use: Hair loss from other body areas = NOT typical AGA. May indicate alopecia areata (autoimmune), alopecia universalis, or systemic condition. Flag HIGH for doctor review. AGA is typically limited to scalp in a patterned distribution.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Current Symptoms section grouping)*

### SECTION 4: LIFESTYLE (5 questions)

**Q17: How would you rate your stress level over the past 6 months?**
- Type: Single select
  - Low — generally relaxed
  - Moderate — some stress but manageable
  - High — frequently stressed
  - Very high — constant significant stress
- AI use: High/very high stress = telogen effluvium trigger, also exacerbates AGA. Counseling note: stress management as adjunct to treatment.

**Q18: How would you describe your diet?**
- Type: Single select
  - Balanced — variety of foods, regular meals
  - Vegetarian / Vegan
  - Restricted — currently dieting or limiting food groups
  - Irregular — skip meals often, mostly processed food
  - Specific diet (keto, intermittent fasting, etc.)
- AI use: Vegetarian/vegan = higher risk of iron, B12, zinc deficiency → prioritize blood work. Restricted/crash diet = telogen effluvium trigger. Irregular = nutritional deficiency context.

**Q19: How many hours of sleep do you typically get?**
- Type: Single select
  - Less than 5 hours
  - 5–6 hours
  - 6–7 hours
  - 7–8 hours
  - More than 8 hours
- AI use: Chronic sleep deprivation (<6 hours) = cortisol elevation, can contribute to hair loss. Context for overall health assessment.

**Q20: Do you smoke?**
- Type: Single select
  - No, never
  - Previously, but quit
  - Yes, occasionally
  - Yes, daily
- AI use: Smoking = reduced scalp blood flow, may decrease minoxidil efficacy. Counseling note: smoking cessation as part of treatment plan.

**Q21: How often do you exercise?**
- Type: Single select
  - Rarely / never
  - 1–2 times per week
  - 3–4 times per week
  - 5+ times per week / daily
- AI use: Context for overall health. Heavy exercise with restricted diet = higher risk of nutritional deficiency. Context for treatment counseling.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Lifestyle section grouping)*

### SECTION 5: SEXUAL HEALTH (4 questions) — MALES ONLY

> **Skip entire section if Q2 = Female.** These questions screen for finasteride/dutasteride side effects, which are relevant only for male patients being considered for 5-alpha reductase inhibitors.

**Q22: Are you currently experiencing any sexual health issues?**
- Type: Single select
  - No issues
  - Reduced sex drive / low libido
  - Difficulty getting or maintaining erections
  - Both reduced libido and erection issues
  - Prefer not to answer
- AI use: Pre-existing sexual dysfunction = finasteride CAUTION. If patient already has libido/ED issues, finasteride may worsen them → AI recommends "Minoxidil Only" or "Conservative" template as first line. "Prefer not to answer" = treated as unknown, doctor should discuss in consultation.

**Q23: Are you concerned about potential sexual side effects from hair loss medication?**
- Type: Single select
  - Not concerned — willing to try medication
  - Somewhat concerned — would like to understand risks
  - Very concerned — would prefer to avoid medications with sexual side effects
- AI use: "Very concerned" = strong signal for minoxidil-only or conservative approach. Informs counseling notes: doctor should spend extra time on finasteride risk/benefit discussion. Patient autonomy respected.

**Q24: [IF Q23 ≠ "Not concerned"] Would you prefer a treatment plan that avoids oral medications like finasteride?**
- Type: Single select
  - Yes — prefer topical-only treatment
  - Open to oral medication if doctor recommends it
  - Not sure — want to discuss with doctor
- Skip: Only shown if Q23 = "Somewhat" or "Very concerned"
- AI use: "Yes, topical only" = AI recommends "Minoxidil Only" template. "Open to oral" = standard recommendation still possible. "Not sure" = doctor discussion needed, include in counseling notes.

**Q25: Are you planning to conceive a child in the next 12 months?**
- Type: Single select — Yes / No / Not sure
- AI use: Finasteride affects semen parameters and is teratogenic (risk to female partner if pregnant). "Yes" = finasteride CAUTION — discuss 3-month washout before conception. Some doctors may avoid prescribing altogether if active conception plans.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Sexual Health section grouping; finasteride safety check logic per PORTAL-DOCTOR.md Section 6.2)*

### SECTION 6: TREATMENT HISTORY & GOALS (3 questions)

**Q26: Have you tried any hair loss treatments before? (Select all)**
- Type: Multi-select
  - Minoxidil (Rogaine / topical solution)
  - Finasteride (Propecia / oral tablet)
  - Dutasteride (Avodart)
  - Ketoconazole shampoo
  - Biotin or hair supplements
  - PRP (Platelet-Rich Plasma) therapy
  - Hair transplant
  - Ayurvedic / herbal treatments
  - Derma roller / microneedling
  - None — this is my first treatment
- AI use: Prior treatment history is CRITICAL for protocol selection. Failed minoxidil alone = consider adding finasteride. Failed finasteride = consider dutasteride (stronger 5-ARI). Already had hair transplant = may need maintenance therapy to preserve results. Prior PRP = may respond to combination approach. "None" = good candidate for standard first-line protocol.

**Q27: [IF tried treatments] How would you describe the results?**
- Type: Free text
- Skip: Only shown if Q26 ≠ "None — this is my first treatment"
- AI use: Duration of use, perceived efficacy, side effects experienced, reason for stopping. Helps doctor avoid re-prescribing ineffective treatments and understand compliance patterns.

**Q28: What is your primary goal with treatment?**
- Type: Single select
  - Stop further hair loss (maintenance)
  - Regrow lost hair
  - Both — stop loss and regrow
  - Improve hair thickness and quality
  - Not sure — want doctor's recommendation
- AI use: Manages expectations. "Stop loss" = maintenance therapy may suffice. "Regrow" = combination therapy likely needed, set 6-month timeline expectation. "Improve thickness" = minoxidil particularly effective. Informs counseling notes and treatment goal documentation.

*(Source: PORTAL-DOCTOR.md Section 7.1 — Treatment Goals section grouping)*

---

### 4.2 Scoring

Hair Loss has **no validated scoring instrument** (unlike ED's IIEF-5 or PE's PEDT). Instead:
- The AI uses questionnaire answers + photos to classify using Norwood scale (males) or Ludwig scale (females)
- Classification is generated by the AI, not calculated by the scoring engine
- The `scoring.type` in the JSON schema is set to `"none"`

*(Source: BACKEND-PART1.md Section 6.1, Section 6.3)*

### 4.3 Skip Logic Summary

| Condition | Question(s) Affected | Behavior |
|-----------|---------------------|----------|
| Q2 = Female | Q3 options | Show female-specific hair loss patterns |
| Q2 = Female | Q4 options | Show PCOS option |
| Q2 = Female | Q7 options | Show childbirth, birth control options |
| Q2 = Female | Q8 options | Show hormonal contraceptives option |
| Q2 = Female | Q22–Q25 | Skip entire Sexual Health section |
| Q5 = "No family history" / "Not sure" | Q6 | Skip |
| Q8 = "None" | — | No skip (Q9 still asked) |
| Q23 = "Not concerned" | Q24 | Skip |
| Q26 = "None — first treatment" | Q27 | Skip |

Most male patients answer **23–25 questions** after skip logic.
Most female patients answer **19–21 questions** after skip logic.

*(Source: APP-PATIENT.md Section 9.3, BACKEND-PART1.md Section 6.2)*

### 4.4 Questionnaire UX

- **One question per screen** — firm design decision, no multi-question forms
- `[Next →]` button (sticky bottom) — disabled until valid answer
- `[← Back]` button (top left)
- Progress bar: "Question 5 of 28" — adjusts dynamically when skip logic reduces total
- Save & resume: progress saved to local storage (Zustand persisted) after each answer, synced to backend every 3 questions
- Saved progress expires after 7 days
- Multi-device: loads last backend-synced state on new device with "Syncing your progress…" spinner

*(Source: APP-PATIENT.md Section 9.3)*

### 4.5 Review Screen

**Screen:** `questionnaire/hair-loss/review.tsx`

After all questions answered:
- All answers listed, grouped by section
- Each answer tappable → navigate back to that question to edit
- Consent checkbox (required): "By submitting, I confirm these answers are accurate and consent to a clinical assessment based on them."
- `[Submit Assessment]` button

**On submit:**
1. All answers sent to backend in one API call
2. Backend triggers AI assessment pipeline (BullMQ job)
3. Consultation record created with status `SUBMITTED`
4. Patient navigated to photo upload

*(Source: APP-PATIENT.md Section 9.5)*

---

## 5. Photo Upload

### 5.1 Requirements

| # | Angle | Label | Description |
|---|-------|-------|-------------|
| 1 | Top of head | "Crown/Vertex" | Bird's-eye view of crown area |
| 2 | Frontal hairline | "Hairline" | Straight-on view of forehead/hairline |
| 3 | Left temple | "Left Temple" | Side view showing temple recession |
| 4 | Right temple | "Right Temple" | Side view showing temple recession |

*(Source: PORTAL-DOCTOR.md Section 8.1, APP-PATIENT.md Section 5)*

### 5.2 Photo Upload Flow

**Screen:** `treatment/photos.tsx`

1. Camera opens with overlay guide showing target area
2. Patient captures or selects from gallery
3. No client-side quality check in MVP — doctor requests retake via messages if needed
4. Photos uploaded to S3 via presigned PUT URL
5. After all 4 photos captured → grid preview with labels
6. Tap any photo to retake
7. `[Looks Good — Continue]` → proceed to plan selection

*(Source: APP-PATIENT.md Section 10)*

### 5.3 Photo Technical Details

- Compressed client-side: max 1MB, max 1920px on longest side
- Storage: S3 presigned URL upload
- If presigned URL expires → request new one automatically
- If S3 returns 403 → request new presigned URL and retry

*(Source: APP-PATIENT.md Section 10.4)*

---

## 6. AI Pre-Assessment

### 6.1 Pipeline

1. Questionnaire submitted → consultation status: `SUBMITTED`
2. BullMQ job queued for AI processing
3. Claude (Sonnet) processes questionnaire answers + photo metadata
4. AI assessment generated → consultation status: `AI_COMPLETE`
5. Case enters doctor queue

*(Source: BACKEND-PART1.md Section 8, PORTAL-DOCTOR.md Section 6)*

### 6.2 AI Assessment Output Structure

The AI assessment for Hair Loss includes:

**Standard fields (all verticals):**
- Classification + confidence level (high/medium/low)
- Attention level: LOW / MEDIUM / HIGH / CRITICAL (with rationale)
- Red flags list
- Contraindications matrix (per medication: safe ✅ / caution ⚠️ / blocked ⛔)
- Risk factors
- Recommended protocol (template name)
- Full summary paragraph (2–3 paragraphs for the doctor)

**Hair Loss–specific extensions (`conditionSpecific` fields):**

| Field | Description | Example |
|-------|-------------|---------|
| `norwoodScale` | Norwood Scale stage assessment (males) or Ludwig Scale (females) | "Stage III Vertex" |
| `finasterideSafetyCheck` | Safe / Caution / Contraindicated (with reasoning) | "Caution — under 25, no children" |
| `alopeciaType` | Classification of hair loss type | "Androgenetic Alopecia (Male Pattern)" |
| `hairDensityZoneAssessment` | Zone-by-zone assessment from photos (frontal, mid-scalp, vertex, temporal) | "Frontal: moderate thinning, Vertex: significant" |

*(Source: PORTAL-DOCTOR.md Section 6.2, BACKEND-PART1.md Section 8.3)*

### 6.3 AI Assessment Example (Hair Loss)

```
┌────────────────────────────────────────────────────┐
│  🤖 AI Pre-Assessment                              │
│  Generated: 15 Jan 2026, 2:34 PM                  │
│  Model: Claude 3.5 Sonnet | Confidence: 87%       │
├────────────────────────────────────────────────────┤
│                                                    │
│  CLASSIFICATION                                    │
│  Androgenetic Alopecia (Male Pattern)              │
│  Norwood Scale: Stage III Vertex                   │
│  Confidence: 87%                                   │
│                                                    │
│  🔴 ATTENTION LEVEL: HIGH                          │
│  Rationale: "Patient reports current finasteride   │
│  use with persistent sexual side effects.          │
│  Requires careful risk-benefit assessment          │
│  before continuing 5-alpha reductase inhibitor."   │
│                                                    │
│  ⚠️ RED FLAGS                                      │
│  • Sexual side effects with current finasteride    │
│  • Family history of prostate cancer (father)      │
│                                                    │
│  💊 CONTRAINDICATIONS MATRIX                       │
│  ┌──────────────┬───────┬────────┬──────────────┐ │
│  │ Medication   │ Safe  │ Caution│ Blocked      │ │
│  ├──────────────┼───────┼────────┼──────────────┤ │
│  │ Finasteride  │       │   ⚠️   │              │ │
│  │ Minoxidil 5% │  ✅   │        │              │ │
│  │ Biotin       │  ✅   │        │              │ │
│  │ Ketoconazole │  ✅   │        │              │ │
│  │ Dutasteride  │       │        │     ⛔       │ │
│  └──────────────┴───────┴────────┴──────────────┘ │
│                                                    │
│  📋 RECOMMENDED PROTOCOL                           │
│  "Minoxidil-only regimen recommended as first      │
│  line given finasteride side effects. Consider      │
│  topical finasteride 0.1% as alternative with      │
│  reduced systemic exposure. Recommend DHT panel    │
│  before any 5-ARI initiation."                     │
│                                                    │
│  📝 FULL SUMMARY                                   │
│  "28-year-old male presenting with progressive     │
│   frontal and vertex thinning consistent with      │
│   Norwood III-V pattern. Patient has been using    │
│   finasteride 1mg daily for 8 months with          │
│   reported decrease in libido and erectile          │
│   function. Family history significant for          │
│   prostate cancer in father (age 62). No other     │
│   medications. No allergies reported. BMI 24.2     │
│   (normal). Recommend transitioning to topical     │
│   approach and ordering DHT panel."                │
└────────────────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 6.1)*

### 6.4 AI Prompt Construction

The AI prompt for Hair Loss includes:
- Patient age, gender, city
- Full questionnaire responses (JSON)
- Calculated scores (none for Hair Loss — no validated scoring tool)
- Instruction to return structured JSON with classification, confidence, attention level, red flags, contraindications, risk factors, recommended protocol, summary, and `conditionSpecific` fields (`norwoodScale`, `finasterideSafetyCheck`, `alopeciaType`)

*(Source: BACKEND-PART1.md Section 8.2, 8.3)*

### 6.5 AI Failure Handling

| Scenario | Doctor Portal Display |
|----------|----------------------|
| Complete failure | "⏳ AI Processing" badge (gray) → after timeout: "AI assessment unavailable. Please review manually." + `[Retry AI Assessment]` button |
| Partial assessment | "⚠️ AI assessment generated with warnings: [missing data points]" |
| Max retries (3) | "AI assessment could not be completed. Please proceed with manual review." |

*(Source: PORTAL-DOCTOR.md Section 6.3)*

### 6.6 AI Disclaimer

Displayed at bottom of AI Assessment tab in doctor portal:

> "This AI pre-assessment is a clinical decision support tool generated by Claude AI. It does not constitute medical advice. The prescribing physician retains full clinical responsibility for all treatment decisions. AI confidence levels reflect pattern matching against training data and should not be interpreted as diagnostic certainty."

*(Source: PORTAL-DOCTOR.md Section 6.4)*

---

## 7. Doctor Review

### 7.1 Case Queue Appearance

Hair Loss cases appear in the doctor's case queue with:
- Patient name, age, sex, city
- Condition badge: "Hair Loss" (color-coded)
- Time since submission
- AI attention level badge: 🟢 Low / 🟡 Medium / 🔴 High / ⛔ Critical
- Status badge
- 1-line AI summary snippet

**Example mobile card:**
```
┌─────────────────────────────────────────┐
│  Rahul M., 28M, Mumbai          2h 15m │
│  ┌──────────┐  ┌────────┐  ┌─────────┐ │
│  │Hair Loss │  │🔴 High │  │  New    │ │
│  └──────────┘  └────────┘  └─────────┘ │
│                                         │
│  "Pattern consistent with Norwood III,  │
│   elevated DHT suggests genetic AGA..." │
└─────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 4.5)*

### 7.2 Case Review Layout (Desktop 3-Panel)

**LEFT (30%) — Patient Summary:**
- Name, age, sex, city, phone (masked)
- Government ID status
- Active subscriptions (Hair Loss shown)
- Consultation history
- Current medications
- Allergies

**CENTER (45%) — Clinical Data Tabs:**
- **Tab: AI Assessment** (default open) — classification, flags, contraindications, recommended protocol
- **Tab: Questionnaire** — collapsible sections with flagged answers highlighted
- **Tab: Photos** — 4-photo grid (2×2): Crown/Vertex, Hairline, Left Temple, Right Temple
- **Tab: Lab Results** — if any exist (inline PDF viewer, abnormals highlighted)
- **Tab: Messages** — chat thread with patient

**RIGHT (25%) — Actions Panel:**

| Action | What Happens |
|--------|--------------|
| **Prescribe** | Opens prescription builder |
| **Order Blood Work** | Opens lab order form (select Extended Hair Panel) |
| **Request More Info** | Opens message composer → status: AWAITING_PATIENT_RESPONSE |
| **Refer** | Opens referral modal (partner clinic) |
| **Refund** | Initiates refund flow |
| **Close Case** | Marks consultation complete |

*(Source: PORTAL-DOCTOR.md Sections 4–11, onlyou-spec-resolved-v4.md Section 4.2)*

### 7.3 Photos Tab — Hair Loss Display

4-photo grid (2×2):

| Position | Angle | Label |
|----------|-------|-------|
| Top-left | Top of head | "Crown/Vertex" |
| Top-right | Frontal hairline | "Hairline" |
| Bottom-left | Left temple | "Left Temple" |
| Bottom-right | Right temple | "Right Temple" |

**Features:**
- Click to zoom → full-screen lightbox overlay
- Lightbox controls: zoom in/out, pan, next/previous, close (Esc)
- Photo metadata: upload date, file size, resolution
- Quality indicator: if flagged → amber badge "⚠️ Quality: Low"

*(Source: PORTAL-DOCTOR.md Section 8.1, 8.2)*

### 7.4 Questionnaire Tab — Flagged Answers

- Amber background + ⚠️ icon = caution (e.g., "Taking blood thinners" for hair transplant consideration)
- Red background + ⛔ icon = critical flag
- Quick-jump: clicking a red flag in AI Assessment tab scrolls Questionnaire tab to the flagged answer

*(Source: PORTAL-DOCTOR.md Section 7.2)*

---

## 8. Prescription Templates

### 8.1 Available Templates

| Template | Key Medications |
|----------|----------------|
| **Standard** | Finasteride 1mg + Minoxidil 5% + Biotin + Ketoconazole shampoo |
| **Minoxidil Only** | Minoxidil 5% + Biotin + Ketoconazole shampoo (no finasteride) |
| **Conservative** | Biotin + Ketoconazole shampoo + PRP recommendation |
| **Combination Plus** | Standard + Derma roller + Saw Palmetto |
| **Advanced** | Dutasteride 0.5mg + Minoxidil + Biotin + Ketoconazole |
| **Female AGA** | Minoxidil 2% + Spironolactone + Biotin |
| **Custom** | Doctor manually selects medications |

*(Source: PORTAL-DOCTOR.md Section 12.3, onlyou-spec-resolved-v4.md Section 4.2)*

### 8.2 Standard Template Example (Pre-filled in Prescription Builder)

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Finasteride | 1mg | 1x daily (morning) | 6 months | Oral — see counseling notes |
| Minoxidil 5% (topical) | 1ml | 2x daily (AM + PM) | 6 months | Topical scalp |
| Biotin | 10,000 mcg | 1x daily (morning) | 6 months | With food |
| Ketoconazole shampoo | 2% | 3x weekly | 3 months | Leave 5 min |

> **Note:** The PORTAL-DOCTOR.md Section 12.2 wireframe shows only Minoxidil, Biotin, and Ketoconazole in the example, while the template definition in Section 12.3 lists Finasteride as part of "Standard". This is a **pre-existing source discrepancy** — the Standard template should include all 4 medications as listed in Section 12.3.

*(Source: PORTAL-DOCTOR.md Section 12.2, 12.3)*

### 8.3 Counseling Notes (Pre-filled from Template)

- Take finasteride once daily, with or without food, at the same time each day
- Finasteride may take 3–6 months to show results; do not stop early
- Rare side effects include decreased libido or erectile changes — report any concerns to your doctor
- If planning to conceive, discuss a 3-month washout period with your doctor
- Apply minoxidil to dry scalp, 1ml each application
- Initial shedding in first 2–4 weeks is normal and indicates the medication is working
- Results typically visible after 3–6 months of consistent use
- Do not use minoxidil on broken or irritated skin
- Wash hands thoroughly after application
- Take Biotin with food to improve absorption

> **Note:** The PORTAL-DOCTOR.md Section 12.2 wireframe counseling notes only show minoxidil/biotin guidance. The finasteride counseling notes above are added for completeness since the Standard template includes finasteride. This is a **pre-existing gap** in the source wireframe.

*(Source: PORTAL-DOCTOR.md Section 12.2 — expanded to match Standard template medication list)*

### 8.4 Prescription Builder Fields

- **Template selector:** Dropdown with all Hair Loss templates
- **Medication list:** Pre-filled from template, fully editable (drug name, dosage, frequency, duration, instructions)
- **Custom medications:** `[+ Add Medication]` to add any medication manually
- **Counseling notes:** Pre-filled condition-specific text, editable
- **Regulatory information (auto-populated):** Doctor name, NMC registration number, patient details, diagnosis ("Androgenetic Alopecia"), date
- **Digital signature:** Click/tap to sign
- **Preview:** PDF preview before submission
- **Submit:** Generates PDF → stores in S3 → creates Order record → notifies coordinator + patient

*(Source: PORTAL-DOCTOR.md Section 12.2, 12.3)*

---

## 9. Blood Work

### 9.1 Extended Hair Panel

| Test | Purpose |
|------|---------|
| TSH | Thyroid function (hypothyroidism causes hair loss) |
| Free T4 | Thyroid function confirmation |
| Ferritin | Iron stores (low ferritin associated with hair shedding) |
| Vitamin D | Deficiency linked to hair loss |
| DHT (Dihydrotestosterone) | Primary androgen driving male pattern hair loss |
| Hemoglobin | Anemia check |
| Iron studies | Comprehensive iron assessment |

**Panel price:** ₹1,200
**First panel:** INCLUDED in subscription when clinically indicated
**Follow-up panels:** ₹600–₹1,200 (subset of initial, doctor selects specific tests)
**Self-upload:** Free (patient provides own recent lab work)

> **⚠️ Pre-existing Source Discrepancy — Blood Work Billing:** APP-PATIENT.md Section 13.1 states lab tests are "billed separately from the subscription — they are NOT included in the monthly/quarterly/6-month plan price." However, PROJECT-OVERVIEW.md Section 5, onlyou-spec-resolved-v4.md Section 5, and PORTAL-LAB-FIXED.md Section 24 all state "First panel: INCLUDED in subscription." This document follows the majority authoritative sources (first panel included). This discrepancy in APP-PATIENT.md should be resolved during implementation.

*(Source: PORTAL-LAB-FIXED.md Section 24, APP-PATIENT.md Section 13.1)*

### 9.2 Blood Work Flow

1. Doctor orders blood work from case review → selects "Extended Hair Panel"
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

### 9.3 Blood Work Tracking (Patient App)

```
┌─────────────────────────────────────┐
│  🔬 Blood Work — Hair Loss           │
│  Panel: Extended Hair                │
│                                      │
│  ✅ Ordered (2 Feb, 10:00 AM)        │
│  ✅ Slot Booked (2 Feb, 2:30 PM)     │
│  🔵 Nurse Assigned                    │
│  ⚪ Sample Collected                  │
│  ⚪ Sample Received at Lab            │
│  ⚪ Processing Started                │
│  ⚪ Results Ready                     │
│  ⚪ Doctor Reviewed                   │
│                                      │
│  Nurse: Priya S. — arriving ~3 PM   │
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

### 10.2 Delivery Tracking (Patient App)

```
┌─────────────────────────────────────┐
│  📦 Treatment Kit — Hair Loss         │
│  Finasteride 1mg, Minoxidil 5%      │
│                                      │
│  ✅ Prescription Created (1 Feb)      │
│  ✅ Sent to Pharmacy (1 Feb)          │
│  ✅ Pharmacy Preparing (2 Feb)        │
│  🔵 Ready for Pickup                  │
│  ⚪ Out for Delivery                  │
│  ⚪ Delivered                          │
│                                      │
│  Pharmacy: MedPlus, Banjara Hills   │
│  [Track] [Contact Support]          │
└─────────────────────────────────────┘
```

*(Source: APP-PATIENT.md Section 6.1)*

### 10.3 Privacy & Packaging

- Plain packaging — no condition or medication names visible externally
- "Onlyou" branding only on the box
- Anonymous patient IDs used for pharmacy/lab partners — they never see the condition name
- Delivery confirmed via OTP — only the patient can receive the package

*(Source: PROJECT-OVERVIEW.md Section 7, onlyou-spec-resolved-v4.md Section 6)*

### 10.4 Auto-Refill

- Medication auto-reorders on subscription renewal cycle
- No manual reorder needed for active subscribers
- Monthly subscribers: auto-refill every 30 days
- Quarterly subscribers: auto-refill every 30 days (plan covers 3 cycles)
- 6-Month subscribers: auto-refill every 30 days (plan covers 6 cycles)

*(Source: PROJECT-OVERVIEW.md Section 6)*

---

## 11. Follow-Up Care & Check-Ins

### 11.1 Follow-Up Schedule

| Time Point | Type | Questionnaire | Photos | Purpose |
|------------|------|--------------|--------|---------|
| 4 weeks | Side effects check | 10 questions (abbreviated) | No | Early side effect detection, compliance check |
| 3 months | Progress review | 10 questions + 4 new photos | Yes | Treatment response assessment |
| 6 months | Full assessment | 15 questions + 4 new photos | Yes | Comprehensive progress review |
| 12 months | Annual review | Full questionnaire + photos | Yes | Long-term efficacy review |

*(Source: PORTAL-DOCTOR.md Section 24.1, APP-PATIENT.md Section 12.4)*

### 11.2 Follow-Up Patient Flow

1. Notification sent when follow-up is due
2. Home tab shows "Check-in Due" card with `[Start Check-in]` CTA
3. Abbreviated questionnaire (10 questions) — reuses questionnaire engine with follow-up JSON schema
4. New photos (at 3-month and 6-month milestones)
5. Doctor reviews → may adjust prescription

*(Source: APP-PATIENT.md Section 12.4)*

### 11.3 Follow-Up in Doctor Queue

Follow-up cases appear with distinct markers:
- **Badge:** "Follow-Up" badge (blue) instead of "New" badge
- **AI Assessment:** Includes delta analysis comparing initial vs. follow-up
- **Photos tab:** Automatically shows comparison mode (baseline vs. follow-up)
- **Questionnaire tab:** Shows "changes only" toggle by default

*(Source: PORTAL-DOCTOR.md Section 24.2)*

### 11.4 Follow-Up AI Delta Analysis

```
┌────────────────────────────────────────────────────┐
│  📊 PROGRESS ANALYSIS (vs. Initial Assessment)     │
│                                                    │
│  Overall trajectory: ✅ Improving                  │
│                                                    │
│  • Symptom severity: Moderate → Mild (improved)    │
│  • Self-reported satisfaction: 3/5 → 4/5           │
│  • Side effects: None reported (stable)            │
│  • Medication compliance: Good (reported)          │
│                                                    │
│  RECOMMENDATION:                                    │
│  "Patient showing positive response to current     │
│   protocol. Recommend continuing current regimen.  │
│   Consider adding oral supplement if lab results   │
│   show persistent vitamin D deficiency."           │
└────────────────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 24.3)*

### 11.5 Follow-Up Photo Comparison

For follow-up consultations, the doctor's Photos tab switches to comparison mode:

- **Side-by-side view** (default): baseline left, follow-up right, with date labels
- **Slider overlay mode:** drag vertical divider to reveal baseline vs. follow-up
- Toggle between the two modes
- If multiple follow-ups exist → dropdown to select which two timepoints to compare
- All photos in a comparison pair are from the same angle/position

*(Source: PORTAL-DOCTOR.md Section 8.3)*

### 11.6 Follow-Up Questionnaire Comparison

Doctor sees both initial and follow-up responses:

```
┌──────────────────────────────────────────────────────┐
│  Q: How would you rate your hair loss severity?      │
│                                                      │
│  Initial (15 Jan 2026):  "Moderate — noticeable"     │
│  Follow-up (15 Apr 2026): "Mild — slight improvement"│
│                           ↑ Changed ✅               │
└──────────────────────────────────────────────────────┘
```

- Changed answers: green "Changed ✅" badge
- Unchanged answers: shown normally
- "Show changes only" toggle to filter to changed answers

*(Source: PORTAL-DOCTOR.md Section 7.3)*

---

## 12. Messaging

### 12.1 Patient ↔ Doctor Chat

Accessible from Messages tab in the patient app. Hair Loss–specific quick reply chips:

| Chip Label | Pre-filled Message |
|------------|-------------------|
| "When will I see results?" | "Hi Doctor, when can I expect to start seeing results from my treatment?" |
| "Side effects?" | "Hi Doctor, I have a question about possible side effects of my medication." |
| "Missed a dose" | "Hi Doctor, I missed a dose of my medication. What should I do?" |
| "Need a refill" | "Hi Doctor, I'm running low on medication and need a refill." |
| "Schedule check-in" | "Hi Doctor, I'd like to schedule my next check-in." |
| "Upload new photos" | "Hi Doctor, I'd like to share updated progress photos." |

Quick replies are condition-specific — Hair Loss shows different options than other verticals.

*(Source: APP-PATIENT.md Section 7)*

### 12.2 Doctor Canned Messages (Hair Loss–Specific)

Examples from doctor portal:
- "Take with food" → "Please make sure to take your medication with a full meal to avoid stomach discomfort."
- "Minoxidil application tip" → "For best results, apply minoxidil to completely dry hair. Wet scalp reduces absorption by up to 50%."

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

### 14.1 Patient Notifications (Hair Loss Journey)

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
| Medication dispatched | ✅ "Your treatment kit is on its way" | ✅ | — |
| Delivery OTP | — | ✅ (OTP code) | — |
| Delivered | ✅ "Package delivered" | — | — |
| 4-week check-in due | ✅ "Time for your check-in" | ✅ | ✅ |
| 3-month check-in due | ✅ "Progress review time" | ✅ | ✅ |
| 6-month check-in due | ✅ "Full assessment due" | ✅ | ✅ |
| Subscription renewal reminder | ✅ "Renewal in 3 days" | ✅ | ✅ |
| Payment failed | ✅ "Payment failed — update payment" | ✅ | ✅ |

Notification channel preferences are user-configurable. "Discreet mode" option hides condition names from push notifications.

*(Source: PORTAL-ADMIN.md Section 25, APP-PATIENT.md, PROJECT-OVERVIEW.md Section 6)*

---

## 15. Landing Page — Hair Loss Condition Page

### 15.1 URL & SEO

- **URL:** `https://onlyou.life/hair-loss/`
- **Title tag:** `Hair Loss Treatment Online India — Clinically Proven Plans from ₹750/mo | Onlyou`
- **Meta description:** `Get prescription hair loss treatment from licensed dermatologists. Finasteride, Minoxidil & more. AI assessment + doctor consultation + medication delivered discreetly. Starting ₹750/mo.`
- **H1:** `Clinically proven hair loss treatment — delivered discreetly`
- **Canonical:** `https://onlyou.life/hair-loss/`

*(Source: LANDING-PAGE.md Section 5)*

### 15.2 Target Keywords

- **Primary:** "hair loss treatment online India", "hair loss treatment home delivery"
- **Secondary:** "finasteride online India", "minoxidil prescription online", "dermatologist online consultation hair", "hair thinning treatment men", "female pattern hair loss treatment"
- **Long-tail:** "hair loss doctor consultation from home India", "discreet hair loss medication delivery"

*(Source: LANDING-PAGE.md Section 5)*

### 15.3 Condition Page Structure (12 Sections)

1. **Condition Hero** — H1, condition description (2–3 sentences), "Start Your Hair Loss Assessment" CTA, condition accent color background
2. **What Is Hair Loss?** — 300–500 words, educational, empathetic tone, de-stigmatizing language
3. **Causes & Risk Factors** — Medically accurate, referenced to Indian demographic data
4. **Symptoms** — "Do you experience any of these?" framing
5. **How Onlyou Treats Hair Loss** — 3-step recap mentioning 4 photos requirement
6. **Treatments We Prescribe** — "Oral medications (DHT blockers), Topical treatments (growth stimulators), Combination therapy" (NOT specific brand names/dosages — that's the doctor's decision)
7. **Why Onlyou?** — 4 differentiators vs. alternatives
8. **Pricing** — Hair Loss pricing table (Monthly / Quarterly / 6-Month)
9. **What's Included** — AI assessment, specialist consultation, prescription, medication delivery, ongoing check-ins, first blood panel when indicated
10. **FAQ** — 8–10 hair loss–specific questions
11. **CTA** — "Start Your Hair Loss Assessment" → app download link
12. **Related Conditions** — Cross-links to other condition pages

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

*(Source: LANDING-PAGE.md Section 18)*

---

## 16. Admin Operations (Hair Loss)

### 16.1 Subscription Plan Management

**Route:** `/settings/plans` in admin portal

Hair Loss plan editor:
- Monthly: ₹999
- Quarterly: ₹2,499
- 6-Month: ₹4,499

Price changes apply to new subscriptions only. Existing subscriptions keep current pricing. All changes logged in audit trail.

*(Source: PORTAL-ADMIN.md Section 24)*

### 16.2 Case Queue Filter

Admin/coordinator can filter the case queue by "Hair Loss" condition badge to view all hair loss cases.

Filter chips: All | **Hair Loss** | ED | PE | Weight | PCOS

*(Source: onlyou-spec-resolved-v4.md Section 4.2)*

---

## 17. Database Schema (Hair Loss–Relevant)

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

### 17.2 Consultation Record Fields (Hair Loss)

| Field | Type | Hair Loss–Specific Notes |
|-------|------|------------------------|
| `conditionType` | `ConditionType` | `HAIR_LOSS` |
| `questionnaireResponseId` | UUID | Links to 28-question hair loss questionnaire (see Section 4) |
| `aiAssessmentId` | UUID | Contains `norwoodScale`, `finasterideSafetyCheck`, `alopeciaType` in `conditionSpecific` JSON |
| `photos` | Photo[] | 4 photos (crown, hairline, left temple, right temple) |
| `prescriptionTemplateUsed` | String | One of: Standard, Minoxidil Only, Conservative, Combination Plus, Advanced, Female AGA, Custom |

### 17.3 AI Assessment `conditionSpecific` JSON Schema (Hair Loss)

```json
{
  "norwoodScale": "Stage III Vertex",
  "finasterideSafetyCheck": "Caution",
  "alopeciaType": "Androgenetic Alopecia (Male Pattern)",
  "hairDensityZoneAssessment": {
    "frontal": "moderate thinning",
    "midScalp": "mild thinning",
    "vertex": "significant thinning",
    "temporal": "mild recession"
  }
}
```

*(Source: BACKEND-PART1.md Section 8.3)*

---

## 18. Testing Checklist

### 18.1 End-to-End Flow (from Phase 6 Checkpoint)

> **✅ Phase 6 Checkpoint:** Full Hair Loss patient journey end-to-end: sign up → questionnaire → AI → payment → doctor prescribes → pharmacy prepares → delivery confirmed → patient sees everything in Activity tab with steppers. Push/WhatsApp notifications fire at each step.

*(Source: onlyou-spec-resolved-v4.md — Phase 6)*

### 18.2 Critical Test Cases

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| C1 | Create consultation | Patient app → select Hair Loss → complete questionnaire | Consultation created, status: SUBMITTED |
| C2 | Photo upload | Patient app → upload 4 head photos | Photos visible in consultation, S3 upload confirmed |
| C3 | AI assessment | After photo upload → wait for AI processing | Assessment generated (Norwood scale, flags, contraindications), status: AI_COMPLETE |
| C4 | Doctor receives case | Doctor portal → check caseload | New case appears in "New" tab with AI assessment |
| C5 | Doctor reviews | Doctor portal → open case → view questionnaire + photos + AI | All data visible, status: IN_REVIEW |
| C6 | Prescription created | Doctor portal → create prescription → select medications → sign | Prescription PDF generated, status: PRESCRIPTION_CREATED |
| C7 | Patient sees prescription | Patient app → consultation detail | Prescription card visible with medication list + PDF download |
| C8 | Lab order created | Doctor portal → order blood work panel | Lab order created, patient notified to book slot |

*(Source: BACKEND-PART3B.md — Testing section)*

### 18.3 Gender Branching Tests

| Test | Male Path | Female Path |
|------|-----------|-------------|
| Questionnaire branching | Male-specific questions, Norwood scale references | Female-specific questions, Ludwig scale references |
| Photo requirements | 4 photos (same for both) | 4 photos (same for both) |
| AI classification | Norwood Scale assessment | Ludwig Scale assessment |
| Prescription templates | Standard, Minoxidil Only, Conservative, Combination Plus, Advanced, Custom | Female AGA, Minoxidil Only, Conservative, Custom |
| Treatment options | Finasteride available (with safety check) | Finasteride generally avoided; Spironolactone available |

---

## 19. Differentiation vs. Competitors

| Feature | Onlyou (Hair Loss) | Man Matters / Be Bodywise | Practo | Apollo 24/7 |
|---------|-------------------|--------------------------|--------|-------------|
| Prescription medication | ✅ Finasteride, Minoxidil Rx | ❌ Supplements/cosmetics | ✅ One-off prescription | ✅ One-off prescription |
| AI pre-assessment | ✅ Claude-powered classification | ❌ | ❌ | ❌ |
| Photo-based assessment | ✅ 4-angle clinical photos | ❌ | ❌ | ❌ |
| Subscription model | ✅ Ongoing care included | ✅ Product subscription | ❌ | ❌ |
| Integrated lab work | ✅ Extended Hair Panel | ❌ | ❌ | ❌ |
| Follow-up cadence | ✅ 4w / 3m / 6m structured | ❌ | ❌ | ❌ |
| Progress photos comparison | ✅ Side-by-side + slider | ❌ | ❌ | ❌ |
| Discreet delivery | ✅ Plain packaging, OTP | ❌ Branded packaging | N/A | ❌ Branded |
| Specialist type | Dermatologist/Trichologist | Generic "wellness expert" | Random doctor | Random doctor |

*(Source: PROJECT-OVERVIEW.md Section 3)*

---

## 20. Cross-Reference Index

This section maps every Hair Loss–specific detail to its authoritative source document.

| Topic | Primary Source | Section |
|-------|---------------|---------|
| Pricing (authoritative) | onlyou-spec-resolved-v4.md | Section 5 |
| Target audience & doctor type | PROJECT-OVERVIEW.md | Section 4 |
| Subscription inclusions | PROJECT-OVERVIEW.md | Section 5 |
| Patient journey (high-level) | PROJECT-OVERVIEW.md | Section 6 |
| Condition selection screen | APP-PATIENT.md | Section 5 |
| Questionnaire engine | APP-PATIENT.md | Section 9 |
| Photo upload | APP-PATIENT.md | Section 10 |
| Plan selection & payment | APP-PATIENT.md | Section 11 |
| Follow-up cadence (patient) | APP-PATIENT.md | Section 12.4 |
| Lab booking & tracking | APP-PATIENT.md | Section 13 |
| Activity tab (steppers) | APP-PATIENT.md | Section 6 |
| Messaging (patient side) | APP-PATIENT.md | Section 7 |
| AI assessment layout | PORTAL-DOCTOR.md | Section 6 |
| AI extensions (Hair Loss) | PORTAL-DOCTOR.md | Section 6.2 |
| Questionnaire tab (doctor) | PORTAL-DOCTOR.md | Section 7 |
| Photos tab (doctor) | PORTAL-DOCTOR.md | Section 8 |
| Prescription builder | PORTAL-DOCTOR.md | Section 12 |
| Prescription templates | PORTAL-DOCTOR.md | Section 12.3 |
| Follow-up handling (doctor) | PORTAL-DOCTOR.md | Section 24 |
| Photo comparison (follow-up) | PORTAL-DOCTOR.md | Section 8.3 |
| SLA thresholds | PORTAL-DOCTOR.md | Section 23.3 |
| Canned messages | PORTAL-DOCTOR.md | Section 20 |
| Lab test panels | PORTAL-LAB-FIXED.md | Section 24 |
| Nurse visit flow | PORTAL-NURSE-FIXED.md | Main flow |
| Admin plan management | PORTAL-ADMIN.md | Section 24 |
| Landing page (condition page) | LANDING-PAGE.md | Section 5 |
| SEO & structured data | LANDING-PAGE.md | Sections 5, 10, 18 |
| Questionnaire JSON schema | BACKEND-PART1.md | Section 6.1 |
| AI prompt construction | BACKEND-PART1.md | Section 8.2 |
| AI output extensions | BACKEND-PART1.md | Section 8.3 |
| Database schema | BACKEND-PART2A.md | Prisma models |
| Build phase & checkpoint | onlyou-spec-resolved-v4.md | Phase 6 (Weeks 16–19) |
| Testing checklist | BACKEND-PART3B.md | Test cases C1–C8 |
| Competitor differentiation | PROJECT-OVERVIEW.md | Section 3 |

---

*End of VERTICAL-HAIR-LOSS.md*
