// Crops the headless-Chrome screenshot of scripts/og/og.html to exactly 1200x630 and writes the optimised PNG
// to public/og/primecare-og.png.  Usage: node scripts/finish-og.mjs <path-to-screenshot.png>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/finish-og.mjs <path-to-screenshot.png>');
  process.exit(1);
}

const out = path.join(process.cwd(), 'public', 'og', 'primecare-og.png');
fs.mkdirSync(path.dirname(out), { recursive: true });

const meta = await sharp(input).metadata();
console.log(`screenshot is ${meta.width}x${meta.height}`);
await sharp(input)
  .extract({ left: 0, top: 0, width: Math.min(1200, meta.width ?? 1200), height: Math.min(630, meta.height ?? 630) })
  .resize(1200, 630, { fit: 'cover', position: 'left top' })
  .png({ palette: true, quality: 90, compressionLevel: 9 })
  .toFile(out);

const size = fs.statSync(out).size;
console.log(`wrote ${path.relative(process.cwd(), out)} (${(size / 1024).toFixed(0)} KB)`);
