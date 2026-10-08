// Tests for the opening-hours logic in src/lib/hours.ts.
// Run: npm run test:hours   (Node 22.18+ runs the .ts source directly by stripping types.)
import test from 'node:test';
import assert from 'node:assert/strict';

const { clinicStatus, albertaGeneralHolidays, easterSunday, formatTime, zonedParts } = await import(
  '../src/lib/hours.ts'
);
const { hoursConfig } = await import('../src/data/hours.ts');

const at = (iso) => clinicStatus(new Date(iso), hoursConfig);

test('formatTime', () => {
  assert.equal(formatTime('09:00'), '9:00 am');
  assert.equal(formatTime('12:00'), '12:00 pm');
  assert.equal(formatTime('13:00'), '1:00 pm');
  assert.equal(formatTime('17:00'), '5:00 pm');
  assert.equal(formatTime('00:30'), '12:30 am');
});

test('open in the morning, with the midday break named', () => {
  // Thursday 2026-10-08 10:00 MDT
  const s = at('2026-10-08T16:00:00Z');
  assert.equal(s.kind, 'open');
  assert.equal(s.open, true);
  assert.equal(s.headline, 'Open now');
  assert.equal(s.detail, 'Closes at 12:00 pm and reopens at 1:00 pm.');
});

test('closed during the midday break', () => {
  const s = at('2026-10-08T18:30:00Z'); // 12:30 MDT
  assert.equal(s.kind, 'break');
  assert.equal(s.open, false);
  assert.equal(s.detail, 'Reopens today at 1:00 pm.');
});

test('open in the afternoon', () => {
  const s = at('2026-10-08T20:00:00Z'); // 14:00 MDT
  assert.equal(s.kind, 'open');
  assert.equal(s.detail, 'Closes at 5:00 pm.');
});

test('boundaries: opens at 9:00, closes at 12:00, 1:00 and 5:00', () => {
  assert.equal(at('2026-10-08T14:59:00Z').kind, 'before-open'); // 08:59
  assert.equal(at('2026-10-08T15:00:00Z').kind, 'open'); // 09:00
  assert.equal(at('2026-10-08T17:59:00Z').kind, 'open'); // 11:59
  assert.equal(at('2026-10-08T18:00:00Z').kind, 'break'); // 12:00
  assert.equal(at('2026-10-08T18:59:00Z').kind, 'break'); // 12:59
  assert.equal(at('2026-10-08T19:00:00Z').kind, 'open'); // 13:00
  assert.equal(at('2026-10-08T22:59:00Z').kind, 'open'); // 16:59
  assert.equal(at('2026-10-08T23:00:00Z').kind, 'after-close'); // 17:00
});

test('after closing on a weekday points to tomorrow', () => {
  const s = at('2026-10-08T23:30:00Z'); // Thursday 17:30
  assert.equal(s.kind, 'after-close');
  assert.equal(s.detail, 'Opens tomorrow at 9:00 am.');
});

test('midnight is treated as 00:xx, not 24:xx', () => {
  const s = at('2026-10-09T06:30:00Z'); // Friday 00:30 MDT
  assert.equal(s.kind, 'before-open');
  assert.equal(s.detail, 'Opens today at 9:00 am.');
});

test('Friday evening skips the weekend and the Monday holiday (Thanksgiving 2026-10-12)', () => {
  const friday = at('2026-10-10T00:00:00Z'); // Friday 18:00 MDT
  assert.equal(friday.kind, 'after-close');
  assert.equal(friday.detail, 'Opens Tuesday at 9:00 am.');
  const saturday = at('2026-10-10T17:00:00Z'); // Saturday 11:00 MDT
  assert.equal(saturday.kind, 'closed-day');
  assert.equal(saturday.headline, 'Closed today');
  assert.equal(saturday.detail, 'Opens Tuesday at 9:00 am.');
});

test('statutory holiday', () => {
  const s = at('2026-10-12T16:00:00Z'); // Monday 10:00 MDT, Thanksgiving
  assert.equal(s.kind, 'holiday');
  assert.equal(s.open, false);
  assert.equal(s.detail, 'Closed for Thanksgiving Day. Opens tomorrow at 9:00 am.');
});

test('daylight saving: 9:00 local is open on both sides of the change', () => {
  // DST began Sunday 2026-03-08. Before: MST (UTC-7). After: MDT (UTC-6).
  assert.equal(at('2026-03-02T16:00:00Z').kind, 'open'); // Mon 09:00 MST
  assert.equal(at('2026-03-02T15:00:00Z').kind, 'before-open'); // Mon 08:00 MST
  assert.equal(at('2026-03-09T15:00:00Z').kind, 'open'); // Mon 09:00 MDT
  assert.equal(at('2026-03-09T14:00:00Z').kind, 'before-open'); // Mon 08:00 MDT
  // DST ended Sunday 2025-11-02. (A past transition, so this test does not depend on future time-zone rules.
  // The code reads wall-clock time through Intl and never hard-codes a UTC offset.)
  assert.equal(at('2025-11-03T16:00:00Z').kind, 'open'); // Mon 09:00 MST
  assert.equal(at('2025-11-03T15:00:00Z').kind, 'before-open'); // Mon 08:00 MST
});

test('zonedParts gives the clinic wall clock', () => {
  const p = zonedParts(new Date('2026-10-08T16:00:00Z'), 'America/Edmonton');
  assert.deepEqual(
    { ymd: p.ymd, weekday: p.weekday, minutes: p.minutes },
    { ymd: '2026-10-08', weekday: 4, minutes: 600 },
  );
});

test('Easter Sunday', () => {
  assert.deepEqual(easterSunday(2025), { month: 4, day: 20 });
  assert.deepEqual(easterSunday(2026), { month: 4, day: 5 });
  assert.deepEqual(easterSunday(2027), { month: 3, day: 28 });
  assert.deepEqual(easterSunday(2028), { month: 4, day: 16 });
});

test('Alberta general holidays 2026', () => {
  assert.deepEqual(albertaGeneralHolidays(2026), {
    '2026-01-01': "New Year's Day",
    '2026-02-16': 'Alberta Family Day',
    '2026-04-03': 'Good Friday',
    '2026-05-18': 'Victoria Day',
    '2026-07-01': 'Canada Day',
    '2026-09-07': 'Labour Day',
    '2026-10-12': 'Thanksgiving Day',
    '2026-11-11': 'Remembrance Day',
    '2026-12-25': 'Christmas Day',
  });
});

test('Alberta general holidays 2027', () => {
  const h = albertaGeneralHolidays(2027);
  assert.equal(h['2027-02-15'], 'Alberta Family Day');
  assert.equal(h['2027-03-26'], 'Good Friday');
  assert.equal(h['2027-05-24'], 'Victoria Day'); // May 24 is itself a Monday
  assert.equal(h['2027-09-06'], 'Labour Day');
  assert.equal(h['2027-10-11'], 'Thanksgiving Day');
});

test('clinic-specific closure days are honoured', () => {
  const config = { ...hoursConfig, extraClosedDates: [{ date: '2026-12-28', name: 'a clinic closure' }] };
  const s = clinicStatus(new Date('2026-12-28T17:00:00Z'), config); // Monday 10:00 MST
  assert.equal(s.kind, 'holiday');
  assert.equal(s.detail, 'Closed for a clinic closure. Opens tomorrow at 9:00 am.');
});
