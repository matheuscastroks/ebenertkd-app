import { expect, test, type Page } from "@playwright/test";
import { assertIsolatedEnvironment, guardBrowserContext } from "./lifecycle-helpers";

type Persona = { email: string; password: string; deniedLanding: RegExp };

const isolatedProjectId = process.env.E2E_APPWRITE_PROJECT_ID;
const personas: Record<string, Persona> = {
  adult: { email: process.env.E2E_ADULT_EMAIL ?? "", password: process.env.E2E_ADULT_PASSWORD ?? "", deniedLanding: /\/aluno$/ },
  guardian: { email: process.env.E2E_GUARDIAN_EMAIL ?? "", password: process.env.E2E_GUARDIAN_PASSWORD ?? "", deniedLanding: /\/responsavel$/ }
};
const admin = { email: process.env.E2E_ADMIN_EMAIL ?? "", password: process.env.E2E_ADMIN_PASSWORD ?? "" };
const configured = Boolean(isolatedProjectId && admin.email && admin.password && Object.values(personas).every((persona) => persona.email && persona.password));

async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("@authenticated matriz de papéis", () => {
  test.skip(!configured, "Configure E2E_* para executar contra um projeto Appwrite isolado.");

  test.beforeAll(() => {
    assertIsolatedEnvironment();
  });
  test.beforeEach(async ({ context, baseURL }) => guardBrowserContext(context, baseURL!));

  test("administrador acessa o painel técnico", async ({ page }) => {
    await login(page, admin.email, admin.password);
    await page.goto("/admin/sistema");
    await expect(page.getByRole("heading", { name: /Sistema e operação/ })).toBeVisible();
  });

  for (const [role, persona] of Object.entries(personas)) {
    test(`${role} não acessa URL administrativa conhecida`, async ({ page }) => {
      await login(page, persona.email, persona.password);
      await page.goto("/admin/sistema");
      await expect(page).toHaveURL(persona.deniedLanding);
      await expect(page.getByText("Sistema e operação")).toHaveCount(0);
    });
  }
});
