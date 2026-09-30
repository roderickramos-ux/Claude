import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const E2E_DB = process.env.DATABASE_URL_E2E ?? "postgres://postgres:postgres@localhost:5432/praxis_e2e";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DB,
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      SITE_MODE: "live",
      ALLOW_DEV_LOGIN: "true",
      SUPER_ADMIN_EMAILS: "admin@e2e.test",
      ADMIN_NOTIFICATION_EMAILS: "alerts@e2e.test",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      RESEND_API_KEY: "",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      TURNSTILE_SECRET_KEY: "",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
