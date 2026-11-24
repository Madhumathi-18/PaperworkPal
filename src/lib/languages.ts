export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', bcp47: 'en-IN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', bcp47: 'te-IN' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', bcp47: 'kn-IN' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', bcp47: 'ml-IN' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', bcp47: 'bn-IN' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', bcp47: 'mr-IN' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code) as [
  LanguageCode,
  ...LanguageCode[],
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/** Returns the language record for a code, falling back to English for unknown codes. */
export function getLanguage(code: string): Language {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}
