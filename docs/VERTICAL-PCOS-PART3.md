<!-- VERTICAL-PCOS-PART3: Sections 13–21 (Messaging through Cross-Reference Index) -->

# VERTICAL-PCOS.md — Part 3 of 3

## 13. Messaging

### 13.1 Patient ↔ Doctor Chat

Accessible from Messages tab in the patient app. PCOS-specific quick reply chips:

| Chip Label | Pre-filled Message |
|------------|-------------------|
| "Period tracker help" | "Hi Doctor, I have a question about how to use the period tracker." |
| "Side effects?" | "Hi Doctor, I'm experiencing side effects from my medication. Can you help?" |
| "Missed a dose" | "Hi Doctor, I missed a dose of my medication. What should I do?" |
| "Cycle update" | "Hi Doctor, I wanted to share an update about my menstrual cycle." |
| "Fertility question" | "Hi Doctor, I have a question about fertility and my PCOS treatment." |
| "Weight concern" | "Hi Doctor, I'm having difficulty with weight management alongside PCOS." |

Quick replies are condition-specific — PCOS shows different options than other verticals.

*(Source: APP-PATIENT.md Section 7)*

### 13.2 Doctor Canned Messages (PCOS-Specific)

Examples from doctor portal:
- "Metformin GI tip" → "If you're experiencing nausea or diarrhea from Metformin, try taking it in the middle of a meal rather than before. These side effects usually improve within 2–4 weeks."
- "Track your period" → "Please make sure to log your period days in the Onlyou app. This data helps me monitor your treatment progress and adjust your plan."

Doctors can create up to 20 custom canned messages (max 30-char label, max 500-char body). Placeholders: `{patient_name}`, `{medication}`.

*(Source: PORTAL-DOCTOR.md Section 20)*

---

## 14. SLA Thresholds

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

## 15. Notifications

### 15.1 Patient Notifications (PCOS Journey)

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
| Period tracker reminder | ✅ "Don't forget to log your period" | — | — |
| Subscription renewal reminder | ✅ "Renewal in 3 days" | ✅ | ✅ |
| Payment failed | ✅ "Payment failed — update payment" | ✅ | ✅ |

Notification channel preferences are user-configurable. "Discreet mode" option hides condition names from push notifications.

*(Source: PORTAL-ADMIN.md Section 25, APP-PATIENT.md, PROJECT-OVERVIEW.md Section 6)*

---

## 16. Landing Page — PCOS Condition Page

### 16.1 URL & SEO

- **URL:** `https://onlyou.life/pcos/`
- **Title tag:** `PCOS Treatment Online India — Hormonal Management from ₹1,167/mo | Onlyou`
- **Meta description:** `Comprehensive PCOS management from specialist gynecologists & endocrinologists. Blood work, hormonal treatment, period tracking, ongoing monitoring. From ₹1,167/mo.`
- **H1:** `PCOS treatment that actually works — from specialist doctors who understand`
- **Canonical:** `https://onlyou.life/pcos/`

*(Source: LANDING-PAGE.md Section 9)*

### 16.2 Target Keywords

- **Primary:** "PCOS treatment online India", "PCOS doctor consultation online"
- **Secondary:** "PCOS medication delivery", "polycystic ovary syndrome treatment India", "hormonal treatment PCOS online"
- **Long-tail:** "PCOS blood test home collection India", "PCOS specialist doctor online consultation"

*(Source: LANDING-PAGE.md Section 9)*

### 16.3 Condition Page Structure (12 Sections)

