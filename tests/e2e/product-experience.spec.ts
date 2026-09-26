import { expect, test } from "@playwright/test";

test.describe("Experiência de Produto e UI/UX (Fase 9)", () => {
  test("exibe tela de entrada com identidade visual e responsividade em múltiplos viewports", async ({ page }) => {
    const viewports = [
      { width: 360, height: 640, label: "mobile" },
      { width: 768, height: 1024, label: "tablet" },
      { width: 1280, height: 800, label: "desktop" },
      { width: 1536, height: 900, label: "wide" }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Adulto" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Menor" })).toBeVisible();
    }
  });

  test("verifica integridade dos cabeçalhos defensivos e CSP", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers()["content-security-policy"]).toContain("default-src 'self'");
  });

  test("bloqueia acesso não autorizado com redirecionamento limpo para /?error=unauthorized", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/?error=unauthorized$/);
    await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();
  });
});
