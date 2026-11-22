// Export generated originals without changing their alpha channel.
const sharp = require("sharp");
const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const [name, source] = process.argv.slice(2);
  if (!name || !source || !/^[a-z0-9-]+$/.test(name)) {
    throw new Error("Usage: node scripts/illustrations-export.cjs asset-name source.png");
  }
  const directory = path.resolve("public/illustrations");
  await fs.mkdir(directory, { recursive: true });
  const target = path.join(directory, `${name}.webp`);
  const info = await sharp(source).resize(480, 480, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85, alphaQuality: 100 }).toFile(target);
  const metadata = await sharp(target).metadata();
  if (!metadata.hasAlpha) throw new Error(`${name}: transparency missing`);
  console.log(`${name}: ${info.width}x${info.height}, ${info.size} bytes, alpha verified`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
