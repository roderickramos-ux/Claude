# Claude Code Prompt: Praxis Center for Advanced Management — Website & Training Platform

> How to use: create an empty project folder, save this file in it as `PROJECT_BRIEF.md`, open Claude Code in that folder, and say: "Read PROJECT_BRIEF.md in full. Before writing any code, summarize your understanding, list any questions, and propose the Phase 1 plan. Wait for my approval."

## 1. Your role

You are a senior full-stack engineer building a production web platform for a new Philippine professional training company. Work in phases, confirm the plan before each phase, commit in small logical steps, and never hard-code secrets. When a requirement is ambiguous, ask instead of guessing. When you make a technical choice not specified here, state it and why.

## 2. Business context

- **Company:** Praxis Center for Advanced Management (SEC-registered, Philippines). Domain: `praxiscenter.ph`.
- **Positioning:** Aspiring to be the country's top professional training provider, led by scholar-practitioners with doctorate degrees. The brand must feel academic-grade yet practical: credible, modern, calm, premium. Not a generic "online course" look.
- **Offer:** Short intensive trainings of 2–5 days (in-person, online, or hybrid).
- **First courses:**
  1. Practical Project Management — first run November/December 2026
  2. Data Management — later within the year
- **Audience:** Working professionals, managers, and HR/L&D departments sending employees (corporate/group registrations are expected to be a large share).
- **Stage:** Pre-launch, zero online presence. The website is the single first point of contact with customers and a key marketing tool.
- **Locale:** Currency PHP (₱), timezone Asia/Manila, English UI.

## 3. Tech stack (default — propose changes if you have strong reasons)

- **Framework:** Next.js (latest stable, App Router) + TypeScript (strict)
- **UI:** Tailwind CSS + shadcn/ui; fully responsive, mobile-first (most PH traffic is mobile)
- **Database/Auth/Storage:** Supabase (PostgreSQL, Row Level Security, Auth with email + Google sign-in, Storage for images/files). Use Prisma or Drizzle for typed schema and migrations.
- **Payments:** PayMongo (GCash, Maya, credit/debit cards, GrabPay, online banking) via Checkout Sessions + webhooks. Abstract payments behind a `PaymentProvider` interface so Xendit can be swapped in later.
- **Email:** Resend + React Email templates
- **SMS:** Semaphore (PH SMS provider), behind a `SmsProvider` interface
- **Scheduled jobs:** Vercel Cron or Inngest for reminders
- **Chatbot:** Anthropic Claude API, grounded on course catalog + FAQ content from the database
- **Hosting:** Vercel; DNS for `praxiscenter.ph` pointed there
- **Analytics:** GA4 + Meta Pixel (consent-aware), UTM capture on registrations
- **Testing:** Vitest for logic, Playwright for critical flows (browse → cart → pay → confirmation)

## 4. Data model (starting point — refine as needed)

- **Course** — title, slug, tagline, description (rich text), learning outcomes, who should attend, prerequisites, modules/outline, duration (days), format, cover image, category, status (draft/published/archived), SEO fields
- **CourseRun** (a scheduled batch of a Course) — start/end dates, daily schedule, venue or online link, capacity, seats taken, regular price, early-bird price + deadline, group-rate rules, registration deadline, status (open/full/closed/completed/cancelled), assigned faculty
- **Faculty** — name, title (e.g., "Dr."), credentials, bio, photo, specializations, LinkedIn
- **User** — account for participants and admins; role: `participant`, `staff`, `admin`, `super_admin`
- **Organization** — company name, address, TIN, billing contact (for corporate registrations)
- **Registration** — links CourseRun + Attendee + Order; status (pending_payment/confirmed/cancelled/waitlisted/attended/completed)
- **Attendee** — name, email, mobile, job title, organization, dietary/accessibility needs (attendee may differ from the buyer)
- **Cart / CartItem** — CourseRun, number of seats, attendee details per seat
- **Order / Payment** — totals, discounts applied, payment method, provider references, status, receipt number, billing details
- **Voucher** — code, type (percent/fixed), value, valid dates, max total uses, max uses per user, minimum cart amount, restricted to specific courses/runs (optional), active flag
- **GiftCode** — code, initial balance, remaining balance, purchaser, recipient name/email/message, expiry; purchasable on the site and redeemable as partial or full payment
- **Notification** — log of every email/SMS sent (type, recipient, status, timestamp)
- **CMS content** — Pages, BlogPosts (Insights), Testimonials, FAQs, Partners/logos, site settings (contact info, social links, banners)
- **Certificate** — per completed registration, unique verification code
- **Waitlist** — for full runs
- **AuditLog** — admin actions (who changed what, when)

