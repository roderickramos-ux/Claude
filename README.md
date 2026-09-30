# Praxis Center for Advanced Management — website & training platform

Public website, course catalog, cart and checkout, offline payments (GCash / QR Ph / BPI), emails, and an admin panel
for **praxiscenter.ph**.

- **Stack:** Next.js 16 (App Router, TypeScript strict), Tailwind CSS v4, Drizzle ORM + PostgreSQL (Supabase),
  Supabase Auth and Storage, Resend + React Email, Vercel (hosting and cron), Vitest and Playwright.
- **Project docs:** [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md), [`docs/PHASE1_PLAN.md`](docs/PHASE1_PLAN.md),
  [`docs/pricing-rules.md`](docs/pricing-rules.md).

---

## 1. Local development

Requirements: Node.js 20.9+ (22 recommended) and PostgreSQL 15+ (local install or Docker).

```bash
npm install
cp .env.example .env.local   # used by Next.js
cp .env.example .env         # used by scripts (migrate/seed/tests)
# Edit both: DATABASE_URL, SUPER_ADMIN_EMAILS=<your email>, ADMIN_NOTIFICATION_EMAILS=<your email>

createdb praxis              # or: docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
npm run db:migrate
npm run db:seed              # sample course, 4-Saturday batch, 2 faculty, pages, FAQs, payment channels
npm run dev                  # http://localhost:3000
```

**Sign in to the admin panel locally.** Go to <http://localhost:3000/login> and use the yellow **Development login** box
with an email listed in `SUPER_ADMIN_EMAILS`. Dev login only works when `ALLOW_DEV_LOGIN=true` and never in production builds.

Without Supabase or Resend keys:

- uploads are saved to `./.data/uploads`
- emails are printed to the terminal instead of being sent

Everything else works the same.

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests plus integration tests (needs `DATABASE_URL_TEST`; they reset that database) |
| `npm run test:e2e` | Playwright end-to-end flow (creates and resets the `praxis_e2e` database) |
| `npm run db:generate` | Generate a migration after editing `src/db/schema/*` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Insert starter content (safe to re-run; never overwrites edits) |
| `npm run db:studio` | Browse the database |

If Playwright can't download a browser, point it to an installed Chromium with
`PW_CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.

---

## 2. Site modes: coming soon → live

`SITE_MODE=coming_soon` shows only the coming-soon page, with its notify-me signup, to the public. The Privacy
Policy, admin, and login pages still work.

- **Preview the full site** while in coming-soon mode: visit `/preview?key=<PREVIEW_KEY>`. To exit, use `/preview?exit`.
- **Go live:** in Vercel, set `SITE_MODE=live` and redeploy. This takes about a minute.
- **Visual direction:** `NEXT_PUBLIC_THEME=a` (Navy & Gold) or `b` (Forest & Amber). Compare both at `/styleguide`.

---

## 3. Deploying to production

### 3.1 Supabase (database, auth, file storage)

1. Create a project at <https://supabase.com>. Choose the Singapore region, the closest to the Philippines.
   Use the **Pro plan** for production, because free projects pause when inactive.
2. **Database URL:** Project Settings → Database → Connection string → **Transaction pooler** (port 6543).
   Set it as `DATABASE_URL`.
3. Run migrations and seed from your computer with that URL:
   `DATABASE_URL=... npm run db:migrate && DATABASE_URL=... npm run db:seed`.
   Every table has Row Level Security enabled with no public policies, so the Supabase Data API cannot read them.
   The app accesses data only from the server.
4. **Storage:** create two buckets:
   - `public`, marked Public, for logos, course images, brochures and QR codes
   - `private`, **not** public, for proofs of payment
5. **Auth:** Authentication → URL configuration:
   - Site URL: `https://praxiscenter.ph`
   - Redirect URL: `https://praxiscenter.ph/auth/callback`
6. **Google sign-in** (optional): Authentication → Providers → Google. Create an OAuth client in Google Cloud
   Console with the redirect URI shown by Supabase.
