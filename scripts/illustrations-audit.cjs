const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const catalog = await fs.readFile("src/components/shared/illustration-catalog.ts", "utf8");
  const list = catalog.split("export const illustrationNames = [")[1].split("] as const")[0];
  const names = [...list.matchAll(/"([a-z0-9-]+)"/g)].map((match) => match[1]);
  const assets = [];
  for (const name of names) {
    const file = path.join("public/illustrations", `${name}.webp`);
    const metadata = await sharp(file).metadata();
    const stats = await sharp(file).stats();
    const alpha = stats.channels[3];
    if (metadata.width !== 480 || metadata.height !== 480 || !metadata.hasAlpha || !alpha || alpha.min !== 0 || alpha.max !== 255) {
      throw new Error(`${name}: expected 480x480 with both transparent and opaque pixels`);
    }
    assets.push({ name, bytes: (await fs.stat(file)).size });
  }
  console.log(JSON.stringify({ count: assets.length, bytes: assets.reduce((sum, item) => sum + item.bytes, 0), assets }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
