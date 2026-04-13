# APP-PATIENT.md — Patient Mobile App: Complete Specification

> **Platform:** Onlyou Telehealth — Indian telehealth for stigmatized chronic conditions  
> **App Type:** React Native (Expo) — iOS + Android from single codebase  
> **Target Size:** 15–25MB AAB download  
> **Auth:** Email / Google / Apple sign-up + mandatory phone OTP verification → JWT  
> **Navigation:** 5-tab bottom navigator (Home | Explore | Activity | Messages | Profile)  
> **API Protocol:** tRPC (end-to-end type-safe, no codegen)  
> **State Management:** Zustand  
> **Routing:** Expo Router (file-based)  
> **Real-time:** SSE + Redis Pub/Sub (no WebSockets, no sticky sessions)

---

## Table of Contents

1. [App Structure & Navigation](#1-app-structure--navigation)
2. [Authentication & Onboarding](#2-authentication--onboarding)
3. [Phone OTP Verification](#3-phone-otp-verification)
4. [Tab 1: Home](#4-tab-1-home)
5. [Tab 2: Explore](#5-tab-2-explore)
6. [Tab 3: Activity (My Care)](#6-tab-3-activity-my-care)
7. [Tab 4: Messages](#7-tab-4-messages)
8. [Tab 5: Profile](#8-tab-5-profile)
9. [Questionnaire Engine](#9-questionnaire-engine)
10. [Photo Upload Module](#10-photo-upload-module)
11. [Plan Selection & Payment](#11-plan-selection--payment)
12. [Consultation Lifecycle (Patient View)](#12-consultation-lifecycle-patient-view)
13. [Lab Booking & Tracking](#13-lab-booking--tracking)
14. [Medication Delivery & Tracking](#14-medication-delivery--tracking)
15. [Subscription Management](#15-subscription-management)
16. [Wallet & Refunds](#16-wallet--refunds)
17. [Notification System](#17-notification-system)
18. [PCOS Period Tracker](#18-pcos-period-tracker)
19. [Discreet Mode](#19-discreet-mode)
20. [Offline & Network Handling](#20-offline--network-handling)
21. [Accessibility & Localization](#21-accessibility--localization)
22. [Error States & Edge Cases](#22-error-states--edge-cases)
23. [Deep Links & Navigation](#23-deep-links--navigation)
24. [Analytics Events](#24-analytics-events)
25. [Security & Privacy](#25-security--privacy)

---

## 1. App Structure & Navigation

### File-Based Routing (Expo Router)

```
src/app/
├── (auth)/                    → Login, signup, OTP verification, profile setup
│   ├── welcome.tsx            → Landing/splash with sign-in options
│   ├── signup.tsx             → Email registration form
│   ├── signin.tsx             → Email login form
│   ├── phone-verify.tsx       → Mandatory phone OTP step
│   ├── otp-entry.tsx          → 6-digit OTP input
│   └── profile-setup.tsx      → First-time profile completion (DOB, gender, address)
├── (tabs)/                    → Main tab navigator (authenticated)
│   ├── _layout.tsx            → Tab bar configuration
│   ├── home/
│   │   ├── index.tsx          → Home screen
│   │   └── tracking/[id].tsx  → Stepper detail for lab/delivery
│   ├── explore/
│   │   ├── index.tsx          → Condition cards grid
│   │   └── [condition].tsx    → Condition detail + Start Assessment CTA
│   ├── activity/
│   │   ├── index.tsx          → Active + completed items
│   │   └── [orderId].tsx      → Order/lab detail with full stepper
│   ├── messages/
│   │   ├── index.tsx          → Conversation list
│   │   └── [conversationId].tsx → Chat interface
│   └── profile/
│       ├── index.tsx          → Profile menu
│       ├── personal-info.tsx
│       ├── subscriptions.tsx
│       ├── prescriptions.tsx
│       ├── orders.tsx
│       ├── lab-results.tsx
│       ├── wallet.tsx
│       ├── payment-methods.tsx
│       ├── addresses.tsx
│       ├── notifications.tsx  → Notification preferences + quiet hours
│       ├── period-tracker.tsx → PCOS period tracker
│       └── help.tsx
├── questionnaire/             → Dynamic questionnaire screens
│   ├── [condition]/
│   │   ├── index.tsx          → Questionnaire entry point
│   │   ├── [questionId].tsx   → Single question per screen
│   │   └── review.tsx         → Review all answers before submit
├── photo-upload/
│   ├── [condition].tsx        → Photo capture/upload per condition
│   └── camera.tsx             → Camera interface with overlay guides
├── treatment/
│   ├── plan-selection.tsx     → Monthly/Quarterly/6-Month picker
│   ├── payment.tsx            → Razorpay checkout
│   └── confirmation.tsx       → Success screen
├── lab-booking/
│   ├── index.tsx              → Book home collection or upload own
│   ├── slot-selection.tsx     → Date + time slot picker
│   ├── address-confirm.tsx    → Confirm collection address
│   └── upload-results.tsx     → Self-upload lab results
├── notifications/
│   └── index.tsx              → Notification center/inbox (all notifications list)
└── lab-results/
    └── [resultId].tsx         → View lab result PDF
```

### Bottom Tab Bar

| Tab | Icon | Label | Badge |
|-----|------|-------|-------|
| Home | 🏠 House | Home | None |
| Explore | 🔍 Search/Compass | Explore | None |
| Activity | 📋 Clipboard | Activity | Count of active items |
| Messages | 💬 Chat bubble | Messages | Unread message count |
| Profile | 👤 Person | Profile | Red dot if action needed |

**Tab bar behavior:**
- Always visible except during: camera capture, Razorpay checkout overlay, full-screen modals
- Badge counts update via SSE real-time events
- Messages badge: unread count from all conversations combined
- Activity badge: count of items in active (non-completed) states
- Profile red dot: shown when payment method expiring, subscription action needed, or incomplete profile

---

## 2. Authentication & Onboarding

### 2.1 Welcome Screen

**Screen:** `(auth)/welcome.tsx`

**Layout (top to bottom):**
- Onlyou logo (centered, discreet branding — no medical imagery)
- Tagline: "Private healthcare, delivered to you"
- Three primary CTAs:
  - `[Continue with Google]` — Google OAuth
  - `[Continue with Apple]` — Apple Sign In (iOS only; hidden on Android)
  - `[Continue with Email]` — Navigate to email signup/signin
- Divider: "or"
- `[Already have an account? Sign In]` — Navigate to email sign-in

**Technical notes:**
- Google OAuth: `expo-auth-session` with Google provider
- Apple Sign In: `expo-apple-authentication` (iOS native)
- No Apple Sign In button on Android — Apple doesn't support it
- All OAuth flows return `{ email, name, provider_id }` → backend creates/finds user

### 2.2 Email Sign-Up

**Screen:** `(auth)/signup.tsx`

**Fields:**
- First Name (required, 2-50 chars, letters only + spaces)
- Last Name (required, 2-50 chars, letters only + spaces)
- Email (required, validated format, checked for uniqueness via API debounced call after 500ms)
- Password (required, minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 number)
- Confirm Password (must match)
- Terms checkbox: "I agree to the [Terms of Service] and [Privacy Policy]" (both linked, must be checked)

**Validation:**
- All fields validated on blur AND on submit
- Email uniqueness check: debounced API call → if taken, show "This email is already registered. [Sign in instead?]"
- Password strength meter: Weak (red) / Fair (yellow) / Strong (green)

**Submit → API call:**
```
trpc.auth.register.mutate({
  firstName, lastName, email, password
})
→ Returns: { accessToken, refreshToken, user: { id, email, firstName, phoneVerified: false } }
```

**Token details:**
- Access token: JWT, 15-minute expiry, stored in `expo-secure-store`
- Refresh token: 7-day expiry (mobile), stored hashed in PostgreSQL, rotation on every refresh (new pair each time)
- See Section 22.2 for token refresh flow and Section 25.1 for full security details

**On success:** Navigate to `(auth)/phone-verify.tsx` (mandatory next step)

**Error states:**
- Network error → "Unable to connect. Please check your internet and try again." + Retry button
- Email already taken → inline error under email field + "Sign in instead?" link
- Server error (500) → "Something went wrong on our end. Please try again in a moment."
- Rate limited (429) → "Too many attempts. Please wait 60 seconds."

### 2.3 Email Sign-In

**Screen:** `(auth)/signin.tsx`

**Fields:**
- Email (required)
- Password (required)
- `[Forgot Password?]` link

**Submit → API call:**
```
trpc.auth.login.mutate({ email, password })
→ Returns: { accessToken, refreshToken, user }
```

**Post-login routing:**
- If `user.phoneVerified === false` → Navigate to phone verification
- If `user.phoneVerified === true` AND profile incomplete (no DOB, no address) → Navigate to profile completion (`(auth)/profile-setup.tsx`)
- If fully set up → Navigate to `(tabs)/home`

**Forgot Password flow:**
- Enter email → API sends reset link via email (SendGrid)
- Reset link opens in-app (deep link) or browser
- Enter new password + confirm → API resets password
- Auto-login after reset

### 2.4 Social Sign-In (Google / Apple)

**Google flow:**
1. Tap "Continue with Google" → `expo-auth-session` opens Google consent screen
2. Google returns `id_token`
3. App sends `id_token` to backend: `trpc.auth.social.mutate({ provider: 'google', token: id_token })`
4. Backend verifies with Google → creates or finds user → returns JWT pair
5. Route based on `phoneVerified` status (same as email sign-in)

**Apple flow (iOS only):**
1. Tap "Continue with Apple" → native Apple Sign In sheet appears
2. Apple returns `identityToken` + `authorizationCode` + optionally `{ email, fullName }` (Apple only provides name/email on FIRST sign-in)
3. App sends to backend: `trpc.auth.social.mutate({ provider: 'apple', token: identityToken, code: authorizationCode, name?, email? })`
4. Backend verifies with Apple → creates or finds user → returns JWT pair
5. **Important:** Store the user's name from the first Apple sign-in because Apple won't provide it again

**Edge cases — social auth:**
- User cancels OAuth flow → return to welcome screen, no error shown
- Google token expired during slow network → retry with fresh token
- Apple provides `null` email (user chose "Hide My Email") → accept the relay email Apple provides
- User signed up with email, tries Google with same email → backend links accounts (same email = same user)
- User signed up with Google, tries email sign-in → "This account uses Google sign-in. [Continue with Google]"

---

## 3. Phone OTP Verification

**Screen:** `(auth)/phone-verify.tsx` → `(auth)/otp-entry.tsx`

### Why Phone Is Mandatory (Shown to User)

After account creation (email or social), the app presents a screen explaining why phone verification is needed:

**Screen copy:**
> "One more step to set up your care"
>
> We need your phone number to:
> - 📋 **Send your prescriptions** — required by Indian medical regulations
> - 📦 **Track your deliveries** — real-time updates via WhatsApp
> - 🔔 **Keep your care team connected** — appointment reminders, test results, and medication alerts
>
> Your phone number is kept private and never shared with third parties.

**Input:** Phone number field with `+91` prefix (India only for MVP)

**Validation:**
- Must be 10 digits (after +91)
- Format display: `+91 XXXXX XXXXX`
- Cannot proceed without entering a valid number

### OTP Delivery

**Primary channel:** WhatsApp (via Gupshup API) — cost ~₹0.10–0.15/message  
**Fallback:** SMS (via Gupshup) — cost ~₹0.15–0.50/message  
**Fallback logic:** If WhatsApp delivery fails (user doesn't have WhatsApp or number not registered) → automatically retry via SMS within 5 seconds

**OTP specification:**
- 6-digit numeric code
- Stored hashed (SHA-256) in Redis with 5-minute TTL
- One active OTP per phone number (new request invalidates previous)
- Rate limit: 3 OTP requests per phone number per 15 minutes
- Rate limit: 5 OTP verification attempts per OTP (then invalidate and require new OTP)

### OTP Entry Screen

**Screen:** `(auth)/otp-entry.tsx`

**Layout:**
- "Enter the 6-digit code sent to +91 XXXXX XXXXX" (masked: show last 4 digits only: `+91 •••••• XXXX`)
- 6 individual digit input boxes (auto-advance on entry)
- Auto-read OTP from SMS (Android: SMS Retriever API via `react-native-otp-verify`)
- Timer: "Resend code in 0:30" → after 30s: `[Resend via WhatsApp]` `[Resend via SMS]`
- `[Change phone number]` link → go back to phone-verify screen

**Auto-submit:** When all 6 digits entered, automatically submit (no "Verify" button needed)

**API call:**
```
trpc.auth.verifyOtp.mutate({ phone: "+919876543210", otp: "123456" })
→ Returns: { success: true } → backend updates user.phoneVerified = true
```

**On success:** 
- If first-time user → navigate to profile completion (`(auth)/profile-setup.tsx` — DOB, gender, address)
- If returning user → navigate to `(tabs)/home`

**Error states:**
- Wrong OTP → shake animation on input boxes + "Incorrect code. Please try again." (decrement attempts remaining)
- OTP expired (5 min) → "Code expired. [Resend]"
- Too many attempts (5) → "Too many incorrect attempts. [Request a new code]" (OTP invalidated in Redis)
- Rate limited (3 requests/15min) → "Too many code requests. Please wait [X] minutes."
- Phone number already verified on another account → "This phone number is already linked to another account. Please use a different number or [contact support]."

---

## 4. Tab 1: Home

**Screen:** `(tabs)/home/index.tsx`  
**Purpose:** At-a-glance status of everything active

### Layout (top to bottom)

**4.1 Greeting Bar**
- "Hi [First Name]" + current date (e.g., "Thursday, 27 Feb")
- Notification bell icon (top right) → tapping opens notification center (`notifications/index.tsx`)
- Bell shows red dot if unread notifications exist

**4.2 Active Tracking Banners**

Shown only when active lab orders or medication deliveries exist. Each is a tappable card.

**Lab Order Banner:**
```
🔬 Blood Test
   Sample being processed
   Updated 2h ago
   [Tap to track →]
```

**Delivery Banner:**
```
📦 Treatment Kit
   Out for delivery
   ETA: 30 mins
   [Tap to track →]
```

**Behavior:**
- Tapping navigates to `(tabs)/activity/[orderId]` with full stepper view
- Multiple banners stack vertically (max 3 shown, "+X more" link if over 3)
- Cards auto-update via SSE events (status changes push new data)
- When delivery is "Out for delivery" → show delivery person name, phone (tap to call), and ETA
- When no active orders → this section is hidden entirely

**4.3 Active Treatment Cards**

One card per subscribed vertical. Shows the condition the patient is being treated for.

```
┌─────────────────────────────────────┐
│  💊 Hair Loss Treatment              │
│  Treatment active — Day 45           │
│  Next check-in: 15 Mar 2026         │
│                                      │
│  [Message Doctor] [View Prescription]│
│  [Reorder]                           │
└─────────────────────────────────────┘
```

**Card fields:**
- Condition name + icon
- Current status: "Treatment active — Day [X]" (days since first prescription)
- Next check-in date (from follow-up schedule: 4-week, 3-month, 6-month, annual)
- Quick actions row: "Message Doctor" | "View Prescription" | "Reorder"

**Quick action behavior:**
- "Message Doctor" → navigates to `(tabs)/messages/[conversationId]` for this vertical
- "View Prescription" → opens prescription PDF (CloudFront signed URL, 1-hour expiry)
- "Reorder" → only visible if subscription is active + no pending delivery → triggers reorder flow

**Edge cases:**
- Multiple verticals → multiple cards, scrollable
- Subscription paused → card shows "Treatment paused" in amber + "Resume" CTA
- Subscription cancelled → card removed from Home (visible in Profile > My Subscriptions as "Cancelled")
- Consultation still under review → card shows "Under Review" status with animated spinner
- Doctor requested more info → card shows "Action Needed" in red + "Respond" CTA

**4.4 Medication Reminders**

Shows today's medications with check-off functionality.

```
Today's Medications:
☐ Finasteride 1mg — Take 1 tablet after breakfast
☐ Minoxidil 5% — Apply to scalp, morning
☐ Minoxidil 5% — Apply to scalp, evening
```

**Interactions:**
- Tap checkbox → mark as "Taken" (✅) → timestamp recorded
- Long-press → options: "Taken" / "Skipped" / "Remind in 1 hour"
- "Remind in 1 hour" → schedules local notification via `expo-notifications`
- All medication data derived from active prescriptions
- Medications sorted by time of day: Morning → Afternoon → Evening → Night

**Edge cases:**
- No active prescriptions → section hidden
- Yesterday's missed medications → shown at top with "Missed yesterday" label
- Multiple verticals with overlapping medication times → combined into single list, grouped by time

**4.5 Quick Actions Grid**

Three buttons in a horizontal grid:

| Action | Icon | Destination |
|--------|------|-------------|
| Start New Assessment | ➕ | `(tabs)/explore` |
| Upload Lab Results | 📄 | `lab-booking/upload-results` (only if doctor ordered tests) |
| Contact Support | 💬 | In-app help/support chat |

**Conditional visibility:**
- "Upload Lab Results" only shown if there's an active lab order with `ORDERED` status where patient hasn't booked collection yet
- If no active lab orders needing uploads → shows "View Lab Results" instead (navigates to Profile > Lab Results)

---

## 5. Tab 2: Explore

**Screen:** `(tabs)/explore/index.tsx`  
**Purpose:** Browse and start new treatment verticals

### 5.1 Condition Cards Grid

5 condition cards displayed in a scrollable grid (2 columns on phone, adapt to screen width):

| Condition | Icon | Tagline | Plan Starting At |
|-----------|------|---------|-----------------|
| Hair Loss | 💇 | "Clinically-proven hair regrowth" | ₹999/mo |
| Erectile Dysfunction | 🛡️ | "Discreet treatment that works" | ₹1,299/mo |
| Premature Ejaculation | ⏱️ | "Take back control" | ₹1,299/mo |
| Weight Management | ⚖️ | "Medical weight loss, supervised" | ₹2,999/mo |
| PCOS & Hormonal Health | 🌸 | "Hormonal balance, expert care" | ₹1,499/mo |

> **Pricing source:** onlyou-spec-resolved-v4.md Section 5 (authoritative). "Starting At" shows monthly plan price.

**Card states:**
- **Available (default):** Shows illustration, tagline, starting price, `[Start Assessment]` CTA
- **Active subscription:** Shows "Active ✓" green badge, no CTA (tapping navigates to treatment detail in Home)
- **Assessment in progress:** Shows "Continue Assessment →" amber badge (saved questionnaire progress)
- **Under review:** Shows "Under Review 🔄" blue badge
- **Subscription paused:** Shows "Paused ⏸️" amber badge + `[Resume]` CTA

### 5.2 Condition Detail Screen

**Screen:** `(tabs)/explore/[condition].tsx`

**Accessed by:** Tapping any condition card

**Layout (scrollable):**
1. **Hero section:** Illustration/icon + condition name + tagline
2. **How It Works** (3 steps):
   - Step 1: "Tell us about your health" (questionnaire icon)
   - Step 2: "Get matched with a specialist" (doctor icon)
   - Step 3: "Receive your treatment at home" (package icon)
3. **What You Get:**
   - Doctor consultation
   - Personalized prescription
   - Medication delivered monthly
   - Ongoing monitoring & check-ins
   - WhatsApp support
4. **Pricing:**
   - Monthly: ₹X/mo
   - Quarterly: ₹X/mo (save Y%)
   - 6-Month: ₹X/mo (save Z%)
5. **FAQ accordion** (3-5 common questions per condition)
6. **CTA button (sticky at bottom):** `[Start Your Assessment — Free]`

**CTA behavior:**
- If not logged in → redirect to auth flow first, then return here
- If logged in + phone verified → navigate to `questionnaire/[condition]`
- If phone not verified → navigate to phone verification first

**Condition-specific content:**

**Hair Loss:**
- Gender selection first (Male / Female) — affects questionnaire branching, photo requirements, and treatment options
- Male: Norwood scale reference images
- Female: Ludwig scale reference images
- Photos required: 4 (top of head, hairline, crown, any problem areas)

**ED:**
- IIEF-5 questionnaire embedded (5 standardized questions + 23 condition questions = 28 total)
- No photos required
- Age restriction check: must be 18+

**PE:**
- PEDT questionnaire embedded (5 standardized + 21 condition questions = 26 total)
- No photos required
- Age restriction check: must be 18+

**Weight Management:**
- BMI auto-calculation from height + weight in questionnaire
- Photos required: 2 (full body front, full body side)
- Two tiers shown based on BMI result:
  - Standard (BMI 25-34.9): ₹2,999/mo — lifestyle + oral medications
  - Premium/GLP-1 (BMI 35+): ₹9,999/mo — includes injectable (semaglutide)
  - **Note:** GLP-1 tier deferred to Phase 2; system shows "Coming Soon" for now

**PCOS:**
- Rotterdam criteria auto-check from questionnaire answers
- Period tracker integration promoted: "Track your cycle for better care"
- Fertility intent question affects treatment branching (not-trying vs. trying-to-conceive)
- Photos: none required
- Blood work: almost always ordered (PCOS Screen panel: ₹1,500)

---

## 6. Tab 3: Activity (My Care)

**Screen:** `(tabs)/activity/index.tsx`  
**Purpose:** Unified tracking for all orders and lab work

### 6.1 Active Items Section

Cards for all in-progress items, sorted by most-recently-updated first.

**Blood Work Order Card:**
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

**Lab Order Status Flow (complete):**

| Status | Display | Patient Actions |
|--------|---------|-----------------|
| `ORDERED` | "Tests ordered by your doctor" | Book home collection OR Upload own results |
| `SLOT_BOOKED` | "Collection booked: [date/time]" | Reschedule, Cancel |
| `NURSE_ASSIGNED` | "Nurse [Name] assigned" | Call nurse, Cancel (if >2hrs before slot) |
| `IN_PROGRESS` | "Nurse is collecting your sample" | None (wait) |
| `SAMPLE_COLLECTED` | "Sample collected, heading to lab" | None |
| `SAMPLE_RECEIVED` | "Sample received at lab" | None |
| `PROCESSING_STARTED` | "Lab is processing your tests" | None |
| `SAMPLE_ISSUE` | "Issue with sample — recollection needed" | Book new collection slot |
| `RESULTS_UPLOADED` | "Results ready" | View results PDF |
| `RESULTS_UPLOADED` (self) | "Your uploaded results are under review" | View uploaded file |
| `DOCTOR_REVIEWING` | "Doctor is reviewing your results" | None |
| `REVIEWED` | "Doctor has reviewed — see notes" | View results + doctor notes |
| `CLOSED` | "Complete" | View results PDF |

**Medication Delivery Card:**
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

**Delivery Status Flow (complete):**

> **Note:** The "Status" column shows the canonical `OrderStatus` enum values as stored in the database. The "Display" column shows the patient-friendly text rendered in the UI. The patient app frontend maps canonical statuses to display strings — it does not use separate patient-specific enum values.

| Status (canonical `OrderStatus`) | Display | Patient Actions |
|--------|---------|-----------------|
| `CREATED` | "Prescription ready" | View prescription PDF |
| `SENT_TO_PHARMACY` | "Sent to pharmacy" | None |
| `PREPARING` | "Pharmacy is preparing" | None |
| `READY` | "Ready for pickup by delivery" | None |
| `OUT_FOR_DELIVERY` | "On its way!" + delivery person name/phone/ETA | Call delivery person, Track |
| `DELIVERED` | "Delivered ✅" | Rate experience, View usage instructions |
| `DELIVERY_FAILED` | "Delivery attempt failed" | Reschedule delivery |
| `PHARMACY_ISSUE` | "Medication temporarily unavailable" | Contact support (admin resolving) |
| `CANCELLED` | "Order cancelled" | View refund status |

### 6.2 Completed Items Section

Below active items, collapsible section:

- Header: "Completed" with expand/collapse chevron
- List of completed deliveries and lab results, most recent first
- Each item shows: type (Lab/Delivery), condition, date completed
- Tap to view details / download PDFs

---

## 7. Tab 4: Messages

**Screen:** `(tabs)/messages/index.tsx`  
**Purpose:** Chat with care team

### 7.1 Conversation List

One conversation per vertical (condition). Not per doctor — if doctors rotate, the patient sees one continuous thread per condition.

```
┌─────────────────────────────────────┐
│  💇 Hair Loss Treatment               │
│  Dr. Patel: "Your results look good…"│
│  Today, 2:30 PM                   🔵│
│                                      │
│  🛡️ ED Treatment                      │
│  You: "When should I take the…"      │
│  Yesterday, 4:15 PM                 │
└─────────────────────────────────────┘
```

**List behavior:**
- Sorted by most recent message
- Blue dot (🔵) = unread messages from doctor
- Shows preview of last message (truncated to 1 line)
- Shows sender ("Dr. [Name]:" or "You:") + timestamp

### 7.2 Chat Interface

**Screen:** `(tabs)/messages/[conversationId].tsx`

**Features:**
- Text messages (max 2000 chars per message)
- Photo attachments (tap camera icon → capture or choose from gallery → compressed via `expo-image-manipulator` before upload to S3 presigned URL)
- Read receipts: single check (sent) → double check (delivered) → blue double check (read by doctor)
- Typing indicator: "Dr. Patel is typing…"
- Timestamps: shown every 15 minutes between messages, or on date change

**Canned Quick Replies:**

Below the message input, a horizontally scrollable row of quick-reply chips for common patient questions:

| Quick Reply | Sends Message |
|-------------|--------------|
| "When will I see results?" | "Hi Doctor, when can I expect to start seeing results from my treatment?" |
| "Side effects?" | "Hi Doctor, I have a question about possible side effects of my medication." |
| "Missed a dose" | "Hi Doctor, I missed a dose of my medication. What should I do?" |
| "Need a refill" | "Hi Doctor, I'm running low on medication and need a refill." |
| "Schedule check-in" | "Hi Doctor, I'd like to schedule my next check-in." |
| "Upload new photos" | "Hi Doctor, I'd like to share updated progress photos." |

**Quick reply behavior:**
- Tapping a chip populates the message input (editable before sending)
- Patient can modify the pre-filled text before sending
- Quick replies are condition-specific (Hair Loss shows different options than ED)

**Photo attachment flow:**
1. Tap 📎 or 📷 icon
2. Choose: "Take Photo" or "Choose from Gallery"
3. Image compressed client-side (max 1MB, max 1920px on longest side)
4. Upload to S3 via presigned PUT URL
5. Send message with S3 key reference
6. Doctor sees image inline in their dashboard

**Notification of new messages:**
- If app is open but not on messages tab → badge count updates
- If app is backgrounded → FCM push notification + WhatsApp message (based on notification preferences)
- Deep link from notification → opens directly to the specific conversation

**Edge cases:**
- Doctor hasn't responded in 24+ hours → no UI change (SLA is internal, not patient-facing)
- Message fails to send (network error) → message shows red ⚠️ with "Tap to retry"
- Patient sends message before phone verified → blocked (should never happen as phone is mandatory before reaching tabs)
- Conversation with no messages yet (new vertical, doctor hasn't responded to initial case) → shows placeholder: "Your doctor will respond here once they've reviewed your case."

---

## 8. Tab 5: Profile

**Screen:** `(tabs)/profile/index.tsx`  
**Purpose:** Account management and settings

### 8.1 Profile Menu

Scrollable list of menu items:

| Menu Item | Icon | Destination | Badge |
|-----------|------|-------------|-------|
| Personal Info | 👤 | `profile/personal-info` | Red dot if incomplete |
| My Subscriptions | 💳 | `profile/subscriptions` | Active count |
| My Prescriptions | 📋 | `profile/prescriptions` | None |
| My Orders | 📦 | `profile/orders` | None |
| My Lab Results | 🔬 | `profile/lab-results` | New results count |
| Payment Methods | 💰 | `profile/payment-methods` | ⚠️ if expiring |
| Wallet | 👛 | `profile/wallet` | Balance amount |
| Address Book | 📍 | `profile/addresses` | None |
| Notification Preferences | 🔔 | `profile/notifications` | None |
| Period Tracker | 📅 | `profile/period-tracker` | Only shown for PCOS patients |
| Help & Support | ❓ | `profile/help` | None |
| Legal | 📄 | Expandable: Terms, Privacy, Refund | None |
| Log Out | 🚪 | Confirmation → clear tokens → welcome screen | None |

### 8.2 Personal Info

**Screen:** `profile/personal-info.tsx`

**Fields (editable):**
- First Name, Last Name
- Date of Birth (date picker, must be 18+)
- Gender (Male / Female / Other / Prefer not to say)
- Phone Number (verified — shows ✅ badge, can change with re-verification)
- Email (from sign-up — can change with email verification link)
- Government ID: Upload photo of Aadhaar / PAN / Driving License
  - Upload via presigned S3 URL
  - Shows thumbnail of uploaded ID
  - Status: "Verified" or "Pending review" or "Not uploaded"
  - **Note:** Gov ID is used for identity verification only — no selfie/face match in MVP (Key Decision #7)

**Government ID upload flow:**
1. Tap "Upload ID" → choose from: Aadhaar Card / PAN Card / Driving License
2. Camera opens with document overlay guide (rectangle frame)
3. Photo captured → compressed → uploaded to `onlyou-documents` S3 bucket
4. Backend stores reference → admin reviews (manual in MVP)
5. Show "Under Review" → changes to "Verified ✅" after admin approval

### 8.3 My Subscriptions

**Screen:** `profile/subscriptions.tsx`

Lists all subscriptions (active, paused, cancelled):

**Active subscription card:**
```
┌─────────────────────────────────────┐
│  💇 Hair Loss — Monthly Plan          │
│  ₹999/month                         │
│  Next billing: 15 Mar 2026          │
│  Status: Active ✅                    │
│                                      │
│  [Change Plan] [Pause] [Cancel]     │
└─────────────────────────────────────┘
```

**Actions:**

**Change Plan:**
- Shows current plan highlighted + other options
- Monthly ↔ Quarterly ↔ 6-Month
- **UPI limitation:** Cannot "update" UPI subscriptions — must cancel + recreate
- Flow: Cancel current Razorpay subscription → create new one at new plan → prorate credit to wallet
- Card subscriptions: can update directly via Razorpay API

**Pause Subscription:**
- Confirmation modal: "Pause your Hair Loss treatment? You won't receive medication or check-ins. You can resume anytime."
- Max pause duration: 3 months
- During pause: no auto-reorder, no billing, subscription shows "Paused" status
- Resume: `[Resume Treatment]` button → resumes billing from next cycle

**Cancel Subscription:**
- Multi-step confirmation:
  1. "We're sorry to see you go. Can you tell us why?" (optional feedback: too expensive / side effects / not seeing results / switching provider / other)
  2. "Are you sure? You'll lose access to your care team and ongoing treatment."
  3. Final: "Cancel subscription" button (red)
- After cancellation: no refund for current billing period, access continues until end of paid period
- Shows in list as "Cancelled — access until [date]"

### 8.4 My Prescriptions

**Screen:** `profile/prescriptions.tsx`

- List of all prescriptions, most recent first
- Each item: condition, date prescribed, doctor name, status (Active / Completed / Superseded)
- Tap → view prescription PDF (CloudFront signed URL)
- Download button → saves to device via `expo-file-system`

### 8.5 My Orders

**Screen:** `profile/orders.tsx`

- List of all medication orders, most recent first
- Each item: order number, medications, date, status, tracking info
- Tap → detailed order view with stepper (same as Activity tab detail)

### 8.6 My Lab Results

**Screen:** `profile/lab-results.tsx`

- List of all lab results, most recent first
- Each item: test panel name, date, condition, status (Pending / Results Ready / Reviewed)
- "New" badge on unviewed results
- Tap → view result PDF + doctor's notes (if reviewed)

### 8.7 Payment Methods

**Screen:** `profile/payment-methods.tsx`

- List of saved payment methods (cards, UPI IDs)
- "Add Payment Method" → Razorpay tokenization flow
- Set default method
- Remove method (confirmation required)
- Expiring card warning: shown 30 days before expiry with "Update" CTA

### 8.8 Wallet

**Screen:** `profile/wallet.tsx`

**Balance display:** "₹[amount]" prominently at top

**Transaction history (scrollable list):**
| Type | Example | Color |
|------|---------|-------|
| Credit (refund) | "+₹500 — Refund for cancelled order" | Green |
| Credit (promo) | "+₹200 — Welcome bonus" | Green |
| Debit (payment) | "-₹999 — Hair Loss monthly subscription" | Red |
| Debit (partial) | "-₹500 — Used from wallet for order" | Red |

**Wallet usage:**
- Wallet balance auto-applied at checkout (if balance > 0)
- Patient can opt out: "Don't use wallet balance" toggle at checkout
- Wallet cannot be directly topped up (credits come from refunds, promotions, referrals)
- **Wallet and auto-renewals:** Wallet balance is **NOT** automatically applied to Razorpay subscription auto-renewals (monthly/quarterly). Razorpay charges the full subscription amount directly to the saved payment method. Wallet credits can only be used during manual checkout (initial purchase, plan changes, one-time lab test payments, manual reorders). This avoids the complexity of intercepting Razorpay recurring charges. If a patient wants to use wallet balance for their subscription, they can cancel auto-renewal and manually pay each cycle — but this is not recommended and not surfaced as an option in the UI.

### 8.9 Address Book

**Screen:** `profile/addresses.tsx`

- List of saved addresses
- Each address: label (Home/Work/Other), full address, pincode
- "Add Address" → form with: label, address line 1, address line 2, city, state, pincode
- Pincode auto-fills city and state (via India Post API)
- Set default delivery address
- Set default lab collection address (can be different from delivery)
- Edit / Delete existing addresses

### 8.10 Notification Preferences

**Screen:** `profile/notifications.tsx`

**Channel toggles (per channel):**

| Channel | Default | Can Disable? |
|---------|---------|-------------|
| Push (FCM) | ON | Yes |
| WhatsApp | ON | Yes (but show warning: "You may miss important updates") |
| SMS | ON | Yes |
| Email | ON | Yes |

**Category toggles (per category):**

| Category | Examples | Can Disable? |
|----------|----------|-------------|
| Treatment Updates | Prescription ready, consultation status | No (always on) |
| Delivery Updates | Out for delivery, delivered | No (always on) |
| Lab Updates | Results ready, nurse assigned | No (always on) |
| Medication Reminders | Daily medication reminders | Yes |
| Promotional | New features, discounts | Yes |
| Check-in Reminders | Upcoming follow-up | Yes |

**Quiet Hours:**
- Toggle: "Enable Quiet Hours"
- When enabled: start time + end time pickers (default: 10:00 PM → 7:00 AM)
- During quiet hours: push notifications are silenced (but still delivered, just no sound/vibration)
- WhatsApp messages are still sent (user controls WhatsApp notification settings on their phone)
- SMS for critical events (OTP, delivery arriving in 15 min) BYPASS quiet hours — always delivered
- UI shows: "Critical alerts (OTPs, deliveries) will still come through during quiet hours"

**Discreet Mode toggle** (see Section 19)

---

## 9. Questionnaire Engine

### 9.1 Architecture

Questionnaires are rendered from **JSON schema files** — one per vertical. The mobile app has a generic questionnaire renderer; it doesn't contain condition-specific logic (all logic is in the JSON).

**JSON schema structure per question:**
```json
{
  "id": "HL_Q1",
  "type": "single_choice" | "multi_choice" | "text" | "number" | "date" | "scale" | "photo",
  "text": "How long have you been experiencing hair loss?",
  "subtext": "This helps us understand the progression",
  "options": [
    { "id": "a", "text": "Less than 6 months", "next": "HL_Q2" },
    { "id": "b", "text": "6-12 months", "next": "HL_Q2" },
    { "id": "c", "text": "1-3 years", "next": "HL_Q3" },
    { "id": "d", "text": "More than 3 years", "next": "HL_Q3" }
  ],
  "required": true,
  "skip_logic": { "if": "gender === 'female'", "goto": "HL_Q1_F" },
  "validation": { "min": 1, "max": 1 }
}
```

### 9.2 Question Types

| Type | UI Component | Validation |
|------|-------------|------------|
| `single_choice` | Radio button list | Exactly 1 selected |
| `multi_choice` | Checkbox list | At least 1 selected (unless optional) |
| `text` | Text input | Min/max length |
| `number` | Numeric input | Min/max value, integer/decimal |
| `date` | Date picker | Min/max date (e.g., DOB must be 18+) |
| `scale` | Slider (1-5 or 1-10) | Within range |
| `photo` | Camera/gallery trigger | See Photo Upload Module |
| `info` | Read-only card (no input) | Auto-advance or "Got it" button |

### 9.3 Questionnaire Flow (UX)

**One question per screen** — this is a firm design decision. No multi-question forms.

**Navigation:**
- `[Next →]` button (bottom, sticky) — disabled until valid answer provided
- `[← Back]` button (top left) — go to previous question
- Progress bar at top: "Question 5 of 25"
- Swipe right → go back (optional gesture)

**Save & Resume:**
- Progress saved to local storage (Zustand persisted) after each answer
- Also synced to backend every 3 questions AND on any navigation away from the questionnaire (app background, back button, tab switch)
- If patient leaves mid-questionnaire → on return, show: "Continue where you left off?" with "Resume" / "Start Over" options
- Saved progress expires after 7 days
- **Multi-device limitation:** If a patient starts on Device A and switches to Device B, up to 2 unanswered questions may not have synced yet. On Device B, the app loads the last backend-synced state. A brief "Syncing your progress…" spinner is shown while checking the backend for the latest state before resuming.

**Skip Logic:**
- Evaluated after each answer
- Can skip forward (e.g., male patients skip female-specific questions)
- Can branch to different question paths
- Progress bar adjusts dynamically (if skip reduces total questions)

### 9.4 Questionnaire per Vertical

| Vertical | Total Questions | Scoring | Special Logic |
|----------|----------------|---------|---------------|
| Hair Loss | ~25 | Norwood/Ludwig classification | Gender branching (M/F), family history weighting |
| ED | ~28 | IIEF-5 (5 scored items) | Age gate (18+), cardiovascular risk flagging |
| PE | ~26 | PEDT (5 scored items) | Age gate (18+), serotonin medication check |
| Weight | ~30 | BMI auto-calc | Height/weight → BMI → tier routing (Standard vs GLP-1) |
| PCOS | ~32 | Rotterdam criteria | Fertility intent branching, menstrual calendar input |

### 9.5 Review Screen

**Screen:** `questionnaire/[condition]/review.tsx`

After all questions answered, patient sees a summary:
- All answers listed (grouped by section)
- Each answer is tappable → navigates back to that question to edit
- "By submitting, I confirm these answers are accurate and consent to a clinical assessment based on them."
- Consent checkbox (required)
- `[Submit Assessment]` button

**On submit:**
1. All answers sent to backend in one API call
2. Backend triggers AI assessment pipeline (BullMQ job)
3. Consultation record created with status `SUBMITTED`
4. Patient navigated to photo upload (if required) or plan selection

---

## 10. Photo Upload Module

### 10.1 Photo Requirements per Vertical

| Vertical | Photos Required | Specifications |
|----------|----------------|----------------|
| Hair Loss | 4 | Top of head, Hairline (frontal), Crown (back), Problem area |
| ED | 0 | None |
| PE | 0 | None |
| Weight | 2 | Full body front, Full body side |
| PCOS | 0 | None |

### 10.2 Camera Interface

**Screen:** `photo-upload/camera.tsx`

**Layout:**
- Camera viewfinder with semi-transparent overlay guide (silhouette showing target framing)
- Instruction text at top: "Position the top of your head in the frame"
- Capture button (bottom center)
- Flash toggle (top right)
- Switch camera (front/back) button
- Gallery button (bottom left) — choose existing photo

**Overlay guides per photo type:**
- Hair Loss — top of head: circle overlay centered, instruction to part hair
- Hair Loss — hairline: face outline with hairline region highlighted
- Hair Loss — crown: back of head oval
- Weight — full body front: full-body silhouette (head to toe)
- Weight — full body side: side profile silhouette

### 10.3 Photo Processing (Client-Side)

Before upload, each photo is processed via `expo-image-manipulator`:

1. **Resize:** Max 1920px on longest side (preserve aspect ratio)
2. **Compress:** JPEG quality 0.8 (reduces ~60-70% file size)
3. **Strip EXIF:** Remove GPS, device info (privacy — especially for sensitive conditions)
4. Final target: <500KB per photo

### 10.4 Upload Flow

1. Photo captured → client-side processing
2. Request presigned PUT URL from API: `trpc.photos.presign.mutate({ condition, photoType, mimeType })`
3. Upload directly to S3 (`onlyou-photos` bucket) via presigned PUT (15-minute expiry)
4. Confirm upload: `trpc.photos.confirm.mutate({ s3Key, consultationId })`
5. Show ✅ on completed photo, move to next required photo

**Upload progress:** Show progress bar per photo (actual bytes uploaded / total)

**Error handling:**
- Upload fails (network) → retry automatically 3 times (exponential backoff: 1s, 3s, 9s) → then show "Upload failed. [Retry]"
- Presigned URL expired → request new one automatically
- Photo too dark/blurry → **no client-side quality check in MVP** (doctor will request retake if needed via messages)
- S3 returns 403 → presigned URL issue → request new presigned URL and retry

### 10.5 Photo Review

After all required photos are captured:
- Grid showing all photos with labels
- Tap any photo to retake
- `[Looks Good — Continue]` button → proceed to plan selection

---

## 11. Plan Selection & Payment

### 11.1 Plan Selection

**Screen:** `treatment/plan-selection.tsx`

**Shown after:** Questionnaire + photos (if required)

**Three plan cards:**

| Plan | Price | Savings | Badge |
|------|-------|---------|-------|
| Monthly | ₹X/mo | — | — |
| Quarterly | ₹X/mo | Save Y% | "Popular" |
| 6-Month | ₹X/mo | Save Z% | "Best Value" |

**Pricing per vertical (source: onlyou-spec-resolved-v4.md Section 5):**

| Vertical | Monthly | Quarterly | 6-Month |
|----------|---------|-----------|---------|
| Hair Loss | ₹999 | ₹833/mo (₹2,499 total) | ₹750/mo (₹4,499 total) |
| ED | ₹1,299 | ₹1,100/mo (₹3,299 total) | ₹1,000/mo (₹5,999 total) |
| PE | ₹1,299 | ₹1,100/mo (₹3,299 total) | ₹1,000/mo (₹5,999 total) |
| Weight (Standard) | ₹2,999 | ₹2,666/mo (₹7,999 total) | ₹2,500/mo (₹14,999 total) |
| Weight (GLP-1) | ₹9,999 | ₹8,333/mo (₹24,999 total) | ₹7,500/mo (₹44,999 total) |
| PCOS | ₹1,499 | ₹1,266/mo (₹3,799 total) | ₹1,167/mo (₹6,999 total) |

**GLP-1 tier — Phase 2 (Coming Soon):**
- GLP-1 row is displayed in the pricing table but **greyed out** with a "Coming Soon" badge overlay
- GLP-1 plan cards are **not tappable/selectable** — tap shows toast: "GLP-1 treatment is coming soon. We'll notify you when it's available."
- If patient's BMI qualifies for GLP-1 (BMI 35+), show a note: "Based on your profile, you may benefit from our upcoming GLP-1 program. We'll notify you when it launches. In the meantime, our Standard plan can help you get started."
- Backend: `glp1_interest` flag set on user record when BMI 35+ patient views this screen (for Phase 2 launch notification list)

**6-Month plan:** This is NOT a Razorpay subscription — it's a one-time payment for 6 months. Razorpay subscriptions only support monthly and quarterly billing cycles. For 6-month plans, charge the full amount upfront.

**Plan card interaction:**
- Tap to select (radio-button style — only one selected at a time)
- Selected card shows blue border + checkmark
- `[Continue to Payment]` button at bottom

### 11.2 Payment (Razorpay Checkout)

**Screen:** `treatment/payment.tsx`

**Pre-checkout summary:**
```
Your Treatment Plan:
Hair Loss — Monthly
₹999/month

Wallet balance: ₹200 (auto-applied)
[ ] Don't use wallet balance

Amount to pay: ₹799
```

**Razorpay Checkout integration:**
- Uses `react-native-razorpay` SDK
- Opens Razorpay checkout sheet (overlay)
- Payment methods available: UPI (GPay, PhonePe, Paytm), Credit/Debit Card, Net Banking
- Prefilled: patient email, phone, name

**Payment flow:**
1. Create Razorpay order/subscription on backend: `trpc.payments.create.mutate({ ... })`
2. Open Razorpay checkout with order/subscription ID
3. Patient completes payment
4. Razorpay webhook hits backend: `payment.authorized` or `subscription.activated`
5. Backend verifies via Razorpay API (dual verification — webhook + API poll)
6. Backend activates subscription, creates first order
7. App receives success callback → navigate to confirmation screen

**Idempotent processing:**
- Store Razorpay event ID → check before processing → skip duplicates
- Daily reconciliation cron job compares local subscription state with Razorpay API

**Error handling:**
- Payment failed → Razorpay shows failure reason → patient returns to plan selection
- Payment cancelled (user dismissed) → "Payment cancelled. Your assessment is saved. [Try Again]"
- Network timeout during payment → check payment status via API before showing error (may have succeeded)
- Duplicate webhook → idempotent handling (skip if already processed)
- UPI autopay limit exceeded (₹15,000/txn) → shouldn't happen for any plan, but if custom GLP-1 pricing exceeds → fallback to card payment

### 11.3 Confirmation

**Screen:** `treatment/confirmation.tsx`

```
✅ You're all set!

Your Hair Loss assessment has been submitted.
A doctor will review your case within 24 hours.

What happens next:
1. Our doctor reviews your health profile and photos
2. You'll receive a personalized treatment plan
3. Your medication will be delivered to your door

[Go to Home]
```

**After confirmation:**
- Home tab now shows "Under Review" treatment card
- Activity tab shows consultation with `SUBMITTED` status
- If doctor needs more info → patient gets notification + treatment card shows "Action Needed"

---

## 12. Consultation Lifecycle (Patient View)

### 12.1 Status Flow (Patient-Facing)

The internal consultation statuses map to simplified patient-facing labels:

| Internal Status | Patient Sees | Patient Actions |
|----------------|-------------|-----------------|
| `SUBMITTED` | "Under Review — A doctor will review your case within 24 hours" | Wait, Message doctor |
| `AI_PROCESSING` | "Under Review" (same — patient doesn't see AI step) | Wait |
| `AI_COMPLETE` | "Under Review" (same) | Wait |
| `ASSIGNED` | "Doctor Assigned — Dr. [Name] is reviewing your case" | Message doctor |
| `REVIEWING` | "Doctor is reviewing your case" | Message doctor |
| `INFO_REQUESTED` | "Action Needed — Your doctor needs more information" | Respond (answer questions or upload photos) |
| `PRESCRIPTION_CREATED` | "Treatment Plan Ready — Review your prescription" | View prescription PDF |
| `TREATMENT_ACTIVE` | "Treatment Active — Day [X]" | Message doctor, View prescription, Reorder |
| `FOLLOW_UP_DUE` | "Check-in Due — Time for your [4-week/3-month/6-month] review" | Start follow-up questionnaire |
| `COMPLETED` | "Treatment Completed" | Start new assessment if needed |
| `CANCELLED` | "Cancelled" | Start new assessment |

### 12.2 INFO_REQUESTED Flow

When doctor requests more info:

1. Patient gets push notification: "Your doctor needs more information about your case"
2. Home tab treatment card shows red "Action Needed" badge
3. Tapping opens a screen showing doctor's specific request (text message + optionally "Please upload new photos of [X]")
4. Patient responds via messages or uploads new photos
5. After responding → consultation returns to `REVIEWING` status

### 12.3 Video Consultation

**Status: Phase 2 — NOT in MVP**

The v4 spec mentions "muted video" consultation status that auto-skips. For MVP:
- All consultations are async (text + photos)
- No video call infrastructure
- System placeholder: `VIDEO_SCHEDULED` status exists in schema but is auto-skipped (immediately transitions to next status)
- Future: integrate video via Daily.co or similar when Phase 2 builds video bridge

### 12.4 Follow-Up Cadence

| Time Point | Follow-Up Type | Questionnaire Length |
|------------|---------------|---------------------|
| 4 weeks | Side effects check | 10 questions (abbreviated) |
| 3 months | Progress review | 10 questions + 4 new progress photos |
| 6 months | Full assessment | 15 questions + 4 new photos |
| 12 months | Annual review | Full questionnaire + comprehensive photos |

**Follow-up flow:**
1. Notification sent when follow-up is due
2. Home tab shows "Check-in Due" card with `[Start Check-in]` CTA
3. Abbreviated questionnaire (10 questions) — reuses questionnaire engine with follow-up JSON schema
4. New photos compared with baseline by doctor
5. Doctor reviews → may adjust prescription

---

## 13. Lab Booking & Tracking

### 13.1 Lab Order Trigger

Lab orders are created by the doctor during consultation review. Patient is notified when a lab order is placed.

**Notification:** "Your doctor has ordered blood tests. Please book a home collection or upload your own results."

**Lab Test Pricing Model:**
- Lab tests are **billed separately** from the subscription — they are NOT included in the monthly/quarterly/6-month plan price.
- Pricing is charged at the time of booking confirmation (home collection) or waived if the patient uploads their own results.
- Home collection fee (nurse visit) is included in the test price — no separate collection charge.

| Test Panel | Price | Used For |
|-----------|-------|----------|
| Extended Hair Panel | ₹1,200 | Hair Loss — thyroid, iron, vitamin D, DHT |
| PCOS Screen Panel | ₹1,500 | PCOS — hormones, glucose, lipids |
| Metabolic Panel | ₹1,800 | Weight Management — HbA1c, lipids, liver, kidney |
| Basic Health Check | ₹800 | ED/PE — testosterone, glucose, lipids |
| Follow-up Panel | ₹600–₹1,200 | Varies by vertical — subset of initial panel |

- Exact pricing shown on the confirmation screen before booking (line item: test panel name + price).
- Payment collected via Razorpay at booking confirmation (same checkout flow as subscriptions).
- Wallet balance can be applied to lab test payments.
- If patient uploads their own results instead of booking home collection → no charge.

### 13.2 Patient Options

**Screen:** `lab-booking/index.tsx`

Two options presented:

1. **Book Home Collection** → navigate to slot selection
2. **I Already Have Results — Upload** → navigate to upload screen

### 13.3 Book Home Collection

**Screen:** `lab-booking/slot-selection.tsx`

**Date selection:**
- Calendar view showing available dates (next 14 days)
- Greyed out: past dates, Sundays (if no nurse available)

**Time slot selection:**
- Morning: 7:00 AM — 10:00 AM (fasting slots highlighted)
- Afternoon: 12:00 PM — 3:00 PM
- Evening: 4:00 PM — 7:00 PM
- Each slot shows availability (based on nurse capacity in patient's area)

**Address confirmation:**
- Pre-filled with default collection address
- `[Change Address]` → address book or add new
- Special instructions field (e.g., "Gate code: 1234", "Call when arriving")

**Confirmation:**
- Summary: date, time slot, address, tests being done, estimated cost
- `[Confirm Booking]` → creates booking → shows confirmation screen
- Booking appears in Activity tab with `SLOT_BOOKED` status

### 13.4 Self-Upload Lab Results

**Screen:** `lab-booking/upload-results.tsx`

- "Upload your recent lab results"
- File picker: PDF or photo (camera capture or gallery)
- If PDF: direct upload to S3
- If photo: compress first (same as photo module)
- "When were these tests done?" — date picker (must be within last 90 days)
- `[Upload]` → status becomes `RESULTS_UPLOADED` → doctor reviews

**Validation:**
- File size limit: 10MB
- Accepted formats: PDF, JPG, PNG
- Date must be within last 90 days
- If older than 90 days → warning: "These results may be outdated. Your doctor may request new tests."

### 13.5 Lab Order SLA (Patient-Facing)

| Event | SLA | If Breached |
|-------|-----|-------------|
| Patient hasn't booked slot | 7 days after order | Reminder notification sent |
| Nurse not assigned after booking | 2 hours | Admin escalation (not patient-visible) |
| Results overdue from lab | 48 hours after sample received | Admin contacts lab (not patient-visible) |
| Doctor hasn't reviewed results | 24 hours after results uploaded | Admin reminds doctor (not patient-visible) |

**Patient sees:** Only the status updates. SLA breaches trigger internal escalation to admin, not patient-facing alerts.

---

## 14. Medication Delivery & Tracking

### 14.1 Delivery Lifecycle

Delivery orders are created automatically when:
- Doctor creates a prescription (first order)
- Auto-reorder triggers on subscription renewal date
- Patient manually requests a reorder

### 14.2 Tracking Detail Screen

**Screen:** `(tabs)/activity/[orderId].tsx` (when order type = delivery)

Full vertical stepper with all delivery statuses (as defined in Section 6.1).

**When status = `OUT_FOR_DELIVERY`:**
- Delivery person card appears:
  ```
  Delivery by: Ravi K.
  Phone: +91 98765 43210 [📞 Call]
  Method: Rapido
  ETA: ~30 minutes
  ```
- Tap phone number → opens dialer
- ETA updates in real-time (manual update by coordinator, not GPS-based in MVP)

### 14.3 Delivery OTP Confirmation

When delivery person arrives:

1. System generates a 4-digit OTP and displays it on the **patient's app** (shown prominently on the delivery tracking screen when status = `OUT_FOR_DELIVERY`)
2. Delivery person's SMS link shows: "Enter the 4-digit code from the customer"
3. Patient verbally shares the OTP with the delivery person
4. Delivery person enters OTP on their SMS link page → API verifies → delivery confirmed
5. Status changes to `DELIVERED`
6. Patient sees: "Delivered ✅ — Here's how to use your medication:"
7. **Usage instructions** appear (medication-specific: how to take, when, with food?, etc.)

**Why patient holds the OTP (standard Indian pattern):** This matches Swiggy, Zomato, Flipkart, and other Indian delivery platforms. The patient only shares the code when they personally receive the package, preventing hand-off to the wrong person at the address.

**OTP edge cases:**
- Delivery person enters wrong OTP → "Incorrect code. Please ask the customer to re-read the code."
- 3 failed attempts → delivery person sees "Having trouble? Contact coordinator" (admin can manually mark as delivered)
- Patient can't find OTP in app → shown on delivery tracking screen + also sent via push notification when delivery is 15 min away
- Patient not home → delivery person marks as "failed" → admin reschedules

### 14.4 Packaging (Discreet)

**Patient notification before first delivery:**
> "Your medication will arrive in a plain Onlyou-branded box. No condition name or medication details are visible on the outside."

---

## 15. Subscription Management

### 15.1 Subscription States

| State | Billing | Treatment | Patient Can |
|-------|---------|-----------|-------------|
| `ACTIVE` | Auto-billing on cycle | Active | Pause, Cancel, Change plan |
| `PAUSED` | No billing | Paused (no reorders) | Resume, Cancel |
| `HALTED` | Payment failed (T+3) | Paused | Retry payment, Update method, Cancel |
| `CANCELLED` | No billing | Access until end of paid period | Resubscribe (new assessment) |
| `EXPIRED` | Period ended | Inactive | Resubscribe |

### 15.2 Auto-Reorder

**Trigger:** Subscription renewal date (monthly: every 30 days, quarterly: every 90 days)

**Flow:**
1. 3 days before renewal → notification: "Your [condition] treatment kit will be reordered on [date]"
2. On renewal date: Razorpay charges → if success → auto-reorder created
3. New delivery order enters pharmacy pipeline
4. Patient sees new delivery in Activity tab

**6-Month plan renewal (one-time payment — NOT a Razorpay subscription):**

Since 6-month plans are charged as a one-time upfront payment (no Razorpay recurring subscription), auto-renewal must be handled separately:

1. **Day 150 (Month 5, Day 0):** BullMQ scheduled job fires → notification: "Your 6-month [condition] plan ends in 30 days. Renew now to continue uninterrupted treatment."
2. **Day 165 (15 days before expiry):** Second reminder: "Your treatment plan expires on [date]. [Renew Now]" — deep links to `treatment/plan-selection.tsx` with current plan pre-selected.
3. **Day 175 (5 days before expiry):** Final reminder via push + WhatsApp: "Last chance — your [condition] treatment expires in 5 days. [Renew Now]"
4. **Day 180 (expiry day):** If not renewed → subscription status → `EXPIRED`. No auto-reorder. Treatment card on Home shows "Plan Expired — [Renew]" CTA.
5. **Renewal action:** Patient taps Renew → taken to `treatment/plan-selection.tsx` → can choose any plan (monthly/quarterly/6-month) → payment → new subscription created, reorder triggered.

**Auto-reorder paused if:**
- Subscription is paused
- Doctor has paused treatment (e.g., awaiting lab results)
- Follow-up check-in is overdue (doctor flagged "must check-in before next reorder")

### 15.3 Payment Retry on Failure

| Day | Action | Patient Notification |
|-----|--------|---------------------|
| T+0 | First charge attempt fails | "Payment failed. Please update your payment method." |
| T+1 | Retry #1 (Razorpay automatic) | WhatsApp: "Still unable to process payment" |
| T+2 | Retry #2 | WhatsApp: "Your treatment may be interrupted" |
| T+3 | Retry #3 (final) | "Last attempt failed. Treatment paused. [Pay Now]" |
| T+3+ | Subscription → `HALTED` | Treatment paused, no reorders, manual payment link provided |

**`HALTED` state resolution:**
- Patient taps "Pay Now" → opens Razorpay checkout for overdue amount
- On success → subscription reactivated, reorder created
- Patient can also update payment method then retry
- If no payment for 30 days → subscription auto-cancelled

---

## 16. Wallet & Refunds

### 16.1 Wallet Balance

- Wallet balance shown in Profile > Wallet
- Also shown at checkout (auto-applied)
- Credits come from: refunds, promotional credits, referral bonuses
- Cannot be topped up with cash/card
- Cannot be withdrawn (credit-only system)

### 16.2 Refund Scenarios

| Scenario | Refund Amount | Where |
|----------|-------------|-------|
| Cancellation (before doctor review) | 100% | Wallet |
| Cancellation (after doctor review, before pharmacy) | 75% | Wallet |
| Cancellation (medication already dispatched) | 0% | — |
| Delivery failed (platform fault) | 100% | Wallet or original payment method |
| Wrong medication delivered | 100% + replacement order | Wallet + new order |
| Subscription cancelled mid-cycle | Prorated remaining days | Wallet |
| Lab order cancelled (before nurse dispatch) | 100% | Wallet |
| Lab order cancelled (after nurse dispatched) | 50% | Wallet |

### 16.3 Refund Flow (Patient Experience)

1. Refund initiated (by patient cancellation or admin action)
2. Patient sees in Wallet: "+₹X — Refund for [reason]" (pending)
3. Processing time: instant for wallet credits, 5-7 business days for original payment method
4. Push notification: "₹X has been credited to your Onlyou wallet"

---

## 17. Notification System

### 17.1 Channels

| Channel | Provider | Cost | Use Case |
|---------|----------|------|----------|
| Push (FCM) | Firebase Cloud Messaging | Free | Primary in-app alerts |
| WhatsApp | Gupshup | ~₹0.10-0.15/msg | Primary for patients (500M+ Indian users) |
| SMS | Gupshup | ~₹0.15-0.50/msg | Fallback for OTP, critical alerts |
| Email | SendGrid | ~$0.001/msg | Receipts, reports, password reset |

### 17.2 Notification Events (Patient-Facing)

| Event | Push | WhatsApp | SMS | Email |
|-------|------|----------|-----|-------|
| OTP delivery | — | ✅ (primary) | ✅ (fallback) | — |
| Consultation submitted | ✅ | ✅ | — | ✅ (receipt) |
| Doctor assigned | ✅ | ✅ | — | — |
| Doctor needs more info | ✅ | ✅ | ✅ | — |
| Prescription ready | ✅ | ✅ | — | ✅ (PDF attached) |
| Lab tests ordered | ✅ | ✅ | — | — |
| Nurse assigned | ✅ | ✅ | ✅ | — |
| Nurse arriving (15 min) | ✅ | ✅ | ✅ | — |
| Lab results ready | ✅ | ✅ | — | ✅ |
| Doctor reviewed results | ✅ | ✅ | — | — |
| Order dispatched | ✅ | ✅ | — | — |
| Out for delivery | ✅ | ✅ | ✅ | — |
| Delivery confirmed | ✅ | — | — | ✅ (receipt) |
| Payment received | ✅ | — | — | ✅ (receipt) |
| Payment failed | ✅ | ✅ | ✅ | ✅ |
| Subscription renewal (3 days) | ✅ | ✅ | — | — |
| Follow-up check-in due | ✅ | ✅ | — | — |
| Daily medication reminder | ✅ | — | — | — |
| New message from doctor | ✅ | ✅ | — | — |

### 17.3 Android Push Notification Mitigations

**Problem:** 20-40% FCM delivery failure on Indian Android devices (Xiaomi, Samsung, Oppo, Realme, Vivo) due to OEM battery optimization.

**Mitigations (all from Day 1):**

1. **FCM high-priority** for all medical notifications
2. **In-app onboarding flow** after first login:
   - Screen: "Enable notifications to stay updated on your treatment"
   - Guide user through disabling battery optimization and enabling Autostart
   - Use `AutoStarter` library (supports Xiaomi MIUI, Samsung One UI, Oppo ColorOS, Vivo FuntouchOS, OnePlus OxygenOS)
   - Show device-specific instructions (detect OEM via `expo-device`)
3. **WhatsApp as primary channel** — more reliable than FCM on Chinese OEM phones
4. **SMS fallback** for critical events (OTP, nurse arriving, delivery in 15 min)
5. **Test on actual target devices** — Samsung M13, Redmi Note 11/12, Realme C-series

### 17.4 Discreet Notification Content

When **Discreet Mode** is enabled (see Section 19), notification content changes:

| Normal | Discreet |
|--------|----------|
| "Your Hair Loss prescription is ready" | "Your health update is ready" |
| "Dr. Patel sent a message about your ED treatment" | "You have a new message from your care team" |
| "Finasteride 1mg delivery arriving in 30 min" | "Your package is arriving in 30 min" |

**Rule:** In discreet mode, no condition names, medication names, or doctor names appear in notifications. Only generic references.

---

## 18. PCOS Period Tracker

**Screen:** `profile/period-tracker.tsx`  
**Visibility:** Only shown to patients with an active PCOS subscription

### 18.1 Purpose

Period tracking is clinically critical for PCOS treatment monitoring. The tracker:
- Records menstrual cycle data for doctor review
- Helps identify irregular patterns that may require treatment adjustment
- Provides data for Rotterdam criteria monitoring
- Shows up in the doctor dashboard (PCOS review tab > Menstrual Calendar)

### 18.2 Calendar UI

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

### 18.3 Cycle Insights

Below the calendar:
- **Average cycle length:** "[X] days" (calculated from logged data, minimum 3 cycles needed)
- **Last period:** "[Date] — [X] days ago"
- **Next predicted:** "[Date]" (based on average)
- **Cycle regularity:** "Regular" (21-35 day cycles, <7 day variation) / "Irregular" (>7 day variation or cycles outside 21-35 days)

### 18.4 Data Shared with Doctor

The following is visible to the treating doctor in their PCOS case review:
- Calendar view of all logged periods
- Cycle length trend (chart)
- Average cycle length + regularity score
- Symptom patterns

**Privacy:** Period tracker data is ONLY shared with the assigned PCOS doctor. Not visible to admin, nurses, lab staff, or pharmacy.

---

## 19. Discreet Mode

### 19.1 What It Does

Discreet Mode is a core privacy feature for patients treating stigmatized conditions. When enabled:

| Feature | Normal Mode | Discreet Mode |
|---------|------------|---------------|
| Push notification content | Full details (condition, medication) | Generic ("Your health update is ready") |
| WhatsApp messages | Full details | Generic messages |
| App icon (future) | Onlyou branded | Generic health/utility icon |
| App name in recents | "Onlyou" | "Health" (future) |
| Delivery packaging | Plain Onlyou box | Already plain (no change) |
| Email subject lines | Specific | "Onlyou — Account Update" |

### 19.2 Enabling Discreet Mode

**Location:** Profile > Notification Preferences > Discreet Mode toggle

**On enable:**
- Explanation modal: "Discreet Mode hides condition-specific details from notifications and messages. This means someone glancing at your phone won't see what you're being treated for. You'll still receive all updates — just with generic wording."
- Toggle ON → immediate effect on all future notifications
- Existing notifications in notification center are NOT retroactively changed

### 19.3 Implementation Details

- Backend checks `user.discreetMode` flag before composing any notification
- Notification templates have both `normal` and `discreet` variants
- WhatsApp message templates: separate Gupshup templates approved for discreet variants
- Deep links in notifications still work (tapping opens the correct screen)

---

## 20. Offline & Network Handling

### 20.1 Network Detection

- Use `@react-native-community/netinfo` for network state detection
- Show persistent offline banner at top of screen when no connectivity:
  ```
  ⚠️ You're offline. Some features may be unavailable.
  ```
- Banner disappears when connectivity restored (with brief green "Back online ✅" flash)

### 20.2 Offline-Capable Features

| Feature | Offline Behavior |
|---------|-----------------|
| View cached prescriptions | ✅ Available (if previously viewed) |
| View cached lab results | ✅ Available (if previously viewed) |
| Medication reminders | ✅ Available (local notifications) |
| Read cached messages | ✅ Available |
| Questionnaire (in-progress) | ✅ Answers saved locally, synced when online |
| Send messages | ❌ Queued, sent when online |
| Photo upload | ❌ Queued, uploaded when online |
| Payment | ❌ Requires network |
| Real-time status updates | ❌ Requires network (SSE reconnects automatically) |

### 20.3 Caching Strategy

- **Prescriptions/Lab PDFs:** Downloaded to device on first view via `expo-file-system`, cached until manually cleared
- **Messages:** Last 50 messages per conversation cached in Zustand persisted storage
- **Home tab data:** Cached with 5-minute staleness threshold (show cached data + refresh in background)
- **Questionnaire progress:** Always saved to local storage after each answer

### 20.4 SSE Reconnection

- On network restored → SSE automatically reconnects
- On reconnect → fetch missed events since last event ID (backend stores last 500 events per user per vertical/channel — e.g., 500 for lab updates, 500 for delivery updates, 500 for messages, etc.)
- If gap too large (>500 events in any channel) → full refresh of that channel's data
- **Rationale:** A global 1000-event buffer can fill quickly for active multi-vertical patients with frequent lab + delivery + message updates. Per-vertical buffering ensures no channel's events are lost due to another channel's high volume.

---

## 21. Accessibility & Localization

### 21.1 Accessibility

- All interactive elements have `accessibilityLabel` and `accessibilityHint`
- Minimum touch target: 44x44pt (Apple HIG) / 48x48dp (Material)
- Color contrast ratio: minimum 4.5:1 for text (WCAG AA)
- Support for system font scaling (up to 200%)
- Screen reader support: test with VoiceOver (iOS) and TalkBack (Android)
- Semantic heading hierarchy for screen reader navigation
- Form fields have visible labels (not placeholder-only)

### 21.2 Localization

**MVP:** English only

**Future (Phase 2+):**
- Hindi
- Telugu
- Tamil
- Kannada

**Preparation for MVP:**
- All user-facing strings in a centralized i18n file (not hardcoded)
- Use `react-i18next` or `expo-localization` for framework
- Date/time formatting: use `Intl.DateTimeFormat` with locale
- Currency: always ₹ (INR) with Indian number formatting (1,00,000 not 100,000)

---

## 22. Error States & Edge Cases

### 22.1 Global Error States

| Error | User Sees | Action |
|-------|-----------|--------|
| Network timeout | "Taking longer than expected. [Retry]" | Retry button |
| Server error (500) | "Something went wrong. Please try again." | Retry + auto-report to Sentry |
| Unauthorized (401) | Silent token refresh → if fails: redirect to login | Auto-refresh or re-login |
| Forbidden (403) | "You don't have access to this" | Back button |
| Not found (404) | "This item doesn't exist or was removed" | Back button |
| Rate limited (429) | "Too many requests. Please wait a moment." | Auto-retry after cooldown |
| Maintenance | "We're doing a quick update. Be right back! (ETA: [X] minutes)" | Auto-retry |

### 22.2 Token Refresh Flow

1. Access token expires (15 minutes)
2. Any API call returns 401
3. tRPC client interceptor catches 401
4. Sends refresh token to `trpc.auth.refresh.mutate({ refreshToken })`
5. Receives new access token + new refresh token (rotation)
6. Retries original request with new access token
7. If refresh token is also expired/invalid → clear tokens → redirect to login screen

**Concurrent requests during refresh:**
- Queue all pending requests
- Refresh token once
- Replay all queued requests with new token

### 22.3 App Version Check & Forced Updates

**On every app launch:**
1. App sends its current version to the backend: `trpc.app.checkVersion.query({ platform: 'ios' | 'android', version: '1.2.3' })`
2. Backend compares against minimum required version (stored in config/DB, editable by admin).
3. Response includes: `{ updateRequired: boolean, updateRecommended: boolean, storeUrl: string, message?: string }`

**Forced update (`updateRequired: true`):**
- Full-screen blocking modal — cannot be dismissed
- Title: "Update Required"
- Body: "A new version of Onlyou is available with important improvements. Please update to continue."
- Single CTA: `[Update Now]` → opens App Store (iOS) or Play Store (Android) via `storeUrl`
- No "Skip" or "Later" option — app is unusable until updated
- **Use case:** Breaking API changes, critical security patches, regulatory compliance updates

**Recommended update (`updateRecommended: true`):**
- Non-blocking banner at top of Home screen
- "A new version is available. [Update]" — tappable, opens store
- Dismissible — patient can tap "X" to close (banner reappears next app launch)
- After 3 dismissals → stop showing until next version bump

**Admin configuration (via admin portal):**
- `minRequiredVersion.ios`: e.g., "1.2.0"
- `minRequiredVersion.android`: e.g., "1.2.0"
- `recommendedVersion.ios`: e.g., "1.3.0"
- `recommendedVersion.android`: e.g., "1.3.0"
- `updateMessage`: Custom message (optional override)

### 22.4 Edge Cases by Feature

**Multi-vertical patient:**
- Patient subscribes to Hair Loss + ED simultaneously
- Home tab shows 2 treatment cards
- Activity tab shows items from both verticals
- Messages tab shows 2 conversations (one per vertical)
- Different doctors may be assigned to each vertical
- Medication reminders combined into single daily list

**Subscription overlap:**
- Cannot subscribe to same vertical twice
- Can subscribe to multiple different verticals
- Each vertical has independent billing cycle

**Account deletion:**
- Patient requests deletion via Help & Support
- 30-day grace period (can reactivate by logging in)
- After 30 days: anonymize all PII, delete photos, retain de-identified clinical records for legal compliance (3 years per Telemedicine Practice Guidelines 2020)
- Active subscriptions auto-cancelled, prorated refund to wallet → then wallet balance refunded to original payment method

---

## 23. Deep Links & Navigation

### 23.1 Deep Link Scheme

**Custom scheme:** `onlyou://`  
**Universal links:** `https://onlyou.life/app/...`

| Link | Opens |
|------|-------|
| `onlyou://home` | Home tab |
| `onlyou://messages/{conversationId}` | Specific chat |
| `onlyou://activity/{orderId}` | Order/lab detail |
| `onlyou://explore/{condition}` | Condition detail |
| `onlyou://profile/wallet` | Wallet screen |
| `onlyou://notifications` | Notification center/inbox |
| `onlyou://lab-booking` | Lab booking screen |
| `onlyou://questionnaire/{condition}/resume` | Resume saved questionnaire |

### 23.2 Notification Deep Links

Every push notification includes a deep link. Tapping the notification opens the relevant screen directly:

| Notification | Deep Link |
|-------------|-----------|
| New message from doctor | `onlyou://messages/{conversationId}` |
| Prescription ready | `onlyou://activity/{consultationId}` |
| Delivery out | `onlyou://activity/{orderId}` |
| Lab results ready | `onlyou://activity/{labOrderId}` |
| Payment failed | `onlyou://profile/payment-methods` |
| Follow-up due | `onlyou://questionnaire/{condition}/followup` |

---

## 24. Analytics Events

### 24.1 Key Events to Track

| Event | Properties | Purpose |
|-------|-----------|---------|
| `app_opened` | source (notification/direct/deeplink) | DAU tracking |
| `auth_signup_started` | method (email/google/apple) | Funnel analysis |
| `auth_signup_completed` | method | Conversion |
| `auth_phone_verified` | — | Conversion |
| `explore_condition_tapped` | condition | Interest tracking |
| `questionnaire_started` | condition | Funnel |
| `questionnaire_completed` | condition, duration_seconds | Funnel |
| `questionnaire_abandoned` | condition, question_number, duration | Drop-off analysis |
| `photo_uploaded` | condition, photo_type | Funnel |
| `plan_selected` | condition, plan_type, price | Conversion |
| `payment_initiated` | condition, plan_type, method | Funnel |
| `payment_completed` | condition, plan_type, amount | Revenue |
| `payment_failed` | condition, plan_type, error_code | Debugging |
| `prescription_viewed` | condition | Engagement |
| `medication_taken` | medication_name | Adherence |
| `medication_skipped` | medication_name, reason | Adherence |
| `message_sent` | condition, has_attachment | Engagement |
| `lab_booking_completed` | condition, slot_type | Operations |
| `delivery_confirmed` | condition, delivery_method | Operations |
| `subscription_paused` | condition, reason | Churn |
| `subscription_cancelled` | condition, reason | Churn |
| `notification_tapped` | notification_type | Engagement |
| `discreet_mode_enabled` | — | Feature usage |
| `period_tracker_logged` | — | Feature usage |

### 24.2 Analytics Provider

- **Mixpanel** or **Amplitude** for product analytics (decide at implementation)
- **Sentry** for error tracking and performance monitoring
- User properties: `userId`, `activeVerticals[]`, `subscriptionStatus`, `deviceOEM`, `osVersion`
- No PII in analytics events (no names, emails, phone numbers, medical data)

---

## 25. Security & Privacy

### 25.1 Data Protection

| Data Type | Protection |
|-----------|-----------|
| Passwords | bcrypt hashed (never stored plaintext) |
| OTPs | SHA-256 hashed in Redis (5-minute TTL) |
| Access tokens | JWT (15-min expiry), HttpOnly cookies (web) / secure storage (mobile) |
| Refresh tokens | Hashed in PostgreSQL, rotation on every refresh |
| Patient photos | S3 SSE-KMS encryption, CloudFront signed URLs (1-hour expiry) |
| Prescriptions | S3 SSE-KMS encryption, CloudFront signed URLs |
| Gov IDs | S3 SSE-KMS encryption, internal access only |
| Phone numbers | AES-256-GCM field-level encryption in PostgreSQL |
| Aadhaar numbers | AES-256-GCM field-level encryption in PostgreSQL |
| Diagnosis codes | AES-256-GCM field-level encryption in PostgreSQL |

### 25.2 Mobile App Security

- **Secure storage:** Use `expo-secure-store` for tokens (Keychain on iOS, Keystore on Android)
- **Certificate pinning:** Pin Onlyou API certificate (prevents MITM attacks)
- **Root/jailbreak detection:** Warn user but don't block (many Indian users have rooted phones)
- **Screenshot prevention:** Disable screenshots on prescription/lab result screens (`FLAG_SECURE` on Android, `UITextField.isSecureTextEntry` workaround on iOS)
  - **Dev note (iOS):** The `UITextField.isSecureTextEntry` technique is a known hack that causes the screen to appear blank in the iOS app switcher. This is acceptable for sensitive screens (prescriptions, lab results) but should NOT be applied globally. Test on physical devices — simulator behavior may differ. If the blank-screen-in-switcher UX is unacceptable, an alternative is to use a screenshot detection listener (`UIApplication.userDidTakeScreenshotNotification`) that shows a warning toast instead of preventing the capture.
- **Biometric lock:** Optional — after 5 minutes of inactivity, require Face ID / fingerprint to reopen (uses `expo-local-authentication`)
- **Auto-logout:** After 30 days of inactivity, clear tokens and require re-login

### 25.3 DPDPA Compliance (Patient App)

- **Consent management:** Separate consent checkboxes for: teleconsultation, prescription sharing with pharmacy, lab order processing, health data analytics
- **No pre-ticked consent boxes**
- **Consent withdrawal:** Available in Profile > Legal > "Manage Consent" (with clear explanation of consequences: "If you withdraw consent for prescription sharing, we cannot fulfill your medication orders")
- **Data portability:** "Download My Data" option in Profile > Legal (exports JSON with all patient data)
- **Account deletion:** As described in Section 22.4

### 25.4 Partner Data Anonymization

| Partner | Sees | Does NOT See |
|---------|------|-------------|
| Pharmacy | Order ID (ORD-XXXX), anonymous patient ID (ONY-P-XXXX), medications, dosage, quantities, prescription PDF, prescribing doctor name + NMC number | Patient name, phone, address, diagnosis, prescriptionId (internal) |
| Lab | Order ID, test type, sample collection details | Patient name, phone, diagnosis |
| Delivery person | Pickup address (pharmacy), delivery address, patient phone (for arrival call), OTP | Medication names, condition, diagnosis |
| Nurse | Patient name, phone, address (for visit), test type, special instructions | Diagnosis code, full medical history |

---

*This is the complete Patient Mobile App specification (v2 — all errors from initial review resolved). All section numbers are unique and sequential. All known issues from prior versions (duplicate numbering, missing features, incomplete status flows, OTP hashing inconsistency, incorrect library references, REST/tRPC mismatch, missing screens, delivery OTP flow direction, pricing gaps, sync gaps, and wallet/subscription ambiguities) have been resolved. Refer to this document as the single source of truth for all patient app implementation. Cross-reference ARCHITECTURE.md for system-level decisions.*
