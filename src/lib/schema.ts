/**
 * JSON-LD (schema.org) builders.
 *
 * Every value is read from src/data/*, the same data the visible pages render, so structured data and page
 * text cannot disagree (Google requires structured data to match visible content).
 *
 * Deliberately NOT here: review, rating or aggregateRating markup. Alberta's physician college does not allow
 * testimonials on physician-controlled sites, and Google ignores self-serving review markup.
 * Doctors are modelled as `Person` (not `Physician`): schema.org defines `Physician` as a doctor's office,
 * and only `Person` has `jobTitle` and `worksFor`.
 */
import { clinic, SITE_URL } from '../data/clinic.ts';
import { doctors } from '../data/doctors.ts';
import { coverageLabel, services, treatments } from '../data/services.ts';
import type { Faq } from '../data/faq.ts';
import { formatDays } from './format.ts';
import { weekdayName } from './hours.ts';

export type Json = Record<string, unknown>;

export const ids = {
  clinic: `${SITE_URL}/#clinic`,
  website: `${SITE_URL}/#website`,
  logo: `${SITE_URL}/#logo`,
};

export const LOGO = { path: '/images/logo/pcmc2022logo.png', width: 265, height: 32 };
export const OG_IMAGE = {
  path: '/og/primecare-og.png',
  width: 1200,
  height: 630,
  alt: 'Primecare Medical Clinic, 315 17 Avenue SW, Calgary. Family medicine and rejuvenation.',
};

export const absoluteUrl = (path: string): string => new URL(path, SITE_URL).toString();

export interface Crumb {
  name: string;
  path: string;
}

export interface PageSchemaInput {
  /** Path with leading and trailing slash, for example "/services/". */
  path: string;
  name: string;
  description: string;
  /** ISO date of the last content change. */
  updated: string;
  type?: 'WebPage' | 'ContactPage' | 'CollectionPage' | 'MedicalWebPage';
  /** Trail after Home. Leave empty on the home page. */
  breadcrumbs?: Crumb[];
  faq?: Faq[];
  /** Include the services catalog on the clinic entity. */
  includeServices?: boolean;
  /** Include the doctors, and link them from the clinic entity. */
  includeDoctors?: boolean;
  /** For MedicalWebPage only, when a physician has reviewed the page. */
  lastReviewed?: string;
  reviewedBy?: string;
  extra?: Json[];
}

function openingHoursSpecification(): Json[] {
  const dayOfWeek = clinic.hours.openDays.map(weekdayName);
  return clinic.hours.periods.map((period) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek,
    opens: period.open,
    closes: period.close,
  }));
}

function serviceNodes(): Json[] {
  return services.map((service) => ({
    '@type': 'Offer',
    itemOffered: {
      '@type': service.schemaType,
      name: service.name,
      description: `${service.summary} ${coverageLabel[service.coverage]}.`,
    },
  }));
}

function procedureNodes(): Json[] {
  const procedures: Json[] = treatments.map((treatment) => ({
    '@type': 'MedicalProcedure',
    name: treatment.name,
    description: `${treatment.items.join('. ')}. ${coverageLabel.uninsured}.`,
  }));
  const skinTags = services.find((service) => service.id === 'skin-tag-removal');
  if (skinTags) {
    procedures.push({
      '@type': 'MedicalProcedure',
      name: skinTags.name,
      description: `${skinTags.summary} ${coverageLabel[skinTags.coverage]}.`,
    });
  }
  return procedures;
}

