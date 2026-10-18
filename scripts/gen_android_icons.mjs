/**
 * Generate Android launcher icons from the game's SVG icons.
 * - ic_launcher.png / ic_launcher_round.png  (legacy, all densities)
 * - ic_launcher_foreground.png               (adaptive icon foreground, 108dp scale)
 * Run: node scripts/gen_android_icons.mjs
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import path from "path";

const ROOT = "/home/z/my-project";
const RES = path.join(ROOT, "android/app/src/main/res");

const iconSvg = readFileSync(path.join(ROOT, "public/icon.svg"));
const maskableSvg = readFileSync(path.join(ROOT, "public/icon-maskable.svg"));

// legacy launcher icon sizes per density (48dp baseline)
const launcherSizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

// adaptive foreground = 108dp baseline (icon content sits in safe zone of maskable svg)
const foregroundSizes = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
};

async function generate() {
  for (const [dir, size] of Object.entries(launcherSizes)) {
    const outFile = path.join(RES, dir, "ic_launcher.png");
    await sharp(iconSvg, { density: 300 }).resize(size, size).png().toFile(outFile);

    // circular mask for round icon
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
    );
    await sharp(iconSvg, { density: 300 })
      .resize(size, size)
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toFile(path.join(RES, dir, "ic_launcher_round.png"));

    console.log(`launcher ${dir}: ${size}px ✓`);
  }

  for (const [dir, size] of Object.entries(foregroundSizes)) {
    await sharp(maskableSvg, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(path.join(RES, dir, "ic_launcher_foreground.png"));
    console.log(`foreground ${dir}: ${size}px ✓`);
  }

  console.log("All Android icons generated.");
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});
