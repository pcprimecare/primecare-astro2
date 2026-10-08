// Audits the BUILT site (dist/) for search-engine and AI-assistant readiness.
//
//   npm run build && npm run check:seo        (or: npm run build:fast && npm run check:seo)
//
// It fails (exit 1) on anything that would hurt search or make structured data disagree with the page text:
// titles, descriptions, canonicals, headings, images, links, JSON-LD validity and parity with visible text,
// the sitemap, robots.txt, llms.txt, redirects from the old URLs, and size budgets.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import * as cheerio from 'cheerio';
import sharp from 'sharp';

const root = process.cwd();
const dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) {
  console.error('dist/ not found. Run `npm run build` (or `npm run build:fast`) first.');
  process.exit(1);
}

const { clinic, SITE_URL } = await import('../src/data/clinic.ts');
const { forms } = await import('../src/data/forms.ts');
const { weekdayName } = await import('../src/lib/hours.ts');
const { updatedFor } = await import('../src/data/pages.ts');

const failures = [];
const warnings = [];
const fail = (where, message) => failures.push({ where, message });
const warn = (where, message) => warnings.push({ where, message });

const gzip = (buffer) => zlib.gzipSync(buffer, { level: 9 }).length;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const normalise = (text) => text.replace(/\s+/g, ' ').trim();

// ---------- discover built pages ----------
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
const allFiles = walk(dist);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));

const routeOf = (file) => {
  const rel = path.relative(dist, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404/';
  return `/${rel.replace(/index\.html$/, '')}`;
};

/** Does an internal URL (path only, no hash) exist in dist? */
function existsInDist(urlPath) {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  if (clean === '/404/') return fs.existsSync(path.join(dist, '404.html'));
  if (clean.endsWith('/')) return fs.existsSync(path.join(dist, clean, 'index.html'));
  return fs.existsSync(path.join(dist, clean)) || fs.existsSync(path.join(dist, clean, 'index.html'));
}

const pages = new Map(); // route -> { $, html, text, ids }
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html);
  const body = $('body').clone();
  body.find('script, style, noscript, template').remove();
  const ids = new Set();
  $('[id]').each((_, el) => ids.add($(el).attr('id')));
  pages.set(routeOf(file), { file, html, $, text: normalise(body.text()), ids });
}

// ---------- per-page checks ----------
const titles = new Map();
const descriptions = new Map();
const rows = [];

const BANNED = [/\bTODO\b/, /\bFIXME\b/, /lorem ipsum/i, /\bundefined\b/, /\[object Object\]/, /\bNaN\b/, /coming soon/i];

function collectRefs(node, refs) {
  if (Array.isArray(node)) return node.forEach((item) => collectRefs(item, refs));
  if (node && typeof node === 'object') {
    const keys = Object.keys(node);
    if (keys.length === 1 && keys[0] === '@id') refs.push(node['@id']);
    else keys.forEach((key) => collectRefs(node[key], refs));
  }
}

function findKeys(node, names, found = []) {
  if (Array.isArray(node)) node.forEach((item) => findKeys(item, names, found));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (names.includes(key)) found.push(key);
      findKeys(value, names, found);
    }
  }
  return found;
}

