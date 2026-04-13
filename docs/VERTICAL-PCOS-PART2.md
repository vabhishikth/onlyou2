<!-- VERTICAL-PCOS-PART2: Sections 7–12 (Doctor Review through Period Tracker) -->

# VERTICAL-PCOS.md — Part 2 of 3

## 7. Doctor Review

### 7.1 Case Queue Appearance

PCOS cases appear in the doctor's case queue with:
- Patient name, age, city
- Condition badge: "PCOS" (color-coded)
- Time since submission
- AI attention level badge: 🟢 Low / 🟡 Medium / 🔴 High / ⛔ Critical
- Fertility intent indicator: "🤰 TTC" (trying to conceive) or blank
- Status badge
- 1-line AI summary snippet

**Example mobile card:**
```
┌─────────────────────────────────────────┐
│  Ananya S., 26F, Hyderabad      3h 20m │
│  ┌──────┐  ┌─────────┐  ┌─────────┐   │
│  │ PCOS │  │🟡 Medium│  │  New    │   │
│  └──────┘  └─────────┘  └─────────┘   │
│  🤰 TTC                                │
│                                         │
│  "Rotterdam 2/3, oligo + hyperandro,   │
│   trying to conceive, BMI 28.5..."     │
└─────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 4.5)*

### 7.2 Case Review Layout (Desktop 3-Panel)

**LEFT (30%) — Patient Summary:**
- Name, age, city, phone (masked)
- Government ID status
- Active subscriptions (PCOS shown)
- Consultation history
- Current medications
- Allergies

**CENTER (45%) — Clinical Data Tabs:**
- **Tab: AI Assessment** (default open) — Rotterdam checklist, phenotype, fertility intent banner, contraindications, recommended protocol
- **Tab: Questionnaire** — collapsible sections with flagged answers highlighted
- **Tab: Photos** — optional photo grid (if uploaded); "No photos uploaded" message if none
- **Tab: Lab Results** — if any exist (inline PDF viewer, abnormals highlighted)
- **Tab: Messages** — chat thread with patient
- **Tab: Menstrual Calendar** — period tracker data from patient app (PCOS-specific tab)

**RIGHT (25%) — Actions Panel:**

| Action | What Happens |
|--------|--------------|
| **Prescribe** | Opens prescription builder (fertility-aware templates) |
| **Order Blood Work** | Opens lab order form (select PCOS Screen Panel) |
| **Request More Info** | Opens message composer → status: AWAITING_PATIENT_RESPONSE |
| **Refer** | Opens referral modal (fertility specialist / endocrinologist) |
| **Refund** | Initiates refund flow |
| **Close Case** | Marks consultation complete |

*(Source: PORTAL-DOCTOR.md Sections 4–11, onlyou-spec-resolved-v4.md Section 4.2)*

### 7.3 Menstrual Calendar Tab (PCOS-Specific)

The doctor sees the period tracker data from the patient's app:
- Calendar view showing logged periods (red = flow days, yellow = predicted)
- Cycle length trend chart
- Average cycle length + regularity score
- Symptom patterns (cramps, bloating, acne flare-ups, mood changes)
- Last 3 cycles summary

This data is only available if the patient has logged period data in the app. If no data: "Patient has not logged any period data yet."

*(Source: APP-PATIENT.md Section 18.4, onlyou-spec-resolved-v4.md Section 9)*

### 7.4 Questionnaire Tab — Flagged Answers

- Amber background + ⚠️ icon = caution (e.g., "Currently taking Metformin" — indicates pre-existing treatment)
- Red background + ⛔ icon = critical flag (e.g., "Trying to conceive" — affects medication choices)
- Quick-jump: clicking a red flag in AI Assessment tab scrolls Questionnaire tab to the flagged answer

*(Source: PORTAL-DOCTOR.md Section 7.2)*

---

## 8. Prescription Templates

### 8.1 PCOS (Not Trying to Conceive)

| Template | Key Medications |
|----------|----------------|
| **Cycle Regulation** | Combined OCP (Ethinyl estradiol + Drospirenone) |
| **Anti-Androgen** | Spironolactone 50mg + Combined OCP |
| **Insulin Focused** | Metformin 500mg BID + Lifestyle |
| **Comprehensive** | Metformin + Spironolactone + Combined OCP |
| **Lean PCOS** | Metformin 500mg + Combined OCP |
| **Natural** | Inositol 2g BID + Lifestyle + supplements |
| **Progestin Only** | Medroxyprogesterone 10mg cyclical (for breakthrough bleeding) |
| **Custom** | Empty — doctor adds all medications manually |

> **⚠️ Consistency Note:** The "Custom" template is not explicitly listed for PCOS in PORTAL-DOCTOR.md or onlyou-spec-resolved-v4.md, but IS present for all other verticals (Hair Loss, ED, PE, Weight). Added here for consistency — doctors should always have a custom option.

### 8.2 PCOS (Trying to Conceive)

| Template | Key Medications |
|----------|----------------|
| **Lifestyle First** | Diet + Exercise + Inositol + Folic acid |
| **Ovulation Induction** | Clomiphene 50mg + Folic acid + Monitoring |
| **Metformin + Lifestyle** | Metformin 500mg BID + Folic acid + Lifestyle |
| **Refer Fertility** | Referral letter to fertility specialist + Folic acid |
| **Custom** | Empty — doctor adds all medications manually |

*(Source: PORTAL-DOCTOR.md Section 12.3)*

### 8.3 Comprehensive Template Example (Not Trying to Conceive — Pre-filled in Prescription Builder)

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Metformin | 500mg | 2x daily (with meals) | 6 months | Start 500mg once daily for 2 weeks, then increase to 500mg twice daily |
| Spironolactone | 50mg | 1x daily | 6 months | For anti-androgen effect (acne, hirsutism). NOT for trying-to-conceive patients |
| Combined OCP (Ethinyl estradiol 30mcg + Drospirenone 3mg) | 1 tablet | 1x daily (21 days on, 7 days off) | 6 months | Cycle regulation + anti-androgen effect |

### 8.4 Metformin + Lifestyle Template Example (Trying to Conceive — Pre-filled in Prescription Builder)

| Medication | Dosage | Frequency | Duration | Notes |
|------------|--------|-----------|----------|-------|
| Metformin | 500mg | 2x daily (with meals) | 6 months | Start 500mg once daily for 2 weeks, then increase to BID. Helps with insulin resistance and ovulation. |
| Folic Acid | 5mg | 1x daily | Ongoing | Pre-conception dose (higher than standard 400mcg — recommended for PCOS patients) |
| Inositol (Myo-inositol) | 2g | 2x daily | 6 months | Supplement — improves insulin sensitivity and ovulation. Take with meals. |

### 8.5 Counseling Notes — Not Trying to Conceive (Pre-filled from Template)

- Take Metformin with meals to reduce GI side effects (nausea, diarrhea)
- Start with lower dose (500mg once daily) for 2 weeks to build tolerance, then increase
- GI side effects usually subside within 2–4 weeks
- Spironolactone is an anti-androgen — helps reduce acne and excess hair growth over 3–6 months
- **Spironolactone is NOT safe during pregnancy** — use reliable contraception while taking
- Take the OCP at the same time each day for best effectiveness
- Expect breakthrough spotting in the first 1–3 months on the OCP — this is normal
- Results for acne improvement: 2–3 months. Hirsutism improvement: 6–12 months
- Track your periods in the Onlyou app — this data helps your doctor monitor your progress

### 8.6 Counseling Notes — Trying to Conceive (Pre-filled from Template)

- Take Metformin with meals to reduce GI side effects
- Folic acid is essential before and during pregnancy — continue even after conception
- Inositol can improve ovulation — take consistently for at least 3 months
- Track your periods and ovulation signs in the Onlyou app
- If no conception after 6 months of treatment, your doctor may recommend a fertility specialist referral
- Maintain a balanced diet and regular exercise — even modest weight loss (5–10%) can significantly improve ovulation
- Avoid alcohol and smoking while trying to conceive

### 8.7 Prescription Builder Fields

- **Template selector:** Dropdown with PCOS templates — **split by fertility intent**: "Not Trying to Conceive" group and "Trying to Conceive" group
- **Fertility intent indicator:** Banner at top of builder showing patient's Q19 answer: "🤰 Trying to Conceive" or "Not trying to conceive"
- **Medication list:** Pre-filled from template, fully editable
- **Custom medications:** `[+ Add Medication]` to add any medication manually
- **Counseling notes:** Pre-filled fertility-aware text, editable
- **Regulatory information (auto-populated):** Doctor name, NMC registration number, patient details, diagnosis ("Polycystic Ovary Syndrome"), date
- **Digital signature:** Click/tap to sign
- **Preview:** PDF preview before submission
- **Submit:** Generates PDF → stores in S3 → creates Order record → notifies coordinator + patient

*(Source: PORTAL-DOCTOR.md Section 12.2, 12.3)*

---

## 9. Blood Work

### 9.1 PCOS Screen Panel

| Test | Purpose |
|------|---------|
| FSH (Follicle-Stimulating Hormone) | Ovarian function assessment; FSH:LH ratio diagnostic for PCOS |
| LH (Luteinizing Hormone) | Elevated LH or LH:FSH ratio >2 = PCOS indicator |
| Estradiol | Baseline estrogen level; low in anovulatory patients |
| Testosterone (total) | Biochemical hyperandrogenism — elevated = Rotterdam criterion |
| DHEA-S (Dehydroepiandrosterone Sulfate) | Adrenal androgen; elevated = adrenal contribution to hyperandrogenism |
| Prolactin | Rule out hyperprolactinemia (differential diagnosis for amenorrhea/oligo) |
| Fasting Glucose | Insulin resistance screening; baseline metabolic assessment |
| Lipid Panel | Metabolic syndrome screening (total cholesterol, LDL, HDL, triglycerides) |
| Insulin (fasting) | Direct insulin resistance assessment; HOMA-IR calculation |

**Panel price:** ₹1,500
**First panel:** INCLUDED in subscription (almost always ordered — blood work is critical for PCOS)
**Follow-up panels:** ₹600–₹1,200 (subset of initial, doctor selects specific tests)
**Self-upload:** Free (patient provides own recent lab work)

*(Source: PORTAL-LAB-FIXED.md Section 24, PORTAL-DOCTOR.md Section 13.2, BACKEND-PART2A.md Section 12.5)*

### 9.2 Blood Work Flow

1. Doctor orders blood work from case review → selects "PCOS Screen Panel"
2. Patient notified: "Your doctor has ordered blood tests. Please book a home collection or upload your own results."
3. **Option A — Home collection:**
   - Patient books time slot in app
   - **Important: Fasting sample required** — nurse visit should be scheduled in the morning, patient instructed to fast 8–12 hours prior
   - Nurse assigned by coordinator
   - Nurse visits home → verifies identity → records vitals (BP, pulse, SpO2, weight) → collects blood
   - Nurse delivers sample to partner lab
   - Lab processes → results uploaded
   - Doctor reviews results → may adjust prescription based on hormonal levels
4. **Option B — Self-upload:**
   - Patient uploads PDF/photo of recent lab results
   - Status: `RESULTS_UPLOADED` (self)
   - Doctor reviews uploaded results

*(Source: APP-PATIENT.md Section 13, PORTAL-NURSE-FIXED.md, PORTAL-LAB-FIXED.md)*

### 9.3 Blood Work Tracking (Patient App)

```
┌─────────────────────────────────────┐
│  🔬 Blood Work — PCOS               │
│  Panel: PCOS Screen                 │
│                                      │
│  ✅ Ordered (5 Mar, 11:00 AM)       │
│  ✅ Slot Booked (6 Mar, 7:30 AM)    │
│  🔵 Nurse Assigned                   │
│  ⚪ Sample Collected                 │
│  ⚪ Sample Received at Lab           │
│  ⚪ Processing Started               │
│  ⚪ Results Ready                    │
│  ⚪ Doctor Reviewed                  │
│                                      │
│  Nurse: Kavitha R. — arriving ~8 AM │
│  ⚠️ Fasting required — no food      │
│     after 10 PM the night before    │
│  [Call Nurse] [Reschedule]          │
└─────────────────────────────────────┘
```

*(Source: APP-PATIENT.md Section 6.1)*

### 9.4 Lab Results Impact on Treatment

After PCOS Screen Panel results are available, the doctor may:
- Confirm biochemical hyperandrogenism (elevated testosterone/DHEA-S) — validates Rotterdam criterion even if clinical signs are borderline
- Assess insulin resistance (elevated fasting insulin, HOMA-IR calculation) — determines Metformin priority
- Rule out differential diagnoses: elevated prolactin → hyperprolactinemia; abnormal thyroid → thyroid disorder; elevated DHEA-S only → adrenal hyperandrogenism
- Adjust prescription based on specific hormonal profile
- Order additional tests if needed (thyroid panel, 17-OH progesterone for congenital adrenal hyperplasia)

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
│  📦 Treatment Kit — PCOS             │
│  Metformin 500mg, Folic Acid 5mg   │
│                                      │
│  ✅ Prescription Created (6 Mar)     │
│  ✅ Sent to Pharmacy (6 Mar)         │
│  ✅ Pharmacy Preparing (7 Mar)       │
│  🔵 Ready for Pickup                 │
│  ⚪ Out for Delivery                 │
│  ⚪ Delivered                         │
│                                      │
│  Pharmacy: MedPlus, Banjara Hills  │
│  [Track] [Contact Support]         │
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

| Time Point | Type | Questionnaire | Photos | Period Data | Purpose |
|------------|------|--------------|--------|-------------|---------|
| 4 weeks | Side effects check | 10 questions (abbreviated) | No | Yes (reviewed) | Early side effect detection, Metformin tolerance check |
| 3 months | Progress review | 10 questions | Optional | Yes (3 months trend) | Cycle regularity assessment, symptom improvement check |
| 6 months | Full assessment | 15 questions | Optional | Yes (6 months trend) | Comprehensive progress review, lab recheck if needed |
| 12 months | Annual review | Full questionnaire | Optional | Yes (full year) | Long-term efficacy, treatment plan review |

*(Source: PORTAL-DOCTOR.md Section 24.1, APP-PATIENT.md Section 12.4)*

### 11.2 Follow-Up Patient Flow

1. Notification sent when follow-up is due
2. Home tab shows "Check-in Due" card with `[Start Check-in]` CTA
3. Abbreviated questionnaire (10 questions) — reuses questionnaire engine with follow-up JSON schema
4. Period tracker data auto-included for doctor review
5. Doctor reviews → may adjust prescription based on cycle regularity improvement

*(Source: APP-PATIENT.md Section 12.4)*

### 11.3 Follow-Up in Doctor Queue

Follow-up cases appear with distinct markers:
- **Badge:** "Follow-Up" badge (blue) instead of "New" badge
- **AI Assessment:** Includes delta analysis comparing initial vs. follow-up
- **Menstrual Calendar tab:** Shows trend over time, cycle regularity improvement
- **Questionnaire tab:** Shows "changes only" toggle by default

*(Source: PORTAL-DOCTOR.md Section 24.2)*

### 11.4 Follow-Up AI Delta Analysis

```
┌────────────────────────────────────────────────────────┐
│  📊 PROGRESS ANALYSIS (vs. Initial Assessment)         │
│                                                        │
│  Overall trajectory: ✅ Improving                      │
│                                                        │
│  • Cycle regularity: 5 periods/yr → 8 periods/yr      │
│  • Acne severity: Severe → Moderate (improved)         │
│  • Hirsutism: No change (expected — takes 6–12 months) │
│  • BMI: 28.5 → 27.1 (improved)                        │
│  • Medication compliance: Good (reported)              │
│  • Side effects: Mild GI — resolved after week 2       │
│                                                        │
│  RECOMMENDATION:                                        │
│  "Patient showing positive response to Metformin.      │
│   Cycle frequency improving. Recommend continuing      │
│   current regimen. Consider adding Spironolactone for  │
│   hirsutism if patient is NOT trying to conceive."     │
└────────────────────────────────────────────────────────┘
```

*(Source: PORTAL-DOCTOR.md Section 24.3)*

---

## 12. PCOS Period Tracker (Patient App Feature)

### 12.1 Purpose

Period tracking is clinically critical for PCOS treatment monitoring. The tracker is a PCOS-exclusive feature visible only to patients with an active PCOS subscription.

**Screen:** `profile/period-tracker.tsx`

*(Source: APP-PATIENT.md Section 18)*

### 12.2 Calendar UI

**Monthly calendar view:**
- Current month displayed with day cells
- Tappable days to log period start/end
- Color coding:
  - 🔴 Red = period days (flow)
  - 🟡 Yellow = predicted period (based on average cycle length)
  - ⚪ White = non-period days
  - 🟢 Green = today

**Logging flow:**
1. Tap a day → options: "Period Started" / "Period Ended" / "Spotting" / "No Period"
2. Flow intensity: Light / Medium / Heavy
3. Optional symptoms: Cramps, Bloating, Headache, Mood changes, Acne flare-up
4. Save → data synced to backend

### 12.3 Cycle Insights

Below the calendar:
- **Average cycle length:** "[X] days" (calculated from logged data, minimum 3 cycles needed)
- **Last period:** "[Date] — [X] days ago"
- **Next predicted:** "[Date]" (based on average)
- **Cycle regularity:** "Regular" (21–35 day cycles, <7 day variation) / "Irregular" (>7 day variation or cycles outside 21–35 days)

### 12.4 Data Shared with Doctor

The following is visible to the treating doctor in their PCOS case review (Menstrual Calendar tab):
- Calendar view of all logged periods
- Cycle length trend (chart)
- Average cycle length + regularity score
- Symptom patterns

**Privacy:** Period tracker data is ONLY shared with the assigned PCOS doctor. Not visible to admin, nurses, lab staff, or pharmacy.

*(Source: APP-PATIENT.md Section 18.1–18.4)*

---