export function clinicNode(options: { includeServices?: boolean; includeDoctors?: boolean } = {}): Json {
  const node: Json = {
    '@type': 'MedicalClinic',
    '@id': ids.clinic,
    name: clinic.name,
    slogan: clinic.tagline,
    url: `${SITE_URL}/`,
    description: clinic.summary,
    telephone: clinic.phone.schema,
    logo: {
      '@type': 'ImageObject',
      '@id': ids.logo,
      url: absoluteUrl(LOGO.path),
      width: LOGO.width,
      height: LOGO.height,
    },
    image: absoluteUrl(OG_IMAGE.path),
    address: {
      '@type': 'PostalAddress',
      streetAddress: clinic.address.street,
      addressLocality: clinic.address.city,
      addressRegion: clinic.address.region,
      postalCode: clinic.address.postalCode,
      addressCountry: clinic.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: clinic.geo.latitude,
      longitude: clinic.geo.longitude,
    },
    hasMap: clinic.maps.pageUrl,
    openingHoursSpecification: openingHoursSpecification(),
    areaServed: { '@type': 'City', name: clinic.address.city },
    medicalSpecialty: 'https://schema.org/PrimaryCare',
    sameAs: [clinic.social.instagram],
  };

  if (options.includeServices) {
    node.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: `Services at ${clinic.name}`,
      itemListElement: serviceNodes(),
    };
    node.availableService = procedureNodes();
  }
  if (options.includeDoctors) {
    node.employee = doctors.map((doctor) => ({ '@id': `${SITE_URL}/doctors/#${doctor.id}` }));
  }
  return node;
}

export function doctorNodes(): Json[] {
  return doctors.map((doctor) => ({
    '@type': 'Person',
    '@id': `${SITE_URL}/doctors/#${doctor.id}`,
    name: doctor.name,
    honorificPrefix: 'Dr.',
    givenName: doctor.givenName,
    familyName: doctor.familyName,
    jobTitle: 'Physician',
    worksFor: { '@id': ids.clinic },
    url: `${SITE_URL}/doctors/`,
    description: `${doctor.name} is a physician at ${clinic.name} in Calgary. ${doctor.name} sees patients ${formatDays(doctor.days)}.`,
  }));
}

export function websiteNode(): Json {
  return {
    '@type': 'WebSite',
    '@id': ids.website,
    url: `${SITE_URL}/`,
    name: clinic.name,
    inLanguage: clinic.locale,
    publisher: { '@id': ids.clinic },
  };
}

function webPageNode(page: PageSchemaInput, url: string): Json {
  const node: Json = {
    '@type': page.type ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: page.name,
    description: page.description,
    inLanguage: clinic.locale,
    isPartOf: { '@id': ids.website },
    about: { '@id': ids.clinic },
    dateModified: page.updated,
  };
  if (page.breadcrumbs?.length) node.breadcrumb = { '@id': `${url}#breadcrumb` };
  if (page.type === 'ContactPage') node.mainEntity = { '@id': ids.clinic };
  if (page.type === 'MedicalWebPage' && page.lastReviewed) {
    node.lastReviewed = page.lastReviewed;
    if (page.reviewedBy) node.reviewedBy = { '@type': 'Person', name: page.reviewedBy };
  }
  return node;
}

function breadcrumbNode(page: PageSchemaInput, url: string): Json {
  const trail: Crumb[] = [{ name: 'Home', path: '/' }, ...(page.breadcrumbs ?? [])];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

function faqNode(faq: Faq[], url: string): Json {
  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/** The complete structured-data graph for one page. */
export function buildGraph(page: PageSchemaInput): Json {
  const url = absoluteUrl(page.path);
  const graph: Json[] = [
    clinicNode({ includeServices: page.includeServices, includeDoctors: page.includeDoctors }),
    websiteNode(),
  ];
  if (page.includeDoctors) graph.push(...doctorNodes());
  graph.push(webPageNode(page, url));
  if (page.breadcrumbs?.length) graph.push(breadcrumbNode(page, url));
  if (page.faq?.length) graph.push(faqNode(page.faq, url));
  if (page.extra) graph.push(...page.extra);
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Serialise for a <script type="application/ld+json"> block. `<` is escaped so the markup can never end the tag. */
export function serializeGraph(graph: Json): string {
  return JSON.stringify(graph).replace(/</g, '\\u003c');
}
