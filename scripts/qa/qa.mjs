// Browser-based QA for the built site. Uses the Chrome already installed on the machine (puppeteer-core downloads nothing).
//
//   npm run build && npm run preview          (serves dist/ on http://localhost:4321 by default)
//   node scripts/qa/qa.mjs shots    --base http://127.0.0.1:4322 --out qa-output
//   node scripts/qa/qa.mjs a11y     --base http://127.0.0.1:4322
//   node scripts/qa/qa.mjs keyboard --base http://127.0.0.1:4322
//   node scripts/qa/qa.mjs metrics  --base http://127.0.0.1:4322
//   node scripts/qa/qa.mjs modes    --base http://127.0.0.1:4322 --out qa-output   (reduced motion, forced colours, print)
//
// Options: --pages /,/services/   --widths 375,768,1024,1440   --chrome "<path to chrome.exe>"
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const command = args[0];
const opt = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};

const base = opt('base', 'http://localhost:4321').replace(/\/$/, '');
const outDir = path.resolve(opt('out', 'qa-output'));
const widths = opt('widths', '375,768,1024,1440').split(',').map(Number);
const pagesArg = opt('pages', '/,/services/,/rejuvenation/,/doctors/,/forms/,/health-info/,/contact/,/book/,/privacy/,/accessibility/,/404.html');
const routes = pagesArg.split(',');
const executablePath =
  opt('chrome') ??
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].find((candidate) => fs.existsSync(candidate));

if (!command || !executablePath) {
  console.error('Usage: node scripts/qa/qa.mjs <shots|a11y|keyboard|metrics|modes> [--base URL] [--out DIR] [--pages a,b] [--widths 375,1440]');
  if (!executablePath) console.error('No Chrome or Edge found. Pass --chrome "<path>".');
  process.exit(1);
}

