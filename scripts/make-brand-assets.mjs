// Derives the raster icons from public/favicon.svg:
//   public/apple-touch-icon.png  (180x180, for iOS home screens)
//   public/favicon.ico           (32x32 PNG inside an ICO container, for old browsers and Windows)
//
// The favicon is a placeholder in the clinic's colours (a plus with a swoosh, echoing the logo).
// When the clinic supplies a vector logo, replace public/favicon.svg and re-run: node scripts/make-brand-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.join(process.cwd(), 'public');
const svg = fs.readFileSync(path.join(publicDir, 'favicon.svg'));

// Apple applies its own rounded mask, so the touch icon is full-bleed square.
const appleSvg = Buffer.from(
  svg.toString().replace(/<rect width="64" height="64" rx="12"/, '<rect width="64" height="64"'),
);
await sharp(appleSvg, { density: 600 }).resize(180, 180).png({ compressionLevel: 9 }).toFile(path.join(publicDir, 'apple-touch-icon.png'));

// ICO container with a single 32x32 PNG image (supported since Windows Vista and by every current browser).
const png32 = await sharp(svg, { density: 600 }).resize(32, 32).png({ compressionLevel: 9 }).toBuffer();
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0); // width
entry.writeUInt8(32, 1); // height
entry.writeUInt8(0, 2); // palette colours
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4); // colour planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(png32.length, 8); // image size
entry.writeUInt32LE(header.length + entry.length, 12); // image offset
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), Buffer.concat([header, entry, png32]));

console.log('wrote public/apple-touch-icon.png and public/favicon.ico');
