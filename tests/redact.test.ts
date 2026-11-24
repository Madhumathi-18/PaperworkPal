import { describe, expect, it } from 'vitest';
import { maskSensitiveValue, passesLuhn, redactPii } from '@/lib/security/redact';

describe('redactPii', () => {
  it.each([
    ['Aadhaar with spaces', 'My Aadhaar is 2345 6789 0123 ok', 'My Aadhaar is [AADHAAR] ok'],
    ['Aadhaar without spaces', 'ID 234567890123.', 'ID [AADHAAR].'],
    ['Aadhaar with hyphens', 'ID 2345-6789-0123', 'ID [AADHAAR]'],
    ['PAN', 'PAN: ABCDE1234F is linked', 'PAN: [PAN] is linked'],
    ['mobile', 'Call 9876543210 today', 'Call [PHONE] today'],
    ['mobile with +91', 'Call +91 98765 43210', 'Call [PHONE]'],
    ['mobile with leading 0', 'Call 09876543210', 'Call [PHONE]'],
    ['email', 'Write to ravi.kumar+tax@example.co.in now', 'Write to [EMAIL] now'],
    ['bank account', 'A/c No 123456789012345', 'A/c No [ACCOUNT]'],
    ['9-digit account', 'A/c 123456789', 'A/c [ACCOUNT]'],
    ['IFSC', 'IFSC SBIN0001234 branch', 'IFSC [IFSC] branch'],
    ['valid card', 'Card 4111 1111 1111 1111 expires', 'Card [CARD] expires'],
    ['unbroken card', 'Card 4111111111111111', 'Card [CARD]'],
    ['Amex layout', 'Card 3782 822463 10005', 'Card [CARD]'],
  ])('redacts %s', (_name, input, expected) => {
    expect(redactPii(input).text).toBe(expected);
  });

  it('reports counts and whether anything was applied', () => {
    const result = redactPii('PAN ABCDE1234F, PAN FGHIJ5678K, mail a@b.com');
    expect(result.counts).toEqual({ PAN: 2, EMAIL: 1 });
    expect(result.applied).toBe(true);
  });

  it('redacts several kinds in one text without double counting', () => {
    const result = redactPii('Aadhaar 2345 6789 0123, phone 9876543210, IFSC HDFC0ABC123');
    expect(result.text).toBe('Aadhaar [AADHAAR], phone [PHONE], IFSC [IFSC]');
  });

  describe('false positives', () => {
    it.each([
      'Pay by 12/03/2024 to avoid a penalty.',
      'Date: 2024-03-12 and 12-03-2024',
      'Amount due is Rs. 1,25,000 or ₹ 45,000.50',
      'The fee is Rs. 1234567890 only',
      'Total INR 12345678901',
      'PIN code 110001, ward 12',
      'Section 143(1) of the Act, year 2024-25',
      'Call 1800 11 2345 for help',
      'Order of 5 items costs 499',
      'FY 2024 2025 2026',
    ])('leaves "%s" unchanged', (input) => {
      expect(redactPii(input).text).toBe(input);
    });

    it('does not call a 10-digit number starting with 5 a phone number', () => {
      const { counts } = redactPii('Number 5876543210');
      expect(counts.PHONE).toBeUndefined();
    });

    it('does not treat a 16-digit non-Luhn number as a card', () => {
      const { text, counts } = redactPii('Ref 1234 5678 9012 3456');
      expect(counts.CARD).toBeUndefined();
      expect(text).not.toContain('[CARD]');
    });

    it('does not split a long grouped number into an Aadhaar plus leftovers', () => {
      expect(redactPii('1234 5678 9012 3456').text).not.toMatch(/\[AADHAAR\] \d/);
    });
  });

  it('returns the original text untouched when nothing matches', () => {
    const result = redactPii('Please visit the office.');
    expect(result).toEqual({ text: 'Please visit the office.', counts: {}, applied: false });
  });
});

describe('passesLuhn', () => {
  it('accepts valid numbers and rejects invalid ones', () => {
    expect(passesLuhn('4111111111111111')).toBe(true);
    expect(passesLuhn('4111111111111112')).toBe(false);
    expect(passesLuhn('')).toBe(false);
  });
});

describe('maskSensitiveValue', () => {
  it('keeps only the last four characters of long reference numbers', () => {
    expect(maskSensitiveValue('TXN12345678')).toBe('•••••••5678');
  });

  it('keeps dates, amounts and short values readable', () => {
    expect(maskSensitiveValue('2024-03-12')).toBe('2024-03-12');
    expect(maskSensitiveValue('12/03/2024')).toBe('12/03/2024');
    expect(maskSensitiveValue('₹ 12,500')).toBe('₹ 12,500');
    expect(maskSensitiveValue('Pune')).toBe('Pune');
  });

  it('redacts identifiers that the model echoed back', () => {
    expect(maskSensitiveValue('ABCDE1234F')).toBe('[PAN]');
  });
});
