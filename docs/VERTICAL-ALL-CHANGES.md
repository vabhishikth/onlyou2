# VERTICAL-*.md (ALL 5 DOCS) — Change Summary
## Payment Flow Redesign: "Pay After Doctor, Not Before"

---

## OVERVIEW

All 5 vertical documents share the same structure and need the same core changes. This document consolidates them to avoid repetition. Where a vertical has unique nuances, they're called out explicitly.

| Vertical | Doc | Unique Nuances |
|----------|-----|---------------|
| Hair Loss | VERTICAL-HAIR-LOSS.md | Photo upload step in flow |
| ED | VERTICAL-ED.md | No photos, age gate |
| PE | VERTICAL-PE.md | No photos, age gate, rare blood work |
| Weight | VERTICAL-WEIGHT.md | Two-tier system (Standard/GLP-1), different flow structure (§7.1 not §3.1), photos |
| PCOS | VERTICAL-PCOS-PART1.md | Optional photos, fertility branching, period tracker |

### Changes per vertical (same pattern × 5):

| Change | Section | Description |
|--------|---------|-------------|
| VT-1 | §2.2 | "What's Included" list — add free consultation item |
| VT-2 | §2.4 | Payment Implementation — source reference update |
| VT-3 | §3.1 (§7.1 for Weight) | High-Level Flow — complete rewrite |
| VT-4 | §3.2 (§7 for Weight) | Condition Selection Screen — "How It Works" update |
| VT-5 | §2.3 | Blood work discrepancy note — resolved |
| VT-6 | Cross-ref table | Update APP-PATIENT.md Section 11 reference |

---

# VT-1: Section 2.2 — "What's Included" List (ALL 5 VERTICALS)

### ADD as item #1 (shift existing items down):

**NEW item 1 for all verticals:**
```
1. Free specialist consultation — doctor reviews your case and creates a personalized treatment plan before any payment
```

**Existing items shift to 2, 3, 4, etc.**

### Example for Hair Loss (others follow same pattern):

**OLD:**
```
1. AI-powered pre-assessment — Norwood/Ludwig classification + risk analysis by Claude
2. Async doctor consultation — dermatologist reviews case, asks follow-ups if needed
3. E-prescription — generated from hair loss–specific templates, PDF stored in S3
4. Medication — discreet local delivery with OTP confirmation
5. Ongoing check-ins — 4-week, 3-month, 6-month cadence
6. First blood panel — included when clinically indicated (Thyroid + Iron Panel: ₹1,200 value)
```

**NEW:**
```
1. Free specialist consultation — dermatologist reviews your case and creates a personalized treatment plan before any payment
2. AI-powered pre-assessment — Norwood/Ludwig classification + risk analysis by Claude
3. Async doctor consultation — dermatologist reviews case, asks follow-ups if needed
4. E-prescription — generated from hair loss–specific templates, PDF stored in S3
5. Medication — discreet local delivery with OTP confirmation
6. Ongoing check-ins — 4-week, 3-month, 6-month cadence
7. First blood panel — included when clinically indicated (Thyroid + Iron Panel: ₹1,200 value)
```

> **Apply to all 5 verticals** with the appropriate doctor type:
> - Hair Loss: "dermatologist"
> - ED: "urologist/andrologist"
> - PE: "urologist/andrologist/sexual medicine specialist"
> - Weight: "obesity medicine specialist/endocrinologist"
> - PCOS: "gynecologist/endocrinologist"

---

# VT-2: Section 2.4 — Payment Implementation Source Reference (ALL 5 VERTICALS)

### UPDATE the source reference:

**OLD:**
```
*(Source: APP-PATIENT.md Section 11.2)*
```

**NEW:**
```
*(Source: APP-PATIENT.md Section 11.4)*
```

> Reason: APP-PATIENT.md Section 11 was restructured. Old §11.2 (Payment) is now §11.4.

---

# VT-3: Section 3.1 — High-Level Flow (REWRITE — ALL 5 VERTICALS)

This is the main change. Each vertical has the same "Selects plan & pays → Doctor reviews" pattern that needs to be reversed.

---

## HAIR LOSS — Section 3.1

### OLD:
```
...
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
        ...
        ├─── REFERS ──→ Partner clinic near patient
        │
        └─── REFUNDS ──→ Full/partial refund if cannot treat
        │
        ▼
ONGOING CARE (check-ins at 4 weeks / 3 months / 6 months)
```

