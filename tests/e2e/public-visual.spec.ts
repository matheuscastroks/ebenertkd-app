import { expect, test } from "./public-fixture";

test("entrada, cadastro e recuperação em 375px e nos dois temas", async ({ page }, testInfo) => {
  for (const theme of ["light", "dark"] as const) {
    await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Entrar" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const list = await page.getByRole("tablist").boundingBox();
    const trigger = await page.getByRole("tab", { name: "Entrar" }).boundingBox();
    expect(list && trigger && list.height >= trigger.height).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ animations: "disabled", path: testInfo.outputPath(`entrada-${theme}.png`), fullPage: true });
    // Em modo dev no CI a hidratação pode terminar depois do primeiro clique; repetir até a aba responder.
    await expect(async () => {
      await page.getByRole("tab", { name: "Criar conta" }).click();
      await expect(page.getByLabel("Confirmar senha", { exact: true })).toBeVisible({ timeout: 1_500 });
    }).toPass({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ animations: "disabled", path: testInfo.outputPath(`cadastro-${theme}.png`), fullPage: true });
    await page.goto("/recuperar");
    await expect(page.getByRole("heading", { name: "Recuperar senha" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ animations: "disabled", path: testInfo.outputPath(`recuperacao-${theme}.png`), fullPage: true });
  }
});
