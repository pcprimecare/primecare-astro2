/**
 * External health-information links.
 * Source: the Health Info page of the clinic's live site (2026-10-08). The old page left Alberta Health Link
 * and Alberta Health Services unlinked in the visible text; the targets below are the hrefs in its HTML.
 */
export interface ExternalLink {
  title: string;
  url: string;
  /** One plain sentence about what the visitor will find. */
  description: string;
}

export const healthCanadaLinks: ExternalLink[] = [
  {
    title: 'Food and nutrition, Health Canada',
    url: 'https://www.canada.ca/en/health-canada/services/food-nutrition.html',
    description: 'Government of Canada information on food and nutrition.',
  },
  {
    title: 'Health Canada',
    url: 'https://www.canada.ca/en/health-canada.html',
    description: 'The Government of Canada department for health.',
  },
];

export const albertaLinks: ExternalLink[] = [
  {
    title: 'Alberta Health Link (811)',
    url: 'https://myhealth.alberta.ca/',
    description: 'Health information from Alberta Health Services, including how to reach Health Link.',
  },
  {
    title: 'Alberta Health Services',
    url: 'https://www.albertahealthservices.ca',
    description: "Alberta's provincial health authority.",
  },
  {
    title: 'Inform Alberta: directory of community, health and social services',
    url: 'https://informalberta.ca/public/common/search.do',
    description: 'A searchable directory of community, health and social services in Alberta.',
  },
];
