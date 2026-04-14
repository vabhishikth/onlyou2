# onlyou Visual Direction

> **What this file is**: Screen-by-screen layout patterns, interaction recipes, and "feel" guidelines modeled after Hims iOS (Jan 2025). This file does NOT redefine colors, tokens, or components — those live in `docs/DESIGN.md` and the `@onlyou/core/tokens/*` exports from `packages/core`. This file tells you HOW to compose those tokens into premium, Hims-quality screens.
>
> **Read order**: `docs/DESIGN.md` first (tokens, components, file paths), then this file (patterns, layouts, feel).

---

## ⚠️ Phase 2 carve-outs — NOT adopted

**Authoritative for Phase 2 except these five sections.** Decided 2026-04-14 during Phase 2 brainstorm. Full rationale in `docs/decisions/2026-04-14-visual-direction-adoption.md`.

| Section                                              | What the doc says                                                                             | What Phase 2 does instead                                                                                                     | Reason                                                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **§2.4 tab bar (5 tabs)**                            | Home · Activity · Orders · Messages · Profile                                                 | **4 tabs + profile avatar top-right**: Home · Explore · Activity · Messages. Profile stack is pushed from the avatar.         | See `docs/decisions/2026-04-14-phase-2-navigation-ia.md` — founder call during brainstorm; profile as avatar feels more premium |
| **§2.9 Shop tab**                                    | First-class Shop tab with Featured / Browse tabs and hero cards                               | **Not in Phase 2 scope.** onlyou ships medications as part of treatment subscriptions, not as a standalone e-commerce catalog | No product-catalog concept in the business model                                                                                |
| **§2.10 Cart screen**                                | First-class Cart + promo + checkout                                                           | **Not in Phase 2 scope.** Same reason — no cart concept in a subscription telehealth product                                  |                                                                                                                                 |
| **§2.5 ID Verification (Aadhaar last-4 / ID photo)** | Part of the consultation flow                                                                 | **Not in Phase 2 scope.** Not in any existing vault doc                                                                       | Needs compliance + legal review before we add it; may come back in a later phase                                                |
| **§7 Haptics + §8 Reduce motion + full a11y**        | Haptic feedback across every interaction, reduce-motion rules, VoiceOver labels, Dynamic Type | **Deferred to Phase 8 (launch polish).** Logged in `docs/DEFERRED.md`                                                         | More efficient to apply uniformly across the whole app at polish time                                                           |

Everything else below is authoritative. Use it.

> **Examples are illustrative, not prescriptive.** The questionnaire examples in §2.5 and the product examples in §2.6 use skin-condition / acne / retinoid / generic Rx names (carried over from the Hims source). **onlyou does not have a skin vertical.** Treat those strings as placeholders that show the _pattern_ (question phrasing, card layout, savings badge, microHeader positioning). The real content per vertical comes from:
>
> - Hair Loss → `docs/VERTICAL-HAIR-LOSS.md` (Phase 3 pulls the real questions from here)
> - ED / PE → `docs/VERTICAL-ED.md`, `docs/VERTICAL-PE.md`
> - PCOS → `docs/VERTICAL-PCOS-PART{1,2,3}.md`
> - Weight → `docs/VERTICAL-WEIGHT.md`
>
> When you build a questionnaire screen, copy the _structure_ from §2.5 but pull the _words_ from the matching vertical doc. Any "skin / acne / retinoid" content that lands in onlyou code is a bug.

---

## 1. The "Clinical Luxe" Feel Checklist

Before shipping ANY patient-facing screen, verify:

