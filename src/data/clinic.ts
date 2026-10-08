/**
 * The single source of truth for everything this website says about the clinic.
 *
 * Visible pages, JSON-LD structured data, llms.txt and the SEO lint (scripts/validate-seo.mjs) all read
 * from here, so they cannot disagree. Facts come from the clinic's own live site (primecaremedicalclinic.ca),
 * read on 2026-10-08. Anything the clinic has not confirmed is left OUT rather than guessed.
 * See README.md, "Open items for the clinic".
 */
import { hoursConfig } from './hours.ts';

export const SITE_URL = 'https://primecaremedicalclinic.ca';

const addressLine = '315 17 Avenue SW, Calgary, AB T2S 0A5';

export const clinic = {
  name: 'Primecare Medical Clinic',
  tagline: 'Caring for better',
  url: SITE_URL,
  locale: 'en-CA',

  phone: {
    display: '403-398-5449',
    schema: '+1-403-398-5449',
    href: 'tel:+14033985449',
  },

  address: {
    street: '315 17 Avenue SW',
    city: 'Calgary',
    region: 'AB',
    regionName: 'Alberta',
    // The old site's text and a University of Calgary listing both say T2S 0A5. The old site's embedded
    // Google Map labels the place T2S 0A9. Confirm with Canada Post before launch.
    postalCode: 'T2S 0A5',
    country: 'CA',
    line: addressLine,
  },

  // Taken from the old site's map embed. Verify in Google Maps.
  geo: { latitude: 51.0374, longitude: -114.07095 },

  hours: hoursConfig,
  closedNote: 'Closed on weekends and statutory holidays.',

  booking: {
    leadTime: 'at least 2 business days',
    notAllOnline: 'Not all appointment types can be booked online.',
    medical: {
      label: 'Book a medical appointment',
      url: 'https://patient.medeohealth.com/booking/prime-care-medical',
      provider: 'Medeo',
    },
    rejuvenation: {
      label: 'Book a rejuvenation appointment',
      url: 'https://primecare.janeapp.com',
      provider: 'Jane',
    },
  },

  maps: {
    pageUrl: 'https://www.google.com/maps?cid=3816753580772133941',
    // The clinic's own embed from the old Contact page. It is only loaded after a visitor asks for it.
    embedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2517.3842739854216!2d-114.07094872320142!3d51.037402071715084!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5371701d608a9493%3A0x34f7d528e11f8c35!2s315%2017%20Ave%20SW%2C%20Calgary%2C%20AB%20T2S%200A9%2C%20Canada!5e0!3m2!1sen!2sca!4v1724697200000!5m2!1sen!2sca',
    directions: {
      google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressLine)}`,
      apple: `https://maps.apple.com/?daddr=${encodeURIComponent(addressLine)}`,
    },
  },

  social: {
    instagram: 'https://www.instagram.com/primecaremedical.rejuvenation/',
  },

  emergency: {
    call911: 'In an emergency, call 911.',
    healthLink: 'For non-emergency health advice, call Health Link at 811.',
  },

  /** From the old Contact page, reworded for clarity. The meaning is unchanged. */
  emailPolicy: {
    title: 'We do not use email for patient communication',
    intro: 'Email is not secure. We do not use it to communicate with patients or the public about:',
    topics: [
      'medical questions or issues',
      'starting a doctor-patient relationship',
      'booking or cancelling appointments',
      'fees, services or similar matters',
    ],
    outro:
      'Email about these matters will not be answered and will be discarded unread. Please call us or write to us at the clinic address instead.',
  },

  /** Short descriptions reused by the page head, JSON-LD and llms.txt. */
  summary:
    'Primecare Medical Clinic is a family practice at 315 17 Avenue SW in Calgary, Alberta. Doctors see patients from newborn to elderly, by appointment. The clinic also offers rejuvenation and aesthetic treatments.',
};

export type Clinic = typeof clinic;
