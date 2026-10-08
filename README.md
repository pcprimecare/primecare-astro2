# Primecare Medical Clinic website

The website for Primecare Medical Clinic, 315 17 Avenue SW, Calgary. A static Astro 7 site built to be found by search
engines and understood by AI assistants, and to be easy to use for patients of every age.

## Commands

```bash
npm install            # once
npm run dev            # live site at http://localhost:4321 (physician-review drafts are visible here)
npm run build          # type-check + build to dist/ (also regenerates public/_redirects)
npm run preview        # serve dist/ at http://localhost:4321 (the production build, no drafts)
npm run verify         # everything below in one go: contrast, hours tests, build, SEO/AI audit
```

| Check | Command | What it proves |
|---|---|---|
| Colour contrast | `npm run check:contrast` | Every text/background pair in `src/styles/tokens.css` passes WCAG (body text 7:1) |
| Opening-hours logic | `npm run test:hours` | "Open now" is right across lunch, weekends, Alberta holidays and daylight saving |
| SEO and AI audit | `npm run check:seo` | Titles, descriptions, canonicals, headings, links, images, JSON-LD (and that it matches the page text), sitemap, robots.txt, llms.txt, old-URL redirects, size budgets |
| Browser QA | `npm run qa:a11y`, `qa:keyboard`, `qa:metrics`, `qa:modes`, `qa:shots` | axe accessibility scan, keyboard focus walkthrough, load metrics, reduced-motion / 320px reflow, screenshots. Run `npm run preview` first. Uses the Chrome already installed. |

## Where things live

```
src/data/        THE source of truth: clinic.ts (address, phone, booking links), hours.ts, doctors.ts,
                 services.ts, forms.ts, faq.ts, links.ts, nav.ts, pages.ts (page dates)
src/lib/         schema.ts (JSON-LD), hours.ts (open-now logic), llms.ts (llms.txt), format.ts, content.ts
src/pages/       one file per page, plus llms.txt.ts and llms-full.txt.ts
src/content/     physician-review drafts (services/, rejuvenation/, guides/), see below
src/components/  Header, Footer, OpenStatus, HoursTable, ServiceDirectory, DoctorSchedule, Faq, ...
src/styles/      tokens.css (all colours, type, spacing), global.css
public/          robots.txt, _redirects (generated), _headers, forms/*.pdf, favicon + og image
design-system/   MASTER.md: the design decisions and why (frontend-design + ui-ux-pro-max)
scripts/         the checks above, plus asset helpers
archive/         the previous scaffold, kept on this computer only (not in git). Safe to delete once you are happy.
```

Pages, structured data, `llms.txt` and the audit all read from `src/data/`, so a fact is changed in one place.

## Common changes

| To change | Edit | Then |
|---|---|---|
| Phone, address, booking links | `src/data/clinic.ts` | `npm run verify` |
| Opening hours or an extra closure day | `src/data/hours.ts` (`extraClosedDates`) | `npm run verify` |
| A doctor or their days | `src/data/doctors.ts` | `npm run verify` |
| A service or its AHCIP coverage | `src/data/services.ts` | `npm run verify` |
| Add or rename a PDF form | put the PDF in `public/forms/`, list it in `src/data/forms.ts` | `npm run verify` |
| A page's date ("last updated", sitemap, structured data) | `src/data/pages.ts` | change the date when the content changes |
| Colours or type sizes | `src/styles/tokens.css` | `npm run check:contrast` |

Nothing on the site is invented. If a fact is not in `src/data/`, it is not on the site.

## Publishing the physician-review pages

`src/content/` holds drafts (driver's medical, travel health, skin tag removal, laser, Botox and fillers, microneedling,
and a "when to call 911 / 811" guide). Each has `draft: true`, so they appear in `npm run dev` (with a banner listing what
must be confirmed) and are **not** in the production build. To publish one:

1. A physician reads and approves the text. Resolve every item in its `reviewNotes`.
2. In the file, set `draft: false`. For health content also set `reviewedBy` and `lastReviewed`.
3. `npm run verify`. The page, its sitemap entry and the links to it appear automatically.

## Deploying (Cloudflare Pages)

