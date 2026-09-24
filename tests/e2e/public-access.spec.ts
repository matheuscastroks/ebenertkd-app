import { expect, test } from "@playwright/test";

test("exibe a entrada pública sem dados privados", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Adulto" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Menor" })).toBeVisible();
});

test("redireciona URLs protegidas quando não há sessão", async ({ page }) => {
  for (const route of ["/admin/sistema", "/aluno/financeiro", "/responsavel/dependentes"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/?error=unauthorized$/);
    await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();
  }
});

test("diagnóstico sem sessão não revela identidade", async ({ request }) => {
  const response = await request.get("/api/diagnostics/session");
  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toEqual({ authenticated: false });
});

test("envia headers defensivos e manifesto PWA", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).display).toBe("standalone");
});