1. **Condition Hero** — H1, condition description (2–3 sentences), "Start Your PCOS Assessment" CTA, condition accent color background
2. **What Is PCOS?** — 300–500 words, educational, empathetic tone, de-stigmatizing language, mention prevalence in Indian women (estimated 1 in 5)
3. **Causes & Risk Factors** — Hormonal imbalance, insulin resistance, genetics, lifestyle factors
4. **Symptoms** — "Do you experience any of these?" framing — irregular periods, acne, hirsutism, weight gain, hair thinning, mood changes
5. **How Onlyou Treats PCOS** — 3-step recap, mention period tracker, blood work emphasis
6. **Treatments We Prescribe** — "Hormonal regulation (OCPs), Insulin sensitizers (Metformin), Anti-androgens (Spironolactone), Fertility support (Clomiphene), Lifestyle management" (NOT specific brand names/dosages — doctor's decision)
7. **Why Onlyou?** — 4 differentiators vs. alternatives
8. **Pricing** — PCOS pricing table (Monthly / Quarterly / 6-Month)
9. **What's Included** — AI assessment, specialist consultation, prescription, medication delivery, ongoing check-ins, first blood panel, period tracker
10. **FAQ** — 8–10 PCOS-specific questions
11. **CTA** — "Start Your PCOS Assessment" → app download link
12. **Related Conditions** — Cross-links to other condition pages (especially Weight Management — PCOS + weight overlap)

*(Source: LANDING-PAGE.md Section 10)*

### 16.4 SEO Content

- Each condition page: 2,000–3,000 words of SEO-optimized long-form content
- Structured data: `MedicalCondition`, `FAQPage`, `Product` (subscription plan with pricing as `Offer`), `BreadcrumbList`

*(Source: LANDING-PAGE.md Section 10, onlyou-spec-resolved-v4.md Section 4.7)*

### 16.5 Structured Data Example

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalCondition",
  "name": "Polycystic Ovary Syndrome",
  "alternateName": "PCOS",
  "description": "A hormonal disorder common in women of reproductive age, causing irregular periods, excess androgen levels, and polycystic ovaries.",
  "possibleTreatment": [
    {
      "@type": "MedicalTherapy",
      "name": "Metformin",
      "drugClass": "Biguanide (insulin sensitizer)"
    },
    {
      "@type": "MedicalTherapy",
      "name": "Combined Oral Contraceptive",
      "drugClass": "Hormonal contraceptive"
    },
    {
      "@type": "MedicalTherapy",
      "name": "Spironolactone",
      "drugClass": "Anti-androgen"
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
    { "@type": "ListItem", "position": 2, "name": "PCOS", "item": "https://onlyou.life/pcos/" }
  ]
}
```

*(Source: LANDING-PAGE.md Section 18)*

---

## 17. Admin Operations (PCOS)

### 17.1 Subscription Plan Management

**Route:** `/settings/plans` in admin portal

PCOS plan editor:
- Monthly: ₹1,499
- Quarterly: ₹3,799
- 6-Month: ₹6,999

Price changes apply to new subscriptions only. Existing subscriptions keep current pricing. All changes logged in audit trail.

*(Source: PORTAL-ADMIN.md Section 24)*

### 17.2 Case Queue Filter

Admin/coordinator can filter the case queue by "PCOS" condition badge to view all PCOS cases.

Filter chips: All | Hair Loss | ED | PE | Weight | **PCOS**

*(Source: onlyou-spec-resolved-v4.md Section 4.2)*

---

## 18. Database Schema (PCOS-Relevant)

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

### 18.2 Consultation Record Fields (PCOS)

| Field | Type | PCOS-Specific Notes |
|-------|------|---------------------|
| `conditionType` | `ConditionType` | `PCOS` |
| `questionnaireResponseId` | UUID | Links to 32-question PCOS questionnaire (see Section 4) |
| `aiAssessmentId` | UUID | Contains `rotterdamCriteriaMet`, `pcosPhenotype`, `fertilityIntentBanner`, `insulinResistanceFlag` in `conditionSpecific` JSON |
| `photos` | Photo[] | 0–3 optional photos (facial acne, hirsutism face, hirsutism body) |
| `prescriptionTemplateUsed` | String | One of: Cycle Regulation, Anti-Androgen, Insulin Focused, Comprehensive, Lean PCOS, Natural, Progestin Only, Lifestyle First, Ovulation Induction, Metformin + Lifestyle, Refer Fertility, Custom |

### 18.3 AI Assessment `conditionSpecific` JSON Schema (PCOS)

```json
{
  "rotterdamCriteriaMet": {
    "oligo": true,
    "hyperandrogenism": true,
    "polycystic": false,
    "count": 2
  },
  "pcosPhenotype": "B",
  "fertilityIntentBanner": "Trying to conceive",
  "insulinResistanceFlag": "Probable — BMI 28.5, acanthosis nigricans reported"
}
```

*(Source: BACKEND-PART1.md Section 8.3)*

---

## 19. Testing Checklist

### 19.1 End-to-End Flow (from Phase 9 Checkpoint)

> **✅ Phase 9 Checkpoint:** PCOS questionnaire with Rotterdam criteria auto-check works, fertility-intent branching produces correct templates, period tracker records and displays cycle data. All 5 verticals now functional end-to-end.

*(Source: onlyou-spec-resolved-v4.md — Phase 9)*

### 19.2 Critical Test Cases

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| C1 | Create consultation | Patient app → select PCOS → complete questionnaire | Consultation created, status: SUBMITTED |
| C2 | Pregnancy hard block | Patient app → Q5 = "Yes" | Questionnaire blocks with message, cannot proceed |
| C3 | Breastfeeding hard block | Patient app → Q6 = "Yes" | Questionnaire blocks with message, cannot proceed |
| C4 | Rotterdam criteria calculation | Submit questionnaire with irregular periods + hirsutism | Rotterdam score: 2/3, isPCOSLikely: true |
| C5 | Fertility branching — TTC | Q19 = "Yes" → check doctor portal | Fertility intent banner displayed, TTC templates shown |
| C6 | Fertility branching — Not TTC | Q19 = "No" → check doctor portal | Standard templates shown, no fertility banner |
| C7 | AI assessment | After questionnaire → wait for AI processing | Assessment generated (Rotterdam, phenotype, fertility intent), status: AI_COMPLETE |
| C8 | Doctor receives case | Doctor portal → check caseload | New case appears in "New" tab with AI assessment |
| C9 | Prescription — TTC template | Doctor selects "Metformin + Lifestyle" (TTC) | Correct medications (Metformin + Folic Acid + Inositol), fertility-safe counseling notes |
| C10 | Prescription — Not TTC template | Doctor selects "Comprehensive" (Not TTC) | Correct medications (Metformin + Spironolactone + OCP) |
| C11 | Lab order — PCOS Screen Panel | Doctor orders blood work | Lab order created with all 9 tests, patient notified, fasting instruction shown |
| C12 | Period tracker — logging | Patient app → period tracker → log period | Data saved, synced to backend |
| C13 | Period tracker — doctor view | Doctor portal → PCOS case → Menstrual Calendar tab | Calendar displays logged period data, cycle insights |
| C14 | Optional photos | Patient uploads 1 of 3 optional photos | Photo visible in doctor portal, "Skip Photos" also works |

*(Source: BACKEND-PART3B.md — Testing section)*

### 19.3 Cross-Vertical Tests

| Test | Scenario | Expected |
|------|----------|----------|
| Weight → PCOS cross-flag | Female patient in Weight vertical with BMI ≥ 25 + irregular periods + PCOS history | AI adds cross-vertical suggestion for PCOS enrollment |
| Hair Loss → PCOS link | PCOS patient with significant hair thinning (Q10 = significant) | AI notes Hair Loss vertical consideration |
| PCOS + Weight dual concern | PCOS patient with BMI ≥ 30 | AI includes weight management recommendations alongside PCOS treatment |

---

## 20. Differentiation vs. Competitors

| Feature | Onlyou (PCOS) | Be Bodywise | Practo | Apollo 24/7 |
|---------|--------------|-------------|--------|-------------|
| Prescription medication | ✅ OCPs, Metformin, Spironolactone, Clomiphene | ❌ Supplements only | ✅ One-off prescription | ✅ One-off prescription |
| AI pre-assessment | ✅ Claude-powered Rotterdam criteria check | ❌ | ❌ | ❌ |
| Rotterdam criteria auto-check | ✅ Automated from questionnaire | ❌ | ❌ | ❌ |
| Fertility-aware templates | ✅ TTC vs. Not-TTC branching | ❌ | ❌ | ❌ |
| Subscription model | ✅ Ongoing care included | ✅ Product subscription | ❌ | ❌ |
| Integrated lab work | ✅ PCOS Screen Panel (9 tests) | ❌ | ❌ | ❌ |
| Period tracker | ✅ Built-in, shared with doctor | ❌ | ❌ | ❌ |
| Follow-up cadence | ✅ 4w / 3m / 6m structured | ❌ | ❌ | ❌ |
| Discreet delivery | ✅ Plain packaging, OTP | ❌ Branded packaging | N/A | ❌ Branded |
| Specialist type | Gynecologist/Endocrinologist | Generic "wellness expert" | Random doctor | Random doctor |

*(Source: PROJECT-OVERVIEW.md Section 3)*

---

## 21. Cross-Reference Index

This section maps every PCOS-specific detail to its authoritative source document.

| Topic | Primary Source | Section |
|-------|---------------|---------|
| Pricing (authoritative) | onlyou-spec-resolved-v4.md | Section 5 |
| Target audience & doctor type | PROJECT-OVERVIEW.md | Section 4 |
| Subscription inclusions | PROJECT-OVERVIEW.md | Section 5 |
| Patient journey (high-level) | PROJECT-OVERVIEW.md | Section 6 |
| Condition selection screen | APP-PATIENT.md | Section 5 |
| Questionnaire engine | APP-PATIENT.md | Section 9 |
| Questionnaire per vertical (PCOS: 32 questions) | APP-PATIENT.md | Section 9.4 |
| Photo upload (optional) | APP-PATIENT.md | Section 10 |
| Plan selection & payment | APP-PATIENT.md | Section 11 |
| Follow-up cadence (patient) | APP-PATIENT.md | Section 12.4 |
| Lab booking & tracking | APP-PATIENT.md | Section 13 |
| Activity tab (steppers) | APP-PATIENT.md | Section 6 |
| Messaging (patient side) | APP-PATIENT.md | Section 7 |
| Period tracker | APP-PATIENT.md | Section 18 |
| AI assessment layout | PORTAL-DOCTOR.md | Section 6 |
| AI extensions (PCOS) | PORTAL-DOCTOR.md | Section 6.2 |
| Questionnaire tab (doctor) | PORTAL-DOCTOR.md | Section 7 |
| Photos tab (doctor) | PORTAL-DOCTOR.md | Section 8 |
| Prescription builder | PORTAL-DOCTOR.md | Section 12 |
| Prescription templates (PCOS) | PORTAL-DOCTOR.md | Section 12.3 |
| Follow-up handling (doctor) | PORTAL-DOCTOR.md | Section 24 |
| SLA thresholds | PORTAL-DOCTOR.md | Section 23.3 |
| Canned messages | PORTAL-DOCTOR.md | Section 20 |
| Lab test panels (PCOS Screen) | PORTAL-LAB-FIXED.md | Section 24 |
| Nurse visit flow | PORTAL-NURSE-FIXED.md | Main flow |
| Admin plan management | PORTAL-ADMIN.md | Section 24 |
| Landing page (condition page) | LANDING-PAGE.md | Section 9 |
| SEO & structured data | LANDING-PAGE.md | Sections 9, 10, 18 |
| Questionnaire JSON schema | BACKEND-PART1.md | Section 6.1 |
| Rotterdam criteria scoring | BACKEND-PART1.md | Section 6.3 |
| AI prompt construction | BACKEND-PART1.md | Section 8.2 |
| AI output extensions | BACKEND-PART1.md | Section 8.3 |
| Database schema | BACKEND-PART2A.md | Prisma models |
| Lab test pricing | BACKEND-PART2A.md | Section 12.5 |
| Build phase & checkpoint | onlyou-spec-resolved-v4.md | Phase 9 (Weeks 24–26) |
| Competitor differentiation | PROJECT-OVERVIEW.md | Section 3 |
| Cross-vertical PCOS flag (from Weight) | VERTICAL-WEIGHT.md | Section 11.6 |

---

*End of VERTICAL-PCOS.md*
