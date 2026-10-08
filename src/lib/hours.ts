/**
 * Pure opening-hours logic. No DOM, no Astro, no imports at runtime, so it runs in the browser
 * (the "open now" panel), at build time, and under `node --test` (scripts/hours.test.mjs).
 *
 * "Statutory holidays" means Alberta's general holidays. The clinic says it is closed on statutory
 * holidays; any other closure days go in `extraClosedDates` in src/data/hours.ts.
 */
import type { HoursConfig } from '../data/hours.ts';

export type StatusKind = 'open' | 'break' | 'before-open' | 'after-close' | 'closed-day' | 'holiday';

export interface Status {
  kind: StatusKind;
  open: boolean;
  /** Short, plain statement: "Open now", "Closed now", "Closed today". */
  headline: string;
  /** One sentence of what happens next. */
  detail: string;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  /** 0 = Sunday ... 6 = Saturday. */
  weekday: number;
  /** Minutes since local midnight. */
  minutes: number;
  /** "YYYY-MM-DD" */
  ymd: string;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function weekdayName(index: number): string {
  return WEEKDAYS[((index % 7) + 7) % 7] ?? '';
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** "13:00" -> "1:00 pm" */
export function formatTime(hhmm: string): string {
  const total = toMinutes(hhmm);
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  const suffix = hour24 >= 12 ? 'pm' : 'am';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toYmd(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The wall-clock date and time in `timeZone` at the instant `date`. Handles daylight saving. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) parts[part.type] = part.value;
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, weekday, minutes, ymd: toYmd(year, month, day) };
}

/** Day of the month of the nth given weekday (0 = Sunday) in a month (1-12). */
function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7;
}

/** Easter Sunday for a year (Anonymous Gregorian algorithm). */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** Alberta general holidays for a year, keyed by "YYYY-MM-DD". */
export function albertaGeneralHolidays(year: number): Record<string, string> {
  const holidays: Record<string, string> = {};
  const add = (month: number, day: number, name: string) => {
    holidays[toYmd(year, month, day)] = name;
  };

  add(1, 1, "New Year's Day");
  add(2, nthWeekday(year, 2, 1, 3), 'Alberta Family Day');

  const easter = easterSunday(year);
  const goodFriday = new Date(Date.UTC(year, easter.month - 1, easter.day - 2));
  add(goodFriday.getUTCMonth() + 1, goodFriday.getUTCDate(), 'Good Friday');

  // Victoria Day is the Monday before May 25.
  const may24 = new Date(Date.UTC(year, 4, 24)).getUTCDay();
  add(5, 24 - ((may24 - 1 + 7) % 7), 'Victoria Day');

  add(7, 1, 'Canada Day');
  add(9, nthWeekday(year, 9, 1, 1), 'Labour Day');
  add(10, nthWeekday(year, 10, 1, 2), 'Thanksgiving Day');
  add(11, 11, 'Remembrance Day');
  add(12, 25, 'Christmas Day');
  return holidays;
}

function closureName(parts: ZonedParts, config: HoursConfig): string | null {
  const extra = config.extraClosedDates.find((closure) => closure.date === parts.ymd);
  if (extra) return extra.name;
  return albertaGeneralHolidays(parts.year)[parts.ymd] ?? null;
}

/** "tomorrow at 9:00 am", "Tuesday at 9:00 am". Skips closed days and holidays. */
function nextOpening(parts: ZonedParts, config: HoursConfig): string {
  const first = config.periods[0];
  if (!first) return 'soon';
  for (let ahead = 1; ahead <= 14; ahead++) {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + ahead));
    const probe: ZonedParts = {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      weekday: date.getUTCDay(),
      minutes: 0,
      ymd: toYmd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
    };
    if (!config.openDays.includes(probe.weekday)) continue;
    if (closureName(probe, config)) continue;
    const label = ahead === 1 ? 'tomorrow' : weekdayName(probe.weekday);
    return `${label} at ${formatTime(first.open)}`;
  }
  return 'soon';
}

/** Whether the clinic is open at an instant, and what happens next. */
export function clinicStatus(now: Date, config: HoursConfig): Status {
  const parts = zonedParts(now, config.timezone);

  const closure = closureName(parts, config);
  if (closure) {
    return {
      kind: 'holiday',
      open: false,
      headline: 'Closed today',
      detail: `Closed for ${closure}. Opens ${nextOpening(parts, config)}.`,
    };
  }

  if (!config.openDays.includes(parts.weekday)) {
    return {
      kind: 'closed-day',
      open: false,
      headline: 'Closed today',
      detail: `Opens ${nextOpening(parts, config)}.`,
    };
  }

  const periods = config.periods;
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    if (!period) continue;
    if (parts.minutes >= toMinutes(period.open) && parts.minutes < toMinutes(period.close)) {
      const following = periods[i + 1];
      return {
        kind: 'open',
        open: true,
        headline: 'Open now',
        detail: following
          ? `Closes at ${formatTime(period.close)} and reopens at ${formatTime(following.open)}.`
          : `Closes at ${formatTime(period.close)}.`,
      };
    }
  }

  const first = periods[0];
  if (first && parts.minutes < toMinutes(first.open)) {
    return {
      kind: 'before-open',
      open: false,
      headline: 'Closed now',
      detail: `Opens today at ${formatTime(first.open)}.`,
    };
  }

  for (let i = 0; i < periods.length - 1; i++) {
    const current = periods[i];
    const following = periods[i + 1];
    if (current && following && parts.minutes >= toMinutes(current.close) && parts.minutes < toMinutes(following.open)) {
      return {
        kind: 'break',
        open: false,
        headline: 'Closed now',
        detail: `Reopens today at ${formatTime(following.open)}.`,
      };
    }
  }

  return {
    kind: 'after-close',
    open: false,
    headline: 'Closed now',
    detail: `Opens ${nextOpening(parts, config)}.`,
  };
}