## 5. Public website

Pages: Home, About (mission, founders' story, scholar-practitioner model), Faculty, Courses (catalog with filters by category/format/month), Course detail, Training Calendar, Corporate/In-House Training inquiry, Insights (blog, for SEO), FAQ, Contact, Privacy Policy, Terms, Certificate Verification.

**Home page must include:** strong hero with value proposition, featured upcoming run with countdown and seats-left indicator, why-Praxis section (doctorate-level faculty, practical application, small cohorts), course cards, faculty highlight, testimonials (hidden until content exists), newsletter signup, clear CTAs ("Register Now", "Inquire for Your Team").

**Course detail must include:** outcomes, outline, who should attend, schedule, venue/format, faculty, price with early-bird callout, seats remaining, FAQ, "Add to Cart" and "Register Team" buttons, downloadable brochure (PDF upload via CMS), share buttons.

**SEO & social:** server-rendered pages, per-page meta tags, Open Graph/Twitter cards with auto-generated OG images, JSON-LD (`Organization`, `Course`, `Event`), sitemap.xml, robots.txt, fast Core Web Vitals. Social media links and share buttons everywhere relevant.

## 6. Registration, cart, and payment

- Guest checkout allowed; account auto-created (magic link) so participants can see their registrations later.
- Cart supports multiple course runs and multiple seats per run; collect attendee details per seat.
- Pricing engine: early-bird, group rates (e.g., 3+ seats), vouchers, gift codes — compute server-side only, with clear line-item breakdown. Define and document the order in which discounts stack; by default one voucher per order, gift codes applied after vouchers.
- Seat reservation: hold seats for a limited time (e.g., 15 minutes) during checkout to prevent overbooking; release on timeout/failure.
- Payment methods:
  1. Online via PayMongo (GCash, Maya, cards, etc.)
  2. Offline / corporate: bank transfer or check with proof-of-payment upload, or "Bill my company" generating a proforma invoice; admin verifies and confirms manually.
- Webhooks must be verified, idempotent, and are the source of truth for payment status.
- Billing fields: name, company, address, TIN (optional). Generate a PDF order confirmation/acknowledgment. Do not label system documents as BIR official receipts/invoices; keep receipt numbering configurable so it can be aligned with BIR requirements later (the client will confirm with their accountant).
- Waitlist when a run is full; auto-notify on freed seats.
- Cancellation/refund/transfer policy text managed in CMS; admin can process transfers to another run.

## 7. Notifications and reminders

Email (and SMS where marked) with editable templates in admin:

- Registration received / payment pending (+ reminder after 24h if unpaid)
- Payment confirmed with calendar invite (.ics) (+SMS)
- Pre-training reminders at 7 days, 2 days, and morning-of, including venue/online link and what to prepare (+SMS for 2 days and morning-of)
- Schedule change or cancellation notice (+SMS)
- Post-training: thank-you, feedback survey link, certificate download
- Gift code delivery to recipient
- Waitlist seat available
- Admin alerts: new registration, new corporate inquiry, payment proof uploaded

All sends are logged; failed sends are retried and visible in admin. Participants can manage marketing-email preferences (transactional messages always sent).

## 8. Participant portal

My registrations (upcoming/past), payment status, receipts, pre-training materials, certificates, profile, and ability to update attendee details before a cutoff date.

## 9. Admin panel (`/admin`, role-protected)

- **Dashboard:** revenue (total, by course, by month), registrations over time, upcoming runs with fill rate, pending payments, voucher usage, top traffic sources (UTM), recent activity.
- **Courses & runs:** create/edit/duplicate/archive courses and runs; rich-text editor; image upload; preview before publishing.
- **Registrations & participants:** search/filter, view details, change status, mark attendance per day, move between runs, export CSV/Excel, print attendance sheet and name tags.
- **Orders & payments:** view, verify offline payments, issue refunds (manual record + PayMongo refund where possible).
- **Vouchers & gift codes:** create single or bulk codes, set rules, view usage, deactivate.
- **CMS:** pages, insights/blog, faculty, testimonials, FAQs, partners, homepage sections, announcement banner, site settings — no code changes needed for content updates.
- **Notifications:** edit templates, view send log, send ad-hoc announcements to a run's participants.
- **Certificates:** generate in bulk for a completed run (branded PDF with verification code/QR).
- **Users & roles:** invite staff, assign roles.
- **Audit log** of admin actions.

## 10. Chatbot

- Floating chat widget on all public pages.
- Answers questions about courses, schedules, prices, registration steps, payment methods, and policies using only data from the database/CMS (retrieve relevant content per question; do not invent courses, prices, or dates).
- Can link directly to course pages or the cart.
- Clear handoff: "Talk to a person" collects name/email/question and notifies admins (optionally links to Messenger/Viber).
- Rate-limited, with a system prompt that keeps it on-topic and polite. Log conversations for admin review (with privacy notice).

## 11. Compliance, security, and quality

- Data Privacy Act of 2012 (RA 10173): privacy notice, explicit consent checkbox at registration, separate opt-in for marketing, cookie consent banner, participant data export/deletion request flow, admin-configurable Data Protection Officer contact.
- Row Level Security on all tables; server-side authorization checks on every admin action.
- Input validation (Zod) on client and server; rate limiting on auth, checkout, chatbot, and forms; CAPTCHA (Cloudflare Turnstile) on public forms.
- Accessibility: WCAG 2.1 AA basics (contrast, keyboard navigation, alt text, labels).
- Environment variables documented in `.env.example`; no secrets in code.
- Seed script with realistic sample data: the Practical Project Management course (placeholder content clearly marked), one scheduled run, two faculty profiles, sample vouchers.
- README covering local setup, deployment to Vercel, DNS setup for `praxiscenter.ph`, PayMongo/Resend/Semaphore account setup, and how to run tests.

## 12. Design direction

Premium, academic, trustworthy, modern. Suggested: deep navy or forest green as primary, a warm accent (gold/amber), generous whitespace, serif for headings (conveying scholarship) paired with a clean sans-serif for body text. Professional photography placeholders. Consistent component library. Propose 2 visual directions (as simple screenshots or a style page) before building all pages.

## 13. Build phases

Launch target is November/December 2026, so prioritize a sellable MVP.

- **Phase 1 — Launch MVP (highest priority):** Project setup, design system, public pages, course catalog and detail, cart, guest checkout, PayMongo + offline payment, confirmation and reminder emails, participant portal (basic), admin: courses/runs/registrations/orders/basic dashboard, basic CMS, SEO, privacy compliance, deployment.
- **Phase 2 — Growth features:** Vouchers and gift codes, SMS, waitlist, certificates, full dashboard analytics, blog/insights, corporate inquiry flow, audit log.
- **Phase 3 — Engagement:** AI chatbot, feedback surveys with reporting, bulk announcements, advanced reporting/exports, performance and accessibility pass.

At the end of each phase: run tests, summarize what was built, list known limitations, and give me a manual test checklist.

## 14. First steps

1. Summarize your understanding of this brief in under 300 words.
2. List any questions or risks.
3. Propose the folder structure, final data schema, and Phase 1 task list.
4. Wait for my approval before writing code.
