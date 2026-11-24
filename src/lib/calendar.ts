import { addDaysToIsoDate, isValidIsoDate } from '@/lib/dates';

export interface CalendarEvent {
  /** Event title, for example "Reply to Income Tax notice". */
  title: string;
  /** Deadline as YYYY-MM-DD. The event is an all-day event on this date. */
  date: string;
  details: string;
}

const MAX_DETAILS_CHARS = 1_000;
const ICS_LINE_OCTETS = 75;

function assertValidEvent(event: CalendarEvent): void {
  if (!isValidIsoDate(event.date)) throw new RangeError(`Invalid event date: ${event.date}`);
}

const compactDate = (isoDate: string): string => isoDate.replaceAll('-', '');

function trimDetails(details: string): string {
  return details.length > MAX_DETAILS_CHARS
    ? `${details.slice(0, MAX_DETAILS_CHARS - 1)}…`
    : details;
}

/** Builds a "create event" link for Google Calendar. No sign-in or API key needed. */
export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  assertValidEvent(event);
  const start = compactDate(event.date);
  const end = compactDate(addDaysToIsoDate(event.date, 1));
  const query = [
    ['action', 'TEMPLATE'],
    ['text', event.title],
    ['dates', `${start}/${end}`],
    ['details', trimDetails(event.details)],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
    .join('&');
  return `https://calendar.google.com/calendar/render?${query}`;
}

/** Escapes text values as required by RFC 5545. */
export function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Folds a line to at most 75 octets per physical line, never splitting a character. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = lines.length === 0 ? ICS_LINE_OCTETS : ICS_LINE_OCTETS - 1;
    if (octets + size > limit) {
      lines.push(current);
      current = '';
      octets = 0;
    }
    current += char;
    octets += size;
  }
  lines.push(current);
  return lines.join('\r\n ');
}

function stableId(value: string): string {
  let hash = 5381;
  for (const char of value) hash = ((hash * 33) ^ (char.codePointAt(0) ?? 0)) >>> 0;
  return hash.toString(16);
}

/** Builds an all-day .ics calendar file with a one-day-before reminder. */
export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  assertValidEvent(event);
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Paperwork Pal//Deadline//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${compactDate(event.date)}-${stableId(event.title)}@paperwork-pal`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
    `DTEND;VALUE=DATE:${compactDate(addDaysToIsoDate(event.date, 1))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(trimDetails(event.details))}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Deadline tomorrow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
