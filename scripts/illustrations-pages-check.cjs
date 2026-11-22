const { chromium } = require("@playwright/test");
const fs = require("node:fs/promises");

async function main() {
  const base = "http://127.0.0.1:4317";
  const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL || "msedge" });
  const results = [];
  const externalRequests = [];
  try {
    for (const route of ["/aluno/eventos", "/admin/eventos", "/aluno/exames", "/aluno/conquistas"]) {
      for (const empty of [false, true]) {
        for (const theme of ["light", "dark"]) {
          for (const width of [320, 1280]) {
            const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme: theme });
            await page.route("**/*", (request) => {
              if (request.request().url().startsWith(base + "/")) return request.continue();
              externalRequests.push(request.request().url()); return request.abort();
            });
            await page.goto(`${base}${route}${empty ? "?empty=1" : ""}`);
            await page.locator("img").evaluateAll((images) => images.forEach((image) => { image.loading = "eager"; }));
            await page.locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode().catch(() => {}))));
            const metrics = await page.evaluate(() => {
              const content = document.querySelector('[data-slot="dashboard-content"]');
              const groups = [
                { selector: '[aria-labelledby="eventos-abertos"] > ul > li', footer: (card) => card.lastElementChild },
                { selector: "li.t-interactive-row", footer: (card) => card.lastElementChild },
                { selector: '[aria-labelledby="earned-badges-heading"] > ul > li', footer: (card) => card.lastElementChild.lastElementChild },
                { selector: '[aria-labelledby="badges-heading"] > .grid > div', footer: (card) => card.lastElementChild },
              ];
              const rowsAligned = groups.every(({ selector, footer }) => {
                const cards = [...document.querySelectorAll(selector)];
                return cards.every((card, index) => {
                  const previous = cards[index - 1];
                  if (!previous) return true;
                  const currentBounds = card.getBoundingClientRect();
                  const previousBounds = previous.getBoundingClientRect();
                  if (Math.abs(currentBounds.top - previousBounds.top) > 1) return true;
                  return Math.abs(currentBounds.height - previousBounds.height) <= 1 && Math.abs(footer(card).getBoundingClientRect().top - footer(previous).getBoundingClientRect().top) <= 1;
                });
              });
              const escapedBadges = [...document.querySelectorAll('[aria-labelledby="earned-badges-heading"] li')].flatMap((card) => {
                const bounds = card.getBoundingClientRect();
                return [...card.querySelectorAll('[data-slot="badge"]')].filter((badge) => badge.getBoundingClientRect().right > bounds.right + 1).map((badge) => badge.textContent);
              });
              return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, contentWidth: content?.clientWidth, contentScrollWidth: content?.scrollWidth, missing: [...document.images].filter((image) => !image.naturalWidth).map((image) => image.src), escapedBadges, rowsAligned };
            });
            const name = `${route.slice(1).replaceAll("/", "-")}${empty ? "-empty" : ""}-${width}-${theme}`;
            await page.screenshot({ path: `reports/illustrations/pages/${name}.png`, fullPage: true });
            if (width === 1280) {
              const content = page.locator('[data-slot="dashboard-content"]');
              await content.evaluate((element) => { element.style.overflow = "visible"; element.style.flex = "none"; });
              await page.screenshot({ path: `reports/illustrations/pages/${name}-full.png`, fullPage: true });
            }
            results.push({ name, ...metrics, passed: metrics.scrollWidth <= width + 1 && metrics.contentScrollWidth <= metrics.contentWidth + 1 && !metrics.missing.length && !metrics.escapedBadges.length && metrics.rowsAligned });
            await page.close();
          }
        }
      }
    }
    // Regression: recognition headings and pills must fit their own cards at 200% text size.
    const zoom = await browser.newPage({ viewport: { width: 640, height: 1000 } });
    await zoom.route("**/*", (request) => request.request().url().startsWith(base + "/") ? request.continue() : request.abort());
    await zoom.goto(`${base}/aluno/conquistas`);
    await zoom.addStyleTag({ content: "html{font-size:200%}" });
    const recognitionFits = await zoom.locator('[aria-labelledby="earned-badges-heading"] li').evaluateAll((cards) => cards.every((card) => {
      const bounds = card.getBoundingClientRect();
      const title = card.querySelector("h3")?.getBoundingClientRect();
      return title?.width >= 96 && [...card.querySelectorAll('[data-slot="badge"]')].every((badge) => badge.getBoundingClientRect().right <= bounds.right + 1);
    }));
    await zoom.screenshot({ path: "reports/illustrations/pages/conquistas-text-200.png", fullPage: true });
    await zoom.close();
    await fs.writeFile("reports/illustrations/pages/results.json", JSON.stringify({ externalRequests, recognitionFits, results }, null, 2));
    console.log(JSON.stringify({ scenarios: results.length, passed: results.filter((item) => item.passed).length, externalRequests, recognitionFits, failures: results.filter((item) => !item.passed) }, null, 2));
    if (!recognitionFits || externalRequests.length || results.some((item) => !item.passed)) process.exitCode = 1;
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