### NEW:
```
...
AI pre-assessment (Claude analyzes → Norwood/Ludwig classification, risk flags, contraindications)
        │
        ▼
Assessment submitted (FREE — no payment collected)
        │
        ▼
Doctor reviews case — FREE (dermatologist sees AI summary + raw data → 3–8 min per case)
        │
        ├─── CREATES TREATMENT PLAN ──────────────────────┐
        │                                                  ▼
        │                                    Treatment plan shown to patient
        │                                    (doctor name, diagnosis, medications,
        │                                     prescription PDF viewable before payment)
        │                                                  │
        │                                                  ▼
        │                                    Selects plan & pays
        │                                    (Monthly/Quarterly/6-Month via Razorpay)
        │                                                  │
        │                                                  ▼
        │                                    Prescription → Pharmacy
        │                                    Pharmacy prepares → Ready
        │                                    Coordinator arranges delivery
        │                                    Delivery person → OTP → Delivered
        │
        ├─── ORDERS BLOOD WORK ──┐
        │    (free during         ▼
        │     initial consult)   Nurse visits home
        │                        Collects blood
        │                        Records vitals
        │                        Delivers to lab
        │                        Lab processes
        │                        Results uploaded
        │                        Doctor reviews
        │                        Then creates treatment plan ─────────┘
        │
        ├─── REQUESTS MORE INFO ──→ Chat message → Patient responds → Doctor re-reviews
        │
        ├─── REFERS ──→ Partner clinic near patient (no charge to patient)
        │
        └─── DECLINES ──→ Not a candidate for treatment (no charge to patient)
        │
        ▼
ONGOING CARE (check-ins at 4 weeks / 3 months / 6 months)
```

### UPDATE the source reference:

**OLD:** `*(Source: PROJECT-OVERVIEW.md Section 6)*`

**NEW:** `*(Source: PROJECT-OVERVIEW.md Section 6 — updated for pay-after-doctor flow)*`

---

## ED — Section 3.1

### OLD:
```
...
AI pre-assessment (Claude analyzes → IIEF-5 scoring, CV risk, nitrate check, etiology)
        │
        ▼
Selects plan & pays (Monthly/Quarterly/6-Month via Razorpay)
        │
        ▼
Doctor reviews case (urologist sees AI summary + raw data → 3–8 min per case)
        │
        ...
        ├─── REFERS ──→ Partner clinic / specialist near patient
        │
        └─── REFUNDS ──→ Full/partial refund if cannot treat (e.g., nitrate user)
```

### NEW:
```
...
AI pre-assessment (Claude analyzes → IIEF-5 scoring, CV risk, nitrate check, etiology)
        │
        ▼
Assessment submitted (FREE — no payment collected)
        │
        ▼
Doctor reviews case — FREE (urologist sees AI summary + raw data → 3–8 min per case)
        │
        ├─── CREATES TREATMENT PLAN ──────────────────────┐
        │                                                  ▼
        │                                    Treatment plan shown to patient
        │                                    (doctor name, diagnosis, medications,
        │                                     prescription PDF viewable before payment)
        │                                                  │
        │                                                  ▼
        │                                    Selects plan & pays
        │                                    (Monthly/Quarterly/6-Month via Razorpay)
        │                                                  │
        │                                                  ▼
        │                                    Prescription → Pharmacy
        │                                    Pharmacy prepares → Ready
        │                                    Coordinator arranges delivery
        │                                    Delivery person → OTP → Delivered
        │
        ├─── ORDERS BLOOD WORK ──┐
        │    (free during         ▼
        │     initial consult)   Nurse visits home
        │                        Collects blood
        │                        Records vitals
        │                        Delivers to lab
        │                        Lab processes
        │                        Results uploaded
        │                        Doctor reviews
        │                        Then creates treatment plan ─────────┘
        │
        ├─── REQUESTS MORE INFO ──→ Chat message → Patient responds → Doctor re-reviews
        │
        ├─── REFERS ──→ Partner clinic / specialist near patient (no charge to patient)
        │
        └─── DECLINES ──→ Not a candidate (e.g., nitrate user — no charge to patient)
```

> **ED-specific note:** The `REFUNDS` → `DECLINES` rename is especially important here. The most common decline reason for ED is nitrate contraindication — under the old model this was "refund if cannot treat," now it's simply "no charge, patient never paid." This is a much better patient experience.

