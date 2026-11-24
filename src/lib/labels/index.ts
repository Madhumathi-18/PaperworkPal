import { DEFAULT_LANGUAGE, type LanguageCode } from '@/lib/languages';
import { bn } from './bn';
import { en } from './en';
import { hi } from './hi';
import { kn } from './kn';
import { ml } from './ml';
import { mr } from './mr';
import { ta } from './ta';
import { te } from './te';
import type { Labels } from './types';

export type { Labels } from './types';

const LABELS: Record<LanguageCode, Labels> = { en, hi, ta, te, kn, ml, bn, mr };

/** The result-screen text in the given language. Unknown languages fall back to English. */
export function getLabels(language: LanguageCode = DEFAULT_LANGUAGE): Labels {
  return LABELS[language] ?? en;
}

/** Which label to show for a number of days from today, for example "in 8 days" or "today". */
export function describeDays(days: number, labels: Labels): string {
  if (days === 0) return labels.today;
  if (days === 1) return labels.tomorrow;
  if (days === -1) return labels.yesterday;
  return days > 0 ? labels.inDays(days) : labels.daysAgo(-days);
}
