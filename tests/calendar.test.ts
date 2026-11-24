import { describe, expect, it } from 'vitest';
import { buildGoogleCalendarUrl, buildIcs, escapeIcsText, foldIcsLine } from '@/lib/calendar';
import { addDaysToIsoDate, daysUntil, formatIsoDate, isValidIsoDate } from '@/lib/dates';

const event = {
  title: 'Reply to tax notice; urgent',
  date: '2026-12-31',
  details: 'Pay online, then keep the receipt.\nCall 1800 if stuck.',
};

describe('buildGoogleCalendarUrl', () => {
  const url = new URL(buildGoogleCalendarUrl(event));

  it('points at the Google Calendar template endpoint', () => {
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
  });

  it('uses an all-day range that ends on the next day, across year boundaries', () => {
    expect(url.searchParams.get('dates')).toBe('20261231/20270101');
  });

  it('percent-encodes text so it cannot inject extra parameters', () => {
    const hostile = buildGoogleCalendarUrl({ ...event, title: 'a&action=evil#x', details: '<b>' });
    const parsed = new URL(hostile);
    expect(parsed.searchParams.getAll('action')).toEqual(['TEMPLATE']);
    expect(parsed.searchParams.get('text')).toBe('a&action=evil#x');
    expect(hostile).not.toContain('<b>');
  });

  it('shortens very long details', () => {
    const long = new URL(buildGoogleCalendarUrl({ ...event, details: 'x'.repeat(5000) }));
    expect(long.searchParams.get('details')?.length).toBeLessThanOrEqual(1000);
  });

  it('throws on an invalid date', () => {
    expect(() => buildGoogleCalendarUrl({ ...event, date: '2026-02-30' })).toThrow(RangeError);
  });
});

describe('buildIcs', () => {
  const ics = buildIcs(event, new Date('2026-11-23T10:15:30.123Z'));

  it('is a well-formed calendar with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('contains all-day start and end dates and a stamp', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101');
    expect(ics).toContain('DTSTAMP:20261123T101530Z');
  });

  it('escapes special characters and newlines', () => {
    expect(ics).toContain('SUMMARY:Reply to tax notice\\; urgent');
    expect(ics).toContain('keep the receipt.\\nCall 1800 if stuck.');
  });

  it('includes a reminder one day before', () => {
    expect(ics).toContain('TRIGGER:-P1D');
  });

  it('produces a stable UID for the same event', () => {
    const again = buildIcs(event, new Date('2027-01-01T00:00:00Z'));
    const uid = (text: string): string | undefined =>
      text.split('\r\n').find((l) => l.startsWith('UID:'));
    expect(uid(again)).toBe(uid(ics));
  });
});

describe('ICS text helpers', () => {
  it('escapes backslashes, semicolons, commas and newlines', () => {
    expect(escapeIcsText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });

  it('folds long lines at 75 octets without splitting multi-byte characters', () => {
    const folded = foldIcsLine(`DESCRIPTION:${'क'.repeat(60)}`);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
    expect(parts.slice(1).every((part) => part.startsWith(' '))).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(`DESCRIPTION:${'क'.repeat(60)}`);
  });
});

describe('date helpers', () => {
  it('validates real calendar dates only', () => {
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2027-02-29')).toBe(false);
    expect(isValidIsoDate('2027-13-01')).toBe(false);
    expect(isValidIsoDate('01-01-2027')).toBe(false);
  });

  it('adds days across month ends', () => {
    expect(addDaysToIsoDate('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('counts days from a local "today"', () => {
    const today = new Date(2026, 10, 23, 18, 0, 0);
    expect(daysUntil('2026-11-23', today)).toBe(0);
    expect(daysUntil('2026-11-30', today)).toBe(7);
    expect(daysUntil('2026-11-20', today)).toBe(-3);
  });

  it('formats dates in the requested locale', () => {
    expect(formatIsoDate('2026-12-01', 'en-IN')).toBe('1 December 2026');
  });
});
