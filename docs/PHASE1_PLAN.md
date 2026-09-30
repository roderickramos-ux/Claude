# Praxis Center Platform: Phase 1 Proposal

Status: **Approved 30 Sep 2026. Phase 1A built** (see §10 for changes made after the client's answers).
Source of requirements: [`PROJECT_BRIEF.md`](../PROJECT_BRIEF.md).

---

## 1. Understanding (summary)

Praxis Center for Advanced Management is a new SEC-registered Philippine training company. Its faculty are scholar-practitioners with doctorates, and it runs short, intensive (2–5 day) courses in person, online, or hybrid. It has no online presence yet, so `praxiscenter.ph` will be its storefront, brand, and main marketing channel. The site has to look academic-grade and premium, not like a generic course marketplace. The first product is **Practical Project Management**, with its first run in Nov/Dec 2026. **Data Management** follows later. Buyers are individual professionals and, in large numbers, HR/L&D teams registering groups. That makes group seats, per-seat attendee details, company billing, and offline payment (bank transfer, check, "bill my company") core features, not extras.

The platform has four parts. (1) An SEO-first public site with catalog, calendar, and course pages. (2) A cart and guest checkout. The server computes prices (early-bird, group rates, later vouchers and gift codes). Seats are held for a limited time. Payment runs through PayMongo, with webhooks as the source of truth, or through a manual offline flow. (3) Transactional email with reminders, plus a basic participant portal. (4) A role-protected admin area for courses, runs, registrations, orders, CMS content, and a dashboard. Everything runs in PHP (₱), Asia/Manila time, and English. It must comply with RA 10173 (consent, a separate marketing opt-in, cookie consent, DPO contact, data export and deletion requests). System documents must not be labelled as BIR receipts or invoices.

The stack is Next.js, TypeScript, Tailwind/shadcn, Supabase, PayMongo, Resend, and Vercel. SMS, vouchers, waitlist, certificates, and the blog come in Phase 2. The AI chatbot and surveys come in Phase 3. **The hard constraint is time.** Today is 30 Sep 2026, and registrations for a Nov/Dec run need to open by late October.

---

## 2. Technical decisions (beyond the brief)

| Decision | Choice | Why |
|---|---|---|
| ORM / migrations | **Drizzle** (over Prisma) | SQL-first migrations let RLS policies, triggers, and functions live beside the schema. It is light on serverless cold starts and works well with Supabase Postgres. |
| Money | Integer **centavos** (`bigint`), never floats | Avoids rounding errors. Formatting to ₱ happens only in the UI and PDFs. |
| Time | `timestamptz` everywhere; displayed in Asia/Manila | Reminders ("morning-of") are calculated in Manila time. |
| Seat availability | Derived: `capacity − confirmed/pending registrations − active holds`, checked inside a transaction with `SELECT … FOR UPDATE` on the run row | Prevents overbooking without a drifting `seats_taken` counter. A cached count is exposed for display only. |
| Rich text | **Tiptap**, stored as JSON and rendered on the server | Safe (no raw HTML from admins), good editing experience, easy to render in email and PDF. |
| PDFs | **@react-pdf/renderer** on the server | Order acknowledgments and proforma invoices now, certificates later, all from React components. |
| Jobs & reminders | **Notification outbox table + Vercel Cron** (every 5–15 min) | No extra vendor. Retries and failure visibility come from the table itself. Needs a Vercel Pro plan, which commercial use requires anyway. Can move to Inngest later if volume needs it. |
| Rate limiting | **Upstash Redis** (`@upstash/ratelimit`) | Works on Vercel serverless and edge. Free tier is enough at launch. |
| CAPTCHA | Cloudflare **Turnstile** | As specified. Free and privacy-friendly. |
| Auth | Supabase Auth (magic link + Google) and a `profiles.role` column | Roles are checked in middleware, in server actions, and again by RLS as defence in depth. |
| Server mutations | Server Actions + Zod, with Route Handlers only for webhooks, cron, and OG images | One validation schema shared by client and server. |
| Payments | `PaymentProvider` interface → `PayMongoProvider`, plus a `ManualProvider` for offline | Leaves room for a Xendit adapter later. Offline payments go through the same order state machine. |
| Email | Resend + React Email, with templates stored in the DB (subject/body blocks) over fixed React layouts | Admin can edit copy without breaking the branded layout. |
| App location | Next.js app at the **repository root** | Simplest Vercel setup. No monorepo is needed yet. |

---

## 3. Folder structure

```
/
├─ PROJECT_BRIEF.md
├─ README.md                    # setup, deploy, DNS, provider accounts, tests
├─ .env.example
├─ drizzle.config.ts
├─ next.config.ts
├─ vercel.json                  # cron schedules
├─ docs/
│  ├─ PHASE1_PLAN.md
│  ├─ pricing-rules.md          # discount stacking order (source of truth)
│  └─ decisions/                # short ADRs
├─ public/
├─ supabase/
│  ├─ migrations/               # generated by drizzle-kit + hand-written RLS/functions
│  └─ seed.ts
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/           # public site: layout with header/footer/cookie banner
│  │  │  ├─ page.tsx            # Home
│  │  │  ├─ about/  faculty/  faculty/[slug]/
│  │  │  ├─ courses/  courses/[slug]/
│  │  │  ├─ calendar/  corporate/  faq/  contact/
│  │  │  ├─ privacy/  terms/  verify/[code]/
│  │  │  └─ [slug]/             # CMS-managed generic pages
│  │  ├─ (checkout)/cart/  checkout/  checkout/success/  checkout/pending/
│  │  ├─ (portal)/account/      # registrations, orders, profile, privacy requests
│  │  ├─ (auth)/login/  auth/callback/
│  │  ├─ admin/                 # role-gated layout
│  │  │  ├─ page.tsx            # dashboard
│  │  │  ├─ courses/  runs/  registrations/  orders/
│  │  │  ├─ faculty/  content/  settings/  users/  notifications/
│  │  ├─ api/
│  │  │  ├─ webhooks/paymongo/route.ts
│  │  │  ├─ cron/[job]/route.ts
│  │  │  └─ og/route.tsx
│  │  ├─ sitemap.ts  robots.ts  layout.tsx
│  │  └─ styleguide/            # the two visual directions (removed/locked before launch)
│  ├─ components/
│  │  ├─ ui/                    # shadcn primitives
│  │  ├─ marketing/  checkout/  admin/  portal/
│  │  └─ seo/                   # JSON-LD helpers
│  ├─ db/
│  │  ├─ schema/                # one file per domain (catalog, commerce, cms, ...)
│  │  ├─ client.ts
│  │  └─ queries/               # typed read helpers
│  ├─ server/                   # server-only domain logic
│  │  ├─ pricing/               # pure functions, heavily unit-tested
│  │  ├─ checkout/              # holds, order creation, state machine
│  │  ├─ payments/              # PaymentProvider + paymongo/ + manual/
│  │  ├─ notifications/         # outbox, EmailProvider (resend), SmsProvider (stub)
│  │  ├─ pdf/                   # acknowledgment, proforma invoice
│  │  ├─ auth/                  # session, requireRole()
│  │  └─ actions/               # server actions grouped by area
│  ├─ emails/                   # React Email layouts
│  ├─ lib/                      # money, dates (Manila), zod schemas, utm, ratelimit, turnstile
│  └─ styles/
└─ tests/
   ├─ unit/                     # vitest
   └─ e2e/                      # playwright
```

---

## 4. Data schema (Phase 1 tables in **bold**; Phase 2/3 tables are designed now so later migrations are additive)

Conventions: `uuid` PKs, `created_at`/`updated_at` on every table, money in `*_centavos bigint`, enums as Postgres enums, soft archive through `status` rather than deletes for anything referenced by orders.

### Identity & organizations
- **profiles**: `id` (= auth.users.id), full_name, mobile, role (`participant|staff|admin|super_admin`), marketing_opt_in, marketing_opt_in_at, privacy_consent_at
- **organizations**: name, address_line1/2, city, province, postal_code, tin, billing_contact_name/email/phone

### Catalog
- **categories**: name, slug, sort_order
- **courses**: title, slug (unique), tagline, description (jsonb), outcomes (jsonb list), who_should_attend (jsonb), prerequisites (jsonb), outline (jsonb: modules → topics), duration_days, default_format (`in_person|online|hybrid`), category_id, cover_image_path, brochure_path, faq (jsonb) *or* link to faqs, status (`draft|published|archived`), seo_title, seo_description, og_image_path
- **faculty**: honorific ("Dr."), first_name, last_name, slug, post_nominals, credentials (jsonb), bio (jsonb), photo_path, specializations (text[]), linkedin_url, sort_order, is_published
- **course_faculty**: course_id, faculty_id, sort_order *(default faculty for a course)*
- **course_runs**: course_id, code (e.g. `PPM-2026-11`), start_date, end_date, daily_schedule (jsonb: per-day date/start/end), format, venue_name, venue_address, venue_map_url, online_url (visible only to confirmed attendees), capacity, regular_price_centavos, early_bird_price_centavos, early_bird_deadline, registration_deadline, attendee_edit_cutoff, status (`draft|open|full|closed|completed|cancelled`), pre_training_notes (jsonb), materials (jsonb list of storage paths)
- **run_faculty**: run_id, faculty_id, role
- **group_rate_tiers**: run_id, min_seats, discount_type (`percent|fixed_per_seat`), value

### Commerce
- **carts**: owner (profile_id nullable), anon_token (httpOnly cookie), utm (jsonb), expires_at
- **cart_items**: cart_id, run_id, seats
- **seat_holds**: run_id, cart_id / order_id, seats, expires_at, released_at
- **orders**: order_number (configurable sequence/format), profile_id, organization_id, buyer_name/email/mobile, billing snapshot (name, company, address, tin), status (`draft|pending_payment|awaiting_verification|paid|partially_refunded|refunded|cancelled|expired`), payment_method (`paymongo|bank_transfer|check|bill_company`), subtotal/discount/total_centavos, pricing_breakdown (jsonb snapshot of the engine output), currency, utm (jsonb), consent flags + timestamps, acknowledgment_pdf_path, receipt_number (nullable, configurable), payment_due_at, paid_at
- **order_items**: order_id, run_id, seats, unit_price_centavos, price_basis (`regular|early_bird`), group_discount_centavos, line_total_centavos
- **attendees**: order_item_id, full_name, email, mobile, job_title, organization_name, dietary_needs, accessibility_needs, profile_id (linked if an account exists)
- **registrations**: run_id, attendee_id, order_id, status (`pending_payment|confirmed|cancelled|waitlisted|attended|completed`), transferred_from_registration_id, cancelled_reason
- **payments**: order_id, provider, provider_ref (checkout session / payment id), method_detail (gcash/card/...), amount_centavos, status (`pending|paid|failed|refunded`), proof_path (offline), verified_by, verified_at, raw (jsonb)
- **refunds**: payment_id, amount_centavos, reason, provider_ref, processed_by, status
- **webhook_events**: provider, event_id (**unique**, which makes processing idempotent), type, payload, processed_at, error
- **counters**: key, prefix, next_value, format (for order and receipt numbering)

### Engagement & notifications
- **notification_templates**: key (e.g. `payment_confirmed`), channel (`email|sms`), subject, body (jsonb/markdown with `{{variables}}`), is_active
- **notifications** (outbox + log): template_key, channel, recipient, payload (jsonb), related entity refs, scheduled_for, status (`queued|sending|sent|failed|cancelled`), attempts, last_error, provider_message_id, sent_at
- **attendance** *(Phase 1 table, basic UI)*: registration_id, day_date, present, marked_by
- **newsletter_subscribers**: email, source, consent_at, unsubscribed_at, token
- **inquiries**: type (`contact|corporate`), name, email, phone, company, message, headcount, preferred_dates, status

### CMS & settings
- **pages**: slug, title, body (jsonb), seo fields, status
- **homepage_sections**: key, is_enabled, content (jsonb), sort_order
- **faqs**: question, answer (jsonb), category, course_id (nullable), sort_order, is_published
- **testimonials**: quote, author_name, author_title, company, photo_path, course_id, is_published
- **partners**: name, logo_path, url, sort_order, is_published
- **site_settings** (single row): contact email/phone/address, social links, announcement banner, DPO name/email, bank transfer instructions, offline payment hold days, policy page links, receipt numbering config
- **privacy_requests**: profile_id/email, type (`export|deletion|correction`), status, handled_by

### Phase 2/3 (designed now, migrated later)
vouchers, voucher_redemptions, gift_codes, gift_code_redemptions, waitlist_entries, certificates, audit_logs, blog_posts, chat_conversations, chat_messages, surveys, survey_responses.

### Row Level Security (summary)
- Published catalog/CMS rows: `select` for `anon`. Everything else is denied by default.
- Participants: `select` only their own orders, registrations, attendees, and profile; limited `update` on attendee fields before `attendee_edit_cutoff`.
- Staff/admin: access through a `is_staff()` / `has_role()` SQL function. `super_admin` alone manages roles.
- Checkout and webhooks run on the server with the service role, inside explicit authorization checks. Clients never write orders or payments directly.

---

## 5. Pricing & discount stacking (proposed default, to be confirmed)

For each run line in the cart:
1. **Base unit price**: early-bird price if the order is created on or before `early_bird_deadline` (Manila time), otherwise regular.
2. **Group rate**: the highest `group_rate_tiers` row where `seats ≥ min_seats` for that run. **Proposed default: early-bird and group rate do not stack; each line takes whichever gives the lower price.** (Needs your decision, see Q5.)
3. Line total = seats × effective unit price.

Order level:
4. **Voucher** (Phase 2): one per order, applied to the eligible subtotal after steps 1–3, capped so the total never goes below 0.
5. **VAT/tax handling** (depends on Q3).
6. **Gift code** (Phase 2): treated as **tender** (payment), not a discount. It reduces the amount due after everything above.

The engine is a pure function `price(cart, context) → breakdown`. It runs on the server at cart view, at checkout, and at order creation. The result is saved on the order so later rule changes never alter a placed order.

---

## 6. Order & seat lifecycle

1. **Checkout start**: create `seat_holds` (default 15 min) inside a locking transaction. If seats are short, show the exact remaining count.
2. **Order created** (`pending_payment`), with attendees and registrations (`pending_payment`).
3. **PayMongo**: create a Checkout Session and redirect. The success page shows "processing" until the webhook arrives. The `checkout_session.payment.paid` webhook is signature-verified and de-duplicated via `webhook_events`. It marks the order `paid` and registrations `confirmed`, converts holds, and queues the confirmation email with an .ics file.
4. **Offline**: the hold is extended to `payment_due_at` (configurable, e.g. 3 business days). The order becomes `awaiting_verification` when proof is uploaded, and an admin clicks *Verify*, which runs the same confirm path. "Bill my company" produces a proforma invoice PDF.
5. **Expiry**: cron releases expired holds, marks unpaid orders `expired`, and sends the 24h unpaid reminder before that.

---

## 7. Phase 1 task list

Split into **1A: sellable launch** and **1B: completes Phase 1** so we can open registrations as early as possible.

### Phase 1A: Sellable launch (target: registrations open ~late Oct)
1. **Project setup**: Next.js, TS strict, Tailwind, shadcn, ESLint/Prettier, Vitest, Playwright, Drizzle + Supabase, `.env.example`, CI (typecheck, lint, unit tests) via GitHub Actions.
2. **Visual directions**: `/styleguide` with **two directions** (e.g. *A: Navy & Gold, classic serif*; *B: Forest & Amber, contemporary serif*) showing type, colour, buttons, course card, hero, and a mini course page. **Your pick is required before step 4.**
3. **Schema & RLS**: migrations for Phase 1 tables, RLS policies, seed script (PPM course marked as placeholder, one run, two faculty, sample group tiers).
4. **Design system & layout**: tokens, header/footer, announcement banner, cookie consent, accessibility baseline.
5. **Public pages**: Home, Courses (filters), Course detail, Calendar, Faculty, About, FAQ, Contact, Privacy, Terms (CMS-driven where applicable).
6. **SEO**: metadata, OG image route, JSON-LD (Organization, Course, Event), sitemap, robots, UTM capture cookie.
7. **Pricing engine**: pure module + unit tests (early-bird boundary, group tiers, rounding).
8. **Cart & checkout**: multi-run/multi-seat cart, per-seat attendee forms, billing details, consent + marketing opt-in, Turnstile, rate limiting, seat holds.
9. **Payments**: `PaymentProvider`, PayMongo Checkout Sessions, verified idempotent webhook, offline flow (instructions, proof upload to private storage, bill-my-company).
10. **PDFs**: order acknowledgment + proforma invoice (clearly *not* BIR receipts), configurable numbering.
11. **Emails**: outbox + Resend, templates: registration received/payment pending, 24h unpaid reminder, payment confirmed + .ics, admin alerts (new registration, proof uploaded, contact inquiry).
12. **Auth**: magic link + Google, auto-account on guest checkout, `requireRole()`.
13. **Admin essentials**: courses and runs CRUD (rich text, image/brochure upload, duplicate, preview), registrations list/detail/status/CSV export, orders list/detail + verify offline payment + manual refund record.
14. **Deploy**: Vercel project, env vars, crons, `praxiscenter.ph` DNS, Resend domain verification (SPF/DKIM/DMARC), PayMongo live keys + webhook.
15. **E2E**: Playwright browse → cart → pay (PayMongo test mode) → confirmation, plus the offline path.

### Phase 1B: Complete Phase 1 (target: ~2 weeks after 1A)
16. Pre-training reminders (7d, 2d, morning-of) + schedule-change/cancellation notice.
17. Participant portal: registrations, payment status, documents, materials, profile, attendee edits before cutoff, marketing preferences, privacy export/deletion request.
18. Basic CMS: pages, homepage sections, faculty, FAQs, testimonials (hidden when empty), partners, site settings (incl. DPO, bank details), notification template editing + send log with retry.
19. Admin: basic dashboard (revenue total/by course/by month, registrations over time, fill rate, pending payments, UTM sources), attendance per day, move registration to another run, print attendance sheet/name tags, staff invites and roles.
20. Newsletter signup (stored in DB, with double opt-in).
21. README complete; end-of-phase test run, limitations list, and manual test checklist.

---

## 8. Open questions

1. **Brand assets**: Is there a logo, colour preference, or typeface already? Real faculty photos, or placeholders for now?
2. **Accounts & ownership**: Who will own the Vercel, Supabase, PayMongo, Resend, and Google Cloud accounts? Commercial use needs **Vercel Pro (~US$20/mo)**, and the Supabase free tier pauses inactive projects, so **Supabase Pro (~US$25/mo)** is advisable for production.
3. **VAT**: Is Praxis VAT-registered? Are displayed prices VAT-inclusive? This affects the breakdown and PDFs.
4. **PayMongo status**: Has the business account been applied for? Activation needs SEC documents, BIR COR, and bank details, and can take **1–3+ weeks**. It is the biggest timeline risk.
5. **Group rates**: What tiers (e.g. 3–4 seats −10%, 5+ −15%)? Per run or across the whole cart? Should they stack with early-bird?
6. **Early-bird on offline payments**: Honour the early-bird price if the order was placed before the deadline but paid after?
7. **Offline hold period**: How many days are seats held for bank transfer/check? Does "Bill my company" confirm the seat immediately (pay later) or only after payment?
8. **First run details**: Dates, venue (Metro Manila?), capacity, price, and format for the PPM run.
9. **Content**: Who writes course copy, faculty bios, About/founders' story, and policies (refund/cancellation/transfer, privacy, terms), and by when?
10. **Numbering**: Preferred order/acknowledgment number format (e.g. `PCAM-2026-000123`)?
11. **Domain & email**: Is `praxiscenter.ph` registered, and where (dotPH, etc.)? Which sending address (e.g. `registrar@praxiscenter.ph`)? Is there an existing mailbox provider (Google Workspace/M365)?
12. **DPO**: Name and contact of the Data Protection Officer? Has NPC registration been considered?
13. **Pre-launch page**: Should we ship a "coming soon + notify me" page to the live domain in week 1 to start SEO indexing and collect leads?

## 9. Risks

- **Timeline.** About 4 weeks to open registrations for a Nov/Dec run. Mitigation: the 1A/1B split, a coming-soon page early, and admin CMS scope held to essentials in 1A.
- **Payment gateway activation lead time.** Mitigation: apply to PayMongo now. The offline payment path lets us sell even if PayMongo is not live yet.
- **Email deliverability** on a brand-new domain. Mitigation: set up SPF/DKIM/DMARC early and warm up with low volume.
- **Content readiness.** The site depends on real faculty bios and course copy. Placeholders will be clearly marked and blocked from publishing only by the content owner's decision.
- **BIR compliance.** Official receipts/invoices are out of scope. The system produces acknowledgments only, and numbering stays configurable pending the accountant's advice.
- **Vendor plan limits.** Vercel Hobby forbids commercial use and limits crons. We plan on Pro.

---

## 10. Client answers and resulting changes (30 Sep 2026)

| Topic | Answer | Change made |
|---|---|---|
| Payments | No PayMongo yet; use GCash / QR Ph / BPI QR | Offline-only checkout. Admin-managed **payment channels** (QR image, account details). Buyer uploads proof and reference; staff verify. PayMongo stays a future provider on the same `payments` table. The 15-minute online seat hold was dropped: seats are held when the order is placed. |
| VAT | Non-VAT (under ₱3M) | No VAT line. Configurable "Non-VAT registered" note on PDFs. |
| Group rate | 3+ seats per batch | `group_min_seats = 3` per batch. **The percentage was not specified: placeholder 10%**, editable per batch. |
| Early-bird | 15% | `early_bird_percent = 15` per batch. Deadline is a placeholder (31 Oct 2026, 11:59 PM). |
| Stacking | Not specified | Default: **no stacking**, best discount wins. Per-batch toggle to stack. |
| Referral incentives | Requested | New `referral_codes` / `referral_rewards`: ₱-per-seat or % reward for the referrer, an optional buyer discount, self-referral blocked, `?ref=CODE` links, payout tracking. **Reward amounts to be confirmed** (placeholder ₱500 per seat). |
| Offline hold | 5 days; early-bird honored if the order was placed before the deadline | `paymentHoldDays = 5` (setting). The price is locked at order time. |
| First run | 4 Saturdays: 14, 21, 28 Nov, 5 Dec 2026. Day 1 and Day 4 in BGC, Days 2–3 on Zoom (hybrid) | Seeded as batch `PPM-2026-11` with per-day mode and location. **Price, capacity, times and venue are placeholders.** |
| Brand/content | Needs spaces | Logo uploads (light/dark), faculty profiles, course copy, and policy pages are all editable in admin, marked `[PLACEHOLDER]`. |
| Email | Alerts to the client's Gmail for now | Set via `ADMIN_NOTIFICATION_EMAILS` / Admin → Settings (kept out of the repo). |
| Coming-soon page | Yes | `SITE_MODE=coming_soon` plus a preview key. The page has notify-me signup with interests. |

### Other technical deviations from §2

- **Markdown** instead of Tiptap for rich text in 1A. It is simpler and safe (no raw HTML), and Tiptap can come later.
- **Cart in a cookie** (run IDs and seat counts only) instead of `carts` tables. Prices are always recomputed on the server.
- **Guest order access by secret link** (an HMAC token, not stored). The participant portal with magic-link accounts is in 1B.
- **RLS**: deny-all for the Supabase Data API. Authorization is enforced in server code for every page and action.
