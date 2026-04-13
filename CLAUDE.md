# ONLYOU v2

Indian telehealth platform for stigmatized chronic conditions. Complete rebuild.

---

## METHODOLOGY

**Use Superpowers for ALL development work.** It is the default and only workflow for this project.

Superpowers has a full library of skills available globally. **Check for and use the relevant skill for whatever you're doing** — brainstorming, planning, coding, debugging, reviewing, finishing. Skills activate automatically based on context. Don't skip them. Don't work outside them.

Core skills you'll use constantly: brainstorming, writing-plans, subagent-driven-development, test-driven-development, systematic-debugging, requesting-code-review, using-git-worktrees, finishing-a-development-branch. But there are many more — use whatever skill fits the task at hand.

**Visual companion is mandatory for this project.** When brainstorming offers it, always accept. The founder is non-technical and approves based on how things look. Show mockups, diagrams, and comparisons in the browser before writing any UI code.

---

## STACK

| Layer | Choice |
|-------|--------|
| Backend + DB + Real-time + Auth + Files + Jobs | **Convex** |
| Patient App | React Native **Expo** (latest SDK) |
| Web Portals | **Next.js** (latest, one app per portal) |
| Styling (web) | **Tailwind CSS** + **shadcn/ui** (latest) |
| Styling (mobile) | **NativeWind** (latest) |
| Monorepo | **Turborepo** + **pnpm** |
| Payments | **Razorpay** via Convex HTTP actions |
| Notifications | **Gupshup** (WhatsApp/SMS) + **FCM** |
| AI assessments | **Claude API** via Convex actions |

Always use latest stable versions. Pin exact. Never downgrade.

---

## KNOWLEDGE BASE (50 docs in `docs/`)

Accessible via **Obsidian skills**. Search on-demand. Never front-load all docs into context.

**`ONLYOU-SOURCE-OF-TRUTH.md` is the master reference.** Read it first before diving into specific docs. When there are inconsistencies between documents, this file resolves them.

The docs describe a v1 stack (NestJS/PostgreSQL/Prisma/tRPC/Redis/S3). Read them for **business logic only**. Translate to Convex equivalents.

Some docs have `-CHANGES.md` companions from a payment redesign. Always check for companions — they override the base. Key change: **patients pay AFTER doctor prescribes**, not before.

`DESIGN.md` is the source of truth for all visual decisions.

---

## RULES

1. Superpowers workflow for everything. No cowboy coding.
2. Visual companion on for all UI work. Founder approves visuals first.
3. Search docs via Obsidian skills. Don't guess business logic.
4. One feature at a time. Approval before moving on.
5. Update `checkpoint.md` every session.
6. Zero lint or TypeScript errors. Fix them immediately — never leave them for later.
7. Keep it simple. Build the simplest thing that works. Don't over-engineer.
8. Stay in scope. When fixing something, only touch what's broken. Don't refactor, reorganize, or "improve" unrelated code.

---

## BUILD ORDER

1. Monorepo scaffold + Convex + design system
2. Patient app shell (all screens) → **APPROVAL GATE**
3. Hair Loss end-to-end
4. Doctor portal → **APPROVAL GATE**
5. Admin portal
6. Nurse / Lab / Pharmacy portals
7. Remaining verticals
8. Landing page + notifications + polish

---

## KEY FACTS

- 5 verticals: Hair Loss, ED, PE, Weight, PCOS
- 6 roles: Patient, Doctor, Admin, Nurse, Lab, Pharmacy
- India-first: ₹, Indian formatting, WhatsApp primary, UPI
- Privacy: Lab/Pharmacy/Delivery never see diagnosis
- MVP: No video (auto-skips), no lab APIs, local delivery only