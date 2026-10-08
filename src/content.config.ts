/**
 * Content collections for pages that need a physician's approval before they go live.
 *
 * Every page here starts as `draft: true`. Drafts are visible in `npm run dev` (with a banner listing what must
 * be confirmed) and are NOT built into production. To publish one: a physician approves the text, the
 * `reviewNotes` are resolved, and `draft` is set to `false`. For health content also set `lastReviewed` and
 * `reviewedBy`, which feed the page's "reviewed by" line and its MedicalWebPage structured data.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const detailPage = z.object({
  /** <title>, 30 to 62 characters. */
  title: z.string().min(30).max(62),
  /** Meta description, 70 to 160 characters. */
  description: z.string().min(70).max(160),
  h1: z.string().min(5),
  /** One or two plain sentences under the heading. */
  lede: z.string().min(40).max(320),
  /** Date the content last changed. Drives lastmod and dateModified. */
  updated: z.coerce.date(),
  draft: z.boolean().default(true),
  coverage: z.enum(['ahcip', 'uninsured']).optional(),
  booking: z.enum(['medical', 'rejuvenation']).default('medical'),
  /** Services-directory row ids this page covers, when different from the file name. */
  serviceIds: z.array(z.string()).default([]),
  /** Set both when a physician has reviewed a health page. */
  reviewedBy: z.string().optional(),
  lastReviewed: z.coerce.date().optional(),
  /** Things the clinic must confirm or supply before this page is published. Shown on drafts in dev only. */
  reviewNotes: z.array(z.string()).default([]),
  faq: z.array(z.object({ q: z.string().min(5), a: z.string().min(10) })).default([]),
  /** Official sources the page relies on. Shown as a list on the page. */
  sources: z.array(z.object({ title: z.string(), url: z.url() })).default([]),
});

const make = (directory: string) =>
  defineCollection({
    loader: glob({ pattern: '**/*.md', base: `./src/content/${directory}` }),
    schema: detailPage,
  });

export const collections = {
  services: make('services'),
  rejuvenation: make('rejuvenation'),
  guides: make('guides'),
};
