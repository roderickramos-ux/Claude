@AGENTS.md

# Praxis Center platform: notes for AI assistants

- Requirements: `PROJECT_BRIEF.md`. Plan and decisions: `docs/PHASE1_PLAN.md`. Pricing: `docs/pricing-rules.md`.
- Money is integer centavos; dates/times are Asia/Manila (`src/lib/dates.ts`). Never price on the client.
- All DB access is server-side via Drizzle (`src/db/client.ts`). Every admin page/action must call `requireRole()` / `guarded()`.
- Schema changes: edit `src/db/schema/*`, run `npm run db:generate`, commit the SQL in `supabase/migrations`.
- Emails go through the outbox (`enqueueEmail`) — never send directly from request handlers.
- Checks before committing: `npm run lint && npm run typecheck && npm test` (integration tests need `DATABASE_URL_TEST`), and `npm run test:e2e` for checkout changes.
