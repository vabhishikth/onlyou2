# PROJECT-OVERVIEW.md — Change Summary
## Payment Flow Redesign: "Pay After Doctor, Not Before"

---

## CHANGE 1: Section 1 — One-liner under "WHAT IS ONLYOU?"

**OLD:**
```
One subscription = AI assessment + doctor consultation + prescription + medication delivery + ongoing monitoring.
```

**NEW:**
```
Free doctor consultation + personalized treatment plan → subscription for medication delivery + ongoing monitoring.
```

**WHY:** The headline value proposition now leads with "free consultation" — the #1 trust-building differentiator.

---

## CHANGE 2: Section 2 — New bullet in "The Problem"

**ADDED:**
```
- Cost-before-trust barrier — existing platforms ask patients to pay before ever speaking to a doctor. For stigmatized conditions where trust is already low, this kills conversion.
```

**WHY:** Explicitly names the problem Onlyou solves that competitors don't.

---

## CHANGE 3: Section 3 — New moat item #6

**ADDED:**
```
6. Free consultation, pay for treatment — patients get a real doctor's opinion before any payment, building trust and maximizing conversion for stigmatized conditions
```

**WHY:** This IS a competitive moat — Man Matters does it, but no clinical telehealth platform in India combines free consultation + AI pre-assessment + prescription medication (not supplements).

---

## CHANGE 4: Section 5 — Subscription model RESTRUCTURED

**OLD:** Single list "What's Included in Every Subscription" (6 items including AI assessment and doctor consultation)

**NEW:** Split into TWO sections:

1. **"What the Patient Gets for Free (Before Payment)"** — AI pre-assessment, async doctor consultation, personalized treatment plan
2. **"What's Included in Every Subscription (After Payment)"** — e-prescription, medication, ongoing check-ins, unlimited messaging, first blood panel, auto-reorder

**ADDED:** New subsection "Why Free Consultation?" explaining the business rationale with competitive evidence (Man Matters, Ro, MFine cautionary tale).

**WHY:** Makes the value proposition crystal clear to anyone reading the spec — the free part is the hook, the subscription is the revenue.

---

## CHANGE 5: Section 6 — CORE USER JOURNEY completely reordered

**OLD FLOW:**
```
Questionnaire → Photos → AI Assessment → SELECTS PLAN & PAYS → DOCTOR REVIEWS CASE → outcomes
```

**NEW FLOW:**
```
Questionnaire → Photos → AI Assessment → DOCTOR REVIEWS CASE (FREE) → CREATES TREATMENT PLAN → PATIENT SEES TREATMENT PLAN → SELECTS PLAN & PAYS → Pharmacy pipeline
```

**KEY DIFFERENCES:**
- Payment moved from BEFORE doctor review to AFTER
- New step: "PATIENT SEES TREATMENT PLAN" — the doctor's approved plan is shown before payment
- "REFUNDS" outcome renamed to "DECLINES" — with "(no charge to patient)" since they haven't paid
- "REFERS" now also says "(no charge to patient)"
- Added explicit note: "Anti-abuse safeguard: One free consultation per vertical per user"

**ADDED:** New subsection under Section 6 titled "Key Flow Difference: Payment Comes AFTER Doctor Review" that explicitly documents OLD vs NEW and the rationale.

---

## CHANGE 6: Section 12 — New Key Decision #16

**ADDED:**
```
| 16 | Payment timing | Pay AFTER doctor review (free consultation) | Pay BEFORE doctor review | Proven by Man Matters / Ro. For stigmatized conditions in India, trust must be built before payment. Consultation is acquisition cost, not revenue. Anti-abuse: 1 free consultation per vertical per user. |
```

**WHY:** This is a major architectural decision that should be logged in the decisions table with its rationale, just like all other key decisions.

---

## SECTIONS WITH NO CHANGES
- Section 4 (MVP Verticals) — no change needed
- Section 7 (System Actors) — no change needed
- Section 8 (MVP Constraints) — no change needed
- Section 9 (Team & Roles) — no change needed
- Section 10 (Domain Strategy) — no change needed
- Section 11 (Timeline) — no change needed (payment system still built in Phase 5, just triggered at a different point in the flow)

---

## IMPACT ON OTHER DOCUMENTS

This change in PROJECT-OVERVIEW.md cascades to:
1. **WORKFLOW-PATIENT.md** — Sections 12-14 (plan selection, payment, post-payment) need reordering
2. **APP-PATIENT.md** — Plan selection screen trigger changes, new "Treatment Plan Ready" screen needed
3. **BACKEND-PART1.md** — Consultation status enum needs `AWAITING_PAYMENT` state
4. **BACKEND-PART2A.md** — Payment webhook triggers pharmacy (not doctor queue)
5. **All VERTICAL-*.md** — Patient journey flows need reordering
6. **LANDING-PAGE.md** — Messaging and "How It Works" section updates
7. **PORTAL-DOCTOR.md** — Minor (doctors review same way, but before payment)
8. **PORTAL-ADMIN.md** — Refund policy simplification
9. **onlyou-spec-resolved-v4.md** — Master spec flow update