for (const [route, page] of pages) {
  const { $, html, text, ids } = page;
  const is404 = route === '/404/';
  const here = route;

  // Document basics
  if ($('html').attr('lang') !== 'en-CA') fail(here, `<html lang> is "${$('html').attr('lang')}", expected en-CA`);
  if ($('meta[charset]').length !== 1) fail(here, 'needs exactly one <meta charset>');
  if (!/width=device-width/.test($('meta[name="viewport"]').attr('content') ?? '')) fail(here, 'missing responsive viewport meta');
  if (/user-scalable=no|maximum-scale=1\b/.test($('meta[name="viewport"]').attr('content') ?? '')) fail(here, 'viewport must not block zoom');

  // Title
  const titleTags = $('head > title');
  const title = titleTags.first().text().trim();
  if (titleTags.length !== 1) fail(here, `expected one <title>, found ${titleTags.length}`);
  if (title.length < 25 || title.length > 62) fail(here, `title is ${title.length} characters (want 25 to 62): "${title}"`);
  if (titles.has(title)) fail(here, `duplicate title also on ${titles.get(title)}`);
  titles.set(title, here);

  // Description
  const descTags = $('meta[name="description"]');
  const description = (descTags.first().attr('content') ?? '').trim();
  if (descTags.length !== 1) fail(here, `expected one meta description, found ${descTags.length}`);
  if (description.length < 70 || description.length > 165) fail(here, `description is ${description.length} characters (want 70 to 165)`);
  if (descriptions.has(description)) fail(here, `duplicate description also on ${descriptions.get(description)}`);
  descriptions.set(description, here);

  // Canonical and robots
  const canonicals = $('link[rel="canonical"]');
  const canonical = canonicals.first().attr('href');
  const expectedCanonical = `${SITE_URL}${is404 ? '/404/' : route}`;
  if (canonicals.length !== 1) fail(here, `expected one canonical, found ${canonicals.length}`);
  else if (!is404 && canonical !== expectedCanonical) fail(here, `canonical is ${canonical}, expected ${expectedCanonical}`);
  const robots = $('meta[name="robots"]').attr('content') ?? '';
  if (is404 && !/noindex/.test(robots)) fail(here, '404 page must be noindex');
  if (!is404 && /noindex/.test(robots)) fail(here, `indexable page has robots "${robots}"`);

  // Open Graph and social
  for (const prop of ['og:title', 'og:description', 'og:type', 'og:url', 'og:image', 'og:site_name', 'og:locale']) {
    const count = $(`meta[property="${prop}"]`).length;
    if (count !== 1) fail(here, `expected one ${prop}, found ${count}`);
  }
  if (!is404 && $('meta[property="og:url"]').attr('content') !== canonical) fail(here, 'og:url differs from the canonical');
  const ogImage = $('meta[property="og:image"]').attr('content') ?? '';
  if (!ogImage.startsWith(SITE_URL)) fail(here, `og:image is not absolute on ${SITE_URL}: ${ogImage}`);
  else if (!existsInDist(ogImage.replace(SITE_URL, ''))) fail(here, `og:image file is missing from dist: ${ogImage}`);

  // Landmarks and structure
  if ($('main').length !== 1) fail(here, `expected one <main>, found ${$('main').length}`);
  if ($('a.skip-link[href="#main"]').length !== 1 || !ids.has('main')) fail(here, 'skip link or #main target is missing');
  const h1s = $('h1');
  if (h1s.length !== 1) fail(here, `expected one <h1>, found ${h1s.length}`);
  const navs = $('nav');
  navs.each((_, el) => {
    if (!$(el).attr('aria-label')) fail(here, 'a <nav> has no aria-label');
  });

  // Heading order: never skip a level going down
  let previous = 0;
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = Number(el.tagName.slice(1));
    if (previous && level > previous + 1) fail(here, `heading level jumps from h${previous} to h${level}: "${normalise($(el).text()).slice(0, 50)}"`);
    previous = level;
  });

  // Duplicate ids
  const seen = new Set();
  $('[id]').each((_, el) => {
    const id = $(el).attr('id');
    if (seen.has(id)) fail(here, `duplicate id "${id}"`);
    seen.add(id);
  });

  // Images
  $('img').each((_, el) => {
    const img = $(el);
    if (img.attr('alt') === undefined) fail(here, `<img src="${img.attr('src')}"> has no alt attribute`);
    if (!img.attr('width') || !img.attr('height')) fail(here, `<img src="${img.attr('src')}"> has no width/height (causes layout shift)`);
  });

  // Links
  $('a').each((_, el) => {
    const a = $(el);
    const href = a.attr('href');
    const label = normalise(a.text()) || a.attr('aria-label') || a.find('img[alt]').attr('alt') || '';
    if (!href) return fail(here, `<a> without href: "${label}"`);
    if (!label) fail(here, `link to ${href} has no accessible name`);
    if (a.attr('target') === '_blank' && !/noopener/.test(a.attr('rel') ?? '')) fail(here, `target=_blank without rel=noopener: ${href}`);
    if (/^(https?:|mailto:|tel:)/.test(href)) {
      if (href.startsWith(SITE_URL)) fail(here, `internal link written as an absolute URL: ${href}`);
      return;
    }
    const [urlPath, hash] = href.split('#');
    const targetPath = urlPath === '' ? route : urlPath;
    if (!targetPath.startsWith('/')) return fail(here, `relative link "${href}" (use root-relative paths)`);
    if (!existsInDist(targetPath)) return fail(here, `broken internal link: ${href}`);
    if (hash) {
      const target = pages.get(targetPath.endsWith('/') ? targetPath : `${targetPath}/`);
      if (target && !target.ids.has(hash)) fail(here, `link ${href} points to a missing #${hash} anchor`);
    }
  });

  // Scripts: only JSON-LD may be inline, so a strict Content-Security-Policy works
  $('script').each((_, el) => {
    const script = $(el);
    if (script.attr('src') || script.attr('type') === 'application/ld+json') return;
    fail(here, 'inline <script> found (breaks the strict CSP in public/_headers)');
  });

  // Banned placeholder text
  for (const pattern of BANNED) if (pattern.test(text)) fail(here, `visible text contains ${pattern}`);

  // Facts must be present as plain text in the HTML
  if (!text.includes(clinic.phone.display)) fail(here, `phone ${clinic.phone.display} is not in the page text`);
  if (!text.includes(clinic.address.street)) fail(here, `address ${clinic.address.street} is not in the page text`);

  // ---------- JSON-LD ----------
  const blocks = $('script[type="application/ld+json"]');
  if (blocks.length !== 1) fail(here, `expected one JSON-LD block, found ${blocks.length}`);
  let graph = null;
  try {
    graph = JSON.parse(blocks.first().text());
  } catch (error) {
    fail(here, `JSON-LD does not parse: ${error.message}`);
  }
  if (graph) {
    const nodes = graph['@graph'] ?? [];
    if (graph['@context'] !== 'https://schema.org') fail(here, 'JSON-LD @context is not https://schema.org');
    const defined = new Set(nodes.map((node) => node['@id']).filter(Boolean));
    const refs = [];
    collectRefs(nodes, refs);
    for (const ref of refs) if (!defined.has(ref)) fail(here, `JSON-LD references ${ref}, which is not defined on the page`);
    const banned = findKeys(nodes, ['aggregateRating', 'review', 'reviews', 'ratingValue', 'reviewRating']);
    if (banned.length) fail(here, `JSON-LD contains review/rating markup (${[...new Set(banned)].join(', ')}). Not allowed for a physician-run site.`);

    const clinicNode = nodes.find((node) => node['@type'] === 'MedicalClinic');
    if (!clinicNode) fail(here, 'JSON-LD has no MedicalClinic node');
    else {
      if (clinicNode.telephone !== clinic.phone.schema) fail(here, `JSON-LD telephone ${clinicNode.telephone} != ${clinic.phone.schema}`);
      if (clinicNode.address?.streetAddress !== clinic.address.street) fail(here, 'JSON-LD streetAddress differs from clinic data');
      if (clinicNode.address?.postalCode !== clinic.address.postalCode) fail(here, 'JSON-LD postalCode differs from clinic data');
      const specs = clinicNode.openingHoursSpecification ?? [];
      clinic.hours.periods.forEach((period, index) => {
        const spec = specs[index];
        const days = clinic.hours.openDays.map(weekdayName);
        if (!spec || spec.opens !== period.open || spec.closes !== period.close || JSON.stringify(spec.dayOfWeek) !== JSON.stringify(days))
          fail(here, `JSON-LD opening hours entry ${index + 1} differs from clinic data`);
      });
    }

    // FAQ: every question and answer in the JSON-LD must be visible on the page
    for (const faq of nodes.filter((node) => node['@type'] === 'FAQPage')) {
      for (const item of faq.mainEntity ?? []) {
        if (!text.includes(normalise(item.name))) fail(here, `FAQ question not visible on page: "${item.name}"`);
        if (!text.includes(normalise(item.acceptedAnswer?.text ?? ''))) fail(here, `FAQ answer not visible on page for: "${item.name}"`);
      }
    }

    // Breadcrumbs: JSON-LD names must match the visible trail
    const crumbNode = nodes.find((node) => node['@type'] === 'BreadcrumbList');
    if (crumbNode) {
      const visible = $('nav[aria-label="Breadcrumb"] li').map((_, el) => normalise($(el).text())).get();
      const structured = crumbNode.itemListElement.map((item) => item.name);
      if (JSON.stringify(visible) !== JSON.stringify(structured)) fail(here, `breadcrumbs differ: visible ${JSON.stringify(visible)} vs JSON-LD ${JSON.stringify(structured)}`);
    } else if (route !== '/' && !is404) {
      fail(here, 'inner page has no BreadcrumbList');
    }

    // dateModified must equal the visible "Last updated" date
    const webPage = nodes.find((node) => /WebPage$|ContactPage$/.test(node['@type']));
    const shown = $('footer .site-footer__updated time').attr('datetime');
    if (!shown) fail(here, 'footer has no visible "last updated" date');
    if (webPage && shown && webPage.dateModified !== shown) fail(here, `dateModified ${webPage.dateModified} != visible ${shown}`);
    if (webPage && !is404 && webPage.dateModified !== updatedFor(route) && !/\/(services|rejuvenation|health-info)\/[^/]+\//.test(route))
      warn(here, `dateModified ${webPage.dateModified} differs from src/data/pages.ts (${updatedFor(route)})`);
  }

  rows.push({ route, title: title.length, description: description.length, htmlGz: gzip(Buffer.from(html)) });
}

