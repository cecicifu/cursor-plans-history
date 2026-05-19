#!/usr/bin/env node
// Crops the generated icon to a centered square and resizes to 256x256.
// Run via: npx jimp ...  (handled by package script below).
const path = require("path");
const fs = require("fs");

(async () => {
  const { Jimp } = await import("jimp");
  const inputPath = process.argv[2] || path.resolve(__dirname, "..", "icon-source.png");
  const outputPath = process.argv[3] || path.resolve(__dirname, "..", "icon.png");
  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    process.exit(1);
  }
  const img = await Jimp.read(inputPath);
  const size = Math.min(img.bitmap.width, img.bitmap.height);
  const x = Math.floor((img.bitmap.width - size) / 2);
  const y = Math.floor((img.bitmap.height - size) / 2);
  img.crop({ x, y, w: size, h: size });
  img.resize({ w: 256, h: 256 });
  await img.write(outputPath);
  console.log(`Wrote ${outputPath} (${img.bitmap.width}x${img.bitmap.height})`);
})();
