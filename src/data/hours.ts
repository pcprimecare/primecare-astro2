/**
 * Opening hours as plain data. Kept tiny and separate so the browser script that shows "open now"
 * only bundles this file and not the rest of the clinic data.
 *
 * Source: the Contact page of the clinic's live site (2026-10-08): "Monday to Friday: 9am - 12pm, 1pm - 5pm.
 * Weekends and Statutory Holidays: Closed."
 */

export interface Period {
  /** Local 24-hour time, "HH:MM". */
  open: string;
  close: string;
}

export interface HoursConfig {
  /** IANA time zone the clinic keeps. */
  timezone: string;
  /** Days the clinic opens. 0 = Sunday ... 6 = Saturday. */
  openDays: number[];
  /** Opening periods on an open day, in order. The gap between two periods is the midday break. */
  periods: Period[];
  /**
   * Closures beyond Alberta's general holidays (which are calculated automatically), as "YYYY-MM-DD".
   * Ask the clinic for any extra closure days, for example the days between Christmas and New Year.
   */
  extraClosedDates: { date: string; name: string }[];
}

export const hoursConfig: HoursConfig = {
  timezone: 'America/Edmonton',
  openDays: [1, 2, 3, 4, 5],
  periods: [
    { open: '09:00', close: '12:00' },
    { open: '13:00', close: '17:00' },
  ],
  extraClosedDates: [],
};
