/**
 * PII redaction for Indian documents. All text is passed through `redactPii` before it
 * is sent to Gemini, so personal identifiers never leave our server.
 */

export type PiiKind = 'EMAIL' | 'IFSC' | 'PAN' | 'CARD' | 'AADHAAR' | 'PHONE' | 'ACCOUNT';

export interface RedactionResult {
  text: string;
  counts: Partial<Record<PiiKind, number>>;
  /** True when at least one value was replaced. */
  applied: boolean;
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const IFSC = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
const PAN = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
// 13-19 digits, either unbroken or in the usual 4-digit groups, or the 4-6-5 Amex layout.
const CARD = /(?<!\d)(?:\d{4}(?:[ -]?\d{4}){2,3}(?:[ -]?\d{1,3})?|\d{4}[ -]\d{6}[ -]\d{5})(?!\d)/g;
const AADHAAR = /(?<!\d|\d[ -])\d{4}[ -]?\d{4}[ -]?\d{4}(?!\d|[ -]\d)/g;
const PHONE = /(?<!\d)(?:\+91[ -]?|0)?[6-9]\d{4}[ -]?\d{5}(?!\d)/g;
// 9-18 digits, but not amounts written as "Rs. 1234567890" or "1234567890.50".
const ACCOUNT = /(?<![\d])(?<!(?:rs\.?|inr|₹)\s*)\d{9,18}(?!\d|[.,]\d)/gi;

const YEAR_GROUP = /^(?:19|20)\d{2}$/;

/** Luhn checksum used by payment cards; filters out random digit strings. */
export function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

function isCardNumber(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, '');
  return digits.length >= 13 && digits.length <= 19 && passesLuhn(digits);
}

function isYearSequence(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, '');
  return [0, 4, 8].every((start) => YEAR_GROUP.test(digits.slice(start, start + 4)));
}

/** Replaces Indian personal identifiers in free text with tags such as `[PAN]`. */
export function redactPii(input: string): RedactionResult {
  const counts: Partial<Record<PiiKind, number>> = {};

  const replaceAll = (
    text: string,
    pattern: RegExp,
    kind: PiiKind,
    accept: (match: string) => boolean = () => true,
  ): string =>
    text.replace(pattern, (match) => {
      if (!accept(match)) return match;
      counts[kind] = (counts[kind] ?? 0) + 1;
      return `[${kind}]`;
    });

  let text = replaceAll(input, EMAIL, 'EMAIL');
  text = replaceAll(text, IFSC, 'IFSC');
  text = replaceAll(text, PAN, 'PAN');
  text = replaceAll(text, CARD, 'CARD', isCardNumber);
  text = replaceAll(text, AADHAAR, 'AADHAAR', (match) => !isYearSequence(match));
  text = replaceAll(text, PHONE, 'PHONE');
  text = replaceAll(text, ACCOUNT, 'ACCOUNT');

  return { text, counts, applied: Object.keys(counts).length > 0 };
}

const LONG_TOKEN = /[A-Za-z0-9][A-Za-z0-9/-]{6,}[A-Za-z0-9]/g;
const DATE_LIKE = /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})$/;

/** Keeps the last four characters of a long reference number and hides the rest. */
function maskToken(token: string): string {
  const digitCount = token.replace(/\D/g, '').length;
  if (digitCount < 6 || DATE_LIKE.test(token)) return token;
  return `${'•'.repeat(token.length - 4)}${token.slice(-4)}`;
}

/**
 * Prepares a value for display: redacts known identifiers, then masks long reference
 * numbers (for example "TXN12345678" becomes "•••••••5678"). Dates and amounts are kept.
 */
export function maskSensitiveValue(value: string): string {
  return redactPii(value).text.replace(LONG_TOKEN, maskToken);
}
