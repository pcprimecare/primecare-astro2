/**
 * Services and rejuvenation treatments.
 * Source: the Services and Rejuvenation pages of the clinic's live site (2026-10-08).
 *
 * Coverage matters: Alberta's physician college expects advertising to say which services are not publicly
 * funded, so every service carries a coverage tag. The live site lists these as NOT covered by AHCIP:
 * driver's medical, travel advice, vaccinations other than influenza, skin tag removal, esthetic services.
 */
export type Coverage = 'ahcip' | 'uninsured';

export const coverageLabel: Record<Coverage, string> = {
  ahcip: 'Covered by AHCIP',
  uninsured: 'Not covered by AHCIP',
};

export interface Service {
  id: string;
  name: string;
  /** One plain sentence. Shown in the directory and used in structured data. */
  summary: string;
  coverage: Coverage;
  /** Which booking system or channel this service uses. */
  booking: 'medical' | 'rejuvenation';
  /** A schema.org type for the structured-data entry. */
  schemaType: 'Service' | 'MedicalProcedure';
}

export const services: Service[] = [
  {
    id: 'family-medicine',
    name: 'Family medicine, all ages',
    summary:
      'Health care for patients from newborn to elderly: treatment of minor injuries and illnesses, illness consultations and referrals to specialists.',
    coverage: 'ahcip',
    booking: 'medical',
    schemaType: 'Service',
  },
  {
    id: 'drivers-medical',
    name: "Driver's medical",
    summary: "A medical examination for people who need a physician's report for a driver's licence.",
    coverage: 'uninsured',
    booking: 'medical',
    schemaType: 'Service',
  },
  {
    id: 'travel-advice',
    name: 'Travel advice',
    summary: 'Health advice before you travel.',
    coverage: 'uninsured',
    booking: 'medical',
    schemaType: 'Service',
  },
  {
    id: 'vaccinations',
    name: 'Vaccinations other than influenza',
    summary: 'Vaccines other than the influenza (flu) vaccine.',
    coverage: 'uninsured',
    booking: 'medical',
    schemaType: 'Service',
  },
  {
    id: 'skin-tag-removal',
    name: 'Skin tag removal',
    summary: 'Removal of skin tags.',
    coverage: 'uninsured',
    booking: 'medical',
    schemaType: 'MedicalProcedure',
  },
  {
    id: 'rejuvenation',
    name: 'Rejuvenation and aesthetic treatments',
    summary: 'Botox and fillers, laser treatments, skin tightening with microneedling, and skin rejuvenation.',
    coverage: 'uninsured',
    booking: 'rejuvenation',
    schemaType: 'Service',
  },
];

export interface Treatment {
  id: string;
  name: string;
  /** What the treatment is used for, as listed by the clinic. */
  items: string[];
  schemaType: 'MedicalProcedure';
}

/**
 * Wording follows the live Rejuvenation page. Two outcome promises were left out on purpose
 * ("long-lasting" laser hair removal, "glowing skin without makeup") because medical advertising must not
 * promise results. The clinic can reinstate them after its own compliance check.
 */
export const treatments: Treatment[] = [
  {
    id: 'botox-and-fillers',
    name: 'Botox and fillers',
    items: ['Wrinkle reduction', 'Dermal fillers for volume restoration and facial contouring'],
    schemaType: 'MedicalProcedure',
  },
  {
    id: 'laser',
    name: 'Laser',
    items: [
      'Rosacea and redness',
      'Freckles and hyperpigmentation',
      'Cherry angiomas and skin tags',
      'Benign pigmented lesions',
      'Facial and leg spider veins',
      'Laser hair removal',
    ],
    schemaType: 'MedicalProcedure',
  },
  {
    id: 'skin-tightening',
    name: 'Skin tightening',
    items: ['Microneedling treatment', 'Tighten and firm your skin', 'Reduce blemishes', 'Acne scars'],
    schemaType: 'MedicalProcedure',
  },
  {
    id: 'skin-rejuvenation',
    name: 'Skin rejuvenation',
    items: ['Reduce blemishes', 'Improve skin elasticity and tone'],
    schemaType: 'MedicalProcedure',
  },
];
