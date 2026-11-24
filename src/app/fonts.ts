import {
  Noto_Sans,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from 'next/font/google';

/**
 * Noto Sans covers Latin and every Indic script we support. Each script is its own font
 * with a unicode-range, so the browser only downloads the scripts that appear on the page.
 */
const latin = Noto_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-latin' });
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  display: 'swap',
  preload: false,
  variable: '--font-devanagari',
});
const tamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  display: 'swap',
  preload: false,
  variable: '--font-tamil',
});
const telugu = Noto_Sans_Telugu({
  subsets: ['telugu'],
  display: 'swap',
  preload: false,
  variable: '--font-telugu',
});
const kannada = Noto_Sans_Kannada({
  subsets: ['kannada'],
  display: 'swap',
  preload: false,
  variable: '--font-kannada',
});
const malayalam = Noto_Sans_Malayalam({
  subsets: ['malayalam'],
  display: 'swap',
  preload: false,
  variable: '--font-malayalam',
});
const bengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  display: 'swap',
  preload: false,
  variable: '--font-bengali',
});

export const fontVariables = [latin, devanagari, tamil, telugu, kannada, malayalam, bengali]
  .map((font) => font.variable)
  .join(' ');