---

## PE — Section 3.1

### OLD:
```
...
AI pre-assessment (Claude analyzes → PEDT scoring, PE type classification, serotonin check, ED comorbidity)
        │
        ▼
Selects plan & pays (Monthly/Quarterly/6-Month via Razorpay)
        │
        ▼
Doctor reviews case (urologist sees AI summary + raw data → 3–6 min per case)
        │
        ...
        ├─── REFERS ──→ Urologist (prostatitis) / Sex therapist / Partner clinic
        │
        └─── REFUNDS ──→ Full/partial refund if cannot treat
```

### NEW:
```
...
AI pre-assessment (Claude analyzes → PEDT scoring, PE type classification, serotonin check, ED comorbidity)
        │
        ▼
Assessment submitted (FREE — no payment collected)
        │
        ▼
Doctor reviews case — FREE (urologist sees AI summary + raw data → 3–6 min per case)
        │
        ├─── CREATES TREATMENT PLAN ──────────────────────┐
        │                                                  ▼
        │                                    Treatment plan shown to patient
        │                                    (doctor name, diagnosis, medications,
        │                                     prescription PDF viewable before payment)
        │                                                  │
        │                                                  ▼
        │                                    Selects plan & pays
        │                                    (Monthly/Quarterly/6-Month via Razorpay)
        │                                                  │
        │                                                  ▼
        │                                    Prescription → Pharmacy
        │                                    Pharmacy prepares → Ready
        │                                    Coordinator arranges delivery
        │                                    Delivery person → OTP → Delivered
        │
        ├─── ORDERS BLOOD WORK ──┐
        │    (rare — thyroid/     ▼
        │     prostatitis only,  Nurse visits home
        │     free during        Collects blood
        │     initial consult)   Records vitals
        │                        Delivers to lab
        │                        Lab processes
        │                        Results uploaded
        │                        Doctor reviews
        │                        Then creates treatment plan ─────────┘
        │
        ├─── REQUESTS MORE INFO ──→ Chat message → Patient responds → Doctor re-reviews
        │
        ├─── REFERS ──→ Urologist (prostatitis) / Sex therapist / Partner clinic (no charge to patient)
        │
        └─── DECLINES ──→ Not a candidate for treatment (no charge to patient)
```

---

## WEIGHT MANAGEMENT — Section 7.1

> **Note:** Weight uses Section 7.1 (not 3.1) and has a different flow structure that includes two-tier plan selection and a different ordering (plan selection → payment → case created → AI → doctor).

### OLD:
```
...
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
  ...
    │
    ▼
Prescription Sent to Pharmacy
  ...
    │
    ▼
Follow-Up Cycle Begins
  ...
    │
    ▼
Subscription Auto-Renews or Patient Cancels
```

### NEW:
```
...
Photo Upload (2 photos: front full-body + side full-body)
    │
    ▼
Assessment Submitted (FREE — no payment collected)
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
Doctor Reviews Case — FREE (Async)
  ├── Reviews AI assessment, questionnaire answers, photos
  ├── Selects/modifies prescription template
  ├── Orders Metabolic Panel if clinically indicated
  └── Creates treatment plan
    │
    ├─── CREATES TREATMENT PLAN ──────────────────────────┐
    │                                                      ▼
    │                                    Treatment plan shown to patient
    │                                    (doctor name, diagnosis, tier recommendation,
    │                                     medications, prescription PDF viewable)
    │                                                      │
    │                                                      ▼
    │                                    Plan Selection
    │                                      ├── Standard Tier: Monthly / Quarterly / 6-Month
    │                                      └── GLP-1 Premium: "Coming Soon" (MVP)
    │                                                      │
    │                                                      ▼
    │                                    Payment (Razorpay — UPI / Card / Net Banking)
    │                                                      │
    │                                                      ▼
    │                                    Prescription Sent to Pharmacy
    │                                    Pharmacy verifies stock + pricing
    │                                    Medication dispensed + shipped
    │                                    Patient receives medication
    │
    ├─── ORDERS BLOOD WORK ──┐
    │    (Metabolic Panel,    ▼
    │     free during        Lab Booking
    │     initial consult)     ├── Home collection or walk-in
    │                          └── Results → Doctor reviews → Then creates plan ──┘
    │
    ├─── REQUESTS MORE INFO ──→ Chat → Patient responds → Doctor re-reviews
    │
    ├─── REFERS ──→ Endocrinologist / bariatric specialist (no charge to patient)
    │
    └─── DECLINES ──→ Not a candidate (e.g., eating disorder flagged — no charge to patient)
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

### Key differences for Weight:
1. **Plan selection moved AFTER doctor review** — doctor's treatment plan now informs which tier to show prominently
2. **AI runs BEFORE doctor review** (same as before, but now before payment too)
3. **Old flow had "Case Created → Enters Doctor Queue" after payment** — now case is created at submission (free), enters queue immediately
4. **"Approves case" replaced with "Creates treatment plan"** — more accurate phrasing
5. **Doctor's tier recommendation visible** on treatment plan screen — if doctor recommends Standard, GLP-1 card remains greyed out with "Coming Soon" but patient sees doctor's reasoning

---

## PCOS — Section 3.1

### OLD:
```
...
AI pre-assessment (Claude analyzes → Rotterdam criteria check, phenotype classification, fertility-aware flags)
        │
        ▼