- [ ] Background is `background` (#FAFAF8) or `white` — never flat gray
- [ ] Headline uses Playfair Display (serif), left-aligned (not centered, except nav titles)
- [ ] Body text is Plus Jakarta Sans — use weight variation (400/500/600) for hierarchy, never 700 for body
- [ ] Horizontal content padding is `horizontal` (24px) on all screens — no exceptions
- [ ] Generous vertical spacing between sections (32–40px / `spacing.2xl` to `spacing.3xl`)
- [ ] Primary CTAs are full-width, pill-shaped (`rounded-full`), 56px height
- [ ] Forms show ONE question or small logical group per screen (consultation flow)
- [ ] Inputs use floating labels (not placeholder-only)
- [ ] Back button is icon-only (ChevronLeft, 44px tap target) — no text
- [ ] No decorative gradients, glows, or heavy shadows — only `shadow.soft`
- [ ] Bottom sheets for all pickers, confirmations, and secondary inputs
- [ ] Consultation flow CTAs use `accentWarm` (#C4956B) background, not `primary`
- [ ] Status badges use the semantic badge variants from `docs/DESIGN.md` Section 11
- [ ] Whitespace feels generous, even "too much" — that's the premium signal

---

## 2. Screen Patterns

### 2.1 Splash Screen

```
┌─────────────────────┐
│                     │
│                     │
│                     │
│       onlyou        │  ← Playfair Display Black 36px, #141414, centered
│                     │
│                     │
│                     │
└─────────────────────┘
```

- Background: `white` (#FFFFFF)
- Logo fades in (opacity 0→1, 400ms, Reanimated FadeIn)
- Hold 1.5s minimum or until auth check resolves
- Cross-dissolve (300ms) to Welcome or Home

### 2.2 Welcome / Landing

```
┌─────────────────────┐
│  onlyou              │  ← Logo, top-left, 36px
│                      │
│  Get your            │  ← Playfair Display SemiBold 32px (heroTitle)
│  personalized        │     "personalized" in accent (#9B8EC4)
│  treatment plan      │
│                      │
│  Your free online    │  ← Plus Jakarta Sans 16px, textSecondary
│  visit starts here.  │
│                      │
│  ┌──────┐ ┌──────┐  │  ← Category cards, horizontal scroll
│  │ Hair │ │ Skin │  │     160×120px, bg offWhite, rounded-2xl
│  └──────┘ └──────┘  │     Treatment vertical tint colors from design.md §12
│                      │
│  ┌──────────────────┐│
│  │   Get started    ││  ← PremiumButton primary, full width
│  └──────────────────┘│
│  ┌──────────────────┐│
│  │     Log in       ││  ← PremiumButton secondary, full width
│  └──────────────────┘│
│                      │
│  New to onlyou?      │  ← Plus Jakarta Sans 14px, "Create an account" bold
│  Create an account   │
│                      │
│  🚚 Free shipping   │  ← Icon + textTertiary, 12px
└──────────────────────┘
```

- Category cards use treatment vertical tint backgrounds (§12 of `docs/DESIGN.md`)
- 12px gap between category cards (`cardGap`)
- 24px horizontal padding (`horizontal`)
- Staggered fade-in animation: logo → headline → cards → buttons (100ms delays)

### 2.3 Authentication

**Phone Entry:**

```
┌─────────────────────┐
│  ←                   │  ← BackButton (44px, ChevronLeft)
│                      │
│  onlyou              │  ← Logo, animated FadeInUp
│                      │
│  What's your         │  ← heroTitle (Playfair 32px)
│  phone number?       │
│                      │
│  We'll text you a    │  ← body (Plus Jakarta 16px), textSecondary
│  verification code   │
│                      │
│  ┌──────────────────┐│
│  │ +91 | 98765 43210││  ← PremiumInput, 60px height
│  └──────────────────┘│
│                      │
│         (spacer)     │
│                      │
│  ┌──────────────────┐│
│  │    Continue      ││  ← PremiumButton primary, sticky footer
│  └──────────────────┘│
│  By continuing...    │  ← caption (12px), textTertiary
└──────────────────────┘
```

**OTP Verification:**

- Same layout structure
- 6-digit OTP input
- "Resend code" link appears after 30s countdown
- Auto-submit on 6th digit entry

### 2.4 Home (Authenticated) — Phase 2 carve-out

> ⚠️ Tab bar at the bottom of this mockup shows 5 tabs. **Phase 2 uses 4 tabs + profile avatar in the header** instead. Ignore the tab-bar row in this section; adopt everything else (banners, category pills, sectionHeading, trending cards, brand footer).

```
┌─────────────────────┐
│  Home          ⊙    │  ← Nav: title left (Playfair 20px), avatar right (Phase 2)
│                      │
│  ┌─────────────────┐ │
│  │ Active Consul.  │ │  ← ActiveConsultationBanner (if active)
│  └─────────────────┘ │
│  ┌─────────────────┐ │
│  │ Order Tracking  │ │  ← ActiveOrderBanner (if active)
│  └─────────────────┘ │
│                      │
│  Hair  Sexual  PCOS  │  ← Horizontal scroll category pills
│  ────                │     Active: primary bg, white text
│                      │     Inactive: offWhite bg, textPrimary
│                      │     Filtered by gender (APP-PATIENT-ADDITIONS §1)
│                      │
│  Trending            │  ← Playfair Display Bold 22px (sectionHeading)
│  Apr 14              │     Date in textTertiary
│                      │
│  ┌──────┐ ┌──────┐  │  ← Condition cards, horizontal scroll
│  │      │ │      │  │     (not "products" — onlyou ships subscriptions)
│  │ Hair │ │ ED   │  │
│  │ Loss │ │      │  │
│  └──────┘ └──────┘  │
│                      │
│  ○ Take care of you. │  ← Brand footer, centered, textTertiary
│    All of you.       │
└──────────────────────┘
```

### 2.5 Consultation Flow

**This is the most critical section.** The consultation is where users decide to trust onlyou with their health. Every screen must feel calm, focused, and unhurried.

> ⚠️ The original §2.5 includes an Aadhaar ID Verification screen. **Phase 2 does not adopt that screen** — excluded per the carve-out table. Everything else in §2.5 is authoritative.

#### Shared Consultation Shell

```
┌─────────────────────┐
│  ←   Consultation  ✕ │  ← Back left, title center, X right
│                      │
│  onlyou              │  ← Brand mark, Playfair Black 18px, left-aligned
│                      │
│  3 of 17             │  ← ProgressIndicator or text counter
│                      │     microHeader style (12px, 500, 1.5px spacing)
│                      │     textTertiary color
│  ┌──────────────────┐│
│  │                  ││
│  │   QUESTION       ││  ← Single question area
│  │   CONTENT        ││
│  │                  ││
│  └──────────────────┘│
│                      │
│         (spacer)     │
│                      │
│  ┌──────────────────┐│
│  │      Next        ││  ← CTA, sticky to bottom
│  └──────────────────┘│     Uses accentWarm (#C4956B) bg, NOT primary
└──────────────────────┘
```

**Rules for consultation screens:**

1. ONE question per screen. Never combine questions.
2. X button (top-right) triggers an "Are you sure?" alert — not immediate exit.
3. CTA button uses `accentWarm` (#C4956B) background with white text — this is the warm consultation feel that distinguishes it from the rest of the app.
4. CTA is disabled (use `ctaDisabled` / `ctaDisabledText` tokens) until the question is answered.
5. Progress counter or ProgressIndicator dots at top.
6. Brand mark "onlyou" sits below the nav bar as a trust signal.
7. Back arrow goes to previous question (never skips).

#### Question Types

**Multi-Select (Checkboxes)**:

```
  What goals do you have     ← Playfair Display SemiBold 22px (sectionHeading)
  for your skin?

  ┌─────────────────────┐
  │ ☑ Control acne      │    ← SelectionCard with check state
  └─────────────────────┘    Selected: accentLight bg (#F0EDF7), accent border
  ┌─────────────────────┐    Icon: accent color checkmark
  │ ☑ Clear pores       │
  └─────────────────────┘    56px row height, 12px gap between
  ┌─────────────────────┐
  │ ☐ Fewer wrinkles    │    ← Unselected: white bg, border color
  └─────────────────────┘
```

- Selected state: `accentLight` (#F0EDF7) background, `accent` (#9B8EC4) border + checkmark
- "Next" enables after 1+ selection

**Single-Select (Radio)**:

```
  Have you tried any         ← sectionHeading
  treatments before?

  ○  Yes, prescription       ← Radio circles, accent color when selected
  ○  Yes, over-the-counter
  ●  No, this is my first
```

- Same visual treatment as SelectionCard but with radio behavior
- "Next" enables after selection

**Text Input**:

```
  9 of 17                    ← Progress counter

  If you remember it,        ← sectionHeading
  what was the strength
  of the retinoid?

  (e.g. Tretinoin 0.05%)    ← body, textSecondary, helper text

  ┌──────────────────────┐
  │ Tretinoin 0.05%      │   ← PremiumInput, floating label
  └──────────────────────┘
```

- Keyboard auto-opens on screen mount
- "Next" enables when input is non-empty

**Photo Upload**:

```
  Take a clear photo         ← sectionHeading
  of your face

  Good lighting, no          ← body, textSecondary
  filters, face centered

  ┌──────────────────────┐
  │                      │
  │    📷 Camera View    │   ← Full-width, 1:1 aspect ratio
  │                      │
  └──────────────────────┘

  After capture:
  [Retake]    [Use Photo]    ← ghost / primary button pair
```

- Uses expo-camera + expo-image-picker
- Retake: PremiumButton ghost variant
- Use Photo: PremiumButton primary variant

**Shipping Address**:

```
  ┌──────────────────────┐
  │ Full name            │   ← PremiumInput, floating label
  └──────────────────────┘
  ┌──────────────────────┐
  │ Street address       │
  └──────────────────────┘
  ┌───────────┐ ┌────────┐
  │ City      │ │ State ▾│   ← State opens bottom sheet picker
  └───────────┘ └────────┘
  ┌──────────────────────┐
  │ PIN code             │   ← 6-digit, numeric keyboard
  └──────────────────────┘
```

- 16px gap between fields (`inputGap`)
- State dropdown triggers bottom sheet with scroll list
- PIN code validates format in real-time
- Sticky "Continue" at bottom (consultation warm CTA)

### 2.6 Treatment Plan Selection

```
┌──────────────────────┐
│  ←   Consultation   ✕│
│                      │
│  Select a treatment  │  ← Playfair Display SemiBold 28px (title)
│  plan                │
│                      │
│  ┌──────────────────┐│  ← Radio-selectable cards
│  │ Every 12 months  ││     RECOMMENDED: left border in accent
│  │ ₹240/12 months   ││     Shipped every 2 months
│  │ ₹45 → ₹20/mo     ││     Original price struck, new price bold
│  │      Save ₹300/yr││     Savings badge: success variant
│  └──────────────────┘│
│  ┌──────────────────┐│
│  │ Every 6 months   ││
│  │ ...              ││
│  └──────────────────┘│
│  ┌──────────────────┐│
│  │ Every 2 months   ││
│  └──────────────────┘│
│                      │
│  OFFER NOT INCLUDED  │  ← microHeader, textTertiary
│  ┌──────────────────┐│
│  │ Every month      ││  ← De-emphasized, no savings badge
│  └──────────────────┘│
│                      │
│  ┌──────────────────┐│
│  │    Continue      ││  ← Sticky, warm CTA
│  └──────────────────┘│
└──────────────────────┘
```

- Plan cards: `rounded-2xl`, `border` color, `white` bg
- Selected plan: `accentLight` bg, `accent` border (2px)
- Recommended plan: 3px left border in `accent`
- Savings badge uses the `success` badge variant
- "OFFER NOT INCLUDED" uses `microHeader` style, adds visual separation
- Longest plan pre-selected by default

### 2.7 Payment

```
┌──────────────────────┐
│  ←   Consultation   ✕│
│                      │
│  ○ UPI    ● Card     │  ← Payment method toggle
│                      │
│  ┌──────────────────┐│
│  │ Card number   /  ││  ← Single row: number + expiry
│  └──────────────────┘│
│                      │
│  ┌──────────────────┐│
│  │    Pay ₹0 Now    ││  ← accentWarm CTA with amount
│  └──────────────────┘│
│                      │
│  Important: By       │  ← caption (12px), textTertiary
│  clicking Pay...     │     Subscription terms, scrollable
│  (legal text)        │
│                      │
│  🔒 256-BIT TLS     │  ← Centered, textMuted, 10px
└──────────────────────┘
```

- Razorpay integration handles actual payment UI (mocked in Phase 2)
- Legal text is scrollable if it exceeds visible area
- Security badge anchored above safe area

### 2.8 Provider Chat

```
┌──────────────────────┐
│  ←  Hair Loss: Consult│
│                      │
│        Dr. Sharma     │  ← Avatar (40px) + name + credentials
│        Dermatologist  │     Plus Jakarta 14px, textSecondary
│                      │
│  ┌─────────────────┐ │
│  │ Based on your   │ │  ← Doctor message: left-aligned
│  │ assessment, I'm │ │     bg: offWhite (#F8F8F6)
│  │ recommending... │ │     rounded-2xl, max-width 75%
│  └─────────────────┘ │
│                      │
│       ┌─────────────┐│
│       │ Thank you,  ││  ← Patient message: right-aligned
│       │ doctor      ││     bg: primary (#141414)
│       └─────────────┘│     text: white, rounded-2xl, max-width 75%
│                      │
│  ┌────────────── 📤 ┐│  ← Input bar: white bg, border-top
│  │ Write a message  ││     Send button: accent circle + arrow
│  └──────────────────┘│     Sticky above keyboard
└──────────────────────┘
```

- Messages load newest at bottom, scroll to bottom on new message
- Doctor avatar shows on first message in a sequence (not every bubble)
- Timestamps (textTertiary, 10px) between message groups (>5min apart)
- Links in doctor messages use `accent` color
- **Phase 2 shell:** input bar is disabled (fixtures, no real send)

### 2.11 Subscription Management

```
┌──────────────────────┐
│  ←   Subscription    │
│                      │
│  Shipping     1226   │  ← Two-column row, chevron right
│  address    Mumbai>  │     Tap to edit
│                      │
│  FROM YOUR PROVIDER  │  ← microHeader, ALL CAPS, textTertiary
│                      │
│  Treatment Plan      │  ← cardTitle (Plus Jakarta SemiBold 18px)
│                      │
│  How to take      ▾  │  ← Expandable section (chevron toggles)
│  Apply 1 pump...     │     body, textSecondary
│                      │
│  ┌──────────────────┐│
│  │ 🖼 Medication    ││  ← Medication card: product on bg-warm
│  │    overview    > ││     Horizontal scroll if multiple
│  └──────────────────┘│
│                      │
│  Set your medication │  ← Tap opens time picker bottom sheet
│  reminder   6:00 AM ▾│
└──────────────────────┘
```

**Manage Subscription** actions (Phase 3 — deferred):

- "Snooze your next order" → confirmation bottom sheet with date + Cancel/Confirm
- "Add/remove items" → item list with SelectionCards + total
- "End subscription" → radio confirmation: "Yes, cancel" / "No, keep"
- Cancel button uses `error` color (destructive variant)

### 2.12 Order History

```
┌──────────────────────┐
│  ←                   │
│                      │
│  Order history       │  ← Playfair Display SemiBold 28px (title)
│                      │
│  ┌──────────────────┐│
│  │ 🖼 Preparing     ││  ← Product thumbnail (56px) + status
│  │   Hair Loss Rx   ││     Status label uses semantic badge variants
│  │   1 item • ₹999  ││     from docs/DESIGN.md Section 11.2
│  └──────────────────┘│
│  ┌──────────────────┐│
│  │ 🖼 Cancelled     ││  ← Cancelled: textMuted
│  │   5% Minoxidil   ││
│  └──────────────────┘│
│                      │
└──────────────────────┘
```

- Full row tappable → opens order detail with DeliveryTracker
- Dividers between orders: `borderLight`

### 2.13 Profile / Account

```
┌──────────────────────┐
│  ←                   │
│                      │
│  Account             │  ← title (Playfair SemiBold 28px)
│                      │
│  Personal info     > │  ← List rows, 56px height
│  Addresses         > │     cardTitle left, ChevronRight right
│  Payment methods   > │     Dividers between (borderLight)
│  Subscriptions     > │
│                      │
│  ─────────────────── │
│                      │
│  Help & support    > │  ← Phase 8 placeholder in Phase 2
│  Terms             > │  ← Phase 8 placeholder in Phase 2
│  Privacy policy    > │  ← Phase 8 placeholder in Phase 2
│  Telehealth consent> │  ← Phase 8 placeholder in Phase 2
│                      │
│  ─────────────────── │
│                      │
│     Sign out         │  ← PremiumButton ghost, error text color
│                      │     Confirmation alert before executing
│                      │
│  v1.0.0 (build 42)   │  ← caption, textMuted, centered
└──────────────────────┘
```

---

## 3. Bottom Sheet Patterns

Bottom sheets are used for ALL secondary interactions. Never use a full-screen modal when a bottom sheet will do.

### Structure

```
┌──────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░│  ← Overlay: rgba(0,0,0,0.3), tap to dismiss
│░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░│
├──────────────────────┤
│         ───          │  ← Drag indicator: 36×5px, border color, centered
│                      │     8px from top of sheet
│  Sheet Title         │  ← cardTitle (18px SemiBold)
│                      │
│  Content here...     │
│                      │
│  ┌──────────────────┐│
│  │    Action CTA    ││  ← PremiumButton (variant depends on context)
│  └──────────────────┘│
│                      │  ← Safe area bottom padding
└──────────────────────┘
```

### Animation

- Enter: Spring animation (Reanimated), translate from bottom, damping 15, stiffness 300
- Exit: 250ms ease-in slide down
- Overlay fades in/out (200ms)

### When to use

- State / city picker → scroll list with check on selected
- Date / time picker → scroll wheel picker
- Promo code entry → text input + Apply button
- Snooze confirmation → date display + Cancel / Confirm
- Cancellation confirmation → radio options + Confirm
- "Why do we need this?" explainers → text content + Close
- Dev scenario switcher (Phase 2 only, **DEV**)

---

## 4. Floating Label Input Behavior

All `PremiumInput` fields use a floating label pattern.

### States

1. **Empty + Unfocused**: Label sits as placeholder (Plus Jakarta Medium 14px, `textMuted`), vertically centered in the 60px input
2. **Focused or Filled**: Label animates up to 12px from top (Plus Jakarta Medium 11px, `textTertiary`). Value text sits below (body, `textPrimary`)
3. **Error**: Border becomes `error` color. Error message appears 4px below input (caption, `error` color). Label turns `error` color.
4. **Disabled**: Background becomes `offWhite` (#F8F8F6). Text becomes `textMuted`. Border becomes `primary-200`.

### Animation

- Label position: `withTiming`, 200ms, easeOut
- Label size: `withTiming`, 200ms, easeOut (14px → 11px)
- Border color: `withTiming`, 150ms

---

## 5. Notification & Permission Screens

When requesting system permissions (notifications, camera, location), follow this pattern:

```
┌──────────────────────┐
│                      │
│  ┌──────────────────┐│
│  │                  ││  ← Illustration/mockup showing the feature
│  │   Preview of     ││     in use (e.g., order tracking notification)
│  │   the feature    ││     bg: offWhite, rounded-2xl
│  │                  ││
│  └──────────────────┘│
│                      │
│  Know the moment     │  ← Playfair Display SemiBold 28px, accent color
│  your order arrives  │
│                      │
│  Turn on notifica-   │  ← body, textSecondary, max 3 lines
│  tions to take       │
│  advantage of...     │
│                      │
│  ┌──────────────────┐│
│  │Allow notifications││ ← PremiumButton primary
│  └──────────────────┘│
│                      │
│      Not now         │  ← PremiumButton ghost
└──────────────────────┘
```

- Always explain the VALUE first, then ask for permission
- "Not now" is always available — never block the user
- After dismissal, the prompt doesn't reappear for that permission

---

## 6. Loading & Empty States

### Skeleton Loading

- Use `Skeleton` component (shimmer animation, 1.5s loop)
- Match the shape of real content (card skeletons should be card-shaped)
- Show skeletons for 300ms minimum to prevent flash

### Empty States

- Use `EmptyState` pattern: centered icon (36px, `textMuted`) + title (sectionHeading) + description (body, `textSecondary`) + optional CTA
- Order history empty: ShoppingBag icon + "No orders yet" + "Start your consultation" CTA
- Messages empty: MessageCircle icon + "No messages yet" + "Your provider will reach out after your consultation"

### Error States

- Use `ErrorState` pattern with retry button
- Network errors: WifiOff icon + "Can't connect" + "Try again" CTA
- Server errors: AlertCircle icon + "Something went wrong" + "Try again" CTA

---

## §7 Haptic feedback map — ⏸ DEFERRED to Phase 8

See `docs/DEFERRED.md`. The original §7 spec (haptic on every button, payment submit, order confirmation, validation error, etc.) is the authoritative target when Phase 8 implements it.

## §8 Reduce Motion / Accessibility — ⏸ DEFERRED to Phase 8

Same — deferred. Touch-target sizing (≥44px) and basic VoiceOver labels where they're free are fine to add opportunistically in Phase 2, but full reduce-motion + Dynamic Type + comprehensive VoiceOver audit is Phase 8 work.

---

## Cross-references

- Tokens, colors, typography, spacing → `docs/DESIGN.md` + `packages/core/tokens/*`
- Phase 2 Patient App Shell spec → `docs/superpowers/specs/2026-04-14-phase-2-patient-shell-design.md`
- Navigation decision (4 tabs + avatar) → `docs/decisions/2026-04-14-phase-2-navigation-ia.md`
- Adoption decision for this file → `docs/decisions/2026-04-14-visual-direction-adoption.md`
- Deferred items (including haptics + a11y) → `docs/DEFERRED.md`