1. Put the project in a Git repository (`git init`) and push it to GitHub or GitLab.
2. Cloudflare dashboard > Workers & Pages > Create > Pages > connect the repository.
3. Build command `npm run build`, output directory `dist`, environment variable `NODE_VERSION` = `24`.
4. Add the custom domain `primecaremedicalclinic.ca`. Redirect `www` to the bare domain and turn on Always Use HTTPS.
5. Check Cloudflare **Security > Bots / AI Crawl Control**: nothing there may block Googlebot, Bingbot, OAI-SearchBot,
   Claude-SearchBot or PerplexityBot. `public/robots.txt` allows them, but a Cloudflare rule can override it.
6. Retire the old IIS site only after the checks below pass.

After it is live:

```bash
curl -I https://primecaremedicalclinic.ca/services.html     # expect 301 to /services/
curl -I https://primecaremedicalclinic.ca/physicians.html   # expect 301 to /doctors/
curl -I "https://primecaremedicalclinic.ca/assets/docs/patient%20information.pdf"   # expect 301
curl -s https://primecaremedicalclinic.ca/robots.txt | head
```

Then: verify the domain in Google Search Console and submit `https://primecaremedicalclinic.ca/sitemap-index.xml`
(import to Bing Webmaster Tools), and run the Rich Results Test on the home page.

## Off-site work that matters as much as the site

AI answers and local search lean on what other sites say about the clinic. Do these once the site is live:

- **Google Business Profile**: primary category, hours **including the 12 to 1 gap**, services, website, and the appointment link `https://primecaremedicalclinic.ca/book/`.
- **Fix wrong listings.** Medimap lists this phone number at **508 15 Ave SW as a walk-in clinic**. Also check Cortico, Apple Business Connect, Bing Places, Yelp and Facebook. Search the phone number to find them.
- "Primecare Health" (Quarry Park, Grande Prairie and others) is a different organisation. Keep the name, address and phone identical everywhere so assistants do not mix them up.

## What AI assistants and search engines get

- Plain HTML with every fact in text (no JavaScript needed), one `<h1>` per page, real tables for hours and schedules.
- JSON-LD on every page (`MedicalClinic`, doctors as `Person`, `WebSite`, `BreadcrumbList`, `FAQPage` where there are visible FAQs). It is generated from the same data as the page and the audit fails if they differ. No review or rating markup, on purpose.
- `robots.txt` that names each major search and AI crawler and allows it, plus a sitemap with real `lastmod` dates.
- `llms.txt` and `llms-full.txt`. Honest note: no major AI product has documented using them, so treat them as a free extra.
  Google says AI Overviews and AI Mode need no special files, only crawlable, indexed, accurate pages.
- 301 redirects from every old URL, so existing search rankings and links carry over.

## Rules this site follows

- **No testimonials, reviews, star ratings or patient photos.** The College of Physicians & Surgeons of Alberta does not allow testimonials on
  physician-controlled sites, and Google ignores self-serving review markup. (This is not legal advice. The clinic should confirm its own advertising compliance.)
- Every service is tagged **Covered by AHCIP** or **Not covered by AHCIP**.
- Two outcome promises on the old Rejuvenation page ("long-lasting" laser hair removal, "glowing skin without makeup") were left out. Reinstate them only after a compliance check.
- No cookies, analytics or forms. The map loads from Google only when a visitor asks for it.

## Open items for the clinic

None blocks the site; each one unlocks more content or fixes a soft spot.

1. **Vector logo** (SVG, AI or EPS). The current logo is 265 x 32 pixels and looks soft on high-density phone screens. This is the only point Lighthouse deducts.
2. **Postal code**: the old site text says T2S 0A5, but its embedded map says T2S 0A9. Confirm with Canada Post. It is set in `src/data/clinic.ts`.
3. Fax number (the old Contact page mentions fax but gives none); statutory-holiday closure dates beyond Alberta's general holidays.
4. Accepting new patients? Languages spoken? Calgary West Central PCN membership, nurse and psychologist on the team? (A UCalgary listing mentions them; not published until confirmed.)
5. For each doctor: credentials, CPSA registration, a short biography, a photo, who performs the aesthetic treatments.
6. The real list of **insured** services (the old site repeats the uninsured list under "general services"), and optionally fees for uninsured services.
7. Real photos of the entrance, reception and team (with consent). No stock photos.
8. Sign-off on: the privacy notice (`src/pages/privacy.astro`), use of the brand name "Botox" in headings, how before and after images are handled.
9. Confirm patients are seen by appointment only (the site says "by appointment"; Medimap's walk-in listing contradicts it).
