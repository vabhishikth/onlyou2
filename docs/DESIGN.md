# Onlyou Design System

  

> **"Clinical Luxe"** — A premium healthcare aesthetic that feels sophisticated and trustworthy, not sterile. Inspired by Hims, Ro, Manual UK, and Curology.

  

This document is the single source of truth for every design decision in the Onlyou project. It covers the patient mobile app (React Native / Expo), all web dashboards and portals (Next.js), and the shared design tokens that keep both platforms visually aligned.

  

---

  

## Table of Contents

  

1. [Design Philosophy](#1-design-philosophy)

2. [Color System](#2-color-system)

3. [Typography](#3-typography)

4. [Spacing & Layout](#4-spacing--layout)

5. [Border Radius](#5-border-radius)

6. [Shadows & Elevation](#6-shadows--elevation)

7. [Animations & Transitions](#7-animations--transitions)

8. [Iconography](#8-iconography)

9. [Component Library — Web](#9-component-library--web)

10. [Component Library — Mobile](#10-component-library--mobile)

11. [Status Badges & Semantic Mapping](#11-status-badges--semantic-mapping)

12. [Treatment Vertical Theming](#12-treatment-vertical-theming)

13. [Dashboard & Portal Layouts](#13-dashboard--portal-layouts)

14. [Mobile App Structure](#14-mobile-app-structure)

15. [Responsive Breakpoints](#15-responsive-breakpoints)

16. [Utility Classes & Helpers](#16-utility-classes--helpers)

17. [Z-Index Scale](#17-z-index-scale)

18. [Chart & Data Visualization](#18-chart--data-visualization)

19. [Libraries & Dependencies](#19-libraries--dependencies)

20. [File Reference](#20-file-reference)

  

---

  

## 1. Design Philosophy

  

The Onlyou design system follows five core principles:

  

**Premium, not clinical.** Warm off-whites instead of hospital blue-whites. Serif headings for brand personality. Soft shadows with low opacity for depth without heaviness.

  

**Restrained color.** The palette is predominantly near-black (#141414) on warm off-white (#FAFAF8). Lavender accent (#9B8EC4) appears sparingly — links, focus rings, interactive highlights. Gold (#C4956B) is reserved for premium badges only.

  

**Clear hierarchy.** Four levels of text color (primary, secondary, tertiary, muted) paired with a dual-font system (serif headings, sans-serif body) create unmistakable visual hierarchy without relying on size alone.

  

**Treatment-specific identity.** Each health vertical (Hair Loss, Sexual Health, PCOS, Weight Management) has a subtle background tint and muted icon color. These tints are extremely subtle — 5-8% opacity feel — so the brand stays cohesive while each vertical has its own visual lane.

  

**Cross-platform parity.** The mobile app (React Native) and web dashboards (Next.js) share identical color values, font choices, and spacing scales. Platform-specific implementations (StyleSheet.create vs Tailwind classes) consume the same semantic tokens.

  

---

  

## 1.1 Logo

  

The Onlyou logo is a **text-only wordmark** — no image file, no SVG. It is the word **"onlyou"** rendered entirely in lowercase.

  

**Specification:**

  

| Property | Value |

|----------|-------|

| Text | `onlyou` (all lowercase, one word) |

| Font | Playfair Display Black (weight 900) |

| Size | 36px |

| Color | `#141414` (textPrimary) |

| Line Height | 1.2x (tight) |

| Letter Spacing | -0.5px (tight) |

  

**Usage in code (mobile):**

```typescript

import { textStyles } from '@/theme/typography';

import { colors } from '@/theme/colors';

  

// textStyles.logo = { fontFamily: 'PlayfairDisplay_900Black', fontSize: 36, lineHeight: 43.2, letterSpacing: -0.5 }

<Animated.Text style={{ ...textStyles.logo, color: colors.textPrimary }}>

    onlyou

</Animated.Text>

```

  

**Where it appears:**

- Splash screen (`mobile/app/index.tsx`) — centered, fades in with opacity animation

- Welcome screen (`mobile/app/welcome.tsx`) — centered

- Phone entry / login screen (`mobile/app/(auth)/phone.tsx`) — top of screen, animates in with FadeInUp (delay 0, duration 400ms)

  

**Key rules:**

- Always lowercase. Never "OnlyYou", "ONLYOU", or "Only You".

- Always Playfair Display Black — never the SemiBold or Bold weights.

- Always `#141414` on light backgrounds, `#FFFFFF` on dark backgrounds.

- No tagline, icon, or symbol accompanies the wordmark.

  

---

  

## 2. Color System

  

### 2.1 Core Palette

  

| Token | Hex | Usage |

|-------|-----|-------|

| `primary` | `#141414` | Text, buttons, headings, borders |

| `primary-foreground` | `#FFFFFF` | Text on primary backgrounds |

| `secondary` / `offWhite` | `#F8F8F6` | Subtle backgrounds, secondary surfaces |

| `background` | `#FAFAF8` | Page background (warm off-white) |

| `surface` | `#FAFAF8` | Card backgrounds, elevated surfaces |

| `white` | `#FFFFFF` | Cards, inputs, overlays |

  

### 2.2 Primary Scale (Warm Grays)

  

| Step | Hex | Usage |

|------|-----|-------|

| 50 | `#F5F5F5` | Lightest gray background |

| 100 | `#E8E8E8` | Hover states |

| 200 | `#D1D1D1` | Disabled borders |

| 300 | `#ABABAB` | Muted text, placeholders |

| 400 | `#8A8A8A` | Tertiary text |

| 500 | `#5C5C5C` | Secondary text |

| 600 | `#3D3D3D` | Emphasized secondary |

| 700 | `#2A2A2A` | Hover on primary |

| 800 | `#1A1A1A` | Deep emphasis |

| 900 | `#141414` | Primary (default) |

  

### 2.3 Text Hierarchy

  

| Token | Hex | Usage |

|-------|-----|-------|

| `textPrimary` | `#141414` | Body text, headings, primary labels |

| `textSecondary` | `#5C5C5C` | Descriptions, secondary info |

| `textTertiary` | `#8A8A8A` | Hints, timestamps, tertiary info |

| `textMuted` | `#ABABAB` | Placeholders, disabled text |

| `textInverse` | `#FFFFFF` | Text on dark backgrounds |

  

### 2.4 Interactive / CTA Colors

  

| Token | Hex | Usage |

|-------|-----|-------|

| `ctaPrimary` | `#141414` | Primary buttons |

| `ctaPrimaryText` | `#FFFFFF` | Text on primary buttons |

| `ctaDisabled` | `#E0E0E0` | Disabled button background |

| `ctaDisabledText` | `#ABABAB` | Disabled button text |

| `ctaSecondary` | `#FFFFFF` | Secondary button background |

| `ctaSecondaryBorder` | `#DCDCDC` | Secondary button border |

  

### 2.5 Accent Colors

  

| Token | Hex | Usage |

|-------|-----|-------|

| `accent` | `#9B8EC4` | Links, focus rings, interactive highlights |

| `accentLight` | `#F0EDF7` | Focus backgrounds, selected states |

| `accentWarm` / `warm` | `#C4956B` | Premium badges, gold highlights (rare) |

  

**Accent scale (web Tailwind):**

  

| Step | Hex |

|------|-----|

| 50 | `#F0EDF7` |

| 100 | `#E4DFF0` |

| 200 | `#D0C8E4` |

| 300 | `#BDB2D8` |

| 400 | `#9B8EC4` |

| 500 | `#8577B0` |

| 600 | `#6F619C` |

| 700 | `#5A4E80` |

| 800 | `#453C63` |

| 900 | `#302A46` |

  

### 2.6 Borders & Dividers

  

| Token | Hex | Usage |

|-------|-----|-------|

| `border` | `#EBEBEB` | Default borders, card outlines |

| `borderLight` | `#F2F2F2` | Subtle dividers between sections |

| `borderFocus` | `#9B8EC4` | Input focus state border |

| `input` | `#EBEBEB` | Input field borders |

| `ring` | `#9B8EC4` | Focus ring color |

  

### 2.7 Semantic / Status Colors

  

| Token | Hex | Light Bg | Usage |

|-------|-----|----------|-------|

| `success` | `#2D9F5D` | `#F0F9F3` | Completed, approved, healthy |

| `warning` | `#D4880F` | `#FFF8ED` | Pending, needs attention |

| `error` | `#CC3333` | `#FDF2F2` | Failed, rejected, urgent |

| `info` | `#0284C7` | `#E0F2FE` | Informational, neutral highlight |

  

### 2.8 Chart Colors

  

| Slot | Hex | Semantic |

|------|-----|----------|

| chart-1 | `#9B8EC4` | Lavender (accent) |

| chart-2 | `#C4956B` | Gold (warm) |

| chart-3 | `#2D9F5D` | Green (success) |

| chart-4 | `#7E86AD` | Steel blue (sexual health) |

| chart-5 | `#AD7E8E` | Dusty rose (PCOS) |

  

### 2.9 CSS Custom Properties (Web)

  

Defined in `globals.css` using HSL format for shadcn compatibility:

  

```css

:root {

  --background: 40 10% 97%;       /* #FAFAF8 */

  --foreground: 0 0% 8%;          /* #141414 */

  --primary: 0 0% 8%;             /* #141414 */

  --primary-foreground: 0 0% 100%;

  --secondary: 40 7% 97%;         /* #F8F8F6 */

  --accent: 256 29% 66%;          /* #9B8EC4 */

  --muted: 40 7% 96%;             /* #F5F5F3 */

  --muted-foreground: 0 0% 36%;   /* #5C5C5C */

  --destructive: 0 63% 50%;       /* #CC3333 */

  --border: 0 0% 92%;             /* #EBEBEB */

  --input: 0 0% 92%;

  --ring: 256 29% 66%;            /* #9B8EC4 */

  --radius: 0.75rem;

}

```

  

---

  

## 3. Typography

  

### 3.1 Font Families

  

| Role | Font | Weights | Usage |

|------|------|---------|-------|

| **Serif** | Playfair Display | Black (900), Bold (700), SemiBold (600), Regular (400) | Headings, brand logo, premium feel |

| **Sans** | Plus Jakarta Sans | Bold (700), SemiBold (600), Medium (500), Regular (400), Italic | Body text, UI elements, labels, buttons |

  

**Web CSS variables:**

```css

font-family: var(--font-plus-jakarta), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

font-family: var(--font-playfair), Georgia, Cambria, 'Times New Roman', serif;

```

  

**Mobile font identifiers:**

```

PlayfairDisplay_900Black, PlayfairDisplay_700Bold, PlayfairDisplay_600SemiBold, PlayfairDisplay_400Regular

PlusJakartaSans_700Bold, PlusJakartaSans_600SemiBold, PlusJakartaSans_500Medium, PlusJakartaSans_400Regular

```

  

### 3.2 Font Size Scale

  

| Token | Size | Line Height | Platform |

|-------|------|-------------|----------|

| `logo` | 36px | 1.2x | Mobile |

| `heroTitle` / `5xl` | 32px / 3rem | 1.2 / 1.1 | Both |

| `title` / `4xl` | 28px / 2.25rem | 1.2 | Both |

| `sectionH` / `2xl` | 22px / 1.5rem | 1.2 / 2rem | Both |

| `cardTitle` / `lg` | 18px / 1.125rem | 1.5 / 1.75rem | Both |

| `body` / `base` | 16px / 1rem | 1.5 / 1.5rem | Both |

| `label` / `sm` | 14px / 0.875rem | 1.5 / 1.25rem | Both |

| `caption` / `xs` | 12px / 0.75rem | 1.5 / 1rem | Both |

| `tiny` | 10px | 1.5 | Mobile |

  

### 3.3 Letter Spacing

  

| Token | Value | Usage |

|-------|-------|-------|

| `tight` | -0.5px | Large headings (tighten for elegance) |

| `normal` | 0 | Body text |

| `wide` | 0.5px | Labels, secondary info |

| `extraWide` | 1.5px | Micro-headers, uppercase text like "GETTING STARTED" |

  

### 3.4 Line Heights

  

| Token | Value | Usage |

|-------|-------|-------|

| `tight` | 1.2 | Headings |

| `normal` | 1.5 | Body text, labels |

| `relaxed` | 1.7 | Long-form reading |

  

### 3.5 Pre-composed Text Styles (Mobile)

  

These are ready-to-use style objects that combine font family, size, line height, and letter spacing:

  

| Style | Font | Size | Weight | Notes |

|-------|------|------|--------|-------|

| `logo` | Serif Black | 36px | 900 | Brand mark only |

| `heroTitle` | Serif SemiBold | 32px | 600 | Screen hero text |

| `title` | Serif SemiBold | 28px | 600 | Screen headings |

| `h2` | Serif Black | 28px | 900 | Alternate heading |

| `sectionHeading` | Sans SemiBold | 22px | 600 | Section titles |

| `cardTitle` | Sans SemiBold | 18px | 600 | Card headings |

| `body` | Sans Regular | 16px | 400 | Default body |

| `bodyMedium` | Sans Medium | 16px | 500 | Emphasized body |

| `bodySemiBold` | Sans SemiBold | 16px | 600 | Strong body |

| `label` | Sans Medium | 14px | 500 | Input labels, meta |

| `caption` | Sans Regular | 12px | 400 | Timestamps, fine print |

| `button` | Sans SemiBold | 16px | 600 | Primary buttons |

| `buttonSmall` | Sans SemiBold | 14px | 600 | Secondary buttons |

| `microHeader` | Sans Medium | 12px | 500 | Uppercase, 1.5px spacing |

  

### 3.6 Legacy Typography Scale (Mobile)

  

For backward compatibility, a second set of styles exists under `typography.*`:

  

| Style | Font | Size | Line Height |

|-------|------|------|-------------|

| `displayLarge` | Serif Bold | 32px | 40px |

| `displayMedium` | Serif SemiBold | 28px | 36px |

| `headingLarge` | Sans SemiBold | 24px | 32px |

| `headingMedium` | Sans SemiBold | 20px | 28px |

| `headingSmall` | Sans SemiBold | 18px | 24px |

| `bodyLarge` | Sans Regular | 16px | 24px |

| `bodyMedium` | Sans Regular | 14px | 20px |

| `bodySmall` | Sans Regular | 12px | 16px |

| `label` | Sans Medium | 12px | 16px |

| `button` | Sans SemiBold | 16px | 24px |

| `buttonSmall` | Sans SemiBold | 14px | 20px |

  

---

  

## 4. Spacing & Layout

  

### 4.1 Base Spacing Scale (8px Grid)

  

| Token | Mobile (px) | Web (rem) | Usage |

|-------|-------------|-----------|-------|

| `xs` | 4 | 0.25 | Tight internal gaps |

| `sm` | 8 | 0.5 | Small padding, icon gaps |

| `md` | 12 | 0.75 | Card internal spacing |

| `base` | 16 | 1 | Default padding, form field gaps |

| `lg` | 20 | 1.25 | Section padding |

| `xl` | 24 | 1.5 | Major section padding |

| `2xl` | 32 | 2 | Large section breaks |

| `3xl` | 40 | 2.5 | Major section gaps |

| `4xl` | 48 | 3 | Hero spacing |

| `5xl` | 64 | 4 | Large hero spacing |

| `6xl` | 80 | 5 | Maximum spacing |

  

### 4.2 Custom Web Spacing

  

| Token | Value | Usage |

|-------|-------|-------|

| `4.5` | 18px | Half-step between 4 and 5 |

| `13` | 52px | Sidebar widths |

| `15` | 60px | Large fixed-height elements |

  

### 4.3 Screen-Specific Spacing (Mobile)

  

| Token | Value | Usage |

|-------|-------|-------|

| `horizontal` | 24px | Horizontal padding on all screens |

| `sectionGap` | 40px | Vertical gap between major sections |

| `cardGap` | 12px | Gap between cards in a list |

| `inputGap` | 16px | Gap between form fields |

| `buttonMargin` | 24px | Bottom margin above the main CTA |

  

### 4.4 Component Dimensions (Mobile)

  

| Token | Value | Usage |

|-------|-------|-------|

| `buttonHeight` | 56px | Primary button height |

| `buttonHeightSmall` | 44px | Secondary / compact button height |

| `inputHeight` | 60px | Text input field height |

| `tabBarHeight` | 84px | Bottom tab bar (includes iOS safe area) |

| `backButtonSize` | 44px | Navigation back button tap target |

| `touchTarget` | 44px | Minimum accessible touch target |

| `progressDotSize` | 8px | Stepper dot diameter |

| `progressDotActiveWidth` | 24px | Active stepper dot width |

  

### 4.5 Icon Sizes (Mobile)

  

| Token | Value |

|-------|-------|

| `iconSizeSm` | 16px |

| `iconSizeMd` | 20px |

| `iconSizeLg` | 24px |

| `iconSizeXl` | 28px |

| `iconSize2xl` | 36px |

  

---

  

## 5. Border Radius

  

### 5.1 Scale

  

| Token | Mobile (px) | Web (rem) | Usage |

|-------|-------------|-----------|-------|

| `sm` | 4 | 0.375 | Small chips, tags |

| `md` | 8 | 0.5 | Inputs, small cards |

| `DEFAULT` | — | 0.75 | Default component radius |

| `lg` | 12 | 0.75 | Cards, containers |

| `xl` | 16 | 1 | Large cards, modals |

| `2xl` | 20 | 1.25 | Treatment cards, prominent elements |

| `3xl` | 24 | 1.5 | Hero cards |

| `4xl` | 28 | — | Extra-large mobile elements |

| `full` | 9999 | 9999px | Pills, circular icons, fully rounded buttons |

  

### 5.2 Common Usage

  

- **Buttons (web):** `rounded-xl` (1rem / 16px)

- **Buttons (mobile primary):** `borderRadius.full` (pill shape)

- **Inputs (web):** `rounded-xl` (1rem / 16px)

- **Cards:** `rounded-2xl` (1.25rem / 20px)

- **Badges:** `rounded-full` (pill)

- **Toasts:** `rounded-xl`

- **Status dots:** `rounded-full` (circular)

  

---

  

## 6. Shadows & Elevation

  

### 6.1 Web Shadows (Tailwind)

  

| Token | CSS Value | Usage |

|-------|-----------|-------|

| `soft` | `0 2px 12px -2px rgb(0 0 0 / 0.04)` | Cards, containers (most common) |

| `soft-md` | `0 2px 8px -2px rgb(0 0 0 / 0.06), 0 4px 16px -4px rgb(0 0 0 / 0.08)` | Elevated cards, hover states |

| `soft-lg` | `0 4px 8px -2px rgb(0 0 0 / 0.08), 0 8px 24px -4px rgb(0 0 0 / 0.1)` | Modals, popovers, toasts |

  

### 6.2 Mobile Shadows (React Native)

  

| Token | Offset | Opacity | Radius | Elevation (Android) | Usage |

|-------|--------|---------|--------|---------------------|-------|

| `none` | 0/0 | 0 | 0 | 0 | Flat elements |

| `sm` | 0/1 | 0.05 | 2 | 1 | Subtle lift, banners |

| `md` | 0/2 | 0.08 | 4 | 2 | Standard card shadow |

| `lg` | 0/4 | 0.10 | 8 | 4 | Prominent elevation |

| `soft` | 0/2 | 0.04 | 12 | 3 | Most common — cards, treatment cards |

  

### 6.3 Design Tokens File (Web) — Extended Shadows

  

| Token | CSS Value |

|-------|-----------|

| `sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |

| `DEFAULT` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` |

| `md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` |

| `lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` |

| `xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` |

| `2xl` | `0 25px 50px -12px rgb(0 0 0 / 0.25)` |

| `soft` | `0 2px 8px -2px rgb(0 0 0 / 0.08), 0 4px 16px -4px rgb(0 0 0 / 0.12)` |

| `soft-lg` | `0 4px 12px -4px rgb(0 0 0 / 0.1), 0 8px 24px -8px rgb(0 0 0 / 0.15)` |

| `inner` | `inset 0 2px 4px 0 rgb(0 0 0 / 0.05)` |

  

---

  

## 7. Animations & Transitions

  

### 7.1 Web Animations (Tailwind + Framer Motion)

  

**Tailwind keyframe animations:**

  

| Class | Behavior | Duration |

|-------|----------|----------|

| `animate-fade-in` | Opacity 0 to 1 | 200ms ease-out |

| `animate-fade-in-up` | Opacity 0 to 1, translateY 10px to 0 | 300ms ease-out |

| `animate-slide-in-right` | Opacity 0 to 1, translateX 20px to 0 | 300ms ease-out |

| `animate-slide-in-left` | Opacity 0 to 1, translateX -20px to 0 | 300ms ease-out |

| `animate-scale-in` | Opacity 0 to 1, scale 0.95 to 1 | 200ms ease-out |

| `animate-pulse-soft` | Opacity 1 to 0.7 and back | 2s infinite |

  

**Framer Motion (toast system):**

```js

initial: { opacity: 0, y: 20, scale: 0.95 }

animate: { opacity: 1, y: 0, scale: 1 }

exit:    { opacity: 0, x: 100, scale: 0.95 }

transition: { type: 'spring', duration: 0.3 }

```

  

**CSS gradient animation:**

```css

.animate-gradient {

  background-size: 200% 200%;

  animation: gradient 8s ease infinite;

}

```

  

### 7.2 Mobile Animations (React Native Reanimated)

  

**Spring configurations:**

  

| Context | Scale | Damping | Stiffness |

|---------|-------|---------|-----------|

| Button press | 0.97 | 10 | 200 |

| Card press | 0.98 | 15 | 300 |

| Release (both) | 1.0 | 10-15 | 200-300 |

  

**Haptic feedback:**

- Button presses trigger `Haptics.impactAsync(ImpactFeedbackStyle.Light)`

- Haptics are enabled by default but can be disabled per-component

  

### 7.3 Duration Scale (Design Tokens)

  

| Token | Duration | Usage |

|-------|----------|-------|

| `fast` | 150ms | Micro-interactions, color changes |

| `normal` | 200ms | Standard transitions |

| `slow` | 300ms | Slide-ins, larger movements |

| `slower` | 500ms | Complex multi-element sequences |

  

### 7.4 Easing Functions

  

| Token | Value | Usage |

|-------|-------|-------|

| `default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General purpose |

| `in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements entering |

| `out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements exiting |

| `inOut` | `cubic-bezier(0.4, 0, 0.2, 1)` | Symmetric transitions |

| `bounce` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Playful emphasis |

  

### 7.5 Interactive Feedback (Web)

  

All buttons apply `active:scale-[0.98]` with `transition-all duration-200` for press feedback. Primary buttons additionally transition shadow from `shadow-soft` to `shadow-soft-lg` on hover.

  

---

  

## 8. Iconography

  

### 8.1 Library

  

| Platform | Library | Version |

|----------|---------|---------|

| Web | `lucide-react` | 0.468.0 |

| Mobile | `lucide-react-native` | 0.563.0 |

  

Lucide icons are stroke-based, 24x24 default, and pair well with the clean aesthetic.

  

### 8.2 Common Icons Used

  

**Navigation:** Home, Users, FileText, MessageSquare, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight

  

**Medical:** Stethoscope, Pill, TestTube, FlaskConical, Heart, Flower2

  

**Status:** CheckCircle, AlertCircle, AlertTriangle, Info, Clock, Loader2

  

**Actions:** Search, RefreshCw, Download, ArrowRightLeft, Truck

  

**Feature-specific:** Video, VideoOff, Mic, MicOff, WifiOff, Sparkles, Scale

  

**Mobile tab bar:** Home, Activity, ShoppingBag, MessageCircle, CircleUser

  

### 8.3 Icon Sizing

  

| Context | Web | Mobile |

|---------|-----|--------|

| Inline text | `w-4 h-4` (16px) | `iconSizeSm` (16px) |

| Standard | `w-5 h-5` (20px) | `iconSizeMd` (20px) |

| Navigation / Headers | `w-6 h-6` (24px) | `iconSizeLg` (24px) |

| Feature icons | — | `iconSizeXl` (28px) |

| Large decorative | — | `iconSize2xl` (36px) |

  

---

  

## 9. Component Library — Web

  

Built on **Radix UI** primitives + **class-variance-authority (CVA)** for variants + **Tailwind CSS** for styling + **Framer Motion** for animations.

  

Source: `web/src/components/ui/`

  

### 9.1 Button

  

**Variants:**

  

| Variant | Appearance |

|---------|------------|

| `default` | Black bg, white text, soft shadow, shadow-lg on hover |

| `destructive` | Red bg (#CC3333), white text |

| `outline` | White bg, border, muted hover |

| `secondary` | Off-white bg (#F8F8F6), dark text |

| `ghost` | Transparent bg, muted hover |

| `link` | No bg, underline on hover |

| `accent` | Lavender bg (#9B8EC4), white text, soft shadow |

  

**Sizes:**

  

| Size | Height | Padding | Radius |

|------|--------|---------|--------|

| `sm` | 36px (h-9) | px-3.5 | rounded-lg |

| `default` | 44px (h-11) | px-5 py-2.5 | rounded-xl |

| `lg` | 48px (h-12) | px-8 | rounded-xl |

| `xl` | 56px (h-14) | px-10 | rounded-xl |

| `icon` | 40px x 40px | — | — |

  

**Features:** Loading spinner state, `asChild` prop via Radix Slot, `active:scale-[0.98]` press effect.

  

### 9.2 Badge

  

**Variants:**

  

| Variant | Style |

|---------|-------|

| `default` | Primary tint bg (10% opacity), primary text |

| `secondary` | Secondary tint bg, secondary text |

| `success` | Green tint bg, green text |

| `warning` | Amber tint bg, amber text |

| `error` | Red tint bg, red text |

| `outline` | Border only, muted text |

| `muted` | Muted bg, muted text |

  

**Sizes:** `sm` (px-2, 10px text), `default` (px-2.5, 12px text), `lg` (px-3, 14px text)

  

**Features:** Optional `dot` prop adds a colored dot indicator before the label. Pre-built specialized badges for ConsultationStatus, OrderStatus, LabOrderStatus, Priority, and Vertical.

  

### 9.3 Input

  

Height: 44px (h-11). Border: `border-input`. Radius: `rounded-xl`. Focus ring: lavender (`ring-ring`). Error state: red border + error message below. Placeholder color: `text-muted-foreground`.

  

### 9.4 Toast

  

Positioned bottom-right with spring animation. Four types: success (green), error (red), warning (amber), info (primary). Each type has a matching icon and subtle tinted background (5% opacity). Auto-dismisses after 4s (6s for errors). Animated with Framer Motion (slide up on enter, slide right on exit).

  

### 9.5 OTP Input

  

Six-digit input field for authentication flows.

  

### 9.6 Switch

  

Toggle switch component (Radix UI primitive).

  

### 9.7 Skeleton

  

Loading placeholder with shimmer animation.

  

### 9.8 Empty State & Error State

  

`EmptyState` — centered icon + title + description + optional action button.

`SearchEmptyState` — variant for empty search results.

`FilterEmptyState` — variant for empty filter results.

`ErrorState` — error display with retry action.

`InlineError` — compact inline error message.

`ErrorBoundaryFallback` — fallback UI for React error boundaries.

  

### 9.9 Custom CSS Components (globals.css)

  

| Class | Behavior |

|-------|----------|

| `.card-premium` | White bg, rounded-2xl, soft shadow, 50% opacity border |

| `.glass` | White/80 bg with backdrop-blur-md |

| `.gradient-text` | Lavender-to-gold gradient on text |

| `.status-badge` | Inline-flex, pill-shaped, xs text, medium weight |

| `.heading-serif` | Applies Playfair Display serif font |

| `.scrollbar-hide` | Hides scrollbar completely |

| `.scrollbar-thin` | Thin 6px scrollbar with border color |

| `.animate-gradient` | 8s infinite background position animation |

  

---

  

## 10. Component Library — Mobile

  

Built with **React Native StyleSheet** + **React Native Reanimated** for animations + **Expo Haptics** for feedback. Components import tokens from `@/theme/*`.

  

Source: `mobile/src/components/`

  

### 10.1 PremiumButton

  

**Variants:**

  

| Variant | Background | Text | Border |

|---------|------------|------|--------|

| `primary` | `#141414` (disabled: `#E0E0E0`) | `#FFFFFF` (disabled: `#ABABAB`) | None |

| `secondary` | `#FFFFFF` | `#141414` | 1.5px `#DCDCDC` |

| `ghost` | Transparent | `#5C5C5C` | None |

  

**Dimensions:** Height 56px. Full width by default. Pill-shaped (`borderRadius.full`). Horizontal padding 32px.

  

**Interaction:** Scale 0.97 on press (spring: damping 10, stiffness 200). Haptic light impact. Loading state shows ActivityIndicator.

  

### 10.2 PremiumInput

  

Text input with error state support. Height: 60px (`inputHeight`). Focus state changes border to lavender accent.

  

### 10.3 ScreenWrapper

  

Common screen wrapper providing safe area insets, scroll support, and an optional sticky footer with gradient fade.

  

### 10.4 ProgressIndicator

  

Step progress tracker. Dot-based: 8px dots, active dot expands to 24px width.

  

### 10.5 SelectionCard

  

Tappable card for selection lists. Shows check icon when selected.

  

### 10.6 BackButton

  

Navigation back button. 44px touch target. ChevronLeft icon.

  

### 10.7 Feature Components

  

| Component | Usage |

|-----------|-------|

| `TreatmentCard` | Treatment vertical cards with icon badge, pricing, description, scale-in animation |

| `ConditionCard` | Condition display with left border accent color and CTA |

| `ActiveConsultationBanner` | Shows active consultation status with Stethoscope icon |

| `ActiveOrderBanner` | Shows order/delivery status with Truck or FlaskConical icon |

| `LabOrderTracker` | Lab order status timeline stepper |

| `DeliveryTracker` | Delivery status timeline |

| `DeliveryOTPModal` | Modal for OTP entry during delivery |

| `CancelLabOrderModal` | Confirmation modal for lab order cancellation |

| `TrackingBanner` | Generic tracking status banner |

| `VerticalStepper` | Multi-step form progress indicator |

| `OnboardingHeader` | Onboarding flow header |

| `RecordingConsentModal` | Video call recording consent dialog |

| `UpcomingSessionBanner` | Banner for upcoming video consultation sessions |

  

---

  

## 11. Status Badges & Semantic Mapping

  

### 11.1 Consultation Statuses

  

| Status | Label | Badge Variant | Color |

|--------|-------|---------------|-------|

| `PENDING_REVIEW` | Pending Review | `warning` | Amber |

| `IN_REVIEW` | In Review | `default` | Primary |

| `NEEDS_INFO` | Needs Info | `warning` | Amber |

| `APPROVED` | Approved | `success` | Green |

| `REJECTED` | Rejected | `error` | Red |

| `FLAGGED` | Flagged | `error` | Red |

  

### 11.2 Order Statuses

  

| Status | Label | Badge Variant |

|--------|-------|---------------|

| `PRESCRIPTION_CREATED` | Created | `muted` |

| `SENT_TO_PHARMACY` | Sent to Pharmacy | `default` |

| `PHARMACY_PREPARING` | Preparing | `warning` |

| `PHARMACY_READY` | Ready | `success` |

| `PHARMACY_ISSUE` | Issue | `error` |

| `PICKUP_ARRANGED` | Pickup Arranged | `default` |

| `OUT_FOR_DELIVERY` | Out for Delivery | `warning` |

| `DELIVERED` | Delivered | `success` |

| `DELIVERY_FAILED` | Failed | `error` |

| `CANCELLED` | Cancelled | `muted` |

  

### 11.3 Lab Order Statuses

  

| Status | Label | Badge Variant |

|--------|-------|---------------|

| `ORDERED` | Ordered | `muted` |

| `SLOT_BOOKED` | Slot Booked | `default` |

| `PHLEBOTOMIST_ASSIGNED` | Assigned | `default` |

| `PHLEBOTOMIST_EN_ROUTE` | En Route | `warning` |

| `SAMPLE_COLLECTED` | Collected | `success` |

| `COLLECTION_FAILED` | Failed | `error` |

| `SAMPLE_IN_TRANSIT` | In Transit | `warning` |

| `SAMPLE_RECEIVED` | Received | `success` |

| `PROCESSING` | Processing | `warning` |

| `RESULTS_UPLOADED` | Results Ready | `success` |

| `RESULTS_REVIEWED` | Reviewed | `success` |

| `CANCELLED` | Cancelled | `muted` |

  

### 11.4 Priority Levels

  

| Priority | Badge Variant | Size |

|----------|---------------|------|

| `low` | `muted` | `sm` |

| `medium` | `default` | `sm` |

| `high` | `warning` | `sm` |

| `urgent` | `error` | `sm` |

  

### 11.5 Design Tokens Status Colors (Extended)

  

Used in the dashboard UI for colored status backgrounds:

  

| Status | Background | Text | Border |

|--------|------------|------|--------|

| New | `#FEF3C7` | `#92400E` | `#FCD34D` |

| In Review | `#DBEAFE` | `#1E40AF` | `#93C5FD` |

| Awaiting Response | `#FEF3C7` | `#92400E` | `#FCD34D` |

| Lab Results | `#E0E7FF` | `#3730A3` | `#A5B4FC` |

| Follow-Up | `#FCE7F3` | `#9D174D` | `#F9A8D4` |

| Completed | `#D1FAE5` | `#065F46` | `#6EE7B7` |

| Referred | `#F3E8FF` | `#6B21A8` | `#C4B5FD` |

| Cancelled | `#FEE2E2` | `#991B1B` | `#FCA5A5` |

  

---

  

## 12. Treatment Vertical Theming

  

Each health condition vertical has a unique, extremely subtle color identity.

  

| Vertical | Background Tint | Icon Color | Icon Examples |

|----------|----------------|------------|---------------|

| Hair Loss | `#FAF7F0` (warm cream) | `#B8A472` (muted gold) | Sparkles |

| Sexual Health | `#F4F5FA` (cool blue) | `#7E86AD` (steel blue) | Heart |

| PCOS | `#FAF4F6` (blush pink) | `#AD7E8E` (dusty rose) | Flower2 |

| Weight Management | `#F2F7F4` (sage green) | `#6E9E7E` (muted sage) | Scale |

  

### Web Tailwind Usage

  

```html

<div class="bg-vertical-hair-loss">

  <icon class="text-vertical-hair-loss-icon" />

</div>

```

  

### Mobile Usage

  

```typescript

import { colors } from '@/theme/colors';

backgroundColor: colors.hairLossTint

iconColor: colors.hairLossIcon

```

  

### Condition-Specific Colors (Design Tokens — Dashboard)

  

These are bolder colors used in dashboard contexts (not patient-facing):

  

| Condition | Primary | Light Background |

|-----------|---------|-----------------|

| `HAIR_LOSS` | `#0D6B4B` | `#E8F5EF` |

| `SEXUAL_HEALTH` | `#4F46E5` | `#EEF2FF` |

| `WEIGHT_MANAGEMENT` | `#EA580C` | `#FFF7ED` |

| `PCOS` | `#DB2777` | `#FDF2F8` |

  

---

  

## 13. Dashboard & Portal Layouts

  

### 13.1 Applications

  

The web platform is a single Next.js 14 codebase with subdomain routing:

  

| Subdomain | Route Group | Role |

|-----------|-------------|------|

| `doctor.onlyou.life` | `/doctor/` | Doctor dashboard |

| `admin.onlyou.life` | `/admin/` | Admin/coordinator dashboard |

| `lab.onlyou.life` | `/lab/` | Diagnostic centre portal |

| `collect.onlyou.life` | `/collect/` | Phlebotomist portal |

| `pharmacy.onlyou.life` | `/pharmacy/` | Pharmacy partner portal |

  

### 13.2 Doctor Dashboard Layout

  

**Sidebar navigation** (`web/src/app/doctor/components/sidebar.tsx`):

  

| Item | Icon | Route |

|------|------|-------|

| Dashboard | Home | `/doctor` |

| Case Queue | Users | `/doctor/queue` |

| Prescriptions | Pill | `/doctor/prescriptions` |

| Lab Orders | TestTube | `/doctor/lab-orders` |

| Video | Video | `/doctor/video` |

| Substitutions | ArrowRightLeft | `/doctor/substitutions` |

| Messages | MessageSquare | `/doctor/messages` |

| Templates | FileText | `/doctor/templates` |

  

**Key features with dedicated routes:**

- Case detail with tabs: `/doctor/case/[id]/` (blood work, prescribe)

- Video consultation: `/doctor/video/`

  

### 13.3 Admin Dashboard Layout

  

Routes under `/admin/`:

- Deliveries, Doctors (add/list/detail), Escalations, Lab Orders, Lab Partners (list/detail), Partners, Patients, Pharmacy Management, Pharmacy Orders

  

### 13.4 Lab Portal Layout

  

Routes under `/lab/`:

- Sample Processing, Lab Profile, Result Upload

  

### 13.5 Collect Portal Layout

  

Routes under `/collect/`:

- Phlebotomist Roster

  

### 13.6 Pharmacy Portal Layout

  

Routes under `/pharmacy/`:

- Order fulfillment, inventory

  

### 13.7 Layout Patterns

  

All dashboard layouts follow the same pattern:

- Left sidebar navigation (collapsible on mobile via hamburger `Menu` / `X` icons)

- Main content area fills remaining space

- Mobile-first design (375px base width, scales up)

- Auth guard wrapper protects all routes

- PWA-installable via `pwa-provider.tsx`

  

---

  

## 14. Mobile App Structure

  

### 14.1 Navigation Architecture

  

**Root:** Expo Router file-based routing (`mobile/app/`)

  

**Tab Navigation** (5 tabs):

  

| Tab | Label | Icon | Route |

|-----|-------|------|-------|

| Home | Home | Home | `/(tabs)/` |

| Activity | Activity | Activity | `/(tabs)/activity` |

| Orders | Orders | ShoppingBag | `/(tabs)/orders` |

| Messages | Messages | MessageCircle | `/(tabs)/messages` |

| Profile | Profile | CircleUser | `/(tabs)/profile` |

  

Tab bar: 68px Android / 84px iOS (with safe area). Active color: `#141414`. Inactive color: `#8A8A8A`. Top border separator.

  

### 14.2 Screen Groups

  

**Authentication** (`(auth)/`): Phone entry, OTP verification. Stack navigator with slide-from-right animation.

  

**Onboarding** (`onboarding/`): Welcome flow, feature introduction.

  

**Health Intake** (`intake/[vertical]/`): Multi-step assessment per treatment vertical (hair-loss, sexual-health, pcos, weight). Steps include: assessment questionnaire, payment, photo upload, review.

  

**Lab Orders** (`lab/`): Order status, result viewing, biomarker information.

  

**Chat** (`chat/[consultationId]`): Per-consultation messaging with doctor.

  

**Video** (`video/`): Video consultation sessions, slot booking.

  

**Pharmacy** (`pharmacy/`): Prescription refills, order tracking.

  

### 14.3 State Management

  

- **Server state:** Apollo Client 3.14.0 (GraphQL)

- **Client state:** Zustand 5.0.11

- **Persistent storage:** MMKV (fast key-value), Expo Secure Store (tokens), AsyncStorage (legacy)

  

---

  

## 15. Responsive Breakpoints

  

### Web (Tailwind)

  

| Prefix | Min-width | Usage |

|--------|-----------|-------|

| `sm` | 640px | Large phones, small tablets |

| `md` | 768px | Tablets |

| `lg` | 1024px | Small laptops |

| `xl` | 1280px | Standard desktops |

| `2xl` | 1536px | Wide screens |

  

All dashboards are **mobile-first** — design for 375px width, then scale up.

  

### Mobile

  

Single-column layout. Responsive padding scales with screen width. Safe area handling for notches and home indicators.

  

---

  

## 16. Utility Classes & Helpers

  

### 16.1 Class Merging

  

```typescript

import { cn } from '@/lib/utils';

// Merges Tailwind classes with proper precedence (clsx + tailwind-merge)

cn('px-4 py-2', isActive && 'bg-primary', className)

```

  

### 16.2 Formatting Helpers

  

| Function | Description |

|----------|-------------|

| `formatINR(amount)` | Formats paise to INR currency (e.g., 50000 to "500") |

| `formatDate(date)` | Indian date format (e.g., "13 Apr 2026") |

| `formatRelativeTime(date)` | Relative time (e.g., "2h ago", "3d ago") |

| `getInitials(name)` | Extracts up to 2 initials from a name |

| `maskPhone(phone)` | Masks phone for privacy (e.g., "91******42") |

  

### 16.3 Display Name Maps

  

| Map | Keys | Example |

|-----|------|---------|

| `VERTICAL_NAMES` | HAIR_LOSS, SEXUAL_HEALTH, WEIGHT_MANAGEMENT, PCOS | "Hair Loss" |

| `ROLE_NAMES` | PATIENT, DOCTOR, ADMIN, LAB, PHLEBOTOMIST, PHARMACY, DELIVERY | "Coordinator" |

| `CONSULTATION_STATUS` | PENDING_REVIEW, IN_REVIEW, AWAITING_PATIENT, etc. | { label: "New", color: "warning" } |

  

---

  

## 17. Z-Index Scale

  

| Token | Value | Usage |

|-------|-------|-------|

| `hide` | -1 | Hidden elements |

| `base` | 0 | Default stacking |

| `docked` | 10 | Sticky sidebars |

| `dropdown` | 1000 | Dropdowns, selects |

| `sticky` | 1100 | Sticky headers |

| `banner` | 1200 | Notification banners |

| `overlay` | 1300 | Background overlays |

| `modal` | 1400 | Modal dialogs |

| `popover` | 1500 | Popovers, tooltips |

| `skipLink` | 1600 | Accessibility skip links |

| `toast` | 1700 | Toast notifications |

| `tooltip` | 1800 | Highest-priority tooltips |

  

---

  

## 18. Chart & Data Visualization

  

**Library:** Recharts 2.14.0 (web)

  

**Color assignments:**

  

| Slot | Color | Usage |

|------|-------|-------|

| 1 | `#9B8EC4` (Lavender) | Primary metric |

| 2 | `#C4956B` (Gold) | Secondary metric |

| 3 | `#2D9F5D` (Green) | Success/positive |

| 4 | `#7E86AD` (Steel Blue) | Tertiary metric |

| 5 | `#AD7E8E` (Dusty Rose) | Quaternary metric |

  

---

  

## 19. Libraries & Dependencies

  

### Web

  

| Category | Library | Version |

|----------|---------|---------|

| Framework | Next.js | 14.2.20 |

| React | React | 18.3.1 |

| Styling | Tailwind CSS | 3.4.16 |

| Animation | tailwindcss-animate | (plugin) |

| Animation | Framer Motion | 12.34.0 |

| UI Primitives | Radix UI (dialog, dropdown, label, slot, toast, switch) | Various |

| Variant Control | class-variance-authority | (latest) |

| Class Merging | clsx + tailwind-merge | (latest) |

| Icons | lucide-react | 0.468.0 |

| Charts | Recharts | 2.14.0 |

| Forms | react-hook-form | 7.54.0 |

| Validation | zod | 3.24.0 |

| GraphQL | @apollo/client | 3.11.0 |

| Video | @100mslive/react-sdk | ^0.11.2 |

| Dates | date-fns | (latest) |

  

### Mobile

  

| Category | Library | Version |

|----------|---------|---------|

| Framework | Expo | ~54.0.33 |

| Routing | expo-router | ~6.0.23 |

| React | React | 19.1.0 |

| React Native | React Native | 0.81.5 |

| Styling | NativeWind | 4.1.0 |

| Animation | react-native-reanimated | ~4.1.6 |

| Haptics | expo-haptics | 15.0.8 |

| Icons | lucide-react-native | 0.563.0 |

| Fonts | @expo-google-fonts/playfair-display + plus-jakarta-sans | (latest) |

| GraphQL | @apollo/client | 3.14.0 |

| State | zustand | 5.0.11 |

| Forms | react-hook-form | 7.54.0 |

| Storage | react-native-mmkv + expo-secure-store + @react-native-async-storage | Various |

| Images | expo-image | 3.0.11 |

| Camera | expo-camera + expo-image-picker | Various |

| Video | @100mslive/react-native-hms | (latest) |

| Payments | react-native-razorpay | 2.3.0 |

| Notifications | expo-notifications | (latest) |

| Gradients | expo-linear-gradient | (latest) |

| Safe Area | react-native-safe-area-context | 5.6.2 |

  

---

  

## 20. File Reference

  

### Design Token Source Files

  

| File | What It Defines |

|------|-----------------|

| `web/tailwind.config.js` | Web color palette, fonts, sizes, radius, shadows, animations, spacing |

| `web/src/app/globals.css` | CSS custom properties, base styles, component utilities |

| `web/src/lib/design-tokens.ts` | TypeScript design tokens (colors, typography, spacing, shadows, animations, z-index, breakpoints, status colors, condition colors) |

| `web/src/lib/utils.ts` | `cn()` class merger, formatters, display name maps |

| `mobile/src/theme/colors.ts` | Mobile color palette |

| `mobile/src/theme/typography.ts` | Mobile font families, sizes, line heights, letter spacing, text styles |

| `mobile/src/theme/spacing.ts` | Mobile spacing, radius, dimensions, shadows |

| `mobile/src/theme/fonts.ts` | Font loading configuration (useFonts hook) |

| `mobile/src/theme/index.ts` | Theme barrel export |

  

### Component Source Files

  

| File | Component |

|------|-----------|

| `web/src/components/ui/button.tsx` | Button (7 variants, 5 sizes) |

| `web/src/components/ui/badge.tsx` | Badge + ConsultationStatusBadge, OrderStatusBadge, LabOrderStatusBadge, PriorityBadge, VerticalBadge |

| `web/src/components/ui/input.tsx` | Input with error state |

| `web/src/components/ui/toast.tsx` | ToastProvider + useToast hook |

| `web/src/components/ui/otp-input.tsx` | OTP Input |

| `web/src/components/ui/switch.tsx` | Toggle Switch |

| `web/src/components/ui/skeleton.tsx` | Skeleton Loader |

| `web/src/components/ui/empty-state.tsx` | EmptyState, SearchEmptyState, FilterEmptyState |

| `web/src/components/ui/error-state.tsx` | ErrorState, InlineError, ErrorBoundaryFallback |

| `web/src/components/auth-guard.tsx` | Authentication wrapper |

| `web/src/components/pwa-provider.tsx` | PWA install prompt |

| `web/src/components/doctor/condition-panels.tsx` | Doctor condition management |

| `web/src/app/doctor/components/sidebar.tsx` | Doctor sidebar navigation |

| `mobile/src/components/ui/PremiumButton.tsx` | PremiumButton (3 variants) |

| `mobile/src/components/ui/PremiumInput.tsx` | PremiumInput |

| `mobile/src/components/ui/ScreenWrapper.tsx` | Screen layout wrapper |

| `mobile/src/components/ui/ProgressIndicator.tsx` | Progress indicator |

| `mobile/src/components/ui/SelectionCard.tsx` | Selection card |

| `mobile/src/components/ui/BackButton.tsx` | Back navigation button |

| `mobile/src/components/TreatmentCard.tsx` | Treatment vertical card |

| `mobile/src/components/ConditionCard.tsx` | Condition display card |

| `mobile/src/components/ActiveConsultationBanner.tsx` | Active consultation status |

| `mobile/src/components/ActiveOrderBanner.tsx` | Active order status |

| `mobile/src/components/LabOrderTracker.tsx` | Lab order timeline |

| `mobile/src/components/DeliveryTracker.tsx` | Delivery timeline |

| `mobile/src/components/DeliveryOTPModal.tsx` | Delivery OTP verification |

| `mobile/src/components/CancelLabOrderModal.tsx` | Lab order cancellation |

| `mobile/src/components/TrackingBanner.tsx` | Generic tracking banner |

| `mobile/src/components/VerticalStepper.tsx` | Multi-step form stepper |

  

---

  

> **Note:** When porting this design system to another project, start with the color palette and typography (Sections 2-3), then spacing and radius (Sections 4-5), then shadows and animations (Sections 6-7). The component implementations in Sections 9-10 show how these tokens are composed into real UI — adapt the patterns to your component framework.