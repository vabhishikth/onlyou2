# WORKFLOW-DOCTOR-PART2.md — Doctor Complete Workflow Reference (Part 2 of 3)

## Clinical Workflows: Case Review, Prescriptions, Lab Orders, Referrals, Messaging & Follow-ups

> **Document type:** Detailed workflow documentation (every screen, action, decision, error, and edge case)
> **Perspective:** Doctor / Consulting Physician
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** See WORKFLOW-DOCTOR-PART1.md for full cross-reference list.

---

## Table of Contents — Part 2

11. [Case Review — The Clinical Workspace](#11-case-review--the-clinical-workspace)
12. [AI Assessment Tab (Clinical Decision Support)](#12-ai-assessment-tab-clinical-decision-support)
13. [Questionnaire Tab](#13-questionnaire-tab)
14. [Photos Tab](#14-photos-tab)
15. [Lab Results Tab](#15-lab-results-tab)
16. [Messages Tab (In-Case Chat)](#16-messages-tab-in-case-chat)
17. [Actions Panel — Doctor Decision Point](#17-actions-panel--doctor-decision-point)
18. [Workflow: Writing a Prescription](#18-workflow-writing-a-prescription)
19. [Workflow: Ordering Blood Work](#19-workflow-ordering-blood-work)
20. [Workflow: Requesting More Information](#20-workflow-requesting-more-information)
21. [Workflow: Referring a Patient](#21-workflow-referring-a-patient)
22. [Workflow: Initiating a Refund](#22-workflow-initiating-a-refund)
23. [Workflow: Closing a Case](#23-workflow-closing-a-case)
24. [Follow-Up Case Handling](#24-follow-up-case-handling)
25. [Consultation Lifecycle — Complete Status Flow](#25-consultation-lifecycle--complete-status-flow)

---

## 11. Case Review — The Clinical Workspace

### 11.1 Overview

**Route:** `/case/[id]`
**Purpose:** The core workspace where the doctor reviews all patient data and makes clinical decisions. This is the single most important screen in the entire doctor portal.

### 11.2 Entering Case Review

When a doctor clicks/taps a case in the queue:

1. Navigate to `/case/[consultationId]`
2. API call fetches full case data:

```
trpc.doctor.consultation.getFullDetail.query({
  consultationId: 'uuid'
})
```

This returns:
- Patient profile (name, age, sex, city, phone masked, gov ID verification status)
- Active subscriptions for this patient
- Consultation history (all past consultations with this doctor)
- Current medications (from questionnaire)
- Allergies (from questionnaire)
- Questionnaire responses
- AI assessment (including vertical-specific extensions)
- Photos (if applicable)
- Lab results (if any)
- Messages (latest 50, paginated)
- Prescriptions (if any exist)
- Lab orders (if any exist)

3. **Auto-assignment trigger:** If case is `SUBMITTED` or `AI_COMPLETE` and unassigned → auto-assign to this doctor
4. **Status transition:** If case is `ASSIGNED` → after 30 seconds or first action → `REVIEWING`

### 11.3 Desktop Layout (3-Panel)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Back to Queue    Rahul M. — Hair Loss    🔴 High Attention       │
├────────────────┬──────────────────────────────┬──────────────────────┤
│                │                              │                      │
│  LEFT PANEL    │     CENTER PANEL             │   RIGHT PANEL        │
│  Patient       │     Clinical Data            │   Actions            │
│  Summary       │     (tabs)                   │                      │
│  (30% width)   │     (45% width)              │   (25% width)        │
│                │                              │                      │
│  Name          │  [AI] [Questionnaire]        │   [💊 Prescribe]     │
│  Age, Sex      │  [Photos] [Lab Results]      │   [🔬 Order Labs]    │
│  City          │  [Messages]                  │   [❓ Request Info]   │
│  Phone (mask)  │                              │   [🏥 Refer]         │
│  Gov ID status │  ─────────────────────       │   [💰 Refund]        │
│  Subscriptions │  Tab content area            │   [✕ Close Case]     │
│  History       │                              │                      │
│  Medications   │                              │                      │
│  Allergies     │                              │                      │
└────────────────┴──────────────────────────────┴──────────────────────┘
```

### 11.4 Left Panel — Patient Summary (Detailed)

**Identity Section:**
- Full name: "Rahul Mehta"
- Age, Sex: "28, Male"
- City: "Mumbai, Maharashtra"
- Phone: `+91 •••••• 4567` (masked — doctor sees last 4 digits only)
- Government ID: "Verified ✅" or "Pending ⏳" (doctor does NOT see the actual ID image — admin-only)

**Subscriptions Section:**
- List of active vertical subscriptions with plan type:
  - "💇 Hair Loss — Monthly (₹999/mo) — Active since 15 Jan 2026"
  - "🛡️ ED — Quarterly (₹3,297/qtr) — Active since 10 Feb 2026"
- If paused: amber "Paused" badge
- If cancelled: gray "Cancelled" badge with end date
- Doctor sees plan TYPE but NOT pricing details (plan name like "Monthly" is visible, but ₹ amount shown is contextual — doctor does not control pricing)

**Consultation History Section:**
- All past consultations for this patient across all verticals assigned to this doctor:
  - "Hair Loss — Initial Assessment — 15 Jan 2026 — Prescribed"
  - "ED — Follow-up (4-week) — 10 Mar 2026 — In Progress" (← current, highlighted with blue left border)
- Tapping a past consultation opens it in a new tab (does NOT navigate away)

**Current Medications Section:**
- Medications patient reported in questionnaire
- Each shown as pill badge: `Finasteride 1mg` `Multivitamin`
- Flagged medications highlighted in amber (potential interactions flagged by AI)

**Allergies Section:**
- "No known allergies" or list: `Sulfa drugs` `Penicillin`
- Allergies shown with red ⚠️ icon if present

### 11.5 Mobile Layout (Single Column)

On mobile (<1024px), the 3 panels collapse:

1. **Sticky top bar:** Patient name + condition badge + attention level + back button
2. **Patient summary:** Collapsible card (starts collapsed to save space)
3. **Clinical tabs:** Horizontal scrollable tab bar → tab content below
4. **Sticky bottom bar:** Action buttons in a row: 💊 Prescribe | 🔬 Labs | 💬 Message | ⋯ More
5. "More" (⋯) opens action sheet: Refer, Refund, Close Case

---

## 12. AI Assessment Tab (Clinical Decision Support)

### 12.1 Overview

The AI Assessment tab is the FIRST tab shown by default when a doctor opens a case. It provides a Claude AI-generated clinical summary that synthesizes questionnaire data, photos (if available), and medical knowledge into a structured assessment.

**Purpose:** Reduce doctor review time from 15-20 minutes to 3-8 minutes by providing a pre-digested clinical summary. The doctor still reviews raw data in other tabs — the AI assessment is decision SUPPORT, not a diagnosis.

### 12.2 Assessment Structure (All Verticals)

Every AI assessment includes these common sections:

**Classification:**
- Condition type (e.g., "Androgenetic Alopecia — Male Pattern")
- Severity level (e.g., "Moderate")
- Confidence level: High (≥85%), Medium (60-84%), Low (<60%)

**Risk Flags:**
- Contraindications identified (color-coded: red = absolute, amber = relative)
- Drug interactions with current medications
- Medical history red flags

**Suggested Treatment Protocol:**
- Template recommendation (e.g., "Standard Hair Loss Protocol")
- Modifications from template (if any based on patient specifics)
- Confidence: "High confidence in standard protocol" or "Medium confidence — consider blood work first"

**Key Observations:**
- Bulleted list of significant findings from questionnaire
- Photo analysis results (if applicable)

### 12.3 Vertical-Specific AI Extensions

**Hair Loss:**
- Norwood Scale assessment (stage I-VII with diagram reference)
- Finasteride safety check: Safe / Caution / Contraindicated (with reasoning)
- Hair density zone assessment (frontal, mid-scalp, vertex, temporal)
- Photo analysis: "Crown thinning visible, Norwood III pattern, temporal recession moderate"

**ED (Erectile Dysfunction):**
- IIEF-5 score + severity: Severe (5-7) / Moderate (8-11) / Mild-Moderate (12-16) / Mild (17-21) / Normal (22-25)
- Cardiovascular risk panel: assessed from family history, smoking, diabetes, hypertension, lipids
- **NITRATE CHECK — RED BANNER** (absolute contraindication):

```
┌──────────────────────────────────────────────────────────┐
│  ⛔ ABSOLUTE CONTRAINDICATION — NITRATE USE DETECTED     │
│                                                          │
│  Patient reports use of [medication name].               │
│  PDE5 inhibitors (Sildenafil, Tadalafil) are            │
│  ABSOLUTELY CONTRAINDICATED with nitrates.               │
│  Risk: Severe, potentially fatal hypotension.            │
│                                                          │
│  DO NOT prescribe PDE5 inhibitors.                       │
│  Consider: Alprostadil, Vacuum devices, or Referral.     │
└──────────────────────────────────────────────────────────┘
```

- Etiology assessment: Organic / Psychogenic / Mixed (with confidence)
- Current PDE5 inhibitor usage

**PE (Premature Ejaculation):**
- PEDT score + classification: Score ≥11 (PE likely), 9-10 (Inconclusive), ≤8 (PE unlikely)
- IELT estimate from questionnaire
- Comorbid ED check banner: "⚠️ Comorbid ED detected — consider combined ED+PE treatment approach"
- Lifelong vs. Acquired classification
- Serotonin medication check

**Weight Management:**
- BMI calculation + WHO Asian classification: <18.5 Underweight / 18.5-22.9 Normal / 23.0-24.9 Overweight / 25.0-29.9 Obese I / ≥30.0 Obese II
- Metabolic risk: diabetes, cardiovascular, fatty liver
- Eating disorder screening flag: "⚠️ Eating disorder risk indicators detected. Consider screening before prescribing."
- GLP-1 eligibility: Eligible (BMI ≥35 or ≥30 with comorbidity) / Not eligible / Borderline
- Note: GLP-1 tier deferred (greyed out with "Coming Soon")

**PCOS:**
- Rotterdam criteria checklist (need 2 of 3): ☐/☑ Oligo/anovulation, ☐/☑ Hyperandrogenism, ☐/☑ Polycystic ovaries
- Phenotype: A (all 3) / B / C / D
- **Fertility intent banner** (if patient answered "Yes" or "Maybe" to trying to conceive):

```
┌──────────────────────────────────────────────────────────┐
│  🤰 FERTILITY INTENT: Trying to conceive                 │
│                                                          │
│  Avoid: Spironolactone, isotretinoin, statins.           │
│  Consider: Lifestyle-first, Metformin, Ovulation         │
│  induction. Refer to fertility specialist if no          │
│  conception within 6 months.                             │
└──────────────────────────────────────────────────────────┘
```

- Insulin resistance flag
- Menstrual calendar data (from patient's period tracker)

### 12.4 AI Assessment States

| State | What Doctor Sees | Doctor Action |
|-------|-----------------|---------------|
| Processing | "⏳ AI assessment is being generated..." + spinner. Other tabs still accessible. | Wait or review other tabs. |
| Complete | Full assessment as described above | Review and proceed to action. |
| Failed | "⚠️ AI assessment failed. Please review questionnaire and photos manually." + `[Retry AI Assessment]` | Retry (max 3 times) or proceed with manual review. |
| Partial | "⚠️ Generated with warnings: [missing data points]" — shows available assessment. | Review what's available, supplement manually. |

**Retry behavior:**
- `trpc.doctor.consultation.retryAI.mutate({ consultationId })`
- Queues new BullMQ job for AI processing
- Button disabled during processing
- Max 3 retries. After 3 failures: "AI assessment could not be completed. Please proceed with manual review."

### 12.5 AI Disclaimer

Fixed footer on AI Assessment tab:

> "This AI pre-assessment is a clinical decision support tool generated by Claude AI. It does not constitute medical advice. The prescribing physician retains full clinical responsibility for all treatment decisions."

---

## 13. Questionnaire Tab

### 13.1 Layout

Collapsible sections matching questionnaire structure (Medical History, Current Symptoms, Lifestyle, Medications, etc.):

- Each section expandable/collapsible
- Questions shown with patient answers
- Completion indicator: "25/25 questions answered"
- Submission timestamp

### 13.2 Flagged Answers

Answers that triggered AI flags are highlighted:

| Flag Type | Visual | Example |
|-----------|--------|---------|
| Caution | Amber background + ⚠️ | "Taking blood thinners" for a Hair Loss patient |
| Critical | Red background + ⛔ | "Taking nitroglycerin" for an ED patient |

- Tooltip on hover: "Flagged: [reason from AI assessment]"
- **Quick-jump:** Clicking a flag in the AI Assessment tab scrolls to the flagged answer in the Questionnaire tab

### 13.3 Follow-Up Questionnaire Comparison

For follow-up consultations, both initial and follow-up responses are shown side-by-side:

```
Q: How would you rate your hair loss severity?
  Initial (15 Jan 2026):   "Moderate — noticeable"
  Follow-up (15 Apr 2026): "Mild — slight improvement"
                            ↑ Changed ✅
```

- Changed answers highlighted with green "Changed ✅" badge
- Toggle: "Show changes only" (filters to changed answers)

---

## 14. Photos Tab

### 14.1 Photo Requirements by Vertical

| Vertical | Photos Required | Photo Grid | Angles |
|----------|----------------|-----------|--------|
| Hair Loss | 4 required | 2×2 grid | Crown/Vertex, Frontal Hairline, Left Temple, Right Temple |
| Weight | 2 required | 2×1 grid | Front-facing full body, Side profile |
| ED | None | — | — |
| PE | None | — | — |
| PCOS | Optional | — | — |

### 14.2 Photo Viewer Features

- **Click to zoom:** Full-screen lightbox overlay
- **Lightbox controls:** Zoom in/out, pan, next/previous, close (Esc key)
- **Metadata:** Upload date, file size, resolution shown below photo
- **Quality indicator:** If photo flagged during upload (blurry, too dark, wrong angle) → amber badge: "⚠️ Quality: Low"

### 14.3 Follow-Up Photo Comparison

For follow-up consultations with photos:

```
Crown/Vertex
┌─────────────────┬─────────────────┐
│  BASELINE        │  FOLLOW-UP      │
│  15 Jan 2026     │  15 Apr 2026    │
│  [photo]         │  [photo]        │
└─────────────────┴─────────────────┘
         ◄──── Slider Overlay ────►
```

- **Side-by-side view** (default): baseline left, follow-up right with date labels
- **Slider overlay mode:** Drag vertical divider left/right to reveal baseline vs. follow-up
- **Multi-timepoint dropdown:** If multiple follow-ups exist → select which two to compare
- All comparison pairs use same angle/position

### 14.4 No Photos States

| Scenario | Message |
|----------|---------|
| No photos (ED/PE) | "No photos uploaded. This condition type does not require clinical photos." |
| Expected photos missing (Hair Loss without photos) | "⚠️ Expected photos not uploaded. Consider requesting photos via 'Request More Info.'" |
| Photo fails to load | Placeholder: broken image icon + "Photo unavailable. [Retry]" |

---

## 15. Lab Results Tab

### 15.1 Lab Results Display

When lab results exist for this consultation:

```
🔬 Lab Results
Extended Hair Panel — 20 Jan 2026
Lab: City Diagnostics, Mumbai
Status: ✅ Results Uploaded

[View PDF]  [View Summary]

SUMMARY (extracted from PDF):
┌──────────────────┬─────────┬──────────────────┐
│ Test             │ Result  │ Reference Range  │
├──────────────────┼─────────┼──────────────────┤
│ TSH              │ 2.1     │ 0.4–4.0 mIU/L ✅│
│ Free T4          │ 1.2     │ 0.8–1.8 ng/dL ✅│
│ Ferritin         │ 18 ⚠️   │ 30–300 ng/mL    │
│ Vitamin D        │ 12 🔴   │ 30–100 ng/mL    │
│ DHT              │ 890     │ 250–990 pg/mL ✅│
│ Hemoglobin       │ 14.2    │ 13.5–17.5 g/dL ✅│
└──────────────────┴─────────┴──────────────────┘

⚠️ Abnormal: Ferritin LOW
🔴 Critical: Vitamin D severely deficient
```

### 15.2 Result Indicators

| Icon | Meaning |
|------|---------|
| ✅ | Normal — within reference range |
| ⚠️ | Abnormal — outside range but not critical |
| 🔴 | Critical — dangerously outside range, requires attention |

- Abnormal/critical values sorted to top of summary table
- Critical values shown with red background row

### 15.3 Self-Uploaded Lab Results

If patient uploaded their own results (not from platform partner lab):
- Banner: "📤 Patient self-uploaded — not from platform partner lab. Verify authenticity."
- Same PDF viewer — doctor views uploaded file
- No structured summary extraction (manual review)
- Doctor can: `[Accept as valid]` / `[Request platform lab test]`

### 15.4 Historical Lab Results

- Dropdown to select different lab panels
- "Compare" mode: side-by-side tables showing trends
- Trend arrows: ↑ (increasing), ↓ (decreasing), → (stable)

### 15.5 Lab Results States

| State | Display |
|-------|---------|
| No lab orders | "No lab results available for this consultation." |
| Lab ordered, awaiting results | "🔬 Lab work ordered — awaiting results. Status: [SAMPLE_COLLECTED / AT_LAB / PROCESSING]. Estimated: [date]." |
| Results ready, not yet reviewed | "Lab results ready — [date]" with unread indicator |
| Results reviewed by doctor | "Lab results reviewed — [date]" |

---

## 16. Messages Tab (In-Case Chat)

### 16.1 Chat Interface

```
┌────────────────────────────────────────────────────┐
│  💬 Messages — Rahul M. (Hair Loss)                │
│                                                    │
│  ┌────────────────────────────────────┐            │
│  │ Dr. Patel                 2:15 PM  │            │
│  │ Hello Rahul. I've reviewed your    │            │
│  │ assessment. Could you share...     │            │
│  └────────────────────────────────────┘            │
│                                                    │
│      ┌────────────────────────────────┐            │
│      │ Rahul M.              3:42 PM  │            │
│      │ Yes doctor, here are the...    │            │
│      └────────────────────────────────┘            │
│                                                    │
│  ──────────────────────────────────────            │
│  Quick replies: [Results look good] [Need more     │
│  photos] [Schedule follow-up] [Lab work required]  │
│  [Side effects normal] [Stop medication]           │
│  ──────────────────────────────────────            │
│  [📎]  [Type a message...            ]  [Send ➤]  │
└────────────────────────────────────────────────────┘
```

### 16.2 Canned (Quick Reply) Messages

**System defaults (cannot edit, available to all doctors):**
- "Results look good"
- "Need more photos"
- "Schedule follow-up"
- "Lab work required"
- "Side effects normal"
- "Stop medication"

**Custom messages (doctor-created, max 20):**
- Doctor creates in Settings → Canned Messages
- Each has: label (≤30 chars) and full message (≤500 chars)
- Supports placeholders: `{patient_name}`, `{medication}` — auto-filled on send

### 16.3 Sending a Message

**Doctor types or selects canned response, clicks Send:**

```
API: trpc.doctor.message.send.mutate({
  consultationId: 'uuid',
  content: 'Hello Rahul, I've reviewed your assessment...',
  isCanned: false   // or true with cannedLabel
})
```

**Backend actions:**
1. Create `Message` record: `{ consultationId, senderId: doctorId, senderRole: 'DOCTOR', content, timestamp }`
2. SSE event → patient app updates in real-time
3. Notify patient (push notification): "New message from Dr. Patel"
4. If patient has WhatsApp notifications enabled: WhatsApp message (discreet: "You have a new message from your doctor. Open the app to view.")
5. Audit log: `{ action: 'MESSAGE_SENT', doctorId, consultationId, messageId, isCanned, timestamp }`

### 16.4 Message Attachments

- Doctor can attach: photos (camera or gallery) and PDF files
- Max file size: 10MB
- Upload flow: presigned S3 URL → upload → attach to message
- Patient sees attachment inline (image preview or PDF link)

### 16.5 Message Edge Cases

| Scenario | Behavior |
|----------|----------|
| Message fails to send (network) | Red ⚠️ indicator + "Tap to retry." Message queued locally. |
| Patient is typing while doctor is typing | Both messages appear in order of server receipt. No typing indicators in MVP. |
| Chat has no messages yet | Placeholder: "No messages yet. Start a conversation with your patient." |
| Doctor sends message while patient's app is closed | Push notification + WhatsApp → deep link opens correct conversation. |
| Doctor tries to message a patient from a closed/referred case | Allowed — messaging remains available for follow-up communication even after case closure. |

---

## 17. Actions Panel — Doctor Decision Point

### 17.1 Available Actions

The right panel (desktop) or bottom bar (mobile) presents the doctor's available actions:

| Action | Button | When Available | Leads To |
|--------|--------|---------------|----------|
| Prescribe | 💊 Prescribe | Case status: `ASSIGNED`, `REVIEWING`, `INFO_REQUESTED` | Prescription Builder (Section 18) |
| Order Blood Work | 🔬 Order Labs | Same as Prescribe | Lab Order Form (Section 19) |
| Request More Info | ❓ Request Info | Same as Prescribe | Info Request flow (Section 20) |
| Refer | 🏥 Refer | Same as Prescribe | Referral Modal (Section 21) |
| Refund | 💰 Refund | Same as Prescribe | Refund Request Modal (Section 22) |
| Close Case | ✕ Close Case | Same as Prescribe | Close Case confirmation (Section 23) |

### 17.2 Action Availability Rules

| Current Status | Actions Available | Actions Blocked | Reason |
|----------------|------------------|----------------|--------|
| `ASSIGNED` / `REVIEWING` | All 6 actions | None | Doctor is actively reviewing |
| `INFO_REQUESTED` | All 6 (can prescribe even while waiting) | None | Doctor may decide to act before patient responds |
| `PRESCRIPTION_CREATED` | Message only (via Messages tab) | Prescribe, Labs, Refer, Refund, Close | Already prescribed — further actions through follow-up |
| `COMPLETED` / `CLOSED` | Message only | All 6 | Case is terminal |
| `REFERRED` | Message only | All 6 | Case referred out |

---

## 18. Workflow: Writing a Prescription

### 18.1 Trigger

Doctor clicks "💊 Prescribe" in the actions panel → full-screen modal opens (desktop) or new page (mobile).

### 18.2 Prescription Builder Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ✕ Close           PRESCRIPTION BUILDER                       │
│                                                              │
│  PATIENT: Rahul Mehta, 28M, Mumbai                          │
│  CONDITION: Hair Loss (Androgenetic Alopecia)                │
│  CONSULTATION: #CONS-2026-0142                               │
│                                                              │
│  ─── TEMPLATE ──────────────────────────────────────────     │
│  Select template: [ Standard               ▼ ]              │
│                                                              │
│  ─── MEDICATIONS ───────────────────────────────────────     │
│  ┌──────────────┬─────────┬────────────┬──────────┬────────┐│
│  │ Medication   │ Dosage  │ Frequency  │ Duration │ Notes  ││
│  ├──────────────┼─────────┼────────────┼──────────┼────────┤│
│  │ Minoxidil 5% │ 1ml     │ 2x daily   │ 6 months │ Topical││
│  │ Biotin       │ 10,000  │ 1x daily   │ 6 months │ W/ food││
│  │ Ketoconazole │ 2%      │ 3x weekly  │ 3 months │ Leave 5m│
│  └──────────────┴─────────┴────────────┴──────────┴────────┘│
│  [+ Add Medication]                                          │
│                                                              │
│  ─── COUNSELING NOTES ──────────────────────────────────     │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Pre-filled from template — fully editable.                ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ─── REGULATORY INFORMATION (auto-populated) ────────────    │
│  Doctor: Dr. Rajesh Patel | NMC: NMC-2019-12345             │
│  Patient: Rahul Mehta, 28M | Date: 15 January 2026          │
│                                                              │
│  ─── DIGITAL SIGNATURE ─────────────────────────────────     │
│  [Click to Sign]                                             │
│                                                              │
│  [Cancel]                          [Preview PDF] [Submit]    │
└──────────────────────────────────────────────────────────────┘
```

### 18.3 Template Selection by Vertical

**Hair Loss templates:**
| Template | Key Medications |
|----------|----------------|
| Standard | Finasteride 1mg + Minoxidil 5% + Biotin + Ketoconazole shampoo |
| Minoxidil Only | Minoxidil 5% + Biotin + Ketoconazole (no finasteride) |
| Conservative | Biotin + Ketoconazole + PRP recommendation |
| Combination Plus | Standard + Derma roller + Saw Palmetto |
| Advanced | Dutasteride 0.5mg + Minoxidil + Biotin + Ketoconazole |
| Female AGA | Minoxidil 2% + Spironolactone 50mg + Biotin + Iron supplement |
| Custom | Empty — doctor adds all manually |

**ED templates:**
| Template | Key Medications |
|----------|----------------|
| On-Demand Sildenafil 50mg | Sildenafil 50mg PRN (30-60 min before, max 1x/day) |
| On-Demand Sildenafil 100mg | Sildenafil 100mg PRN |
| On-Demand Tadalafil 10mg | Tadalafil 10mg PRN (30 min before) |
| On-Demand Tadalafil 20mg | Tadalafil 20mg PRN |
| Daily Tadalafil 5mg | Tadalafil 5mg daily (same time each day) |
| Conservative | Lifestyle counseling + L-Arginine + Zinc |
| Custom | Empty |

**PE templates:**
| Template | Key Medications |
|----------|----------------|
| On-Demand Dapoxetine 30mg | Dapoxetine 30mg, 1-3 hours before activity |
| On-Demand Dapoxetine 60mg | Dapoxetine 60mg, 1-3 hours before activity |
| Daily Paroxetine | Paroxetine 10mg daily (SSRI off-label) |
| Daily + On-Demand Combo | Paroxetine 10mg daily + Dapoxetine 30mg PRN |
| Behavioral + Medication | Dapoxetine 30mg + behavioral techniques counseling |
| Custom | Empty |

**Weight templates:**
| Template | Key Medications |
|----------|----------------|
| Lifestyle Only | Diet plan + Exercise regimen + Behavioral counseling |
| Standard Orlistat | Orlistat 120mg TID with meals + Multivitamin |
| Metformin Add-On | Metformin 500mg BID + Orlistat 120mg TID |
| GLP-1 Standard | Semaglutide (dose escalation) — *deferred, greyed out* |
| GLP-1 + Metformin | Semaglutide + Metformin — *deferred, greyed out* |
| Custom | Empty |

**PCOS (NOT trying to conceive):**
| Template | Key Medications |
|----------|----------------|
| Cycle Regulation | Combined OCP (Ethinyl estradiol + Drospirenone) |
| Anti-Androgen | Spironolactone 50mg + Combined OCP |
| Insulin Focused | Metformin 500mg BID + Lifestyle |
| Comprehensive | Metformin + Spironolactone + Combined OCP |
| Lean PCOS | Metformin 500mg + Combined OCP |
| Natural | Inositol 2g BID + Lifestyle + supplements |
| Progestin Only | Medroxyprogesterone 10mg cyclical |
| Custom | Empty |

**PCOS (TRYING to conceive):**
| Template | Key Medications |
|----------|----------------|
| Lifestyle First | Diet + Exercise + Inositol + Folic acid |
| Ovulation Induction | Clomiphene 50mg + Folic acid + Monitoring |
| Metformin + Lifestyle | Metformin 500mg BID + Folic acid + Lifestyle |
| Refer Fertility | Referral letter + Folic acid |
| Custom | Empty |

### 18.4 Medication Row Editing

Each medication row is fully editable with these fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Medication name | Autocomplete text | ✅ | Searches drug database; can also type custom |
| Dosage | Text input | ✅ | e.g., "1mg", "5%", "500mg" |
| Frequency | Dropdown | ✅ | Once daily / Twice daily / Three times daily / PRN / Weekly / Custom |
| Duration | Dropdown | ✅ | 1 month / 2 months / 3 months / 6 months / Ongoing / Custom |
| Instructions | Text input | Optional | e.g., "Take with food", "Apply to scalp" |

**Row operations:** Drag handle (⠿) for reordering, Delete (🗑️) to remove, `[+ Add Medication]` to add empty row.

### 18.5 Template Switching

When doctor switches template after modifications:
- Confirmation dialog: "Switching template will replace medications and counseling notes. Keep current data or replace?"
- Options: `[Keep current]` / `[Replace with new template]`

### 18.6 Digital Signature

- Doctor clicks `[Click to Sign]`
- Pre-registered text signature (doctor's name in signature font) — NOT drawn
- PDF format: "Digitally signed by Dr. Rajesh Patel (NMC-2019-12345) on [date] at [time]"
- Signature cannot be undone — entering preview mode
- `[Edit Prescription]` clears signature and returns to edit mode

### 18.7 PDF Preview & Submit

After signing → PDF preview rendered via `@react-pdf/renderer`:

**PDF layout:**
- Header: Onlyou logo + "Prescription" + doctor details
- Patient details: name, age, sex, phone (masked), consultation ID, date
- Diagnosis line
- Medication table (formatted)
- Counseling notes
- Digital signature + date
- Footer: "This prescription is valid for [X] days" + Rx number

Buttons: `[Edit]` / `[Submit Prescription]`

### 18.8 Submit Flow (Complete Pipeline)

**When doctor clicks `[Submit Prescription]`:**

**1. Client-side validation:**
- At least 1 medication (unless "Lifestyle Only")
- All required medication fields filled
- Signature present
- Counseling notes not empty

**2. API call:**
```
trpc.doctor.prescription.create.mutate({
  consultationId: 'uuid',
  medications: [{ name, dosage, frequency, duration, instructions }],
  counselingNotes: 'text',
  templateUsed: 'standard',
  signedAt: 'ISO timestamp'
})
```

**3. Server-side (synchronous):**
- CASL check: doctor owns this consultation
- Status check: consultation must be `ASSIGNED`, `REVIEWING`, or `INFO_REQUESTED`
- Optimistic lock: ensure no other prescription exists for this consultation (prevents race condition)
- Store `Prescription` record in PostgreSQL
- Update `Consultation.status` → `PRESCRIPTION_CREATED`

**4. Server-side (async — BullMQ jobs):**
- Generate PDF via `@react-pdf/renderer` → store in S3 (`onlyou-prescriptions` bucket, SSE-KMS encrypted)
- Create `Order` record (medication order for pharmacy pipeline)
- Notify patient (push + WhatsApp): "Your treatment plan is ready! Review your prescription in the app."
- Notify coordinator (admin): "New prescription created — [Patient Name] — [Condition]. Order #[ID] ready for pharmacy."
- SSE event → patient app updates
- Audit log: `{ action: 'PRESCRIPTION_CREATED', doctorId, consultationId, medicationCount, templateUsed, timestamp }`

**5. Post-submit UI:**
- Prescription builder closes
- Case review shows "Prescription Created ✅" banner
- Status badge updates to `PRESCRIPTION_CREATED`
- Toast: "Prescription submitted successfully. Patient and coordinator have been notified."

### 18.9 Downstream Effects (After Prescription)

Once the doctor submits a prescription, the following pipeline activates (doctor is passive from here):

```
Doctor submits prescription
    → Order record created (status: CREATED)
    → Admin sees order in Deliveries pipeline
    → Admin sends order to pharmacy (status: SENT_TO_PHARMACY)
    → Pharmacy receives, starts preparing (status: PREPARING)
    → Pharmacy marks ready (status: READY)
    → Admin arranges delivery (status: OUT_FOR_DELIVERY)
    → Delivery person delivers with OTP confirmation (status: DELIVERED)
    → Patient receives medication
    → Consultation status → TREATMENT_ACTIVE
    → Follow-up timer begins (4 weeks, 3 months, etc.)
```

### 18.10 Prescription Edge Cases

| Scenario | Behavior |
|----------|----------|
| Doctor navigates away with unsaved changes | Confirmation: "You have unsaved changes. Leave without saving?" |
| Doctor selects GLP-1 template (deferred) | Template greyed out with "Coming Soon." Cannot be selected. |
| Medication conflicts with patient's reported meds | Warning: "⚠️ Potential interaction: [drug A] + [drug B]. Type: [moderate/severe]." Warning only — does NOT block. |
| Doctor prescribes PDE5 inhibitor with nitrate flag | Hard block: "⛔ Cannot prescribe [drug] — patient reports nitrate use. Absolute contraindication." Row turns red, cannot submit. |
| Network error during submit | Error toast + `[Retry]` button. Draft preserved in local state. |
| Session expires during builder | On submit → 401 → silent refresh → retry. If refresh fails → login redirect, draft lost. |
| Two doctors prescribe for same case simultaneously | Second gets error: "A prescription already exists for this consultation by Dr. [Name]." (Optimistic locking.) |
| Doctor wants to modify after submission | Not possible in current consultation. Doctor can adjust at next follow-up. Admin can request doctor to create a new consultation if urgent. |

---

## 19. Workflow: Ordering Blood Work

### 19.1 Trigger

Doctor clicks "🔬 Order Labs" → modal opens.

### 19.2 Lab Order Form

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close           ORDER BLOOD WORK                      │
│                                                          │
│  Patient: Rahul Mehta, 28M, Mumbai                      │
│  Condition: Hair Loss                                    │
│                                                          │
│  ─── SELECT TEST PANEL ──────────────────────────────── │
│  ( ) Extended Hair Panel           ₹1,200               │
│  ( ) Follow-up Panel               ₹600–₹1,200          │
│      [Select specific tests ▼]                           │
│                                                          │
│  ─── NOTES FOR LAB ──────────────────────────────────── │
│  ┌──────────────────────────────────────────────────────┐│
│  │ (Optional notes — e.g., "Fasting sample required")    ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ─── URGENCY ────────────────────────────────────────── │
│  ( ) Routine (book within 5 days)                       │
│  ( ) Urgent (book within 48 hours)                      │
│                                                          │
│  [Cancel]                              [Order Blood Work]│
└──────────────────────────────────────────────────────────┘
```

### 19.3 Test Panels by Vertical

| Vertical | Default Panel | Tests | Price |
|----------|--------------|-------|-------|
| Hair Loss | Extended Hair Panel | TSH, Free T4, Ferritin, Vitamin D, DHT, Hemoglobin, Iron studies | ₹1,200 |
| ED | Basic Health Check | Testosterone (total + free), Fasting glucose, HbA1c, Lipid panel | ₹800 |
| PE | Basic Health Check | Same as ED | ₹800 |
| Weight | Metabolic Panel | HbA1c, Fasting glucose, Lipid panel, Liver/Kidney function, Thyroid | ₹1,800 |
| PCOS | PCOS Screen Panel | FSH, LH, Estradiol, Testosterone, DHEA-S, Prolactin, Fasting glucose, Lipid panel, Insulin | ₹1,500 |

**Billing note:** First panel INCLUDED in subscription. Follow-up panels charged separately.

### 19.4 Lab Order Submit Flow

```
API: trpc.doctor.labOrder.create.mutate({
  consultationId: 'uuid',
  panelId: 'extended_hair_panel',
  customTests: [],
  notes: 'Fasting sample required',
  urgency: 'routine'
})
```

**Backend actions:**
1. Create `LabOrder` record with status `ORDERED`
2. Notify coordinator: "Lab order created — [Patient] — [Panel]. Please arrange collection."
3. Notify patient (push + WhatsApp): "Your doctor has ordered blood tests. Book a home collection or upload your own results."
4. SSE events → admin + patient
5. Audit log entry

**Downstream pipeline (doctor is passive):**
```
ORDERED → Patient books slot → SLOT_BOOKED → Admin assigns nurse → NURSE_ASSIGNED
→ Nurse en route → NURSE_EN_ROUTE → Nurse arrives → NURSE_ARRIVED
→ Nurse collects sample → SAMPLE_COLLECTED → Nurse delivers to lab → AT_LAB
→ Lab receives → SAMPLE_RECEIVED → Lab processes → PROCESSING
→ Lab uploads results → RESULTS_READY → Doctor notified → Doctor reviews
```

### 19.5 Lab Order Edge Cases

| Scenario | Behavior |
|----------|----------|
| Active lab order already exists | Warning: "An active lab order exists. [View existing] / [Create additional]" |
| Patient has recent self-uploaded results | Info: "Patient uploaded lab results on [date]. [View] — may not need new tests." |
| Urgent order without notes | Soft warning: "Urgent orders typically include reason. [Add notes] / [Continue anyway]" |
| Sample rejected by lab (hemolyzed, insufficient) | Lab marks `SAMPLE_ISSUE` → Admin creates recollection order → Patient rebooks → New sample collected |
| Lab order cancelled by admin | Doctor notified → Lab Results tab shows "Order cancelled — [reason]" |

---

## 20. Workflow: Requesting More Information

### 20.1 Trigger

Doctor clicks "❓ Request Info" → message composer opens (pre-focused on Messages tab).

### 20.2 Flow

1. Doctor types a specific question or selects canned response (e.g., "Need more photos")
2. Message sent with special flag: `isInfoRequest: true`
3. Backend updates consultation status → `INFO_REQUESTED`
4. Patient receives notification: "Your doctor needs more information about your case"
5. Patient's Home tab shows red "Action Needed" badge with `[Respond]` CTA
6. Patient responds (text, photos, or additional questionnaire answers)
7. Backend detects patient response → status → `REVIEWING` (returns to active review)
8. Doctor notified: "Patient responded — [Patient Name]"
9. Case reappears in queue with updated status

### 20.3 What Doctor Can Request

- Additional text clarification ("Can you describe your symptoms in more detail?")
- Additional photos ("Please upload a clear photo of your crown area in natural lighting")
- Specific medical information ("What was the dosage of your previous finasteride prescription?")

### 20.4 Info Request Edge Cases

| Scenario | Behavior |
|----------|----------|
| Patient doesn't respond for 7+ days | SLA: reminders sent at 3 and 7 days. After 14 days: doctor can close case or prescribe based on available data. |
| Doctor requests info then prescribes before patient responds | Allowed — prescription takes priority. Status → `PRESCRIPTION_CREATED`. Patient's pending info request is implicitly resolved. |
| Patient responds but with irrelevant information | Doctor can request info again (multiple rounds) or proceed with available data. |
| Multiple info requests in same consultation | Each creates a new message. Status stays `INFO_REQUESTED` until patient responds to any of them. |

---

## 21. Workflow: Referring a Patient

### 21.1 Trigger

Doctor clicks "🏥 Refer" → Referral Modal opens.

### 21.2 Referral Form

**Referral types:**
- Partner clinic (near patient — selected from admin-managed partner list)
- Specialist referral (specific doctor/specialty)
- Emergency referral (immediate attention required)

**Required fields:**
- Referral type
- Partner clinic (if applicable) — search by patient's city
- Reason for referral (required text, e.g., "Suspected Norwood Stage VI — needs surgical assessment for hair transplant")

### 21.3 Referral Submit Flow

```
API: trpc.doctor.referral.create.mutate({
  consultationId: 'uuid',
  type: 'partner_clinic',
  clinicId: 'uuid',       // optional
  reason: 'Advanced hair loss requiring surgical assessment',
  closeCase: true          // whether to close the consultation
})
```

**Backend actions:**
1. Create `Referral` record with clinic details and reason
2. If `closeCase: true` → consultation status → `REFERRED`
3. Notify patient: "Based on your case, your doctor recommends seeing a specialist in person."
4. Notify admin: "Referral created — [Patient] — [Reason]"
5. If partner clinic selected: notify clinic (if notification integration exists)
6. SSE events + audit log

### 21.4 Referral Edge Cases

| Scenario | Behavior |
|----------|----------|
| No partner clinics in patient's city | Doctor shown: "No partner clinics available in [city]. Select 'Specialist referral' to provide custom referral details." |
| Doctor refers but doesn't close case | Case stays in `REVIEWING` — doctor can still prescribe or take other actions. Referral exists as a separate record. |
| Patient was already referred for this condition | Warning: "This patient was previously referred on [date]. [View previous referral] / [Create new]" |
| Emergency referral | System sends immediate notification to admin (bypasses quiet hours). Admin prioritizes patient contact. |

---

## 22. Workflow: Initiating a Refund

### 22.1 When Doctors Request Refunds

Common scenarios:
- Patient has absolute contraindication (e.g., nitrate use for ED patient) — platform cannot treat
- Patient's condition is beyond telehealth scope
- Patient's case requires in-person care that makes the subscription inappropriate

### 22.2 Refund Request Form

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close           REQUEST REFUND                        │
│                                                          │
│  Patient: Rahul Mehta — ED Monthly (₹1,299)             │
│                                                          │
│  Reason: [Select reason ▼]                               │
│  • Medical contraindication (e.g., nitrate use)          │
│  • Beyond telehealth scope                               │
│  • Patient not suitable for treatment                    │
│  • Other (specify)                                       │
│                                                          │
│  Additional notes: [________________________]            │
│                                                          │
│  Refund amount: ₹1,299 (full consultation fee)          │
│  Refund to: Wallet (instant) or Original payment (5-7d) │
│                                                          │
│  ⚠️ This request will be sent to the coordinator for     │
│     approval before processing.                          │
│                                                          │
│  [Cancel]                              [Submit Request]  │
└──────────────────────────────────────────────────────────┘
```

### 22.3 Refund Submit Flow

```
API: trpc.doctor.refund.request.mutate({
  consultationId: 'uuid',
  reason: 'medical_contraindication',
  notes: 'Patient reports nitrate use - PDE5 inhibitors absolutely contraindicated',
  amount: 1299
})
```

**Backend actions:**
1. Create `RefundRequest` record with status `PENDING_APPROVAL`
2. Notify admin: "⚠️ Refund request — [Patient] — ₹[amount] — [reason]. Review required."
3. Consultation status → `CANCELLED` (if doctor selects to close case)
4. Audit log entry

**Admin then reviews and approves/rejects:**
- If approved → refund processed (wallet or Razorpay) → patient and doctor notified
- If rejected → doctor notified with reason

---

## 23. Workflow: Closing a Case

### 23.1 Trigger

Doctor clicks "✕ Close Case" → confirmation dialog.

### 23.2 Close Case Dialog

```
┌──────────────────────────────────────────────────────────┐
│  Close this case?                                        │
│                                                          │
│  Reason: [Select ▼]                                      │
│  • No treatment needed                                   │
│  • Patient does not qualify                              │
│  • Duplicate case                                        │
│  • Other (specify)                                       │
│                                                          │
│  Notes: [________________________]                       │
│                                                          │
│  ⚠️ This action cannot be undone. The patient will be     │
│  notified that their case has been closed.               │
│                                                          │
│  [Cancel]                              [Close Case]      │
└──────────────────────────────────────────────────────────┘
```

### 23.3 Backend Actions

1. Update consultation status → `COMPLETED` (or `CLOSED` — see note below)
2. Notify patient: "Your consultation has been closed. Reason: [reason]"
3. Audit log: `{ action: 'CASE_CLOSED', doctorId, consultationId, reason, timestamp }`

> **⚠️ Status note:** PORTAL-DOCTOR.md's flow diagram lists `CLOSED` as a status, but the transition table maps "Close Case" to `COMPLETED`. During implementation: decide whether `CLOSED` is a distinct enum value or an alias for `COMPLETED`. Recommendation: use `COMPLETED` as the canonical status for all case terminations (whether via prescription or manual closure), with a `closureReason` field to distinguish the type.

---

## 24. Follow-Up Case Handling

### 24.1 Follow-Up Schedule (All Verticals)

| Time Point | Type | Questionnaire | Photos |
|------------|------|--------------|--------|
| 4 weeks | Side effects check | ~10 questions (abbreviated) | None |
| 3 months | Progress review | ~10 questions + progress photos | Hair Loss: 4, Weight: 2, Others: none |
| 6 months | Full assessment | ~15 questions + photos | Same as 3 months |
| 12 months | Annual review | Full questionnaire + comprehensive photos | Same as initial |

### 24.2 How Follow-Ups Enter the Queue

1. BullMQ scheduled job fires when follow-up is due (calculated from `TREATMENT_ACTIVE` date)
2. Patient notified: "It's time for your [4-week] check-in"
3. Patient completes abbreviated questionnaire + photos (if required)
4. Patient submits → new consultation created (type: `FOLLOW_UP`) linked to original
5. AI processes follow-up with delta analysis
6. Case appears in doctor's queue with "Follow-Up" badge (blue, not green "New")

### 24.3 Follow-Up Differences in Case Review

| Feature | Initial Assessment | Follow-Up |
|---------|-------------------|-----------|
| Queue badge | "New" (green) | "Follow-Up" (blue) |
| AI Assessment | Standard assessment | Includes **delta analysis** (comparison with initial) |
| Photos tab | Standard grid | **Comparison mode** (baseline vs. follow-up, slider overlay) |
| Questionnaire tab | Standard display | **Changes highlighted** with "Show changes only" toggle |
| Prescription builder | Empty or template | **Pre-populated** with previous prescription's medications |

### 24.4 Follow-Up AI Delta Analysis

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
│  "Continue current regimen. Consider adding oral   │
│   supplement if lab results show persistent         │
│   vitamin D deficiency."                           │
└────────────────────────────────────────────────────┘
```

### 24.5 Follow-Up Prescription

- Prescription builder pre-populates with previous prescription's medications
- Default template: "Continue Current"
- Doctor adjusts dosages, adds/removes medications as needed
- If significant changes: counseling notes should explain the change

### 24.6 Follow-Up Edge Cases

| Scenario | Behavior |
|----------|----------|
| Patient ignores follow-up notification | Reminders at +3 days and +7 days. After 14 days: auto-reorder may pause if doctor flagged "must check-in before next reorder." |
| Patient's condition has worsened | Doctor can escalate — refer to specialist, adjust medication urgently, or request emergency in-person visit. |
| Different doctor reviews the follow-up (original doctor unavailable) | New doctor sees full history + previous doctor's notes. CASL requires the follow-up be assigned to the new doctor. |
| Follow-up reveals new comorbidity (e.g., ED patient now reports PE symptoms) | Doctor can recommend patient start a new vertical assessment. Cannot prescribe for a vertical not in the current consultation. |
| Multiple follow-ups due simultaneously (multi-vertical patient) | Each vertical tracked independently. Patient may receive two check-in notifications in the same week. |

---

## 25. Consultation Lifecycle — Complete Status Flow

### 25.1 Full Status Flow Diagram

```
    SUBMITTED          ← Patient submits assessment + pays
        │
        ▼
    AI_PROCESSING      ← BullMQ job: Claude API call (1-3 min)
        │
        ├──→ AI_FAILED  ← Claude API error (retryable 3x)
        │       │
        │       ▼ (retry or manual review)
        │
        ▼
    AI_COMPLETE        ← AI assessment ready, case appears in queue
        │
        ▼ (doctor opens case)
    ASSIGNED           ← Auto-assigned to doctor, assignedAt set
        │
        ▼ (30s or first action)
    REVIEWING          ← Doctor actively reviewing, firstReviewedAt set
        │
        ├──→ INFO_REQUESTED    ← Doctor sends "Request More Info"
        │         │
        │         ▼ (patient responds)
        │    REVIEWING          ← Back to reviewing
        │
        ├──→ PRESCRIPTION_CREATED  ← Doctor submits prescription
        │         │
        │         ▼ (medication delivered, patient starts treatment)
        │    TREATMENT_ACTIVE      ← Day counter starts
        │         │
        │         ▼ (follow-up timer fires)
        │    FOLLOW_UP_DUE         ← Patient notified to check in
        │
        ├──→ REFERRED              ← Doctor refers to specialist
        │
        └──→ COMPLETED/CLOSED      ← Doctor closes case (no treatment)
```

### 25.2 Complete Status Transitions Table

| Current Status | Trigger | New Status | Who | Side Effects |
|----------------|---------|-----------|-----|-------------|
| `SUBMITTED` | System queues AI job | `AI_PROCESSING` | System | BullMQ job created |
| `AI_PROCESSING` | AI assessment completes | `AI_COMPLETE` | System | Case enters queue, eligible for assignment |
| `AI_PROCESSING` | AI assessment fails | `AI_FAILED` | System | Admin notified, retry available |
| `AI_COMPLETE` | Doctor opens case review | `ASSIGNED` | Doctor | `assignedAt` set, doctor notified |
| `AI_COMPLETE` | Admin manually assigns | `ASSIGNED` | Admin | Doctor notified |
| `ASSIGNED` | 30s on page or first action | `REVIEWING` | System | `firstReviewedAt` set |
| `REVIEWING` | Doctor clicks "Request More Info" | `INFO_REQUESTED` | Doctor | Message sent, patient notified |
| `INFO_REQUESTED` | Patient responds | `REVIEWING` | System | Doctor notified, case returns to review |
| `REVIEWING` | Doctor submits prescription | `PRESCRIPTION_CREATED` | Doctor | PDF generated, order created, notifications sent |
| `REVIEWING` | Doctor submits referral (close=true) | `REFERRED` | Doctor | Patient notified, referral record |
| `REVIEWING` | Doctor clicks "Close Case" | `COMPLETED` | Doctor | Patient notified |
| `PRESCRIPTION_CREATED` | Medication delivered + patient starts | `TREATMENT_ACTIVE` | System | Day counter starts |
| `TREATMENT_ACTIVE` | Follow-up timer fires | `FOLLOW_UP_DUE` | System | Patient notified |

### 25.3 Status Enum Cross-Reference Note

> **⚠️ CRITICAL for implementation:** Different documents use slightly different status names for the same state:
>
> - ARCHITECTURE.md and BACKEND-PART1.md use `PENDING_REVIEW` and `IN_REVIEW`
> - PORTAL-DOCTOR.md and APP-PATIENT.md use `AI_COMPLETE` and `REVIEWING`
>
> **Canonical names for code:** Use `AI_COMPLETE` (not `PENDING_REVIEW`) and `REVIEWING` (not `IN_REVIEW`). BACKEND-PART1.md also uses `PRESCRIBED` instead of `PRESCRIPTION_CREATED` and `MORE_INFO_REQUESTED` instead of `INFO_REQUESTED` — normalize to the PORTAL-DOCTOR.md versions.
>
> Video consultation status (`NOT_REQUIRED | PENDING | SCHEDULED | IN_PROGRESS | COMPLETED | SKIPPED_TESTING`) exists as a parallel track but is auto-set to `SKIPPED_TESTING` in MVP. No video step appears in the doctor workflow.

---

*End of WORKFLOW-DOCTOR-PART2.md — Continue to Part 3 for Operational Workflows (Patient Management, Stats, Settings, Notifications, SLA, Security, Edge Cases)*