Selects plan & pays (Monthly/Quarterly/6-Month via Razorpay)
        │
        ▼
Doctor reviews case (gynecologist/endocrinologist sees AI summary + raw data → 5–10 min per case)
        │
        ...
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

### NEW:
```
...
AI pre-assessment (Claude analyzes → Rotterdam criteria check, phenotype classification, fertility-aware flags)
        │
        ▼
Assessment submitted (FREE — no payment collected)
        │
        ▼
Doctor reviews case — FREE (gynecologist/endocrinologist sees AI summary + raw data → 5–10 min per case)
        │
        ├─── CREATES TREATMENT PLAN ──────────────────────┐
        │    (fertility-aware template selection)          ▼
        │                                    Treatment plan shown to patient
        │                                    (doctor name, diagnosis, PCOS phenotype,
        │                                     fertility-aware medications,
        │                                     prescription PDF viewable before payment)
        │                                                  │
        │                                                  ▼
        │                                    Selects plan & pays
        │                                    (Monthly/Quarterly/6-Month via Razorpay)
        │                                                  │
        │                                                  ▼
        │                                    Prescription → Pharmacy
        │                                    Pharmacy prepares → Ready
        │                                    Coordinator arranges delivery
        │                                    Delivery person → OTP → Delivered
        │
        ├─── ORDERS BLOOD WORK ──┐
        │    (almost always,      ▼
        │     free during        Nurse visits home
        │     initial consult)   Collects blood
        │                        Records vitals
        │                        Delivers to lab
        │                        Lab processes
        │                        Results uploaded
        │                        Doctor reviews
        │                        Then creates treatment plan ─────────┘
        │
        ├─── REQUESTS MORE INFO ──→ Chat message → Patient responds → Doctor re-reviews
        │
        ├─── REFERS ──→ Fertility specialist / Endocrinologist (no charge to patient)
        │
        └─── DECLINES ──→ Not a candidate for treatment (no charge to patient)
        │
        ▼
ONGOING CARE
  ├── Check-ins at 4 weeks / 3 months / 6 months
  ├── Period tracker data reviewed at each check-in
  └── Treatment adjusted based on cycle regularity + lab trends
```

---

# VT-4: Section 3.2 — Condition Selection Screen (ALL 5 VERTICALS)

### In the "How It Works" 3-step summary, UPDATE Step 2:

**OLD (all verticals use a variation of):**
```
Step 2: "Get matched with a specialist" (doctor icon)
```

**NEW:**
```
Step 2: "Get a free doctor review" (doctor icon)
```

### In the "What You Get" checklist, ADD as first item:

```
Free specialist consultation (no payment until you see your treatment plan)
```

### For the "Pricing cards" line, ADD note:

**OLD:**
```
7. Pricing cards (Monthly / Quarterly / 6-Month)
```

**NEW:**
```
7. Pricing cards (Monthly / Quarterly / 6-Month) — shown for reference; actual plan selection happens after doctor creates treatment plan
```

---

# VT-5: Section 2.3 — Blood Work Discrepancy Note (HAIR LOSS, ED, PCOS)

### REPLACE the existing discrepancy warning with a resolution note:

