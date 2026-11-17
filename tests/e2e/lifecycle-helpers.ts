import { expect, type BrowserContext, type Page } from "@playwright/test";
import { assertIsolatedEnvironment } from "../../scripts/testing/e2e-environment";
export { assertIsolatedEnvironment } from "../../scripts/testing/e2e-environment";

export async function guardBrowserContext(context: BrowserContext, baseURL: string) {
  assertIsolatedEnvironment();
  const origin = new URL(baseURL).origin;
  // Includes the legacy browser ping: it must not touch its hardcoded production project.
  await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
}

export function missingEnvironment(names: string[]) {
  return names.filter((name) => !process.env[name]?.trim());
}

export function persona(role: "ADMIN" | "ADULT" | "GUARDIAN") {
  return { email: process.env[`E2E_${role}_EMAIL`] ?? "", password: process.env[`E2E_${role}_PASSWORD`] ?? "" };
}

export async function dismissOnboarding(page: Page) {
  const skip = page.getByRole("button", { name: "Pular apresentação" });
  // The modal can arrive after its server component streams into the page.
  await expect(async () => {
    if (await skip.isVisible()) await skip.click();
    await expect(page.getByRole("dialog", { name: "Introdução ao aplicativo Ebener TKD" })).toHaveCount(0);
  }).toPass({ timeout: 10_000 });
}

export async function login(page: Page, credentials: { email: string; password: string }) {
  assertIsolatedEnvironment();
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill(credentials.email);
  await page.getByLabel("Senha", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/(admin|aluno|responsavel)(?:\?|$)/);
  await dismissOnboarding(page);
}

export async function chooseOption(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Uses the actual calendar controls, never modifies hidden inputs or mocks requests. */
export async function chooseDate(page: Page, id: string, iso: string) {
  const [year, month] = iso.split("-").map(Number);
  await page.locator(`#${id}`).click();
  const calendar = page.locator("[data-slot=popover-content]").last();
  const years = calendar.locator(`select:has(option[value="${year}"])`);
  if (await years.count()) {
    await years.selectOption(String(year));
    await calendar.locator(`select:has(option[value="${month - 1}"])`).selectOption(String(month - 1));
  }
  await calendar.locator(`button[data-date="${iso}"]`).click();
}

export const syntheticImage = {
  name: "fixture-isolated-test.png", mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKxkAAAAASUVORK5CYII=", "base64")
};

export function syntheticCpf(seed: string) {
  const digits = [...seed.replace(/\D/g, "").padStart(9, "3").slice(-9)].map(Number);
  if (new Set(digits).size === 1) digits[0] = (digits[0] + 1) % 10;
  for (const length of [9, 10]) {
    const remainder = digits.reduce((sum, digit, index) => sum + digit * (length + 1 - index), 0) % 11;
    digits.push(remainder < 2 ? 0 : 11 - remainder);
  }
  return digits.join("");
}

export function businessToday() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}
