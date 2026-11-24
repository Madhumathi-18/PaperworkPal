import { describe, expect, it } from 'vitest';
import { describeDays, getLabels, type Labels } from '@/lib/labels';
import { LANGUAGE_CODES } from '@/lib/languages';
import { hasForeignScript } from '@/lib/scripts';

/** Every text the labels can produce, including the ones that take numbers. */
function everyString(labels: Labels): string[] {
  return Object.values(labels).flatMap((value) =>
    typeof value === 'string'
      ? [value]
      : [value(3, 7), value(1, 1), value(12, 12)].filter((text) => typeof text === 'string'),
  );
}

describe('translated labels', () => {
  const english = getLabels('en');
  const englishKeys = Object.keys(english).sort();

  it.each(LANGUAGE_CODES)('%s has every label, and none is empty', (code) => {
    const labels = getLabels(code);
    expect(Object.keys(labels).sort()).toEqual(englishKeys);
    for (const text of everyString(labels)) expect(text.trim().length).toBeGreaterThan(0);
  });

  it.each(LANGUAGE_CODES.filter((code) => code !== 'en'))(
    '%s is really translated and never mixes in letters from another script',
    (code) => {
      const labels = getLabels(code);
      expect(labels.summary).not.toBe(english.summary);
      expect(labels.whatToDo).not.toBe(english.whatToDo);
      expect(labels.disclaimer).not.toBe(english.disclaimer);
      for (const text of everyString(labels)) expect(hasForeignScript(text, code)).toBe(false);
    },
  );

  it('keeps the English wording the app was built and tested with', () => {
    expect(english.deadline).toBe('Deadline');
    expect(english.doneOf(1, 3)).toBe('1 of 3 done');
    expect(english.inDays(8)).toBe('in 8 days');
  });

  it('puts the numbers in the sentences', () => {
    for (const code of LANGUAGE_CODES) {
      const labels = getLabels(code);
      expect(labels.doneOf(2, 5)).toContain('2');
      expect(labels.doneOf(2, 5)).toContain('5');
      expect(labels.inDays(9)).toContain('9');
      expect(labels.daysAgo(4)).toContain('4');
    }
  });
});

describe('describeDays', () => {
  const labels = getLabels('en');

  it('uses words for today, tomorrow and yesterday', () => {
    expect(describeDays(0, labels)).toBe('today');
    expect(describeDays(1, labels)).toBe('tomorrow');
    expect(describeDays(-1, labels)).toBe('yesterday');
  });

  it('counts days forwards and backwards', () => {
    expect(describeDays(8, labels)).toBe('in 8 days');
    expect(describeDays(-3, labels)).toBe('3 days ago');
  });

  it('works in another language', () => {
    expect(describeDays(0, getLabels('ta'))).toBe('இன்று');
  });
});