**OLD (appears in Hair Loss, ED, PCOS):**
```
> **⚠️ Pre-existing Source Discrepancy — Blood Work Billing:** APP-PATIENT.md Section 13.1 states lab tests are "billed separately from the subscription — they are NOT included in the monthly/quarterly/6-month plan price." However, PROJECT-OVERVIEW.md Section 5, onlyou-spec-resolved-v4.md Section 5, and PORTAL-LAB-FIXED.md Section 24 all state "First panel: INCLUDED in subscription." This document follows the majority authoritative sources (first panel included). This discrepancy in APP-PATIENT.md should be resolved during implementation.
```

**NEW:**
```
> **✅ Resolved — Blood Work Billing:** APP-PATIENT.md Section 13.1 has been updated (see APP-PATIENT-CHANGES.md, Change 5) to clarify:
> - **Initial lab panel (during free consultation):** FREE to patient. Cost absorbed as acquisition cost.
> - **Follow-up lab panels (during active subscription):** Included in subscription, no additional charge.
> - **Standalone lab orders (edge case):** Standard pricing applies.
> This is now consistent across all documents.
```

### For PE, the existing note is different (no discrepancy warning). ADD:

```
> **Note on lab pricing during free consultation:** When a doctor orders blood work during the initial (free) consultation phase, the lab panel is free to the patient regardless of which panel is ordered. The cost is absorbed as customer acquisition cost. This applies to all PE-specific panels (Thyroid Check, Hormonal, Prostate, Combined).
```

### For Weight, ADD similar note in §5.3 or equivalent blood work section:

```
> **Note on lab pricing during free consultation:** The initial Metabolic Panel, when ordered during the free consultation phase, is free to the patient. Cost absorbed as customer acquisition cost.
```

---

# VT-6: Cross-Reference Table Updates (ALL 5 VERTICALS)

### Each vertical has a Cross-Reference Index table at the end. UPDATE these rows:

**OLD:**
```
| Plan selection & payment | APP-PATIENT.md | Section 11 |
```

**NEW:**
```
| Plan selection & payment | APP-PATIENT.md | Section 11 (restructured: §11.1 free submission, §11.2 treatment plan ready, §11.3 plan selection, §11.4 payment, §11.5 confirmation) |
```

**ADD new row:**
```
| Free consultation flow | APP-PATIENT.md | Section 11.1 |
| Treatment plan ready screen | APP-PATIENT.md | Section 11.2 |
| Payment flow redesign | BACKEND-ALL-CHANGES.md | All sections |
```

---

# SECTIONS WITH NO CHANGES (ALL 5 VERTICALS)

| Section | Reason |
|---------|--------|
| §1 (Overview/Scope) | No change |
| §2.1 (Pricing tables) | No change — prices unchanged |
| §4+ (Questionnaire) | No change — clinical content unchanged |
| AI Assessment sections | No change — AI runs same way, just before payment now |
| Prescription templates | No change |
| Follow-up cadence | No change |
| Medication fulfillment | No change |
| Referral edge cases | Minor — "REFUNDS" → "DECLINES" terminology only |
| Comorbidity handling | No change |

---

# SUMMARY — ALL CHANGES ACROSS 5 VERTICALS

| Change | Hair Loss | ED | PE | Weight | PCOS |
|--------|-----------|-----|-----|--------|------|
| VT-1: Add "free consultation" to inclusions | ✅ §2.2 | ✅ §2.2 | ✅ §2.2 | ✅ §5.2* | ✅ §2.2 |
| VT-2: Source ref update (§11.2 → §11.4) | ✅ §2.4 | ✅ §2.4 | ✅ §2.4 | ✅ §5.4* | ✅ §2.4 |
| VT-3: Patient journey flow rewrite | ✅ §3.1 | ✅ §3.1 | ✅ §3.1 | ✅ §7.1 | ✅ §3.1 |
| VT-4: "How It Works" + condition screen | ✅ §3.2 | ✅ §3.2 | ✅ §3.2 | ✅ §7 | ✅ §3.2 |
| VT-5: Blood work discrepancy resolved | ✅ §2.3 | ✅ §2.3 | ✅ §2.3 | ✅ §5.3* | ✅ §2.3 |
| VT-6: Cross-ref table update | ✅ end | ✅ end | ✅ end | ✅ end | ✅ end |

*Weight Management uses different section numbering but same content changes.

**Total: 6 changes × 5 verticals = 30 individual edits, all following the same pattern.**
