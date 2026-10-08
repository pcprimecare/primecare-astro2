/**
 * Doctors and the days they see patients.
 * Source: the Physicians page of the clinic's live site (2026-10-08), "Our physicians schedule".
 *
 * Credentials, biographies, photos and languages are deliberately absent: the clinic has not supplied them,
 * and nothing is invented. When the clinic provides them, add optional fields here and render them in
 * src/components/DoctorSchedule.astro and src/lib/schema.ts.
 */
export interface Doctor {
  id: string;
  /** As shown to patients. */
  name: string;
  givenName: string;
  familyName: string;
  /** Days this doctor sees patients. 0 = Sunday ... 6 = Saturday. */
  days: number[];
}

export const doctors: Doctor[] = [
  { id: 'william-wu', name: 'Dr. William Wu', givenName: 'William', familyName: 'Wu', days: [1, 2, 3, 4] },
  { id: 'luis-acevedo', name: 'Dr. Luis Acevedo', givenName: 'Luis', familyName: 'Acevedo', days: [1, 2, 3, 4, 5] },
  { id: 'maya-grover', name: 'Dr. Maya Grover', givenName: 'Maya', familyName: 'Grover', days: [3, 5] },
];
