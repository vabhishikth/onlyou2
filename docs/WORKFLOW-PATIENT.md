# WORKFLOW-PATIENT.md — Patient/User Complete Workflow Reference

> **Document type:** Detailed workflow documentation (every screen, tap, decision, error, and edge case)
> **Perspective:** End-user / Patient
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** PROJECT-OVERVIEW.md, APP-PATIENT.md, PORTAL-DOCTOR.md, PORTAL-NURSE-FIXED.md, PORTAL-ADMIN.md, PORTAL-LAB-FIXED.md, PORTAL-PHARMACY.md, LANDING-PAGE.md, ARCHITECTURE.md, BACKEND-PART1.md, BACKEND-PART2A.md, BACKEND-PART2B.md, BACKEND-PART3A.md, BACKEND-PART3B.md, VERTICAL-HAIR-LOSS.md, VERTICAL-ED.md, VERTICAL-PE.md, VERTICAL-WEIGHT.md, VERTICAL-PCOS-PART1.md, VERTICAL-PCOS-PART2.md, VERTICAL-PCOS-PART3.md, onlyou-spec-resolved-v4.md

---

## Table of Contents

1. [Pre-App Discovery & Awareness](#1-pre-app-discovery--awareness)
2. [App Download & First Launch](#2-app-download--first-launch)
3. [Account Creation (Sign-Up)](#3-account-creation-sign-up)
4. [Phone OTP Verification (Mandatory)](#4-phone-otp-verification-mandatory)
5. [Profile Completion (First-Time Setup)](#5-profile-completion-first-time-setup)
6. [Returning User Sign-In](#6-returning-user-sign-in)
7. [Home Tab — Daily Command Centre](#7-home-tab--daily-command-centre)
8. [Explore Tab — Browsing Conditions](#8-explore-tab--browsing-conditions)
9. [Starting an Assessment (Questionnaire)](#9-starting-an-assessment-questionnaire)
10. [Photo Upload](#10-photo-upload)
11. [AI Pre-Assessment (Background)](#11-ai-pre-assessment-background)
12. [Plan Selection](#12-plan-selection)
13. [Payment (Razorpay Checkout)](#13-payment-razorpay-checkout)
14. [Post-Payment Confirmation & Waiting](#14-post-payment-confirmation--waiting)
15. [Doctor Review Outcomes (Patient Perspective)](#15-doctor-review-outcomes-patient-perspective)
16. [Doctor Requests More Info (INFO_REQUESTED)](#16-doctor-requests-more-info-info_requested)
17. [Blood Work / Lab Tests](#17-blood-work--lab-tests)
18. [Lab Home Collection (Nurse Visit)](#18-lab-home-collection-nurse-visit)
19. [Self-Upload Lab Results](#19-self-upload-lab-results)
20. [Lab Results Received & Doctor Review](#20-lab-results-received--doctor-review)
21. [Prescription Created (Treatment Plan Ready)](#21-prescription-created-treatment-plan-ready)
22. [Medication Delivery Lifecycle](#22-medication-delivery-lifecycle)
23. [Delivery OTP Confirmation](#23-delivery-otp-confirmation)
24. [Treatment Active — Ongoing Daily Care](#24-treatment-active--ongoing-daily-care)
25. [Messaging (Doctor-Patient Chat)](#25-messaging-doctor-patient-chat)
26. [Follow-Up Check-Ins](#26-follow-up-check-ins)
27. [Subscription Management (Change/Pause/Cancel)](#27-subscription-management-changepausecancel)
28. [Auto-Reorder & Renewal](#28-auto-reorder--renewal)
29. [Payment Failure & Retry](#29-payment-failure--retry)
30. [Wallet & Refunds](#30-wallet--refunds)
31. [Notification System (Patient Experience)](#31-notification-system-patient-experience)
32. [Discreet Mode](#32-discreet-mode)
33. [PCOS Period Tracker](#33-pcos-period-tracker)
34. [Multi-Vertical Patient (Multiple Conditions)](#34-multi-vertical-patient-multiple-conditions)
35. [Profile & Account Management](#35-profile--account-management)
36. [Offline & Network Edge Cases](#36-offline--network-edge-cases)
37. [App Version Check & Forced Updates](#37-app-version-check--forced-updates)
38. [Account Deletion](#38-account-deletion)
39. [Referral Flow (Doctor-Initiated)](#39-referral-flow-doctor-initiated)
40. [Refund Flow (Doctor-Initiated)](#40-refund-flow-doctor-initiated)
41. [Complete Status Mapping Reference](#41-complete-status-mapping-reference)
42. [Master Edge Case Registry](#42-master-edge-case-registry)

---

## 1. Pre-App Discovery & Awareness

### 1.1 How a Patient Finds Onlyou

The patient's journey begins before the app, on the public marketing site at `onlyou.life`.

**Discovery channels:**
- Organic search: SEO-optimized condition pages rank for queries like "hair loss treatment online India," "ED treatment delivery," "PCOS specialist online"
- Paid ads: Google/Meta campaigns driving to condition-specific landing pages
- Word of mouth / referrals
- Social media content

**Landing page experience (Source: LANDING-PAGE.md):**
- The marketing site is a fully static Next.js SSG site — no login required, no API calls
- Mobile-first responsive design (70%+ of Indian web traffic is mobile)
- Homepage presents the five verticals with condition cards: Hair Loss, ED, PE, Weight Management, PCOS
- Each condition has its own dedicated page (`/hair-loss`, `/erectile-dysfunction`, `/premature-ejaculation`, `/weight-management`, `/pcos`)

**Condition page content:** Each condition page includes a "How It Works" section (3 steps: questionnaire → specialist match → treatment delivered), what's included in the subscription, transparent pricing table (Monthly/Quarterly/6-Month), frequently asked questions, and a sticky CTA: `[Start Your Free Assessment — Download App]`.

**Conversion path:** Every CTA links to app store downloads (App Store for iOS, Play Store for Android). The landing page does NOT handle any sign-up, payment, or clinical flow. All of that happens exclusively in the mobile app.

**Smart banner:** Mobile visitors see a smart app banner at the top of the page: "Get Onlyou on your phone — [Open in App Store]." This uses Apple Smart App Banners for iOS and a custom banner for Android.

### 1.2 Edge Cases — Discovery Phase

- Patient visits on desktop → prominent "Scan QR to download" section and/or "Text me the link" phone input (sends SMS download link)
- Patient Googles a condition but Onlyou isn't the right fit (e.g., they need a surgical consultation) → landing page FAQ addresses this with "When to see a doctor in person" guidance
- Patient arrives via deep link to a condition that doesn't exist yet → 404 page with redirect to homepage
- Patient is under 18 → no age gating on the public website (age verification happens inside the app during questionnaire)

---

## 2. App Download & First Launch

### 2.1 Download

- **iOS:** App Store listing (Onlyou app icon, discreet branding — no medical imagery on icon)
- **Android:** Google Play Store listing
- **Download size target:** 15–25MB AAB

### 2.2 First Launch Sequence

1. App opens → brief splash screen (Onlyou logo, "Private healthcare, delivered to you" tagline)
2. App performs version check in background: `trpc.app.checkVersion.query({ platform, version })` (See Section 37)
3. If forced update required → full-screen blocking modal (cannot proceed)
4. If recommended update → non-blocking banner (dismissible)
5. If version OK → navigate to Welcome Screen (`(auth)/welcome.tsx`)

### 2.3 Android Notification Permission Prompt

On first launch on Android 13+ devices, the system shows the notification permission prompt. This is shown BEFORE the welcome screen to maximise opt-in. The in-app onboarding flow (battery optimization, autostart) comes later after account creation.

### 2.4 Edge Cases — First Launch

- App launches with no internet connection → welcome screen still shows (it's static UI), but sign-in/sign-up buttons show "No internet connection" toast on tap
- App crashes on launch → Sentry captures crash report; user retries
- App was already installed but user deleted account previously → fresh start, no cached data (tokens were cleared)
- User sideloaded APK (not from Play Store) → app functions normally but auto-update banners may not work (no Play Store link)

---

## 3. Account Creation (Sign-Up)

### 3.1 Welcome Screen

**Screen:** `(auth)/welcome.tsx`

**What the patient sees:**
- Onlyou logo centered, discreet branding (no medical imagery)
- Tagline: "Private healthcare, delivered to you"
- Three sign-up options:
  - `[Continue with Google]` — Google OAuth
  - `[Continue with Apple]` — Apple Sign In (iOS only; completely hidden on Android)
  - `[Continue with Email]` — navigates to email registration form
- Below: "Already have an account? [Sign In]"

### 3.2 Email Sign-Up Flow

**Screen:** `(auth)/signup.tsx`

**Step-by-step:**

1. Patient taps "Continue with Email"
2. Registration form appears with fields:
   - First Name (required, 2–50 chars, letters + spaces only)
   - Last Name (required, 2–50 chars, letters + spaces only)
   - Email (required, format validated, uniqueness checked via debounced API call after 500ms of typing pause)
   - Password (required, minimum 8 chars, at least 1 uppercase + 1 lowercase + 1 number)
   - Confirm Password (must match password field)
   - Terms checkbox: "I agree to the Terms of Service and Privacy Policy" (both linked, must be checked to proceed)
3. All fields validate on blur (when the user taps away from the field) AND on submit
4. Password field shows a live strength meter: Weak (red bar) → Fair (yellow) → Strong (green)
5. Patient taps `[Create Account]`
6. API call: `trpc.auth.register.mutate({ firstName, lastName, email, password })`
7. On success: tokens stored in `expo-secure-store`, patient navigated to phone verification

**What the patient receives after sign-up:**
- Access token: JWT, 15-minute expiry (stored securely on device)
- Refresh token: 7-day expiry (SHA-256 hashed in Redis with 7-day TTL server-side, stored securely on device)
- User object with `phoneVerified: false`

### 3.3 Google Sign-In Flow

1. Patient taps "Continue with Google"
2. `expo-auth-session` opens Google consent screen (browser pop-up or system sheet)
3. Patient selects their Google account and grants consent
4. Google returns `id_token` to the app
5. App sends to backend: `trpc.auth.social.mutate({ provider: 'google', token: id_token })`
6. Backend verifies `id_token` with Google, extracts email + name
7. Backend creates or finds user → returns JWT pair
8. Routing based on `phoneVerified` status

### 3.4 Apple Sign-In Flow (iOS Only)

1. Patient taps "Continue with Apple"
2. Native iOS Apple Sign In sheet appears (Face ID / Touch ID prompt)
3. Apple returns `identityToken` + `authorizationCode` + optionally `{ email, fullName }` (Apple only provides name/email on the FIRST sign-in ever — this is an Apple platform limitation)
4. App sends to backend: `trpc.auth.social.mutate({ provider: 'apple', token: identityToken, code: authorizationCode, name?, email? })`
5. Backend verifies token with Apple → creates or finds user → returns JWT pair
6. **Critical implementation note:** Backend stores the user's name from the first Apple sign-in because Apple will never provide it again on subsequent logins

### 3.5 Edge Cases — Account Creation

| Scenario | What Happens |
|----------|-------------|
| Email already registered (email sign-up) | Inline error below email field: "This email is already registered. [Sign in instead?]" — link navigates to sign-in screen with email pre-filled |
| Network error during sign-up | Full-screen toast: "Unable to connect. Please check your internet and try again." + `[Retry]` button |
| Server error (500) | "Something went wrong on our end. Please try again in a moment." |
| Rate limited (429) | "Too many attempts. Please wait 60 seconds." — countdown timer shown |
| User cancels Google OAuth mid-flow | Returns to welcome screen silently (no error shown) |
| User cancels Apple Sign In mid-flow | Returns to welcome screen silently |
| Google token expired during slow network | App retries automatically with a fresh token request |
| Apple provides `null` email (user chose "Hide My Email") | Backend accepts Apple's relay email (e.g., `abcdef@privaterelay.appleid.com`) |
| User signed up with email, later tries Google with same email | Backend links accounts (same email = same user). Patient logs in via Google, sees same account. |
| User signed up with Google, tries email sign-in | Error: "This account uses Google sign-in. [Continue with Google]" — button opens Google flow |
| User provides a disposable/temp email | No check in MVP — if the email can receive a password reset link, it's accepted |
| Name contains non-Latin characters | Accepted (Unicode), but displayed as-is throughout the platform |

---

## 4. Phone OTP Verification (Mandatory)

### 4.1 Why This Step Exists

Phone verification is **mandatory** for every Onlyou account regardless of sign-up method (email, Google, or Apple). Without a verified Indian phone number, the patient cannot proceed to any app functionality.

**Reasons (shown to user on-screen):**
- Prescriptions: Required by Indian medical regulations (Telemedicine Practice Guidelines 2020)
- Delivery tracking: Real-time updates via WhatsApp
- Care team connectivity: Appointment reminders, test results, medication alerts

### 4.2 Phone Number Entry

**Screen:** `(auth)/phone-verify.tsx`

1. Patient sees explanation screen (as described above)
2. Phone number input field with `+91` prefix (India only for MVP — prefix is fixed, not selectable)
3. Patient enters 10-digit number
4. Format displayed as: `+91 XXXXX XXXXX`
5. Validation: exactly 10 digits after +91
6. Patient taps `[Send Verification Code]`

### 4.3 OTP Delivery Mechanism

- **Primary:** WhatsApp message via Gupshup API (~₹0.10–0.15/message)
- **Automatic fallback:** If WhatsApp delivery fails (user doesn't have WhatsApp, or number not registered on WhatsApp), system automatically retries via SMS within 5 seconds. SMS uses Gupshup (primary) with MSG91 as a secondary SMS fallback if Gupshup SMS fails.
- **OTP format:** 6-digit numeric code
- **OTP storage:** Hashed in Redis with 5-minute TTL

> **⚠️ Pre-existing source discrepancy — OTP hashing:** APP-PATIENT.md Sections 3 and 25.2 specify "SHA-256 hashed in Redis." However, BACKEND-PART1.md Section 5's actual code uses `bcrypt.hash(otp, 10)` and `bcrypt.compare()`. During implementation, use bcrypt (as per the backend code) since it is the more secure choice for hashing short numeric codes.
- **One active OTP per phone:** A new OTP request automatically invalidates any previous OTP for that number

### 4.4 OTP Entry

**Screen:** `(auth)/otp-entry.tsx`

1. Patient sees: "Enter the 6-digit code sent to +91 •••••• XXXX" (last 4 digits shown, rest masked)
2. 6 individual digit input boxes with auto-advance (typing a digit jumps cursor to next box)
3. **Android auto-read:** SMS Retriever API via `react-native-otp-verify` attempts to read OTP from SMS and auto-fill the boxes
4. Countdown timer: "Resend code in 0:30"
5. After 30 seconds: `[Resend via WhatsApp]` and `[Resend via SMS]` buttons appear
6. "Change phone number" link below → returns to phone entry screen
7. **Auto-submit:** When all 6 digits are entered, the form automatically submits (no "Verify" button needed)

**API call on submit:** `trpc.auth.verifyOtp.mutate({ phone: "+91XXXXXXXXXX", otp: "123456" })`

**On success:**
- Backend sets `user.phoneVerified = true`
- If first-time user → navigate to profile completion
- If returning user (phone was verified before, e.g., re-verification after phone number change) → navigate to Home tab

### 4.5 Rate Limits & Protections

| Protection | Limit | What Patient Sees |
|-----------|-------|-------------------|
| OTP requests per phone number | 5 per hour | "Too many code requests. Please wait and try again in [X] minutes." |
| OTP verification attempts per code | 3 attempts, then invalidated | "Too many incorrect attempts. [Request a new code]" |
| OTP lifetime | 5 minutes | "Code expired. [Resend]" |

### 4.6 Edge Cases — OTP Verification

| Scenario | What Happens |
|----------|-------------|
| Wrong OTP entered | Shake animation on input boxes + "Incorrect code. Please try again." Remaining attempts decremented. |
| OTP expires (5 min) | "Code expired. [Resend]" — must request new code |
| 3 failed attempts | OTP invalidated server-side. "Too many incorrect attempts. [Request a new code]" |
| 5 OTP requests in 1 hour | Rate limited. "Too many code requests. Please wait and try again." Timer counts down. |
| Phone number already verified on another account | "This phone number is already linked to another account. Please use a different number or [contact support]." |
| Patient doesn't have WhatsApp | WhatsApp delivery fails → system auto-sends SMS within 5 seconds. Patient sees SMS arrive. |
| SMS delivery delayed (telecom issues) | Patient waits 30s, taps "Resend via SMS" → new OTP sent |
| Patient enters incorrect phone number | Taps "Change phone number" → returns to entry screen → re-enters |
| Network error during OTP verification | "Unable to verify. Check your connection and try again." + Retry |
| Patient force-closes app during OTP entry | On relaunch, patient is still on OTP screen (phone not yet verified, so routing logic redirects back here) |

---

## 5. Profile Completion (First-Time Setup)

### 5.1 Profile Setup Screen

**Screen:** `(auth)/profile-setup.tsx`
**When shown:** Only for first-time users after phone verification

**Fields:**
- Date of Birth (date picker; must be 18+ — patients under 18 cannot use the platform)
- Gender (Male / Female / Other / Prefer not to say)
- Delivery Address:
  - Address Line 1 (required)
  - Address Line 2 (optional)
  - City (auto-filled from pincode)
  - State (auto-filled from pincode)
  - Pincode (required, 6-digit Indian postal code — auto-fills city + state via India Post API)

**On completion:** Patient taps `[Complete Setup]` → navigated to Home tab (`(tabs)/home`)

### 5.2 Edge Cases — Profile Setup

| Scenario | What Happens |
|----------|-------------|
| Patient is under 18 (DOB check fails) | "Onlyou is available for patients 18 years and older. If you believe this is an error, please contact support." — cannot proceed. |
| Invalid pincode | "We couldn't find this pincode. Please check and try again." |
| India Post API is down | Pincode lookup fails → city and state fields become manually editable (not auto-filled) |
| Patient skips profile setup (force-closes app) | On next login, routing detects incomplete profile → redirects back to profile setup. Patient cannot access Home until profile is complete. |
| Patient enters a pincode outside service area | Accepted (no service area restriction in MVP — single-city MVP will expand). Note: delivery logistics may be manually coordinated by admin for out-of-area patients. |

---

## 6. Returning User Sign-In

### 6.1 Normal Sign-In

**Screen:** `(auth)/signin.tsx`

1. Patient taps "Already have an account? Sign In" from welcome screen
2. Enters email + password
3. API: `trpc.auth.login.mutate({ email, password })`
4. **Post-login routing logic:**
   - If `phoneVerified === false` → redirect to phone verification
   - If `phoneVerified === true` AND profile incomplete (no DOB, no address) → redirect to profile completion
   - If fully set up → navigate to Home tab

### 6.2 Forgot Password

1. Patient taps "Forgot Password?" on sign-in screen
2. Enters email address
3. API sends password reset link via email (Resend for MVP)
4. Patient opens email, taps link → opens in-app (deep link) or mobile browser
5. Enters new password + confirm password (same validation rules as sign-up)
6. API resets password
7. Auto-login after successful reset → routed based on `phoneVerified` / profile status

### 6.3 Social Re-Authentication

- Google: Tap "Continue with Google" → same Google OAuth flow → backend finds existing user → returns JWT pair
- Apple: Tap "Continue with Apple" → native Apple sheet → backend finds existing user → returns JWT pair (Apple does NOT re-provide name/email after first sign-in)

### 6.4 Biometric Unlock (Optional)

- If patient enabled biometric lock (Profile > Settings): after 5 minutes of app inactivity, the app requires Face ID / fingerprint to reopen
- Uses `expo-local-authentication`
- If biometric fails 3 times → fallback to full password/social login

### 6.5 Auto-Logout

- After 30 days of inactivity (no app opens, no API calls), tokens are cleared and the patient must re-login
- This is a security measure, not a session expiry

### 6.6 Edge Cases — Sign-In

| Scenario | What Happens |
|----------|-------------|
| Wrong password | "Incorrect email or password. [Forgot Password?]" |
| Account locked (too many failed attempts) | "Account temporarily locked. Try again in 30 minutes or [reset your password]." |
| Patient has no internet | "Unable to connect. Please check your internet." |
| Patient signed up with Google but tries email sign-in | "This account uses Google sign-in. [Continue with Google]" |
| Patient signed up with email but tries Google with same email | Backend links accounts — seamless login via Google |
| Password reset link expired (24h) | "This link has expired. [Request a new one]" |
| Patient opens password reset link on desktop (not phone) | Opens in mobile browser → form works but doesn't auto-login to app → patient must manually log into app afterward |

---

## 7. Home Tab — Daily Command Centre

### 7.1 Layout (Top to Bottom)

**Screen:** `(tabs)/home/index.tsx`

The Home tab is the patient's daily command centre. It's the first screen after login and provides at-a-glance status of everything happening.

**7.1.1 Greeting Bar**
- "Hi [First Name]" + current date (e.g., "Thursday, 27 Feb")
- Notification bell icon (top right) with red dot if unread notifications
- Tapping bell → notification center screen (`notifications/index.tsx`)

**7.1.2 Active Tracking Banners (Conditional)**

Only shown when active lab orders or medication deliveries exist. Each is a tappable card.

Lab order banner example:
```
🔬 Blood Test
   Sample being processed
   Updated 2h ago
   [Tap to track →]
```

Delivery banner example:
```
📦 Treatment Kit
   Out for delivery
   ETA: 30 mins
   [Tap to track →]
```

- Tapping navigates to detailed stepper in Activity tab
- Maximum 3 banners shown; if more exist, "+X more" link appears
- Cards auto-update via SSE (Server-Sent Events) in real-time
- When delivery is "Out for delivery" → shows delivery person name, phone (tap to call), and ETA
- When no active orders → this entire section is hidden

**7.1.3 Active Treatment Cards**

One card per subscribed vertical:
```
┌─────────────────────────────────────┐
│  💊 Hair Loss Treatment              │
│  Treatment active — Day 45           │
│  Next check-in: 15 Mar 2026         │
│  [Message Doctor] [View Prescription]│
│  [Reorder]                           │
└─────────────────────────────────────┘
```

- Card fields: condition name + icon, current status ("Treatment active — Day [X]"), next check-in date, quick action buttons
- "Message Doctor" → opens condition-specific chat
- "View Prescription" → opens prescription PDF (CloudFront signed URL, 1-hour expiry)
- "Reorder" → only visible if subscription active + no pending delivery

**7.1.4 Medication Reminders**

```
Today's Medications:
☐ Finasteride 1mg — Take 1 tablet after breakfast
☐ Minoxidil 5% — Apply to scalp, morning
☐ Minoxidil 5% — Apply to scalp, evening
```

- Tap checkbox → mark as "Taken" (✅) with timestamp
- Long-press → options: "Taken" / "Skipped" / "Remind in 1 hour"
- "Remind in 1 hour" schedules a local notification
- Medications sorted by time of day: Morning → Afternoon → Evening → Night
- Data derived from active prescriptions

**7.1.5 Quick Actions Grid**

| Action | Destination |
|--------|------------|
| Start New Assessment | Explore tab |
| Upload Lab Results | Lab booking upload screen (only shown if doctor ordered tests and patient hasn't booked collection yet) |
| Contact Support | In-app help chat |

### 7.2 Edge Cases — Home Tab

| Scenario | What Happens |
|----------|-------------|
| Brand new user (no subscriptions yet) | Home tab shows welcome message + "Start your first assessment" CTA → links to Explore tab. Medication reminders, tracking banners, treatment cards — all hidden. |
| Multiple verticals (e.g., Hair Loss + ED) | Multiple treatment cards, scrollable. Medication reminders combined from all verticals into one daily list. |
| Subscription paused | Treatment card shows "Treatment paused" in amber + `[Resume]` CTA |
| Subscription cancelled | Card removed from Home. Visible in Profile > My Subscriptions as "Cancelled — access until [date]" |
| Consultation still under review | Card shows "Under Review" status with animated spinner |
| Doctor requested more info | Card shows red "Action Needed" badge + `[Respond]` CTA |
| Yesterday's medications missed | Shown at top of medication list with "Missed yesterday" label |
| No active prescriptions | Medication reminders section hidden entirely |
| Over 3 active tracking items | First 3 shown + "+X more" link to Activity tab |

---

## 8. Explore Tab — Browsing Conditions

### 8.1 Condition Cards Grid

**Screen:** `(tabs)/explore/index.tsx`

5 condition cards in a 2-column scrollable grid:

| Condition | Tagline | Starting Price |
|-----------|---------|---------------|
| Hair Loss | "Clinically-proven hair regrowth" | ₹999/mo |
| Erectile Dysfunction | "Discreet treatment that works" | ₹1,299/mo |
| Premature Ejaculation | "Take back control" | ₹1,299/mo |
| Weight Management | "Medical weight loss, supervised" | ₹2,999/mo |
| PCOS & Hormonal Health | "Hormonal balance, expert care" | ₹1,499/mo |

**Card states (dynamic per patient):**

| State | Badge | CTA |
|-------|-------|-----|
| Available (default) | None | `[Start Assessment]` |
| Active subscription | "Active ✓" (green) | None (tapping goes to Home treatment card) |
| Assessment in progress (saved) | "Continue Assessment →" (amber) | Resumes questionnaire |
| Under review | "Under Review 🔄" (blue) | None |
| Subscription paused | "Paused ⏸️" (amber) | `[Resume]` |

### 8.2 Condition Detail Screen

**Screen:** `(tabs)/explore/[condition].tsx`

When patient taps a condition card, they see:

1. **Hero section:** illustration/icon + condition name + tagline
2. **How It Works** (3-step visual):
   - Step 1: "Tell us about your health" (questionnaire icon)
   - Step 2: "Get matched with a specialist" (doctor icon)
   - Step 3: "Receive your treatment at home" (package icon)
3. **What You Get:** Doctor consultation, personalized prescription, monthly medication delivery, ongoing monitoring, WhatsApp support
4. **Pricing table:** Monthly / Quarterly / 6-Month with savings percentages
5. **FAQ accordion** (3–5 common questions per condition)
6. **Sticky bottom CTA:** `[Start Your Assessment — Free]`

**Condition-specific detail content:**

| Condition | Special Content |
|-----------|----------------|
| Hair Loss | Gender selection (Male/Female) shown first — affects questionnaire branching, photo requirements, and treatment. Norwood scale (men) / Ludwig scale (women) reference images. Note that 4 photos are required. |
| ED | IIEF-5 questionnaire mentioned. No photos required. Age restriction: must be 18+ |
| PE | PEDT questionnaire mentioned. No photos. Age restriction: 18+ |
| Weight Management | BMI auto-calculated from questionnaire. 2 photos required. Two tiers: Standard (₹2,999/mo, BMI ≥ 25) and GLP-1/Premium (₹9,999/mo, BMI ≥ 30 with comorbidity OR BMI ≥ 35 without comorbidity). **GLP-1 tier greyed out with "Coming Soon" badge** — not selectable in MVP. |
| PCOS | Rotterdam criteria auto-check from answers. Period tracker promoted. Fertility intent question affects treatment. Blood work almost always ordered. No photos required. |

### 8.3 Edge Cases — Explore Tab

| Scenario | What Happens |
|----------|-------------|
| Patient taps CTA but isn't logged in | Redirected to auth flow → after login → returns to this condition detail |
| Patient taps CTA but phone not verified | Redirected to phone verification → after verify → returns |
| Patient already has active subscription for this condition | Card shows "Active ✓" — no start assessment CTA. Tapping navigates to Home treatment card. |
| Patient taps "Start Assessment" but has saved progress from before | Modal: "Continue where you left off?" with `[Resume]` / `[Start Over]` options |
| Patient tries to subscribe to same vertical twice | Backend prevents it. UI shows "Active" badge. |
| GLP-1 tier tapped (Weight Management) | Toast: "GLP-1 treatment is coming soon. We'll notify you when it's available." Card is not selectable. |
| Patient's BMI qualifies for GLP-1 (BMI ≥ 35, or BMI ≥ 30 with comorbidity) | After questionnaire: "Based on your profile, you may benefit from our upcoming GLP-1 program. We'll notify you when it launches. In the meantime, our Standard plan can help you get started." Backend sets `glp1_interest` flag on user record. |

---

## 9. Starting an Assessment (Questionnaire)

### 9.1 Questionnaire Architecture

Questionnaires are rendered from JSON schema files — one per vertical. The mobile app has a generic questionnaire renderer; no condition-specific logic is hardcoded in the app.

**Key design decision:** One question per screen. No multi-question forms.

### 9.2 Step-by-Step Flow

1. Patient taps `[Start Your Assessment — Free]` on condition detail page
2. If condition requires gender selection (Hair Loss) → gender picker screen first
3. Questionnaire begins: single question displayed per screen
4. Patient answers question → taps `[Next →]` (bottom sticky button — disabled until valid answer provided)
5. `[← Back]` button (top left) to revisit previous question
6. Progress bar at top: "Question 5 of 25"
7. After each answer:
   - Skip logic evaluated (may jump forward, branch to different path, or skip irrelevant questions)
   - Progress bar adjusts dynamically if skips reduce total questions
   - Answer saved to local Zustand store (persisted)
   - Backend sync every 3 questions AND on any navigation away (app background, tab switch, back press)
8. Process repeats until all questions answered
9. Patient arrives at Review screen

### 9.3 Question Types

| Type | UI Element | Example |
|------|-----------|---------|
| `single_choice` | Radio button list | "How long have you been experiencing hair loss?" |
| `multi_choice` | Checkbox list | "Select all medications you currently take" |
| `text` | Text input | "Describe any previous treatments you've tried" |
| `number` | Numeric input | "What is your weight in kg?" |
| `date` | Date picker | "When did you last have a blood test?" |
| `scale` | Slider (1–5 or 1–10) | "Rate the severity of your symptoms" |
| `photo` | Camera/gallery trigger | Hair loss photo capture (see Section 10) |
| `info` | Read-only informational card | "The next section covers your medical history" (auto-advance or "Got it" button) |

### 9.4 Questionnaire per Vertical

| Vertical | Total Questions | Duration | Scoring | Special Logic |
|----------|----------------|----------|---------|---------------|
| Hair Loss | ~25 | ~8–12 min | Norwood/Ludwig classification | Gender branching (M/F), family history weighting |
| ED | ~28 | ~8–12 min | IIEF-5 (5 scored items) | Age gate (18+), cardiovascular risk flagging |
| PE | ~26 | ~6–8 min | PEDT (5 scored items) | Age gate (18+), serotonin medication check |
| Weight | ~30 | ~8–10 min | BMI auto-calc | Height/weight → BMI → tier routing (Standard vs GLP-1) |
| PCOS | ~32 | ~10–14 min | Rotterdam criteria | Fertility intent branching, menstrual calendar input |

### 9.5 Review Screen

**Screen:** `questionnaire/[condition]/review.tsx`

1. All answers listed, grouped by section
2. Each answer is tappable → navigates back to that specific question for editing
3. Consent text: "By submitting, I confirm these answers are accurate and consent to a clinical assessment based on them."
4. Required consent checkbox
5. `[Submit Assessment]` button

**On submit:**
- All answers sent to backend in one API call
- Backend triggers AI assessment pipeline (BullMQ background job)
- Consultation record created with status `SUBMITTED`
- Patient navigated to photo upload (if required by vertical) or plan selection (if no photos needed)

### 9.6 Edge Cases — Questionnaire

| Scenario | What Happens |
|----------|-------------|
| Patient exits mid-questionnaire (closes app, switches tab) | Progress saved locally + synced to backend. On return: "Continue where you left off?" with `[Resume]` / `[Start Over]` |
| Saved progress expires after 7 days | "Your previous assessment has expired. Please start a new one." Progress cleared. |
| Patient starts on Device A, switches to Device B | Device B loads last backend-synced state (up to 2 unanswered questions may not have synced). Brief "Syncing your progress…" spinner shown while fetching. |
| Skip logic makes progress bar jump backward (branch reveals more questions) | Progress bar smoothly adjusts. No confusion — total questions count updates. |
| Patient tries to submit without consent checkbox | Submit button disabled. Hint text highlights: "Please confirm your consent to proceed." |
| Network error during final submit | "Unable to submit. Your answers are saved. [Retry]" — answers preserved locally |
| Patient goes through entire questionnaire and realizes they selected wrong condition | Must start over. Back button at review screen goes to previous question, not to condition selection. Patient can exit to Explore and choose a different condition — previous questionnaire progress is saved separately per condition. |
| ED/PE questionnaire: patient indicates age < 18 | Hard stop: "This treatment is only available for patients 18 and older." Assessment cannot proceed. |
| Weight questionnaire: BMI calculated as < 25 (below eligibility) | Info screen: "Based on your responses, our weight management program may not be appropriate for you. Please consult with your primary care physician." Assessment cannot proceed. Note: Onlyou uses WHO Asian BMI cutoffs where ≥ 25 = Obese Class I (lower than Western standard of ≥ 30). |

---

## 10. Photo Upload

### 10.1 Which Verticals Require Photos

| Vertical | Photos Required | Photo Types |
|----------|----------------|-------------|
| Hair Loss | 4 mandatory | Top of head, Hairline (frontal), Crown (back), Problem area |
| Weight Management | 2 optional | Full body front, Full body side |
| ED | 0 | — |
| PE | 0 | — |
| PCOS | 0 mandatory (optional: acne/hirsutism photos) | Optional: acne severity, excess hair growth areas |

### 10.2 Photo Capture Flow

**Screen:** `photo-upload/camera.tsx`

For each required photo:

1. Camera viewfinder opens with semi-transparent overlay guide (silhouette showing target framing)
2. Instruction text at top: e.g., "Position the top of your head in the frame"
3. Controls: capture button (bottom center), flash toggle (top right), switch camera (front/back), gallery button (bottom left)
4. Patient captures photo OR selects from gallery
5. Client-side processing:
   - Resize: max 1920px on longest side (preserve aspect ratio)
   - Compress: JPEG quality 0.8 (~60–70% file size reduction)
   - Strip EXIF: GPS, device info removed (critical privacy measure for sensitive conditions)
   - Target: <500KB per photo
6. Upload via presigned S3 PUT URL (15-minute expiry)
7. Progress bar shown per photo (actual bytes uploaded / total)
8. On success: ✅ checkmark on completed photo, auto-advance to next required photo

### 10.3 Photo Review

After all required photos are captured:
- Grid showing all photos with labels
- Tap any photo to retake
- `[Looks Good — Continue]` → proceed to plan selection

### 10.4 Edge Cases — Photo Upload

| Scenario | What Happens |
|----------|-------------|
| Upload fails (network error) | Auto-retry 3 times (exponential backoff: 1s, 3s, 9s) → then "Upload failed. [Retry]" |
| Presigned URL expired (15 min) | New presigned URL requested automatically in background, retry upload |
| Photo too dark/blurry | No client-side quality check in MVP. Doctor will request retake via messages if needed. |
| S3 returns 403 | Presigned URL issue → new URL requested + retry |
| Patient takes photo from gallery but it's a screenshot, not a real photo | Accepted (no authenticity check in MVP). Doctor may flag and request retake. |
| Patient's camera permissions are denied | System permission prompt shown. If denied: "Camera access is required for photos. Please enable in Settings." with link to OS settings. |
| Patient uses gallery but chooses non-image file | File type validation rejects: "Please select a JPG or PNG image." |
| Patient exits during multi-photo upload (2 of 4 done) | Completed photos preserved server-side. On return, review screen shows completed photos + empty slots for remaining ones. |
| Patient is in a dark room (Hair Loss top-of-head photo) | Flash toggle available. No auto-flash in MVP. |

---

## 11. AI Pre-Assessment (Background)

### 11.1 What Happens (Invisible to Patient)

After questionnaire submission:

1. Backend creates a BullMQ job for AI assessment
2. Claude AI analyzes questionnaire answers + any photos
3. Generates:
   - Classification (e.g., Norwood Type III for Hair Loss, IIEF-5 score for ED)
   - Risk flags (e.g., cardiovascular risk, drug interactions)
   - Contraindications (e.g., finasteride contraindicated for women of childbearing age)
   - Recommended treatment category
   - Structured summary for doctor review
4. Consultation status progresses: `SUBMITTED` → `AI_PROCESSING` → `AI_COMPLETE`

### 11.2 Patient Experience During AI Processing

- **Patient does NOT see AI processing as a separate step.** The patient-facing status remains "Under Review" throughout `SUBMITTED`, `AI_PROCESSING`, and `AI_COMPLETE` phases.
- Patient is either selecting a plan/paying (if plan selection happens before doctor review) or waiting for doctor assignment.
- Typical AI processing time: 15–60 seconds
- If AI processing fails → case is still queued for doctor review with raw data (no AI summary). Admin is alerted. Patient sees no difference.

---

## 12. Plan Selection

### 12.1 Plan Selection Screen

**Screen:** `treatment/plan-selection.tsx`
**Shown after:** Questionnaire + photos (if required)

Three plan cards:

| Plan | Badge | Description |
|------|-------|-------------|
| Monthly | — | Full monthly price, maximum flexibility |
| Quarterly | "Popular" | 11–17% savings depending on vertical, billed quarterly |
| 6-Month | "Best Value" | 17–25% savings depending on vertical, one-time payment |

> **⚠️ Note — Pre-existing source discrepancy:** PROJECT-OVERVIEW.md states savings ranges as "15–17% quarterly, 22–25% 6-month." However, actual math from the pricing table shows Weight Management (Standard) has only 11% quarterly savings and 17% 6-month savings — outside those stated ranges. All other verticals fall within the PROJECT-OVERVIEW ranges. The per-vertical pricing table below is authoritative.

**Pricing per vertical (authoritative source: onlyou-spec-resolved-v4.md Section 5):**

| Vertical | Monthly | Quarterly (per mo / total) | 6-Month (per mo / total) |
|----------|---------|---------------------------|-------------------------|
| Hair Loss | ₹999 | ₹833/mo (₹2,499) | ₹750/mo (₹4,499) |
| ED | ₹1,299 | ₹1,100/mo (₹3,299) | ₹1,000/mo (₹5,999) |
| PE | ₹1,299 | ₹1,100/mo (₹3,299) | ₹1,000/mo (₹5,999) |
| Weight (Standard) | ₹2,999 | ₹2,666/mo (₹7,999) | ₹2,500/mo (₹14,999) |
| Weight (GLP-1) | ₹9,999 | ₹8,333/mo (₹24,999) | ₹7,500/mo (₹44,999) |
| PCOS | ₹1,499 | ₹1,266/mo (₹3,799) | ₹1,167/mo (₹6,999) |

**GLP-1 tier (Phase 2 — Coming Soon):** Row displayed but greyed out with "Coming Soon" badge. Not tappable.

### 12.2 Plan Selection Interaction

1. Cards shown side by side (horizontal scroll on small screens)
2. Tap to select (radio-button style — only one selected at a time)
3. Selected card shows blue border + checkmark
4. `[Continue to Payment]` button at bottom

### 12.3 Critical Technical Detail: 6-Month Plans

The 6-month plan is a one-time Razorpay payment, NOT a Razorpay subscription. Razorpay subscriptions only support monthly and quarterly billing cycles. This affects renewal flow (see Section 28).

---

## 13. Payment (Razorpay Checkout)

### 13.1 Pre-Checkout Summary

**Screen:** `treatment/payment.tsx`

```
Your Treatment Plan:
Hair Loss — Monthly
₹999/month

Wallet balance: ₹200 (auto-applied)
[ ] Don't use wallet balance

Amount to pay: ₹799
```

- Wallet balance auto-applied if > 0
- Patient can toggle "Don't use wallet balance" to pay full amount via Razorpay
- Note: Wallet balance is NOT applied to future auto-renewals (Razorpay charges the full amount on recurring payments directly to the saved payment method)

### 13.2 Razorpay Checkout Flow

1. Patient taps `[Pay ₹799]`
2. App creates Razorpay order/subscription on backend: `trpc.payments.create.mutate({ ... })`
3. Razorpay checkout sheet opens (native overlay via `react-native-razorpay` SDK)
4. Available payment methods: UPI (GPay, PhonePe, Paytm), Credit/Debit Card, Net Banking
5. Prefilled: patient email, phone, name
6. Patient selects payment method and completes payment
7. Razorpay webhook fires to backend: `payment.authorized` or `subscription.activated`
8. Backend verifies via Razorpay API (dual verification — webhook + API poll)
9. Backend activates subscription, creates first order
10. App receives success callback → navigates to confirmation screen

### 13.3 Edge Cases — Payment

| Scenario | What Happens |
|----------|-------------|
| Payment failed (insufficient funds, declined) | Razorpay shows failure reason. Patient returns to plan selection. "Payment failed. Your assessment is saved. [Try Again]" |
| Payment cancelled (user dismissed checkout) | "Payment cancelled. Your assessment is saved. [Try Again]" — assessment not lost |
| Network timeout during payment | App checks payment status via Razorpay API before showing error (payment may have succeeded). If confirmed: proceed to confirmation. If unconfirmed: "We're checking your payment status. Please wait…" with auto-retry. |
| Duplicate webhook from Razorpay | Idempotent handling — Razorpay event ID stored, duplicate skipped. No double-charge. |
| UPI autopay limit (₹15,000/txn) exceeded | Shouldn't happen for any standard plan. If custom pricing exceeds: fallback to card payment. |
| Patient tries to pay for a vertical they already have an active subscription for | Backend rejects: "You already have an active subscription for this condition." |
| Razorpay checkout SDK crashes | Sentry captures error. Patient taps retry → fresh checkout initiated. |

---

## 14. Post-Payment Confirmation & Waiting

### 14.1 Confirmation Screen

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

### 14.2 State After Confirmation

- Home tab: "Under Review" treatment card with animated spinner
- Activity tab: consultation listed with `SUBMITTED` status → patient-facing: "Under Review — A doctor will review your case within 24 hours"
- Messages tab: new conversation created for this vertical → placeholder: "Your doctor will respond here once they've reviewed your case."

### 14.3 What Happens Behind the Scenes

1. Case enters doctor case queue (ordered by priority, SLA timer starts)
2. Admin can manually assign to a specific doctor, or auto-assignment picks the first available specialist for that vertical
3. Doctor sees AI summary + raw questionnaire data + photos
4. Typical review time: 3–8 minutes per case
5. Doctor chooses one of several actions (see Section 15)

### 14.4 Edge Cases — Waiting Period

| Scenario | What Happens |
|----------|-------------|
| Doctor hasn't reviewed within 24 hours | Internal SLA escalation to admin (admin dashboard alert). Patient does NOT see an SLA breach notification — the promise is "within 24 hours" and admin intervenes to meet it. |
| Patient messages doctor during "Under Review" | Message delivered to the doctor's queue. Doctor sees it when reviewing the case. |
| Patient wants to cancel before doctor reviews | Can request cancellation: 100% refund to wallet (see Section 30) |

---

## 15. Doctor Review Outcomes (Patient Perspective)

After a doctor reviews the case, ONE of the following outcomes occurs. The patient is notified for each.

### 15.1 Outcome: Prescription Created (Most Common)

- Doctor writes prescription using condition-specific template
- Status changes to `PRESCRIBED`
- Patient sees: "Treatment Plan Ready — Review your prescription"
- Push notification: "Your prescription is ready! Tap to view your treatment plan."
- Home tab treatment card updates: `[View Prescription]` CTA active
- Prescription PDF viewable in app (CloudFront signed URL, 1-hour expiry)
- Medication delivery automatically enters pharmacy pipeline (see Section 22)

### 15.2 Outcome: Blood Work Ordered

- Doctor orders lab tests before prescribing (common for PCOS, sometimes Hair Loss, sometimes Weight)
- Consultation status remains at `IN_REVIEW` — the lab order is a separate entity, not a consultation status change
- Prescription is delayed until lab results are reviewed by the doctor
- Patient notified: "Your doctor has ordered blood tests. Please book a home collection or upload your own results."
- Patient proceeds to Lab Booking flow (see Section 17)
- Once lab results are ready and reviewed, the doctor then prescribes → status moves to `PRESCRIBED`

### 15.3 Outcome: More Info Requested

- Doctor needs clarification or additional photos
- Status changes to `MORE_INFO_REQUESTED`
- Patient notified: "Your doctor needs more information about your case"
- Home tab shows red "Action Needed" badge
- See Section 16 for full flow

### 15.4 Outcome: Referral

- Doctor determines the patient needs in-person care that Onlyou cannot provide
- Status changes to `REFERRED`
- Patient notified: "Based on your case, your doctor recommends seeing a specialist in person."
- Patient sees referral details: partner clinic near their location, specialist type, what to mention
- See Section 39 for full flow

### 15.5 Outcome: Refund

- Doctor determines the patient cannot be treated via the platform
- Status changes to `CANCELLED` with refund
- Patient notified: "We're unable to provide treatment for your case. A full refund has been issued."
- See Section 40 for full flow

---

## 16. Doctor Requests More Info (MORE_INFO_REQUESTED)

### 16.1 Patient Experience

1. Push notification: "Your doctor needs more information about your case"
2. Home tab treatment card shows red "Action Needed" badge
3. Patient taps card → opens a screen showing:
   - Doctor's specific written request (text message)
   - Optionally: "Please upload new photos of [specific area]"
4. Patient responds via:
   - Text message in the Messages tab (doctor-patient chat)
   - Uploading additional photos (same upload flow as Section 10)
5. After responding → consultation returns to `IN_REVIEW` status
6. Doctor re-reviews with new information

### 16.2 Edge Cases

| Scenario | What Happens |
|----------|-------------|
| Patient ignores "Action Needed" for 48+ hours | Admin reminder sent to patient (WhatsApp + push). Internal SLA tracking. |
| Patient responds with unclear information | Doctor may send another INFO_REQUESTED round. No limit on rounds, but typical: 1–2. |
| Patient uploads wrong photo type | Doctor messages to clarify and re-request |

---

## 17. Blood Work / Lab Tests

### 17.1 Trigger

Lab tests are ordered by the doctor during consultation review. Patient receives notification: "Your doctor has ordered blood tests."

### 17.2 Lab Test Pricing

> **⚠️ Pre-existing source discrepancy:** APP-PATIENT.md Section 13.1 states lab tests are "billed separately from the subscription." However, PROJECT-OVERVIEW.md Section 5, onlyou-spec-resolved-v4.md Section 5, and VERTICAL-HAIR-LOSS.md Section 2.3 all state "First panel: INCLUDED in subscription." This document follows the majority authoritative sources (PROJECT-OVERVIEW + v4 spec + vertical docs).

**First lab panel:** INCLUDED in the subscription at no extra charge when clinically indicated as part of the initial assessment.

**Follow-up panels:** Billed separately from the subscription at the time of booking.

| Test Panel | Price | Used For |
|-----------|-------|----------|
| Extended Hair Panel | ₹1,200 | Hair Loss — thyroid, iron, vitamin D, DHT |
| PCOS Screen Panel | ₹1,500 | PCOS — hormones, glucose, lipids |
| Metabolic Panel | ₹1,800 | Weight Management — HbA1c, lipids, liver, kidney |
| Basic Health Check | ₹800 | ED/PE — testosterone, glucose, lipids |
| Follow-up Panel | ₹600–₹1,200 | Varies by vertical |

**Patient self-upload:** Free — no charge if patient provides their own recent results instead of booking home collection.

### 17.3 Patient Options

**Screen:** `lab-booking/index.tsx`

Two choices presented:

| Option | Description | Cost |
|--------|-------------|------|
| **Book Home Collection** | Nurse visits patient's home to collect blood sample | First panel: included in subscription (free). Follow-up panels: lab test price (includes nurse visit fee). |
| **Upload Own Results** | Patient has recent lab results from another provider | Free |

---

## 18. Lab Home Collection (Nurse Visit)

### 18.1 Booking Flow

**Step 1: Slot Selection** (`lab-booking/slot-selection.tsx`)
- Calendar view: next 14 days, Sundays greyed out if no nurse available
- Time slots: Morning 7–10 AM (fasting slots highlighted), Afternoon 12–3 PM, Evening 4–7 PM
- Each slot shows availability based on nurse capacity in patient's area

**Step 2: Address Confirmation** (`lab-booking/address-confirm.tsx`)
- Pre-filled with default collection address (may differ from delivery address)
- `[Change Address]` → address book or add new
- Special instructions field (e.g., "Gate code: 1234", "Call when arriving")

**Step 3: Confirmation**
- Summary: date, time slot, address, tests being done, cost
- If first panel (included in subscription): no separate payment required — `[Confirm Booking]` only
- If follow-up panel: payment via Razorpay (same checkout flow, wallet balance applicable)
- `[Confirm Booking]`
- Booking appears in Activity tab with `SLOT_BOOKED` status

### 18.2 Nurse Visit Day — Patient Experience

1. **Nurse assigned** → notification: "Nurse [Name] has been assigned for your blood collection"
2. **15 minutes before arrival** → notification (push + WhatsApp + SMS): "Your nurse is arriving in about 15 minutes"
3. Nurse arrives at patient's home
4. Nurse collects blood sample(s), records vitals (blood pressure, weight — basic measurements)
5. Nurse marks collection as complete on their portal
6. Patient's Activity tab updates: `SAMPLE_COLLECTED`
7. Nurse delivers sample to partner lab
8. Lab receives sample → status: `SAMPLE_RECEIVED`
9. Lab begins processing → status: `PROCESSING_STARTED`
10. Results uploaded by lab → status: `RESULTS_UPLOADED`

### 18.3 Full Lab Order Status Flow (Patient View)

| Internal Status (Backend Enum) | Patient Sees | Patient Actions |
|-------------------------------|-------------|-----------------|
| `ORDERED` | "Tests ordered by your doctor" | Book home collection OR Upload own results |
| `SLOT_BOOKED` | "Collection booked: [date/time]" | Reschedule, Cancel |
| `NURSE_ASSIGNED` | "Nurse [Name] assigned" | Call nurse, Cancel (if >2hrs before slot) |
| `NURSE_EN_ROUTE` | "Nurse is on the way" | Wait |
| `NURSE_ARRIVED` | "Nurse has arrived" | Wait |
| `SAMPLE_COLLECTED` | "Sample collected, heading to lab" | Wait |
| `AT_LAB` | "Sample delivered to lab" | Wait |
| `SAMPLE_RECEIVED` | "Sample received and verified at lab" | Wait |
| `PROCESSING` | "Lab is processing your tests" | Wait |
| `RESULTS_READY` | "Results ready" (lab-processed) | View results PDF |
| `RESULTS_UPLOADED` | "Your uploaded results are under review" (self-uploaded path) | View results PDF |
| `SAMPLE_ISSUE` | "Issue with sample — recollection needed" | Book new collection slot |
| `RECOLLECTION_NEEDED` | "New sample needed — please book a new collection" | Book new collection slot |
| `COLLECTION_FAILED` | "Collection could not be completed" | Rebook slot |
| `DOCTOR_REVIEWED` | "Doctor has reviewed — see notes" | View results + doctor notes |
| `CLOSED` | "Complete" | View results PDF |
| `CANCELLED` | "Lab order cancelled" | — |

### 18.4 Edge Cases — Lab Collection

| Scenario | What Happens |
|----------|-------------|
| Patient needs to reschedule | Tap "Reschedule" on booking card → new slot selection (allowed up to 2 hours before booked slot) |
| Patient cancels lab booking before nurse dispatch | 100% refund to wallet |
| Patient cancels after nurse already dispatched | 50% refund to wallet |
| Nurse can't find patient's address | Nurse calls patient directly (phone number visible on nurse portal). If unreachable, nurse waits 15 min then marks as "patient unavailable" → admin reschedules. |
| Patient wasn't fasting for fasting-required tests | Nurse notes this. Doctor may still accept partial results or request recollection. |
| Sample has quality issue at lab | Status: `SAMPLE_ISSUE`. Patient notified: "There was an issue with your sample. Please book a new collection." New booking is free. |
| Lab results overdue (>48h after sample received) | Internal admin escalation. Patient doesn't see SLA breach but may receive "still processing" update. |
| Patient has multiple lab orders (different verticals) | Each lab order tracked independently in Activity tab. |

---

## 19. Self-Upload Lab Results

### 19.1 Upload Flow

**Screen:** `lab-booking/upload-results.tsx`

1. Patient taps "I Already Have Results — Upload"
2. Selects file: PDF or photo (camera capture or gallery)
3. If PDF: direct upload to S3. If photo: compressed first (same processing as Section 10).
4. Date picker: "When were these tests done?" (must be within last 90 days)
5. Patient taps `[Upload]`
6. Status becomes `RESULTS_UPLOADED`
7. Doctor reviews the uploaded results

### 19.2 Edge Cases

| Scenario | What Happens |
|----------|-------------|
| Results older than 90 days | Warning: "These results may be outdated. Your doctor may request new tests." Upload still allowed — doctor decides. |
| File size > 10MB | "File too large. Maximum size: 10MB. Please compress or take a clearer photo." |
| Unsupported format (e.g., .heic from iPhone) | "Please upload a PDF, JPG, or PNG file." |
| Upload fails (network) | Auto-retry 3 times → "Upload failed. [Retry]" |
| Uploaded results are unreadable/blurry | Doctor reviews and either accepts or requests new upload via messaging |
| Patient uploads results for wrong tests | Doctor reviews, notes the discrepancy, may still order the specific missing tests |

---

## 20. Lab Results Received & Doctor Review

### 20.1 Patient Experience

1. Notification: "Your lab results are ready. Your doctor will review them shortly."
2. Activity tab: lab order card shows `RESULTS_UPLOADED` → patient can tap to view results PDF
3. Doctor reviews results (within 24-hour SLA)
4. After doctor review: status → `REVIEWED`
5. Notification: "Your doctor has reviewed your lab results. Check your messages for notes."
6. Patient views results + doctor's notes/interpretation
7. Doctor then proceeds to prescribe (or request more info, or refer)

### 20.2 Edge Cases

| Scenario | What Happens |
|----------|-------------|
| Results show serious abnormality | Doctor's notes flag the issue. Doctor may: adjust treatment plan, refer to in-person specialist, or recommend ER visit for urgent findings. Doctor also messages patient directly with urgency-appropriate guidance. |
| Doctor hasn't reviewed within 24h | Internal admin reminder. Patient not notified of SLA status. |
| Lab uploads wrong patient's results | Lab portal has anonymous IDs, reducing mismatch risk. If caught: admin contacts lab, correct results re-uploaded. Patient sees delay but not the error. |

---

## 21. Prescription Created (Treatment Plan Ready)

### 21.1 Patient Experience

1. Notification: "Your treatment plan is ready! Tap to view your prescription."
2. Home tab treatment card updates to show `[View Prescription]` active
3. Patient taps → prescription PDF opens (CloudFront signed URL, 1-hour expiry)
4. Prescription includes: medications, dosages, frequency, duration, doctor's name + NMC number
5. PDF can be downloaded to device via `expo-file-system`
6. Screenshot is disabled on this screen (`FLAG_SECURE` on Android; iOS workaround via `UITextField.isSecureTextEntry`)

### 21.2 What Happens Automatically

- Prescription PDF generated server-side from condition-specific templates
- Prescription automatically sent to assigned partner pharmacy (status: `SENT_TO_PHARMACY`)
- Delivery order created (status: `CREATED`)
- Medication delivery lifecycle begins (see Section 22)

### 21.3 Edge Cases

| Scenario | What Happens |
|----------|-------------|
| CloudFront signed URL expires while viewing | 1-hour expiry. If patient leaves and returns after 1 hour: new signed URL generated on next tap. |
| Patient wants to share prescription with another doctor | Download PDF → share via any method. Prescription PDF includes all necessary information. |
| Doctor adjusts prescription during treatment (follow-up) | New prescription created. Old one marked "Superseded" in My Prescriptions list. New one becomes active. |

---

## 22. Medication Delivery Lifecycle

### 22.1 When Delivery Orders Are Created

Delivery orders are created automatically when:
1. Doctor creates a prescription (first order)
2. Auto-reorder triggers on subscription renewal date (see Section 28)
3. Patient manually requests a reorder (via "Reorder" button on Home tab)

### 22.2 Full Delivery Status Flow (Patient View)

| Status (canonical) | Patient Display | Patient Actions |
|--------------------|----------------|-----------------|
| `CREATED` | "Prescription ready" | View prescription PDF |
| `SENT_TO_PHARMACY` | "Sent to pharmacy" | Wait |
| `PREPARING` | "Pharmacy is preparing" | Wait |
| `READY` | "Ready for pickup by delivery" | Wait |
| `OUT_FOR_DELIVERY` | "On its way!" + delivery person name/phone/ETA | Call delivery person, view delivery OTP |
| `DELIVERED` | "Delivered ✅" | Rate experience, view usage instructions |
| `DELIVERY_FAILED` | "Delivery attempt failed" | Reschedule delivery |
| `PHARMACY_ISSUE` | "Medication temporarily unavailable" | Contact support (admin resolving) |
| `CANCELLED` | "Order cancelled" | View refund status |

### 22.3 Tracking Detail

**Screen:** `(tabs)/activity/[orderId].tsx`

Full vertical stepper showing all statuses with timestamps. Each completed status shows ✅ with date/time. Current status shows 🔵 with descriptive text. Future statuses show ⚪.

When status = `OUT_FOR_DELIVERY`:
```
Delivery by: Ravi K.
Phone: +91 98765 43210 [📞 Call]
Method: Rapido
ETA: ~30 minutes
```

- Tap phone → opens dialer
- ETA updates manually by coordinator (not GPS-based in MVP)
- Delivery OTP prominently displayed (see Section 23)

### 22.4 Packaging

Patient notification before first delivery: "Your medication will arrive in a plain Onlyou-branded box. No condition name or medication details are visible on the outside."

### 22.5 Edge Cases — Delivery

| Scenario | What Happens |
|----------|-------------|
| Pharmacy doesn't have a medication in stock | Status: `PHARMACY_ISSUE`. Patient sees: "Medication temporarily unavailable." Admin contacts pharmacy to resolve or reassigns to another pharmacy partner. |
| Delivery person can't reach patient's address | Delivery person calls patient. If unreachable after waiting 15 min → marks as `DELIVERY_FAILED`. Admin reschedules. |
| Patient not home at delivery time | Delivery person marks as failed → admin reschedules |
| Weather delays delivery | ETA updated by coordinator. Patient sees updated ETA. |
| Multiple medications from different pharmacies | MVP: single pharmacy per order. All medications in one package. |
| Patient wants to change delivery address mid-transit | Not possible once `OUT_FOR_DELIVERY`. Must fail and reschedule. Can change address for future deliveries via Address Book. |

---

## 23. Delivery OTP Confirmation

### 23.1 Flow (Indian Standard Pattern)

This follows the same pattern as Swiggy, Zomato, Flipkart — the customer holds the OTP.

1. When delivery is assigned and entering `OUT_FOR_DELIVERY`, system generates a 4-digit OTP
2. OTP is displayed prominently on the patient's app (delivery tracking screen)
3. OTP also sent via push notification when delivery is ~15 min away
4. Delivery person arrives at patient's address
5. Delivery person's SMS link page shows: "Enter the 4-digit code from the customer"
6. Patient verbally tells the delivery person the 4-digit OTP
7. Delivery person enters OTP on their SMS link → API verifies → delivery confirmed
8. Status changes to `DELIVERED`
9. Patient sees: "Delivered ✅ — Here's how to use your medication:"
10. Usage instructions appear (medication-specific: how to take, when, with/without food, etc.)

### 23.2 Edge Cases — Delivery OTP

| Scenario | What Happens |
|----------|-------------|
| Wrong OTP entered by delivery person | "Incorrect code. Please ask the customer to re-read the code." |
| 3 failed OTP attempts | Delivery person sees: "Having trouble? Contact coordinator." Admin can manually mark as delivered. |
| Patient can't find OTP in app | OTP shown on delivery tracking screen + push notification. If still can't find: Contact Support. |
| Delivery person doesn't have data/internet on their phone | Delivery person's SMS link is lightweight (works on slow connections). Worst case: coordinator manually confirms. |

---

## 24. Treatment Active — Ongoing Daily Care

### 24.1 Daily Experience

Once prescription is active and medication delivered:

1. **Morning:** Push notification (if medication reminders enabled): "Time for your morning medications"
2. Patient opens app → Home tab → Medication Reminders section shows today's medications
3. Patient taps checkbox next to each medication as taken → ✅ with timestamp
4. Long-press option: "Taken" / "Skipped" / "Remind in 1 hour"
5. If "Skipped" → brief modal: "Why? (Side effect / Forgot / Other)" — logged for doctor review
6. **Evening:** Repeat for evening medications
7. **End of day:** Any unchecked medications remain for the next day as "Missed yesterday"

### 24.2 Between Check-Ins

- Patient can message doctor anytime via Messages tab
- Quick-reply chips available for common questions
- Patient can upload new progress photos to share with doctor
- Treatment card shows "Day [X]" count since first prescription

### 24.3 Edge Cases — Ongoing Care

| Scenario | What Happens |
|----------|-------------|
| Patient experiences side effects | Messages doctor. Doctor may adjust prescription. |
| Patient runs out of medication before next auto-reorder | Taps "Reorder" on Home tab → new delivery order created. Should be rare with proper auto-reorder timing. |
| Patient stops taking medication without cancelling | Medication reminders continue. At follow-up check-in, non-compliance will be detected via answers. |
| Patient moves to a new city | Updates address in Profile > Address Book. Next delivery uses new address. Lab collection uses new address if applicable. |

---

## 25. Messaging (Doctor-Patient Chat)

### 25.1 Architecture

- One conversation per vertical (condition), NOT per doctor
- If doctors rotate (e.g., original dermatologist goes on leave), new doctor sees full message history
- Patient sees one continuous thread per condition

### 25.2 Chat Interface

**Screen:** `(tabs)/messages/[conversationId].tsx`

Features:
- Text messages (max 2000 chars per message)
- Photo attachments (camera or gallery → compressed → uploaded to S3)
- Read receipts: ✓ (sent) → ✓✓ (delivered) → ✓✓ blue (read by doctor)
- Typing indicator: "Dr. Patel is typing…"
- Timestamps every 15 minutes between messages or on date change
- Canned quick-reply chips (condition-specific):
  - "When will I see results?"
  - "Side effects?"
  - "Missed a dose"
  - "Need a refill"
  - "Schedule check-in"
  - "Upload new photos"

### 25.3 Quick Reply Behavior

- Tapping a chip populates the message input field with pre-written text
- Patient can edit the text before sending
- Different conditions have different quick replies (Hair Loss vs ED, etc.)

### 25.4 Photo Attachment Flow in Chat

1. Tap 📎 or 📷 icon
2. "Take Photo" or "Choose from Gallery"
3. Image compressed client-side (max 1MB, max 1920px)
4. Upload to S3 via presigned PUT URL
5. Message sent with S3 key reference
6. Doctor sees image inline in their dashboard

### 25.5 Edge Cases — Messaging

| Scenario | What Happens |
|----------|-------------|
| Doctor hasn't responded in 24+ hours | No UI change for patient (SLA is internal). Admin receives escalation. |
| Message fails to send (network) | Message shows red ⚠️ with "Tap to retry." Message queued and sent when connectivity restores. |
| Conversation with no messages yet | Placeholder: "Your doctor will respond here once they've reviewed your case." |
| Patient sends message while app is in background | Message queued → sent when app comes to foreground or via background fetch |
| Doctor sends message while patient's app is closed | FCM push notification + WhatsApp message (per notification preferences). Deep link opens correct conversation. |

---

## 26. Follow-Up Check-Ins

### 26.1 Check-In Schedule

| Time Point | Type | Questionnaire Length | Photos |
|------------|------|---------------------|--------|
| 4 weeks | Side effects check | ~10 questions (abbreviated) | None |
| 3 months | Progress review | ~10 questions | 4 new progress photos (Hair Loss), 2 (Weight), none (ED/PE/PCOS) |
| 6 months | Full assessment | ~15 questions | 4 new photos (Hair Loss), 2 (Weight), none (ED/PE/PCOS) |
| 12 months | Annual review | Full questionnaire | Comprehensive photo set per vertical (same as initial requirement) |

### 26.2 Check-In Flow

1. BullMQ scheduled job fires when check-in is due
2. Patient notification: "It's time for your [4-week/3-month] check-in"
3. Home tab: "Check-in Due" card with `[Start Check-in]` CTA
4. Patient taps → abbreviated questionnaire (same engine as initial, but shorter)
5. Progress photos requested if applicable (compared with baseline by doctor)
6. Submit → doctor reviews → may adjust prescription

### 26.3 Edge Cases — Follow-Ups

| Scenario | What Happens |
|----------|-------------|
| Patient ignores follow-up notification | Reminder sent at +3 days and +7 days. After 14 days: auto-reorder may be paused (if doctor flagged "must check-in before next reorder") |
| Patient's treatment plan changes at follow-up | New prescription created, old one superseded, new delivery order for updated medications |
| Patient has multiple verticals with different check-in schedules | Each vertical tracked independently. May receive two "Check-in Due" notifications in the same week. |
| Follow-up reveals serious deterioration | Doctor escalates — may request emergency in-person visit, refer to specialist, or adjust treatment urgently |

---

## 27. Subscription Management (Change/Pause/Cancel)

### 27.1 Where to Manage

**Screen:** `profile/subscriptions.tsx`

Each active subscription shows a card with: condition name, plan type, monthly price, next billing date, status, and action buttons.

### 27.2 Change Plan

- Patient taps `[Change Plan]`
- Shows current plan highlighted + other options (Monthly ↔ Quarterly ↔ 6-Month)
- **UPI limitation:** Cannot "update" UPI subscriptions via Razorpay API → must cancel + recreate
- **Card subscriptions:** Can update directly via Razorpay API
- Flow: Cancel current Razorpay subscription → create new one → prorate credit applied to wallet
- Patient sees seamless transition

### 27.3 Pause Subscription

1. Tap `[Pause]`
2. Confirmation: "Pause your [condition] treatment? You won't receive medication or check-ins. You can resume anytime."
3. Max pause: 3 months
4. During pause: no auto-reorder, no billing, status shows "Paused"
5. Resume: tap `[Resume Treatment]` → billing resumes from next cycle

### 27.4 Cancel Subscription

Multi-step process:

1. **Step 1 — Feedback:** "We're sorry to see you go. Can you tell us why?" (optional: too expensive / side effects / not seeing results / switching provider / other)
2. **Step 2 — Confirmation:** "Are you sure? You'll lose access to your care team and ongoing treatment."
3. **Step 3 — Final:** `[Cancel subscription]` (red button)

After cancellation:
- No refund for current billing period
- Access continues until end of paid period
- Shows as "Cancelled — access until [date]"
- Treatment card removed from Home tab
- Visible in Profile > My Subscriptions as "Cancelled"

> **⚠️ Pre-existing source discrepancy — Mid-cycle cancellation refund:** APP-PATIENT.md Section 15.2 states "After cancellation: no refund for current billing period" (line 765), but the same file's Refund Scenarios table (Section 16.2) lists "Subscription cancelled mid-cycle → Prorated remaining days → Wallet." During implementation, decide which policy applies for voluntary patient-initiated cancellation. The "no refund" rule likely applies to voluntary cancellation, while prorated refunds may be reserved for system/admin-initiated cancellations and account deletion (which APP-PATIENT.md line 1716 confirms includes prorated refunds).

### 27.5 Edge Cases — Subscription Management

| Scenario | What Happens |
|----------|-------------|
| Patient pauses for more than 3 months | At 3-month mark, subscription auto-cancelled. Notification: "Your paused [condition] treatment has been cancelled. [Resubscribe]" |
| Patient cancels mid-cycle on a quarterly plan | Access continues until end of quarterly period. No partial refund for unused days within the paid period. |
| Patient cancels then wants to restart immediately | Must start new assessment from Explore tab → questionnaire → payment. Previous medical records retained. |
| Patient has a delivery in transit when they cancel | Delivery completes normally. No future reorders. |
| Patient pauses and there's a follow-up check-in due | Check-in deferred until resume. |

---

## 28. Auto-Reorder & Renewal

### 28.1 Monthly/Quarterly (Razorpay Subscription)

1. 3 days before renewal → notification: "Your [condition] treatment kit will be reordered on [date]"
2. On renewal date: Razorpay automatically charges saved payment method
3. If success → new delivery order created → enters pharmacy pipeline
4. Patient sees new delivery in Activity tab

### 28.2 6-Month Plan Renewal (One-Time Payment — NOT Razorpay Subscription)

Since 6-month plans are one-time payments, renewal is managed via scheduled notifications:

| Day | What Happens |
|-----|-------------|
| Day 150 (Month 5) | Notification: "Your 6-month plan ends in 30 days. Renew now for uninterrupted treatment." |
| Day 165 (15 days before) | Second reminder: "Your treatment plan expires on [date]. [Renew Now]" — deep link to plan selection |
| Day 175 (5 days before) | Final reminder (push + WhatsApp): "Last chance — your treatment expires in 5 days." |
| Day 180 (expiry) | If not renewed → status: `EXPIRED`. No auto-reorder. Home shows "Plan Expired — [Renew]" |

Renewal: Patient taps Renew → plan selection → payment → new subscription created → reorder triggered.

### 28.3 Auto-Reorder Paused Conditions

Auto-reorder is paused if:
- Subscription is paused
- Doctor has paused treatment (e.g., awaiting lab results)
- Follow-up check-in is overdue and doctor flagged "must check-in before next reorder"

---

## 29. Payment Failure & Retry

### 29.1 Retry Sequence (Razorpay Automatic)

| Day | Action | Patient Notification |
|-----|--------|---------------------|
| T+0 | First charge attempt fails | Push + WhatsApp: "Payment failed. Please update your payment method." |
| T+1 | Retry #1 (Razorpay automatic) | WhatsApp: "Still unable to process payment." |
| T+2 | Retry #2 | WhatsApp: "Your treatment may be interrupted." |
| T+3 | Retry #3 (final) | Push + WhatsApp + SMS: "Last attempt failed. Treatment paused. [Pay Now]" |
| T+3+ | Subscription → `HALTED` | Treatment paused, no reorders. Manual payment link provided. |

### 29.2 HALTED State Resolution

- Patient taps "Pay Now" → opens Razorpay checkout for overdue amount
- On success → subscription reactivated, reorder created
- Patient can also update payment method first (Profile > Payment Methods) then retry
- If no payment for 30 days → subscription auto-cancelled

### 29.3 Edge Cases — Payment Failure

| Scenario | What Happens |
|----------|-------------|
| Patient's card expired | Profile > Payment Methods shows ⚠️ warning 30 days before expiry. After failure: "Update your payment method to continue treatment." |
| Patient's bank declines for suspicious activity | Patient contacts their bank directly. Then retries via "Pay Now." |
| UPI mandate revoked by patient | Razorpay charge fails. Same retry sequence. Patient must set up new UPI mandate. |
| Patient intentionally avoids payment | After 30 days of HALTED → auto-cancelled. Patient can resubscribe with new assessment if desired. |

---

## 30. Wallet & Refunds

### 30.1 Wallet Overview

- Balance shown in Profile > Wallet
- Also shown at checkout (auto-applied)
- **Credits come from:** refunds, promotional credits, referral bonuses
- **Cannot be:** topped up directly, withdrawn as cash (credit-only system)
- **NOT applied to:** Razorpay subscription auto-renewals. Only used during manual checkout.

### 30.2 Refund Scenarios

| Scenario | Refund Amount | Refund To |
|----------|-------------|-----------|
| Cancel before doctor review | 100% | Wallet |
| Cancel after doctor review, before pharmacy prepares | 75% | Wallet |
| Cancel after medication dispatched | 0% | — |
| Delivery failed (platform fault) | 100% | Wallet or original payment method |
| Wrong medication delivered | 100% + replacement order | Wallet + new order |
| Subscription cancelled mid-cycle | Prorated remaining days | Wallet |
| Lab order cancelled before nurse dispatch | 100% | Wallet |
| Lab order cancelled after nurse dispatched | 50% | Wallet |

### 30.3 Refund Experience

1. Refund initiated
2. Wallet shows: "+₹X — Refund for [reason]" (pending)
3. Wallet credits: instant. Original payment method refunds: 5–7 business days.
4. Push notification: "₹X has been credited to your Onlyou wallet."

---

## 31. Notification System (Patient Experience)

### 31.1 Channels

| Channel | Provider | Primary Use |
|---------|----------|-------------|
| Push (FCM) | Firebase Cloud Messaging | Primary in-app alerts |
| WhatsApp | Gupshup API | Primary for Indian users (500M+ users) |
| SMS | Gupshup API (primary) + MSG91 (fallback) | Fallback for OTP, critical alerts |
| Email | Resend (MVP) → AWS SES (scale) | Receipts, reports, password reset |

> **⚠️ Pre-existing source discrepancy — Email provider:** APP-PATIENT.md Section 17.1 states "SendGrid" as the email provider. However, ARCHITECTURE.md Section 3, BACKEND-PART1.md, and BACKEND-PART2A.md all specify "Resend (MVP) → SES (scale)" and explicitly rejected SendGrid as "unnecessary cost." This document follows the architecture docs (Resend for MVP).

### 31.2 All Patient Notification Events

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
| Subscription renewal (3 days before) | ✅ | ✅ | — | — |
| Follow-up check-in due | ✅ | ✅ | — | — |
| Daily medication reminder | ✅ | — | — | — |
| New message from doctor | ✅ | ✅ | — | — |

### 31.3 Notification Preferences

Patient can configure (Profile > Notification Preferences):

**Channel toggles:** Push, WhatsApp, SMS, Email — each can be disabled (WhatsApp shows warning if disabled: "You may miss important updates")

**Category toggles:**
- Treatment Updates — always on (cannot disable)
- Delivery Updates — always on
- Lab Updates — always on
- Medication Reminders — can disable
- Promotional — can disable
- Check-in Reminders — can disable

**Quiet Hours:** 10 PM – 7 AM default. Push notifications silenced (but delivered without sound). Critical alerts (OTPs, delivery arriving in 15 min) bypass quiet hours.

### 31.4 Android Push Notification Reliability

**Problem:** 20–40% FCM delivery failure on Indian Android devices (Xiaomi, Samsung, Oppo, Realme, Vivo) due to aggressive OEM battery optimization.

**Mitigations (Day 1):**
1. FCM high-priority for all medical notifications
2. In-app onboarding flow guides user through disabling battery optimization and enabling Autostart (device-specific instructions detected via `expo-device`)
3. WhatsApp as primary channel (more reliable than FCM on Chinese OEM phones)
4. SMS fallback for critical events (OTP, nurse arriving, delivery in 15 min)

---

## 32. Discreet Mode

### 32.1 What Changes

| Feature | Normal Mode | Discreet Mode |
|---------|------------|---------------|
| Push notifications | "Your Hair Loss prescription is ready" | "Your health update is ready" |
| WhatsApp messages | Full details | Generic messages |
| Email subject lines | Specific | "Onlyou — Account Update" |
| Delivery packaging | Plain Onlyou box | Already plain (no change) |

**Rule:** In discreet mode, NO condition names, medication names, or doctor names appear in any notification. Only generic references.

### 32.2 Enabling

Profile > Notification Preferences > Discreet Mode toggle → explanation modal → toggle ON → immediate effect on all future notifications. Existing notifications NOT retroactively changed.

### 32.3 Deep Links Still Work

Discreet notifications still contain deep links. Tapping a generic notification like "Your health update is ready" still opens the correct screen in the app.

---

## 33. PCOS Period Tracker

### 33.1 Visibility

Only shown to patients with an active PCOS subscription. Appears in Profile > Period Tracker.

### 33.2 Calendar UI

- Monthly calendar view with tappable days
- Color coding: 🔴 period days, 🟡 predicted period, ⚪ non-period, 🟢 today
- Logging: tap day → "Period Started" / "Period Ended" / "Spotting" / "No Period"
- Flow intensity: Light / Medium / Heavy
- Optional symptoms: Cramps, Bloating, Headache, Mood changes, Acne flare-up

### 33.3 Cycle Insights

- Average cycle length (calculated after 3+ logged cycles)
- Last period date + days ago
- Next predicted date
- Cycle regularity: "Regular" (21–35 day cycles, <7 day variation) / "Irregular"

### 33.4 Data Sharing

- Period data visible ONLY to the assigned PCOS doctor
- NOT visible to admin, nurses, lab staff, pharmacy
- Doctor sees: calendar view, cycle length trend chart, average cycle length, regularity score, symptom patterns

---

## 34. Multi-Vertical Patient (Multiple Conditions)

### 34.1 How It Works

A patient can subscribe to multiple different conditions simultaneously (e.g., Hair Loss + ED). Each vertical operates independently:

| Aspect | Behavior |
|--------|----------|
| Home tab | Multiple treatment cards (scrollable) |
| Activity tab | Items from all verticals |
| Messages tab | Separate conversation per vertical |
| Doctors | Different specialists may be assigned per vertical |
| Billing | Each vertical has independent billing cycle |
| Medication reminders | Combined into single daily list |
| Prescriptions | Separate per vertical |

### 34.2 ED + PE Comorbidity (Special Case)

ED and PE co-occur in ~30–40% of cases. When detected during questionnaire (either vertical's questionnaire flags symptoms of the other):

- AI pre-assessment flags the comorbidity for the doctor
- Doctor can prescribe combined treatment (e.g., Tadalafil 5mg daily + Dapoxetine 30mg on-demand) under the SINGLE subscription the patient purchased
- Patient does NOT need a separate subscription for the other condition
- This applies regardless of which vertical the patient subscribed to (ED subscription can include PE treatment and vice versa)

### 34.3 What's NOT Allowed

- Cannot subscribe to the same vertical twice
- Cannot have two active Hair Loss subscriptions, for example

---

## 35. Profile & Account Management

### 35.1 Profile Menu Items

| Item | Description |
|------|-------------|
| Personal Info | Name, DOB, gender, phone (re-verify to change), email, Government ID upload |
| My Subscriptions | All active/paused/cancelled subscriptions with management actions |
| My Prescriptions | List of all prescriptions (tap to view PDF) |
| My Orders | All medication delivery orders with tracking |
| My Lab Results | All lab results (tap to view PDF + doctor notes) |
| Payment Methods | Saved cards/UPI IDs, add/remove, set default |
| Wallet | Balance + transaction history |
| Address Book | Multiple addresses, set default delivery + collection addresses separately |
| Notification Preferences | Channel toggles, category toggles, quiet hours, discreet mode |
| Period Tracker | PCOS patients only |
| Help & Support | FAQ, contact support, report issue |
| Legal | Terms of Service, Privacy Policy, Refund Policy, Manage Consent (DPDPA) |
| Log Out | Confirmation → clear tokens → welcome screen |

### 35.2 Government ID Upload

1. Tap "Upload ID" → choose: Aadhaar / PAN / Driving License
2. Camera with document overlay guide (rectangle frame)
3. Photo captured → compressed → uploaded to S3
4. Status: "Under Review" → admin manually reviews → "Verified ✅"
5. No selfie/face match in MVP (Key Decision #7)

### 35.3 DPDPA Compliance Features

- **Consent management:** Separate consent checkboxes for teleconsultation, prescription sharing with pharmacy, lab order processing, health data analytics. No pre-ticked boxes.
- **Consent withdrawal:** Profile > Legal > "Manage Consent" with clear consequences (e.g., "If you withdraw prescription sharing consent, we cannot fulfill medication orders")
- **Data portability:** Profile > Legal > "Download My Data" → exports JSON with all patient data
- **Account deletion:** See Section 38

---

## 36. Offline & Network Edge Cases

### 36.1 Network Detection

- Persistent offline banner: "⚠️ You're offline. Some features may be unavailable."
- When connectivity restored: brief green "Back online ✅" flash

### 36.2 Offline-Capable Features

| Feature | Offline? |
|---------|---------|
| View cached prescriptions | ✅ (if previously viewed) |
| View cached lab results | ✅ (if previously viewed) |
| Medication reminders | ✅ (local notifications) |
| Read cached messages | ✅ (last 50 per conversation) |
| Questionnaire in-progress | ✅ (answers saved locally, synced when online) |
| Send messages | ❌ Queued, sent when online |
| Photo upload | ❌ Queued, uploaded when online |
| Payment | ❌ Requires network |
| Real-time status updates | ❌ SSE reconnects automatically |

### 36.3 SSE Reconnection

- On network restore → SSE auto-reconnects
- Fetches missed events since last event ID (backend stores last 500 events per user per vertical/channel — e.g., 500 for Hair Loss lab updates, 500 for ED delivery updates, etc.)
- If gap too large (>500 events in any channel) → full refresh of that channel's data

---

## 37. App Version Check & Forced Updates

### 37.1 On Every App Launch

1. App sends version: `trpc.app.checkVersion.query({ platform, version })`
2. Backend compares against minimum required version
3. Response: `{ updateRequired, updateRecommended, storeUrl, message? }`

### 37.2 Forced Update

- Full-screen blocking modal — cannot be dismissed
- "Update Required — A new version of Onlyou is available with important improvements."
- Single CTA: `[Update Now]` → opens App Store / Play Store
- No "Skip" or "Later" option
- Use case: breaking API changes, critical security patches, regulatory compliance

### 37.3 Recommended Update

- Non-blocking banner at top of Home screen
- "A new version is available. [Update]" — dismissible
- After 3 dismissals → stop showing until next version bump

---

## 38. Account Deletion

### 38.1 Flow

1. Patient requests deletion via Help & Support
2. 30-day grace period begins (patient can reactivate by logging in)
3. During grace period: account is deactivated but data preserved
4. After 30 days if not reactivated:
   - All PII anonymized
   - Photos deleted from S3
   - De-identified clinical records retained for 3 years (Telemedicine Practice Guidelines 2020 legal requirement)
5. Active subscriptions auto-cancelled with prorated refund to wallet → wallet balance refunded to original payment method

---

## 39. Referral Flow (Doctor-Initiated)

### 39.1 Patient Experience

1. Doctor determines patient needs in-person care
2. Patient notified: "Based on your case, your doctor recommends seeing a specialist in person."
3. Patient sees:
   - Referral reason (doctor's notes)
   - Recommended partner clinic near patient's location
   - Specialist type (e.g., dermatologist, urologist)
   - What to mention at the clinic visit
4. Consultation status → `REFERRED`
5. Refund: partial or full depending on stage (see Section 30)

---

## 40. Refund Flow (Doctor-Initiated)

### 40.1 Patient Experience

1. Doctor determines platform cannot treat this patient (contraindications, severity beyond telehealth scope, etc.)
2. Patient notified: "We're unable to provide treatment for your case. A full refund has been issued."
3. Consultation status → `CANCELLED`
4. Refund processed: 100% to wallet (instant) or original payment method (5–7 days)
5. Patient can start a different vertical's assessment if desired

---

## 41. Complete Status Mapping Reference

### 41.1 Consultation Status — Internal to Patient-Facing

| Internal Status | Patient Display |
|----------------|----------------|
| `SUBMITTED` | "Under Review — A doctor will review your case within 24 hours" |
| `AI_PROCESSING` | "Under Review" (same — patient doesn't see AI step) |
| `AI_COMPLETE` | "Under Review" (same) |
| `ASSIGNED` | "Doctor Assigned — Dr. [Name] is reviewing your case" |
| `REVIEWING` | "Doctor is reviewing your case" |
| `INFO_REQUESTED` | "Action Needed — Your doctor needs more information" |
| `VIDEO_SCHEDULED` | Auto-skipped in MVP (schema placeholder, immediately transitions to next status) |
| `PRESCRIPTION_CREATED` | "Treatment Plan Ready — Review your prescription" |
| `TREATMENT_ACTIVE` | "Treatment Active — Day [X]" |
| `FOLLOW_UP_DUE` | "Check-in Due — Time for your [period] review" |
| `COMPLETED` | "Treatment Completed" |
| `CANCELLED` | "Cancelled" |
| `REFERRED` | "Referred to in-person specialist" |

> **⚠️ Pre-existing source discrepancy — CLOSED vs COMPLETED:** PORTAL-DOCTOR.md's flow diagram lists `CLOSED` as a terminal status ("Doctor closes case — no treatment needed"), but the same document's transition table maps the "Close Case" action to `COMPLETED`. During implementation, confirm whether `CLOSED` is a distinct status or an alias for `COMPLETED` in the consultation status enum.

### 41.2 Delivery Status — Canonical to Patient-Facing

| Canonical `OrderStatus` | Patient Display |
|------------------------|----------------|
| `CREATED` | "Prescription ready" |
| `SENT_TO_PHARMACY` | "Sent to pharmacy" |
| `PREPARING` | "Pharmacy is preparing" |
| `READY` | "Ready for pickup by delivery" |
| `OUT_FOR_DELIVERY` | "On its way!" + delivery person info |
| `DELIVERED` | "Delivered ✅" |
| `DELIVERY_FAILED` | "Delivery attempt failed" |
| `PHARMACY_ISSUE` | "Medication temporarily unavailable" |
| `CANCELLED` | "Order cancelled" |

### 41.3 Lab Order Status — Full Flow

| Internal Status (Backend Enum) | Patient Display |
|-------------------------------|----------------|
| `ORDERED` | "Tests ordered by your doctor" |
| `SLOT_BOOKED` | "Collection booked: [date/time]" |
| `NURSE_ASSIGNED` | "Nurse [Name] assigned" |
| `NURSE_EN_ROUTE` | "Nurse is on the way" |
| `NURSE_ARRIVED` | "Nurse has arrived" |
| `SAMPLE_COLLECTED` | "Sample collected, heading to lab" |
| `AT_LAB` | "Sample delivered to lab" |
| `SAMPLE_RECEIVED` | "Sample received and verified at lab" |
| `PROCESSING` | "Lab is processing your tests" |
| `RESULTS_READY` | "Results ready" (lab-processed) |
| `RESULTS_UPLOADED` | "Your uploaded results are under review" (self-uploaded path) |
| `SAMPLE_ISSUE` | "Issue with sample — recollection needed" |
| `RECOLLECTION_NEEDED` | "New sample needed — please book a new collection" |
| `COLLECTION_FAILED` | "Collection could not be completed" |
| `DOCTOR_REVIEWED` | "Doctor has reviewed — see notes" |
| `CLOSED` | "Complete" |
| `CANCELLED` | "Lab order cancelled" |

### 41.4 Subscription Status

| Status | Billing | Treatment | Patient Can Do |
|--------|---------|-----------|---------------|
| `ACTIVE` | Auto-billing | Active | Pause, Cancel, Change plan |
| `PAUSED` | None | Paused (no reorders) | Resume, Cancel |
| `HALTED` | Payment failed (T+3) | Paused | Retry payment, Update method, Cancel |
| `CANCELLED` | None | Access until end of paid period | Resubscribe |
| `EXPIRED` | Period ended | Inactive | Resubscribe |

---

## 42. Master Edge Case Registry

This section collects edge cases that span multiple workflows or don't fit neatly into a single section.

### 42.1 Authentication & Session Edge Cases

| Scenario | Resolution |
|----------|-----------|
| Token expires during active app use (15-min access token) | tRPC interceptor catches 401 → sends refresh token → receives new pair → retries original request. Patient doesn't notice. |
| Refresh token also expired (7 days) | Patient redirected to login screen. Must re-authenticate. All local data preserved. |
| Multiple concurrent API calls during token refresh | All pending requests queued → single refresh call → all replayed with new token |
| Patient logged in on multiple devices simultaneously | Supported. Each device has independent token pair. Refresh token rotation means old refresh tokens on other devices expire after 7 days. |
| Patient changes password on web (password reset link) | All existing refresh tokens revoked → all devices logged out → must re-login |

### 42.2 Data Privacy Edge Cases

| Scenario | Resolution |
|----------|-----------|
| Patient takes screenshot of prescription screen | Android: `FLAG_SECURE` prevents screenshot. iOS: screen appears blank in app switcher. Toast warning on screenshot detection. |
| Patient shares prescription PDF with unauthorized person | Out of platform scope — patient has right to share their own medical records |
| Lab receives sample but patient name is anonymized | By design. Lab sees anonymous ID only. Cannot cross-reference with patient identity. |
| Pharmacy fills prescription but doesn't know patient's condition | By design. Pharmacy sees medications + dosages but NOT diagnosis. |
| Delivery person sees medication names | By design — delivery person does NOT see medication names. Package is plain, delivery slip shows only package ID + addresses. |

### 42.3 Payment & Financial Edge Cases

| Scenario | Resolution |
|----------|-----------|
| Razorpay is down during payment | "Payment service is temporarily unavailable. Your assessment is saved. Please try again shortly." |
| Double charge due to webhook delay | Idempotent processing: Razorpay event IDs tracked. Daily reconciliation cron job catches any discrepancies. |
| Patient disputes charge with bank | Razorpay handles dispute process. Admin notified. Subscription may be paused during dispute. |
| Wallet balance + Razorpay payment for a single checkout | Wallet amount deducted first → remaining charged to Razorpay. If Razorpay fails: wallet deduction reversed. |
| Indian currency formatting | Always ₹ with Indian number system (e.g., ₹1,00,000 not ₹100,000) |

### 42.4 Multi-Vertical Complications

| Scenario | Resolution |
|----------|-----------|
| Same medication prescribed by two different specialists | Prescription builder should flag drug interactions. Doctor reviews comorbidity data. Admin may escalate for clinical review. |
| Patient has Hair Loss + ED with conflicting medications | Doctor sees comorbidity flag in case review. Both doctors' prescriptions are visible to each other. |
| Patient cancels one vertical but keeps another | Independent — cancelling Hair Loss doesn't affect ED subscription |
| Patient has lab orders from two verticals | Each tracked independently. If same test panel ordered twice, admin may consolidate into single collection. |

### 42.5 Device & Platform Edge Cases

| Scenario | Resolution |
|----------|-----------|
| Patient switches from Android to iOS | Account is server-side. Login on new device → all data available. FCM token updates. Local cache rebuilt. |
| Root/jailbreak detected | Warning shown but NOT blocked (many Indian users have rooted phones). Note in user profile. |
| Patient uses very old Android version | Minimum Android target set in Expo config. Below minimum → Play Store won't show the app. |
| Patient's phone storage is full | Photo upload may fail → "Not enough storage. Please free up space." Questionnaire progress saved remotely (backend sync) so not lost. |
| Patient clears app cache | Local questionnaire progress lost. Backend-synced progress (every 3 questions) preserved. Messages cache lost (re-fetched on next open). |
| App killed by OS due to memory pressure | Same as normal app close — state persisted via Zustand. On relaunch: restore from persisted state + backend sync. |

### 42.6 Time Zone & Date Edge Cases

| Scenario | Resolution |
|----------|-----------|
| Patient travelling outside India (IST) | App uses device timezone for display. Backend stores all timestamps in UTC. Subscription billing dates are calendar-date based (IST). Medication reminders adjust to local time. |
| Patient changes phone timezone | Medication reminders re-scheduled to new timezone. Delivery ETAs shown in new timezone. |
| Daylight saving time (not applicable for IST) | India doesn't observe DST. No impact for MVP (India-only). |

### 42.7 Concurrent Action Edge Cases

| Scenario | Resolution |
|----------|-----------|
| Patient taps "Pay" twice rapidly | Backend idempotent: same Razorpay order ID prevents double creation. Checkout opens only once (second tap ignored while first is loading). |
| Patient and doctor both typing in chat simultaneously | Both messages appear in order of server receipt. Typing indicators work independently. |
| Patient submits questionnaire while AI is already processing a previous submission | Backend rejects: "You already have an active assessment for this condition." |
| Patient tries to book lab collection while one is already booked | Backend rejects: "You already have a booking on [date]. [Reschedule]" |

### 42.8 Extreme / Rare Edge Cases

| Scenario | Resolution |
|----------|-----------|
| Patient's phone number changes (got a new SIM) | Profile > Personal Info > Phone Number > re-verification required with new number |
| Patient is transgender (selected gender affects questionnaire branching) | Gender options include "Other" and "Prefer not to say." Questionnaire skip logic handles gracefully — doctor reviews and adjusts treatment manually. |
| Patient provides intentionally false questionnaire answers | Doctor reviews AI summary + raw data. Significant discrepancies flagged by AI. Doctor can request INFO if suspicious. Ultimately, clinical responsibility is on the prescribing doctor. |
| Patient dies | Family contacts support. Admin handles account closure per legal requirements. Medical records retained per Telemedicine Practice Guidelines 2020 (3 years). |
| Patient is a minor using a parent's account | DOB check during profile setup (must be 18+). If a minor circumvents with false DOB: doctor may catch during review. Platform ToS requires accurate information. |
| Power outage during blood sample processing at lab | Lab manages their own contingencies. Platform tracks SLA — if results delayed beyond 48 hours, admin escalates. |
| Partner pharmacy loses its drug license | Admin removes pharmacy from active partner list. Pending orders reassigned to another partner. Patient may see brief delay. |

---

*This document provides the complete, detailed patient workflow for every interaction in the Onlyou platform. Each section traces the exact screen, tap, API call, status change, notification, and edge case that a patient encounters. For system-level architecture decisions, see ARCHITECTURE.md. For individual portal specifications, see the respective PORTAL-*.md documents. For condition-specific clinical details, see the VERTICAL-*.md documents. For backend implementation details, see BACKEND-PART1/2A/2B/3A/3B.md.*