7. **Keys:** copy the Project URL, anon key and service role key into `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Keep the service role key secret.

### 3.2 Resend (email)

1. Create an account at <https://resend.com>, then open **Domains → Add domain** and enter `praxiscenter.ph`.
2. Add the DNS records Resend shows (SPF/DKIM, and a DMARC TXT record such as `v=DMARC1; p=none;`) at your
   DNS provider, then wait for them to verify.
3. Set `RESEND_API_KEY` and `EMAIL_FROM="Praxis Center <registrar@praxiscenter.ph>"`.

Until the domain is verified, Resend can only deliver to your own account email. Replies go to the contact email
set in Admin → Site settings.

### 3.3 Vercel

1. Import the GitHub repository at <https://vercel.com/new>. The framework is detected automatically.
2. Add every variable from `.env.example` under Settings → Environment Variables.
   - Production must have `ALLOW_DEV_LOGIN=false`.
   - Generate `AUTH_SECRET` and `CRON_SECRET` with `openssl rand -hex 32`.
   - Set `NEXT_PUBLIC_SITE_URL=https://praxiscenter.ph`.
3. **Plan:** Vercel's Hobby plan is for non-commercial use only, so use **Pro** for the business.
4. **Cron:** `vercel.json` runs `/api/cron/maintenance` hourly. This job sends the 24-hour payment reminders,
   releases expired seat holds, and retries failed emails. Hourly crons require Pro. On Hobby, change the schedule
   to daily (`0 0 * * *`), or call the URL from a free external cron service with the header
   `Authorization: Bearer <CRON_SECRET>`.

### 3.4 DNS for praxiscenter.ph

In Vercel, open Project → Settings → Domains and add both `praxiscenter.ph` and `www.praxiscenter.ph`. Then, at
your domain registrar or DNS host (e.g. dotPH, Cloudflare):

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` (or the value Vercel shows) |
| CNAME | `www` | `cname.vercel-dns.com` |

Vercel issues SSL certificates automatically. Keep the Resend (email) records from 3.2 alongside these, and don't
remove existing MX records if you use Google Workspace or Microsoft 365 for mailboxes.

### 3.5 Optional services

- **Cloudflare Turnstile** (spam protection on forms): create a widget for `praxiscenter.ph`, then set
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
- **Upstash Redis** (shared rate limiting): create a free database, then set `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN`.
- **Analytics:** `NEXT_PUBLIC_GA4_ID` and `NEXT_PUBLIC_META_PIXEL_ID`. These load only after a visitor accepts
  cookies.

### 3.6 First-time setup after deploying

1. Sign in at `/login` with an email listed in `SUPER_ADMIN_EMAILS`.
2. **Admin → Site settings:** upload the logo, set the contact email and phone, admin alert recipients, social
   links, and Data Protection Officer.
3. **Admin → Payment channels:** enter the real GCash and BPI account names and numbers, and upload the QR images.
4. **Admin → Courses / Batches / Faculty / Pages:** replace every `[PLACEHOLDER]`, and confirm the venue, prices
   and capacity.
5. Place a test order end to end, verify it in admin, then cancel it.

### 3.7 Payment gateway later (PayMongo / Xendit)

Payments are recorded in a gateway-neutral `payments` table: `provider`, `provider_ref`, and a status flow
controlled by the server. When a PayMongo account is approved:

- add a provider module (Checkout Session creation plus a verified, idempotent webhook)
- add a "Pay online" option at checkout

The order and seat logic doesn't change.

---

## 4. How it works (short tour)

| Area | Where |
|---|---|
| Database schema | `src/db/schema/*` (migrations in `supabase/migrations`) |
| Pricing engine | `src/lib/pricing/engine.ts`, documented in `docs/pricing-rules.md` |
| Order creation (row-locked, no overbooking) | `src/server/orders/create.ts` |
| Payment lifecycle (verify / reject / refund / expire) | `src/server/orders/lifecycle.ts` |
| Emails (outbox with retries, templates) | `src/server/notifications/*` |
| Auth and roles | `src/server/auth/session.ts` |
| Coming-soon mode, UTM and referral capture | `src/proxy.ts` |
| Public pages | `src/app/(site)/*` |
| Admin | `src/app/admin/*` and `src/server/actions/admin/*` |

**Roles:**

- **staff:** orders, payments, registrations, leads
- **admin:** everything staff can do, plus catalog, content, settings, refunds and cancellations
- **super_admin:** everything admin can do, plus users and roles

**Seat holds.** Placing an order reserves its seats immediately. The hold lasts for the configured number of days
(default 5). Unpaid orders are released by the hourly job. Orders with an uploaded proof are never auto-expired;
they wait for staff review.

**Documents.** The PDFs are *order acknowledgments* and *proforma invoices*, clearly labelled as not BIR official
receipts. A free-text receipt number field on each order leaves room to align with BIR numbering later.
