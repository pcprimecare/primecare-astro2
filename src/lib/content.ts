/**
 * Which approval-gated pages are live. In production only `draft: false` pages exist;
 * in `npm run dev` drafts are included so they can be reviewed.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

type Name = 'services' | 'rejuvenation' | 'guides';

export const isLive = (entry: CollectionEntry<Name>): boolean => import.meta.env.DEV || !entry.data.draft;

export async function liveEntries(name: Name) {
  return getCollection(name, ({ data }) => import.meta.env.DEV || !data.draft);
}

/** Directory row id -> path of its published detail page. */
export async function serviceLinks(): Promise<Record<string, string>> {
  const entries = await liveEntries('services');
  const links: Record<string, string> = {};
  for (const entry of entries) {
    const ids = entry.data.serviceIds.length > 0 ? entry.data.serviceIds : [entry.id];
    for (const id of ids) links[id] = `/services/${entry.id}/`;
  }
  return links;
}

/** Treatment id -> path of its published detail page. */
export async function treatmentLinks(): Promise<Record<string, string>> {
  const entries = await liveEntries('rejuvenation');
  return Object.fromEntries(entries.map((entry) => [entry.id, `/rejuvenation/${entry.id}/`]));
}
