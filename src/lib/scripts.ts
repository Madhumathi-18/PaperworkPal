import type { LanguageCode } from '@/lib/languages';

type Script = 'devanagari' | 'bengali' | 'tamil' | 'telugu' | 'kannada' | 'malayalam' | 'other';

/** Unicode blocks for the Indian scripts we can see in model output. */
const BLOCKS: ReadonlyArray<{ script: Script; from: number; to: number }> = [
  { script: 'devanagari', from: 0x0900, to: 0x097f },
  { script: 'bengali', from: 0x0980, to: 0x09ff },
  // Gurmukhi, Gujarati and Odia are never wanted in our output.
  { script: 'other', from: 0x0a00, to: 0x0b7f },
  { script: 'tamil', from: 0x0b80, to: 0x0bff },
  { script: 'telugu', from: 0x0c00, to: 0x0c7f },
  { script: 'kannada', from: 0x0c80, to: 0x0cff },
  { script: 'malayalam', from: 0x0d00, to: 0x0d7f },
  // Sinhala
  { script: 'other', from: 0x0d80, to: 0x0dff },
];

const SCRIPT_OF: Record<LanguageCode, Script | null> = {
  en: null,
  hi: 'devanagari',
  mr: 'devanagari',
  bn: 'bengali',
  ta: 'tamil',
  te: 'telugu',
  kn: 'kannada',
  ml: 'malayalam',
};

/** The danda marks are shared punctuation (Bengali uses the Devanagari ones), so they never count. */
const isSharedPunctuation = (codePoint: number): boolean =>
  codePoint === 0x0964 || codePoint === 0x0965;

function scriptOf(codePoint: number): Script | null {
  if (isSharedPunctuation(codePoint)) return null;
  return BLOCKS.find((block) => codePoint >= block.from && codePoint <= block.to)?.script ?? null;
}

/**
 * True when the text contains letters from an Indian script other than the one the language
 * uses, for example Malayalam letters inside a Tamil answer. Latin letters and digits are fine,
 * and English is never checked because documents may contain names in any script.
 */
export function hasForeignScript(text: string, language: LanguageCode): boolean {
  const expected = SCRIPT_OF[language];
  if (expected === null) return false;
  for (const character of text) {
    const script = scriptOf(character.codePointAt(0) ?? 0);
    if (script !== null && script !== expected) return true;
  }
  return false;
}
