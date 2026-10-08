/**
 * Builds /llms.txt (a short, curated map of the site) and /llms-full.txt (the whole site as plain text),
 * from the same data the pages use. Honest expectation: no major AI search product has documented using
 * llms.txt, so this is a low-cost extra for AI agents and developer tools, not a ranking lever. What matters
 * for AI answers is crawlable HTML, accurate structured data and consistent listings.
 */
import { clinic, SITE_URL } from '../data/clinic.ts';
import { doctors } from '../data/doctors.ts';
import { faqBook, faqContact, faqDoctors, faqHome, faqRejuvenation, faqServices } from '../data/faq.ts';
import { forms } from '../data/forms.ts';
import { albertaLinks, healthCanadaLinks } from '../data/links.ts';
import { coverageLabel, services, treatments } from '../data/services.ts';
import { formatDays } from './format.ts';
import { formatTime, weekdayName } from './hours.ts';

const url = (path: string) => `${SITE_URL}${path}`;
const hoursLine = `${formatDays(clinic.hours.openDays)}, ${clinic.hours.periods
  .map((p) => `${formatTime(p.open)} to ${formatTime(p.close)}`)
  .join(' and ')}. ${clinic.closedNote}`;

const summary = `${clinic.summary} Phone ${clinic.phone.display}. Open ${hoursLine}`;

export function buildLlmsTxt(): string {
  return [
    `# ${clinic.name}`,
    '',
    `> ${summary}`,
    '',
    `Online appointment requests must be made ${clinic.booking.leadTime} in advance. ${clinic.booking.notAllOnline} The clinic does not use email for patient communication.`,
    '',
    '## Key facts',
    `- Address: ${clinic.address.line}`,
    `- Phone: ${clinic.phone.display}`,
    `- Hours: ${hoursLine}`,
    `- Doctors: ${doctors.map((d) => `${d.name} (${formatDays(d.days)})`).join('; ')}`,
    `- Not covered by Alberta Health Care Insurance (AHCIP): ${services
      .filter((s) => s.coverage === 'uninsured')
      .map((s) => s.name)
      .join('; ')}`,
    '',
    '## Pages',
    `- [Home](${url('/')}): who we are, today's hours, how to book`,
    `- [Services and coverage](${url('/services/')}): family medicine and uninsured services, with AHCIP coverage for each`,
    `- [Rejuvenation and aesthetics](${url('/rejuvenation/')}): Botox and fillers, laser, skin tightening, skin rejuvenation`,
    `- [Doctors](${url('/doctors/')}): the doctors and the days each sees patients`,
    `- [Book an appointment](${url('/book/')}): online booking rules and links`,
    `- [Contact and hours](${url('/contact/')}): address, phone, directions, email policy`,
    '',
    '## Booking',
    `- [Medical appointments](${clinic.booking.medical.url}): booking site for medical appointments (${clinic.booking.medical.provider})`,
    `- [Rejuvenation appointments](${clinic.booking.rejuvenation.url}): booking site for rejuvenation appointments (${clinic.booking.rejuvenation.provider})`,
    '',
    '## Optional',
    `- [Patient forms](${url('/forms/')}): ${forms.length} downloadable PDF forms`,
    `- [Health information](${url('/health-info/')}): links to Health Canada and Alberta health services`,
    `- [Full text of this site](${url('/llms-full.txt')}): every page as plain text`,
    '',
  ].join('\n');
}

const faqBlock = (title: string, items: { q: string; a: string }[]) => [
  `### ${title}`,
  ...items.flatMap((item) => [`Q: ${item.q}`, `A: ${item.a}`, '']),
];

export function buildLlmsFull(): string {
  return [
    `# ${clinic.name}: full site text`,
    '',
    `> ${summary}`,
    '',
    `Source: ${SITE_URL}/ . Generated from the site's data at build time. For the current version of any page, use its URL.`,
    '',
    '## About the clinic',
    `${clinic.name} (tagline: "${clinic.tagline}") is a family practice in Calgary, Alberta. Doctors see patients from newborn to elderly. Patients are seen by appointment. The clinic also offers rejuvenation and aesthetic treatments.`,
    '',
    `- Address: ${clinic.address.line}, Canada`,
    `- Phone: ${clinic.phone.display}`,
    `- Hours: ${hoursLine}`,
    `- Instagram: ${clinic.social.instagram}`,
    `- ${clinic.emergency.call911} ${clinic.emergency.healthLink}`,
    '',
    `## How to book (${url('/book/')})`,
    `- Medical appointments: ${clinic.booking.medical.url}`,
    `- Rejuvenation appointments: ${clinic.booking.rejuvenation.url}`,
    `- Online requests must be made ${clinic.booking.leadTime} in advance. ${clinic.booking.notAllOnline}`,
    `- For an earlier appointment, or if you do not find the right time, call ${clinic.phone.display} when the clinic is open.`,
    '',
    `## Services and coverage (${url('/services/')})`,
    ...services.map((s) => `- ${s.name}: ${s.summary} ${coverageLabel[s.coverage]}.`),
    '',
    `## Rejuvenation and aesthetics (${url('/rejuvenation/')})`,
    'Rejuvenation and aesthetic treatments are available by appointment. Treatments use medical devices. Not covered by AHCIP.',
    ...treatments.flatMap((t) => [`### ${t.name}`, ...t.items.map((item) => `- ${item}`)]),
    '',
    `## Doctors (${url('/doctors/')})`,
    ...doctors.map((d) => `- ${d.name}: sees patients ${formatDays(d.days)}.`),
    `Days the clinic is open: ${clinic.hours.openDays.map(weekdayName).join(', ')}.`,
    '',
    `## Contact (${url('/contact/')})`,
    `${clinic.emailPolicy.title}. ${clinic.emailPolicy.intro} ${clinic.emailPolicy.topics.join('; ')}. ${clinic.emailPolicy.outro}`,
    '',
    `## Patient forms (${url('/forms/')})`,
    ...forms.map((f) => `- ${f.title}: ${url(`/forms/${f.file}`)}`),
    '',
    `## Health information (${url('/health-info/')})`,
    ...[...healthCanadaLinks, ...albertaLinks].map((l) => `- ${l.title}: ${l.url}`),
    '',
    '## Frequently asked questions',
    ...faqBlock('Home', faqHome),
    ...faqBlock('Booking', faqBook),
    ...faqBlock('Services', faqServices),
    ...faqBlock('Rejuvenation', faqRejuvenation),
    ...faqBlock('Doctors', faqDoctors),
    ...faqBlock('Contact', faqContact),
  ].join('\n');
}
