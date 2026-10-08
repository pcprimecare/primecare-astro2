// Verifies WCAG 2.2 colour contrast for every text/background pair the site actually uses.
// Reads the colours from src/styles/tokens.css, so a token change that breaks contrast fails here.
//
//   npm run check:contrast
//
// Targets: body text 7:1 (AAA, for an older patient base); other text 4.5:1 (AA); UI shapes and focus rings 3:1.
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.join(process.cwd(), 'src', 'styles', 'tokens.css'), 'utf8');

// Collect "--name: value;" declarations (comments stripped).
const tokens = {};
for (const match of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
  tokens[match[1]] = match[2].trim();
}

function resolve(name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`circular token --${name}`);
  seen.add(name);
  const value = tokens[name];
  if (value === undefined) throw new Error(`unknown token --${name}`);
  const ref = value.match(/^var\(--([\w-]+)\)$/);
  return ref ? resolve(ref[1], seen) : value;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground token, background token, minimum ratio, where it is used]
const pairs = [
  // Body copy
  ['text', 'surface', 7, 'body text on white'],
  ['text', 'surface-tint', 7, 'body text on porcelain sections'],
  ['text-soft', 'surface', 7, 'secondary text on white'],
  ['text-soft', 'surface-tint', 7, 'secondary text on porcelain'],
  ['text', 'surface-rejuvenation', 7, 'text on the champagne rejuvenation band'],
  // Links and buttons
  ['link', 'surface', 4.5, 'links on white'],
  ['link', 'surface-tint', 4.5, 'links on porcelain'],
  ['white', 'clinic-teal', 4.5, 'primary button label'],
  ['white', 'deep-teal', 7, 'primary button hover, white on deep teal'],
  ['champagne', 'deep-teal', 7, 'rejuvenation button on the champagne band (champagne text on deep teal)'],
  ['deep-teal', 'champagne', 7, 'rejuvenation button and ghost button on champagne'],
  ['deep-teal', 'white', 7, 'ghost button and headings on white'],
  // Dark surfaces
  ['text-inverse', 'surface-inverse', 7, 'white text on the deep-teal panel and footer'],
  ['text-inverse-soft', 'surface-inverse', 7, 'secondary text on the deep-teal panel and footer'],
  ['champagne', 'surface-inverse', 7, 'tagline and link hover on deep teal'],
  // Emergency note
  ['text', 'white', 7, 'emergency note text'],
  ['emergency', 'white', 4.5, 'emergency icon and border on white'],
  // Non-text: shapes, status dot, focus rings (3:1)
  ['logo-teal', 'surface-inverse', 3, 'status dot on deep teal'],
  ['logo-teal', 'surface', 3, 'check bullets and decorative shapes on white'],
  ['focus', 'surface', 3, 'focus ring on white'],
  ['focus', 'surface-tint', 3, 'focus ring on porcelain'],
  ['focus-inverse', 'surface-inverse', 3, 'focus ring on deep teal'],
  ['rule-strong', 'surface', 3, 'strong rules and borders'],
];

let failed = 0;
console.log('Contrast check (tokens from src/styles/tokens.css)\n');
for (const [fg, bg, min, use] of pairs) {
  const fgHex = resolve(fg);
  const bgHex = resolve(bg);
  const value = ratio(fgHex, bgHex);
  const ok = value >= min;
  if (!ok) failed++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${value.toFixed(2).padStart(5)}:1  (need ${String(min).padStart(3)})  ${fgHex} on ${bgHex}  ${use}`,
  );
}

// Known-unsafe combinations that must never appear as text. Documented so nobody "fixes" the palette into them.
const forbidden = [
  ['logo-teal', 'surface', 4.5, 'logo teal is for decoration only: it is below 4.5:1 on white'],
  ['clinic-teal', 'surface-rejuvenation', 4.5, 'clinic teal on champagne is below 4.5:1, so use deep teal there'],
  ['emergency', 'surface-inverse', 3, 'signal red on deep teal is below 3:1'],
];
console.log('\nGuard rails (these combinations are expected to be too weak for text):');
for (const [fg, bg, min, why] of forbidden) {
  const value = ratio(resolve(fg), resolve(bg));
  console.log(`  ${value.toFixed(2).padStart(5)}:1  ${why}${value >= min ? '   <- now passes; the restriction can be lifted' : ''}`);
}

console.log(`\n${failed === 0 ? 'All text and UI pairs pass.' : `${failed} pair(s) FAILED.`}`);
process.exit(failed === 0 ? 0 : 1);