// ---------- sitewide: sitemap ----------
const sitemapIndex = path.join(dist, 'sitemap-index.xml');
if (!fs.existsSync(sitemapIndex)) fail('sitemap', 'dist/sitemap-index.xml is missing');
else {
  const childFiles = [...fs.readFileSync(sitemapIndex, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const entries = [];
  for (const loc of childFiles) {
    const file = path.join(dist, new URL(loc).pathname);
    if (!fs.existsSync(file)) fail('sitemap', `listed sitemap ${loc} is missing from dist`);
    else {
      const xml = fs.readFileSync(file, 'utf8');
      for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
        entries.push({ loc: m[1].match(/<loc>([^<]+)<\/loc>/)?.[1], lastmod: m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] });
      }
    }
  }
  const sitemapRoutes = new Set(entries.map((entry) => new URL(entry.loc).pathname));
  for (const route of pages.keys()) {
    if (route === '/404/') {
      if (sitemapRoutes.has(route)) fail('sitemap', '404 page must not be in the sitemap');
      continue;
    }
    if (!sitemapRoutes.has(route)) fail('sitemap', `page ${route} is not in the sitemap`);
  }
  for (const entry of entries) {
    const urlPath = new URL(entry.loc).pathname;
    if (!entry.loc.startsWith(SITE_URL)) fail('sitemap', `entry is not on ${SITE_URL}: ${entry.loc}`);
    if (!pages.has(urlPath)) fail('sitemap', `entry has no built page: ${entry.loc}`);
    if (!entry.lastmod) fail('sitemap', `entry has no <lastmod>: ${entry.loc}`);
    else if (!/^\d{4}-\d{2}-\d{2}/.test(entry.lastmod)) fail('sitemap', `bad <lastmod> "${entry.lastmod}" on ${entry.loc}`);
  }
}