const slug = (route) => (route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/[\/.]/g, '-'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check'] });

async function open(route, width = 1280, extra = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
  if (extra.before) await extra.before(page);
  const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await sleep(extra.settle ?? 700); // let the one entrance animation finish
  return { page, status: response?.status() };
}

try {
  if (command === 'shots') {
    fs.mkdirSync(outDir, { recursive: true });
    for (const route of routes) {
      for (const width of widths) {
        const { page, status } = await open(route, width);
        const file = path.join(outDir, `${slug(route)}-${width}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        console.log(`${String(status).padEnd(4)} ${route.padEnd(18)} ${String(width).padStart(4)}px  overflow:${overflow}px  ${path.relative(process.cwd(), file)}`);
        await page.close();
      }
    }
  }

  if (command === 'a11y') {
    const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
    const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
    let total = 0;
    for (const route of routes) {
      for (const width of [375, 1280]) {
        const { page } = await open(route, width);
        await page.evaluate(axeSource);
        const results = await page.evaluate(async (runTags) => await window.axe.run(document, { runOnly: { type: 'tag', values: runTags } }), tags);
        const bad = results.violations;
        total += bad.length;
        console.log(`${bad.length === 0 ? 'PASS' : 'FAIL'}  ${route.padEnd(18)} ${String(width).padStart(4)}px  violations:${bad.length}  needs-review:${results.incomplete.length}`);
        for (const violation of bad) {
          console.log(`        [${violation.impact}] ${violation.id}: ${violation.help}  (${violation.nodes.length} node${violation.nodes.length > 1 ? 's' : ''})`);
          for (const node of violation.nodes.slice(0, 3)) console.log(`           ${node.target.join(' ')}  ${node.failureSummary?.split('\n')[1] ?? ''}`);
        }
        for (const item of results.incomplete.filter((entry) => entry.id !== 'color-contrast')) {
          console.log(`        review: ${item.id} (${item.nodes.length})`);
        }
        await page.close();
      }
    }
    console.log(`\n${total === 0 ? 'axe found no violations.' : `${total} violation group(s) found.`}`);
    if (total > 0) process.exitCode = 1;
  }

  if (command === 'keyboard') {
    let problems = 0;
    for (const route of routes) {
      for (const width of [375, 1280]) {
        const { page } = await open(route, width);
        const trail = [];
        for (let i = 0; i < 80; i++) {
          await page.keyboard.press('Tab');
          const info = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            const cx = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
            const cy = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
            const topEl = document.elementFromPoint(cx, cy);
            const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
            const label = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('href') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
            return {
              tag: el.tagName.toLowerCase(),
              label,
              outline,
              outlineWidth: style.outlineWidth,
              visible: rect.width > 0 && rect.height > 0,
              obscured: !!topEl && topEl !== el && !el.contains(topEl) && !topEl.contains(el),
              size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
              inViewport: rect.bottom > 0 && rect.top < innerHeight,
            };
          });
          if (!info) break;
          trail.push(info);
          if (trail.length > 1 && trail[0].label === info.label && i > 3) break; // wrapped around
        }
        const noOutline = trail.filter((t) => !t.outline && t.visible);
        const obscured = trail.filter((t) => t.obscured);
        const tiny = trail.filter((t) => t.visible && (parseInt(t.size) < 24 || parseInt(t.size.split('x')[1]) < 24));
        problems += noOutline.length + obscured.length;
        console.log(`${noOutline.length + obscured.length === 0 ? 'PASS' : 'FAIL'}  ${route.padEnd(18)} ${String(width).padStart(4)}px  stops:${trail.length}  first:"${trail[0]?.label}"  no-outline:${noOutline.length}  obscured:${obscured.length}  under-24px:${tiny.length}`);
        for (const t of noOutline) console.log(`        no visible focus ring: <${t.tag}> "${t.label}"`);
        for (const t of obscured) console.log(`        covered by other content when focused: <${t.tag}> "${t.label}"`);
        for (const t of tiny) console.log(`        small target ${t.size}: <${t.tag}> "${t.label}"`);
        await page.close();
      }
    }
    // Skip link: first Tab lands on it, Enter moves focus into <main>
    const { page } = await open('/', 1280);
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
    await page.keyboard.press('Enter');
    const afterSkip = await page.evaluate(() => document.activeElement?.id);
    console.log(`\nskip link: first Tab -> "${first}"; after Enter focus is on #${afterSkip} ${afterSkip === 'main' ? '(PASS)' : '(FAIL)'}`);
    if (afterSkip !== 'main') problems++;
    await page.close();
    if (problems > 0) process.exitCode = 1;
  }

  if (command === 'metrics') {
    for (const route of routes.slice(0, 6)) {
      for (const width of [375, 1280]) {
        let requests = 0;
        let bytes = 0;
        const { page } = await open(route, width, {
          before: async (p) => {
            p.on('response', async (response) => {
              requests++;
              try {
                bytes += (await response.buffer()).length;
              } catch {}
            });
            await p.evaluateOnNewDocument(() => {
              window.__cls = 0;
              window.__lcp = 0;
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
              }).observe({ type: 'layout-shift', buffered: true });
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) window.__lcp = entry.startTime;
              }).observe({ type: 'largest-contentful-paint', buffered: true });
            });
          },
          settle: 1500,
        });
        const m = await page.evaluate(() => ({ cls: window.__cls, lcp: window.__lcp, scripts: document.scripts.length }));
        console.log(`${route.padEnd(18)} ${String(width).padStart(4)}px  LCP ${m.lcp.toFixed(0).padStart(5)} ms  CLS ${m.cls.toFixed(3)}  requests ${String(requests).padStart(2)}  transferred ~${(bytes / 1024).toFixed(0)} KB (uncompressed)`);
        await page.close();
      }
    }
  }

  if (command === 'modes') {
    fs.mkdirSync(outDir, { recursive: true });
    // Reduced motion: the status panel must not animate
    {
      const { page } = await open('/', 1280, { before: (p) => p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]), settle: 100 });
      const info = await page.evaluate(() => {
        const el = document.querySelector('[data-open-status]');
        const s = getComputedStyle(el);
        return { animationName: s.animationName, animationDuration: s.animationDuration, state: el.dataset.state, opacity: s.opacity };
      });
      const calm = info.animationName === 'none' || parseFloat(info.animationDuration) < 0.01;
      console.log(`${calm ? 'PASS' : 'FAIL'}  reduced motion: status animation "${info.animationName}" ${info.animationDuration}, state ${info.state}, opacity ${info.opacity}`);
      if (!calm) process.exitCode = 1;
      await page.close();
    }
    // Forced colours (Windows high contrast) and print
    for (const [name, features, media] of [
      ['forced-colors', [{ name: 'forced-colors', value: 'active' }], 'screen'],
      ['print', [], 'print'],
    ]) {
      for (const route of ['/', '/contact/']) {
        const { page } = await open(route, 1280, {
          before: async (p) => {
            if (features.length) await p.emulateMediaFeatures(features);
            await p.emulateMediaType(media);
          },
        });
        const file = path.join(outDir, `${slug(route)}-${name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`wrote ${path.relative(process.cwd(), file)}`);
        await page.close();
      }
    }
    // 200% zoom / 320px reflow: no horizontal scroll at 320 CSS px
    for (const route of routes) {
      const { page } = await open(route, 320);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      console.log(`${overflow <= 0 ? 'PASS' : 'FAIL'}  reflow at 320px: ${route.padEnd(18)} horizontal overflow ${overflow}px`);
      if (overflow > 0) process.exitCode = 1;
      await page.close();
    }
  }
} finally {
  await browser.close();
}
