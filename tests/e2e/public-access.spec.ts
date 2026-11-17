import { expect, test } from "./public-fixture";

test("exibe a entrada pública sem dados privados", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Criar conta" })).toBeVisible();
});

test("primeira instalação PWA preserva o formulário em edição", async ({ page }) => {
  await page.goto("/");
  const email = page.getByLabel("E-mail", { exact: true });
  await email.fill("rascunho@example.test");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 15000 }).toBe(true);
  await expect(email).toHaveValue("rascunho@example.test");
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
