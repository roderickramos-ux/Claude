import postgres from "postgres";
import { runMigrations } from "../../scripts/migrate";
import { seed } from "../../scripts/seed";

/** Fresh database for every E2E run. */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL_E2E ?? "postgres://postgres:postgres@localhost:5432/praxis_e2e";
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await sql.end();
  await runMigrations(url);
  await seed(url);
}