// ---------- sitewide: robots.txt ----------
const robotsFile = path.join(dist, 'robots.txt');
if (!fs.existsSync(robotsFile)) fail('robots.txt', 'missing');
else {
  const robots = fs.readFileSync(robotsFile, 'utf8');
  if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap-index.xml`)) fail('robots.txt', 'missing the Sitemap: line');
  const groups = robots.split(/\n\s*\n/);
  const wildcard = groups.find((group) => /User-agent:\s*\*/i.test(group)) ?? '';
  if (/^Disallow:\s*\/\s*$/m.test(wildcard)) fail('robots.txt', 'blocks everything for User-agent: *');
  const wanted = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended'];
  for (const bot of wanted) {
    const group = groups.find((g) => new RegExp(`User-agent:\\s*${bot}\\b`, 'i').test(g));
    if (!group) fail('robots.txt', `no explicit rule for ${bot}`);
    else if (/^Disallow:\s*\/\s*$/m.test(group)) fail('robots.txt', `${bot} is blocked, but the policy is to allow all major AI crawlers`);
  }
}

// ---------- sitewide: llms.txt ----------
for (const name of ['llms.txt', 'llms-full.txt']) {
  const file = path.join(dist, name);
  if (!fs.existsSync(file)) {
    fail(name, 'missing');
    continue;
  }
  const body = fs.readFileSync(file, 'utf8');
  if (!body.startsWith('# ')) fail(name, 'must start with a "# " title');
  if (!body.includes(clinic.phone.display)) fail(name, 'phone number missing');
  if (!body.includes(clinic.address.street)) fail(name, 'address missing');
  for (const m of body.matchAll(/\]\((https:\/\/primecaremedicalclinic\.ca[^)\s]*)\)/g)) {
    if (!existsInDist(new URL(m[1]).pathname)) fail(name, `links to a page that does not exist: ${m[1]}`);
  }
}

// ---------- sitewide: redirects, headers, forms, icons ----------
const redirectsFile = path.join(dist, '_redirects');
if (!fs.existsSync(redirectsFile)) fail('_redirects', 'missing');
else {
  const rules = fs
    .readFileSync(redirectsFile, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/));
  const byFrom = new Map(rules.map(([from, to, status]) => [from, { to, status }]));
  const required = ['/index.html', '/services.html', '/rejuvenation.html', '/physicians.html', '/forms.html', '/healthinfo.html', '/contact.html'];
  for (const from of required) if (!byFrom.has(from)) fail('_redirects', `no redirect for old URL ${from}`);
  for (const form of forms) {
    const from = `/assets/docs/${encodeURIComponent(form.legacyFile)}`;
    if (!byFrom.has(from)) fail('_redirects', `no redirect for old form ${form.legacyFile}`);
  }
  for (const [from, { to, status }] of byFrom) {
    if (status !== '301') fail('_redirects', `${from} uses status ${status}, expected 301`);
    if (!existsInDist(to)) fail('_redirects', `${from} redirects to ${to}, which does not exist`);
  }
}
if (!fs.existsSync(path.join(dist, '_headers'))) fail('_headers', 'missing');
else if (!/Content-Security-Policy/.test(fs.readFileSync(path.join(dist, '_headers'), 'utf8'))) fail('_headers', 'no Content-Security-Policy');

for (const form of forms) {
  const file = path.join(dist, 'forms', form.file);
  if (!fs.existsSync(file)) fail('forms', `missing PDF ${form.file}`);
  else if (fs.readFileSync(file).subarray(0, 5).toString('latin1') !== '%PDF-') fail('forms', `${form.file} is not a PDF`);
}
for (const icon of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) {
  if (!fs.existsSync(path.join(dist, icon))) fail('icons', `missing ${icon}`);
}
const ogFile = path.join(dist, 'og', 'primecare-og.png');
if (fs.existsSync(ogFile)) {
  const meta = await sharp(ogFile).metadata();
  if (meta.width !== 1200 || meta.height !== 630) fail('og image', `is ${meta.width}x${meta.height}, expected 1200x630`);
} else fail('og image', 'public/og/primecare-og.png is missing');

// ---------- budgets ----------
const assets = allFiles.filter((file) => file.includes(`${path.sep}_astro${path.sep}`));
const cssGz = assets.filter((f) => f.endsWith('.css')).reduce((sum, f) => sum + gzip(fs.readFileSync(f)), 0);
const jsGz = assets.filter((f) => f.endsWith('.js')).reduce((sum, f) => sum + gzip(fs.readFileSync(f)), 0);
const fontBytes = assets.filter((f) => /\.woff2$/.test(f)).reduce((sum, f) => sum + fs.statSync(f).size, 0);
const worstHtml = Math.max(...rows.map((row) => row.htmlGz));
if (cssGz > 15 * 1024) fail('budget', `CSS is ${kb(cssGz)} gzipped (budget 15 KB)`);
if (jsGz > 8 * 1024) fail('budget', `JavaScript is ${kb(jsGz)} gzipped (budget 8 KB)`);
if (worstHtml > 25 * 1024) fail('budget', `largest page is ${kb(worstHtml)} gzipped (budget 25 KB)`);
if (fontBytes > 160 * 1024) fail('budget', `fonts total ${kb(fontBytes)} (budget 160 KB)`);

// ---------- report ----------
console.log(`\nSEO / AI readiness audit of dist/  (${pages.size} pages)\n`);
console.log('page'.padEnd(34), 'title', 'desc', 'html(gz)');
for (const row of rows.sort((a, b) => a.route.localeCompare(b.route))) {
  console.log(row.route.padEnd(34), String(row.title).padStart(5), String(row.description).padStart(4), kb(row.htmlGz).padStart(9));
}
console.log(`\nassets: CSS ${kb(cssGz)} gz | JS ${kb(jsGz)} gz | fonts ${kb(fontBytes)} | JSON-LD on every page`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  WARN  ${w.where}: ${w.message}`);
}
if (failures.length) {
  console.log(`\n${failures.length} FAILURE(S):`);
  for (const f of failures) console.log(`  FAIL  ${f.where}: ${f.message}`);
  process.exit(1);
}
console.log('\nAll checks passed.');
