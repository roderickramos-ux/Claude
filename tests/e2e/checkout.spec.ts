import { expect, test } from "@playwright/test";

// 1×1 PNG used as a proof-of-payment screenshot.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test("team registration → GCash proof → admin verifies → seats confirmed", async ({ page }) => {
  // Browse
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Management education");
  await page.goto("/courses/practical-project-management");
  await expect(page.getByRole("heading", { level: 1, name: "Practical Project Management" })).toBeVisible();

  // Register a team of 3 → group rate in cart
  await page.getByRole("button", { name: /Register Team \(3 seats\)/ }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText(/Early-bird 15%|Group rate 10%/).first()).toBeVisible();
  await page.getByRole("link", { name: "Proceed to checkout" }).click();

  // Checkout
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByLabel("Full name").first().fill("Maria Santos");
  await page.getByLabel("Email").first().fill("maria@e2e.test");
  await page.getByLabel("Mobile number").fill("0917 123 4567");
  const seats = page.locator("fieldset");
  for (const [i, name] of [[1, "Jose Rizal"], [2, "Gabriela Silang"]] as const) {
    await seats.nth(i).getByLabel("Full name").fill(name);
    await seats.nth(i).getByLabel("Email").fill(`${name.split(" ")[0].toLowerCase()}@e2e.test`);
  }
  await page.getByLabel("Company / organization").fill("Acme Philippines Inc.");
  await page.getByRole("radio", { name: "GCash" }).check();
  await page.getByRole("checkbox", { name: /I agree to the Terms/ }).check();
  await page.getByRole("button", { name: "Place order" }).click();

  // Order page
  await expect(page).toHaveURL(/\/orders\/PCAM-\d{4}-\d{5}\?t=/, { timeout: 30_000 });
  await expect(page.getByText("Your order has been placed")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Complete your payment" })).toBeVisible();
  const orderNumber = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const customerUrl = page.url();

  // Upload proof
  await page.getByLabel("Reference number").fill("GC-1234567890");
  await page.getByLabel("Screenshot or PDF of payment").setInputFiles({ name: "gcash.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Submit proof of payment" }).click();
  await expect(page.getByText("Thank you! We received your proof of payment")).toBeVisible({ timeout: 20_000 });

  // Admin verifies
  await page.goto("/login?next=/admin/orders");
  await page.getByLabel("Email").fill("admin@e2e.test");
  await page.getByRole("button", { name: "Sign in (dev)" }).click();
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.getByRole("link", { name: orderNumber }).click();
  await page.getByRole("button", { name: "Verify payment" }).click();
  await expect(page.getByText("paid", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("confirmed", { exact: true })).toHaveCount(3);

  // Customer sees confirmation
  await page.goto(customerUrl);
  await expect(page.getByText("Paid — seats confirmed")).toBeVisible();

  // Email log recorded the confirmations
  await page.goto("/admin/notifications");
  await expect(page.getByText("payment confirmed").first()).toBeVisible();
  await expect(page.getByText("attendee confirmed").first()).toBeVisible();
});

test("checkout validates required fields", async ({ page }) => {
  await page.goto("/courses/practical-project-management");
  await page.getByRole("button", { name: "Add to Cart" }).first().click();
  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Please check the highlighted fields.")).toBeVisible();
  await expect(page.getByText("Enter your full name")).toBeVisible();
});

test("public pages render and admin requires login", async ({ page }) => {
  for (const path of ["/calendar", "/faculty", "/faq", "/about", "/privacy", "/corporate", "/contact"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  const robots = await page.request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin");
});
