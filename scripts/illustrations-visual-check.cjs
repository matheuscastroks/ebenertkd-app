// Run after exporting the real component fixture with ILLUSTRATION_PREVIEW=1.
const { chromium } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function main() {
  await fs.mkdir("reports/illustrations", { recursive: true });
  const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL || "msedge" });
  const results = [];
  try {
    for (const scenario of [
      { name: "mobile-light", width: 320, theme: "light" },
      { name: "mobile-dark", width: 320, theme: "dark" },
      { name: "desktop-light", width: 1280, theme: "light" },
      { name: "desktop-dark", width: 1280, theme: "dark" },
      { name: "text-200", width: 640, theme: "light", textZoom: true },
      { name: "images-unavailable", width: 320, theme: "light", broken: true },
    ]) {
      const page = await browser.newPage({ viewport: { width: scenario.width, height: 1100 }, colorScheme: scenario.theme });
      await page.goto(pathToFileURL(path.resolve("reports/illustrations/components.html")).href);
      await page.locator("img").evaluateAll((images) => images.forEach((img) => { img.loading = "eager"; }));
      await page.locator("img").evaluateAll((images) => Promise.all(images.map((img) => img.decode().catch(() => {}))));
      if (scenario.textZoom) await page.addStyleTag({ content: "html{font-size:200%}" });
      if (scenario.broken) await page.locator("img").evaluateAll((images) => images.forEach((img) => { img.src = "file:///unavailable-illustration.webp"; }));
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        missing: [...document.images].filter((image) => !image.naturalWidth).map((image) => image.getAttribute("src")),
        text: document.body.innerText.includes("Inscrever-se") && document.body.innerText.includes("Nenhum evento no momento"),
        overflow: [...document.querySelectorAll("main *")].filter((element) => element.getBoundingClientRect().right > innerWidth + 1 && !element.closest(".sr-only")).slice(0, 12).map((element) => ({ tag: element.tagName, className: element.className?.baseVal ?? element.className, text: element.textContent?.slice(0, 100) })),
      }));
      await page.screenshot({ path: `reports/illustrations/${scenario.name}.png`, fullPage: true });
      results.push({ scenario: scenario.name, ...metrics, passed: metrics.scrollWidth <= metrics.width + 1 && metrics.text && (scenario.broken || metrics.missing.length === 0) });
      await page.close();
    }
    const gallery = await browser.newPage({ viewport: { width: 1200, height: 1000 }, colorScheme: "light" });
    await gallery.goto(pathToFileURL(path.resolve("docs/illustrations/gallery.html")).href);
    await gallery.locator("img").evaluateAll((images) => Promise.all(images.map((img) => img.decode().catch(() => {}))));
    await gallery.screenshot({ path: "docs/illustrations/gallery.png", fullPage: true });
    await gallery.close();
  } finally {
    await browser.close();
  }
  await fs.writeFile("reports/illustrations/visual-results.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.map(({ missing, ...result }) => ({ ...result, missingImages: missing.length })), null, 2));
  if (results.some((result) => !result.passed)) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
