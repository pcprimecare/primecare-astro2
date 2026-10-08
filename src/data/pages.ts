/**
 * The date each page's content last changed (ISO, "YYYY-MM-DD").
 *
 * One value drives three things so they always agree: the sitemap <lastmod>, the JSON-LD `dateModified`,
 * and the visible "Last updated" line. Change the date when the page's content changes, not on every build.
 * A build-time "now" in <lastmod> is ignored by search engines because it changes on every deploy.
 */
export const DEFAULT_UPDATED = '2026-10-08';

export const pageUpdated: Record<string, string> = {
  '/': '2026-10-08',
  '/book/': '2026-10-08',
  '/services/': '2026-10-08',
  '/rejuvenation/': '2026-10-08',
  '/doctors/': '2026-10-08',
  '/forms/': '2026-10-08',
  '/health-info/': '2026-10-08',
  '/contact/': '2026-10-08',
  '/privacy/': '2026-10-08',
  '/accessibility/': '2026-10-08',
};

export function updatedFor(pathname: string): string {
  return pageUpdated[pathname] ?? DEFAULT_UPDATED;
}

/** "2026-10-08" -> "October 8, 2026" (Canadian English, no day-of-week) */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).toLocaleDateString('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
