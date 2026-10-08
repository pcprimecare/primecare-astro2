/**
 * Frequently asked questions, written only from facts the clinic has published.
 * Answers are plain text so the visible answer and the FAQPage JSON-LD are identical.
 * Everything that can be derived from clinic data is derived, so it cannot drift.
 */
import { clinic } from './clinic.ts';
import { doctors } from './doctors.ts';
import { services, treatments } from './services.ts';
import { formatDays, joinList } from '../lib/format.ts';

export interface Faq {
  q: string;
  a: string;
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const phone = clinic.phone.display;
const hoursSentence = `Monday to Friday, 9:00 am to 12:00 pm and 1:00 pm to 5:00 pm. ${clinic.closedNote}`;
const uninsuredNames = services
  .filter((s) => s.coverage === 'uninsured' && s.id !== 'rejuvenation')
  .map((s) => lowerFirst(s.name));
const uninsuredList = joinList([...uninsuredNames, 'esthetic (rejuvenation) services']);

const whereAnswer = `${clinic.name} is at ${clinic.address.line}, south of downtown Calgary.`;
const bookAnswer = `Book online for a medical appointment or a rejuvenation appointment, or call ${phone} when the clinic is open. Online requests must be made ${clinic.booking.leadTime} in advance. ${clinic.booking.notAllOnline}`;
const coverageAnswer = `${upperFirst(uninsuredList)} are not covered by Alberta Health Care Insurance (AHCIP).`;
const emailAnswer = `No. We do not use email for medical questions, to start a doctor-patient relationship, to book or cancel appointments, or for questions about fees, services or similar matters. Please call ${phone}.`;

export const faqHome: Faq[] = [
  { q: 'Where is Primecare Medical Clinic?', a: whereAnswer },
  { q: 'What are the clinic hours?', a: hoursSentence },
  { q: 'How do I book an appointment?', a: bookAnswer },
  { q: 'Which services are not covered by AHCIP?', a: coverageAnswer },
];

export const faqBook: Faq[] = [
  {
    q: 'How far ahead do I need to book online?',
    a: `Online appointment requests must be made ${clinic.booking.leadTime} in advance.`,
  },
  {
    q: 'What if I cannot find the appointment time I need?',
    a: `${clinic.booking.notAllOnline} If you want an earlier appointment, or you do not find the right time, call ${phone} when the clinic is open.`,
  },
  {
    q: 'Which online booking should I use?',
    a: 'Use the medical booking for family medicine and other medical services. Use the rejuvenation booking for rejuvenation and aesthetic treatments.',
  },
  {
    q: 'Can I book or cancel an appointment by email?',
    a: `No. We do not use email to book or cancel appointments. Please call ${phone}.`,
  },
];

export const faqServices: Faq[] = [
  {
    q: 'Who can be seen at the clinic?',
    a: 'We are a family practice for patients of all ages, from newborn to elderly.',
  },
  {
    q: 'What does "not covered by AHCIP" mean?',
    a: 'AHCIP is Alberta Health Care Insurance. A service that is not covered by AHCIP is not paid for by AHCIP.',
  },
  { q: 'Which services are not covered by AHCIP?', a: coverageAnswer },
  { q: "Is a driver's medical covered by AHCIP?", a: "No. A driver's medical is not covered by AHCIP." },
];

export const faqRejuvenation: Faq[] = [
  {
    q: 'Are rejuvenation and aesthetic treatments covered by AHCIP?',
    a: 'No. Esthetic services are not covered by AHCIP.',
  },
  {
    q: 'What rejuvenation and aesthetic treatments do you offer?',
    a: `${joinList(treatments.map((t, i) => (i === 0 ? t.name : lowerFirst(t.name))))}. Skin tightening is done with microneedling.`,
  },
  {
    q: 'What can laser treatment be used for?',
    a: `Laser treatments at the clinic include ${joinList((treatments.find((t) => t.id === 'laser')?.items ?? []).map(lowerFirst))}.`,
  },
  {
    q: 'How do I book a rejuvenation appointment?',
    a: `Use the rejuvenation online booking, or call ${phone} when the clinic is open. Online requests must be made ${clinic.booking.leadTime} in advance.`,
  },
];

export const faqDoctors: Faq[] = [
  {
    q: 'Which doctors work at Primecare Medical Clinic?',
    a: `${joinList(doctors.map((d) => d.name))}.`,
  },
  {
    q: 'Which days does each doctor see patients?',
    a: `${doctors.map((d) => `${d.name}: ${formatDays(d.days)}.`).join(' ')}`,
  },
];

export const faqContact: Faq[] = [
  { q: 'Can I email the clinic?', a: emailAnswer },
  { q: 'What are the clinic hours?', a: hoursSentence },
  { q: 'Where do I find the clinic?', a: whereAnswer },
  {
    q: 'What should I do in an emergency?',
    a: `${clinic.emergency.call911} ${clinic.emergency.healthLink}`,
  },
];
