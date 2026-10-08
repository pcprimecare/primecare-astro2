// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { SITE_URL } from './src/data/clinic.ts';
import { updatedFor } from './src/data/pages.ts';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,

  // One URL per page: /services/ (never /services or /services.html). Redirects for the old URLs live in public/_redirects.
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },

  // Astro 7 defaults to 'jsx', which strips the space between inline elements. 'true' keeps one space.
  compressHTML: true,

  // Markdown (the physician-review pages in src/content) keeps straight apostrophes, like the rest of the site's text,
  // so what a visitor reads matches the titles, structured data and FAQ answers exactly.
  markdown: {
    processor: satteri({ features: { smartPunctuation: false } }),
  },

  // The site ships almost no JavaScript, so there is nothing for a prefetcher to improve.
  prefetch: false,
  devToolbar: { enabled: false },

  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      // <lastmod> is the date the page's content last changed (src/data/pages.ts), not the build time.
      serialize(item) {
        item.lastmod = updatedFor(new URL(item.url).pathname);
        return item;
      },
    }),
  ],

  // Fonts are downloaded at build time and served from this site: no request to Google when a visitor loads a page.
  // Literata (headings) for comfortable on-screen reading; Atkinson Hyperlegible Next (body and interface),
  // designed by the Braille Institute for low-vision legibility.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Literata',
      cssVariable: '--font-heading',
      // 400 to 700: headings use 600-700; phone numbers and times use 500 (see .figures in global.css).
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Atkinson Hyperlegible Next',
      cssVariable: '--font-body',
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
    },
  ],

  vite: {
    build: {
      // Never inline scripts into the HTML, so the Content-Security-Policy in public/_headers can stay strict.
      assetsInlineLimit: 0,
    },
  },
});
