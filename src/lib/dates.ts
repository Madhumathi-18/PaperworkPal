const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** True for a real calendar date written as YYYY-MM-DD (rejects 2025-02-30). */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Formats a Date as YYYY-MM-DD using its UTC fields. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Adds whole days to a YYYY-MM-DD date and returns a YYYY-MM-DD date. */
export function addDaysToIsoDate(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return toIsoDate(new Date(Date.UTC(year, month - 1, day + days)));
}

/** Whole days from `today` (local calendar date) to the ISO date. Negative when overdue. */
export function daysUntil(value: string, today: Date = new Date()): number {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const target = Date.UTC(year, month - 1, day);
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - start) / MS_PER_DAY);
}

/** Human-friendly date such as "1 December 2026" for an ISO date, in the given locale. */
export function formatIsoDate(value: string, locale: string): string {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
