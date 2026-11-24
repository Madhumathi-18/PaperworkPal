import { describe, expect, it } from 'vitest';
import { hasForeignScript } from '@/lib/scripts';

describe('hasForeignScript', () => {
  it('flags Malayalam letters inside a Tamil word', () => {
    // The real glitch: Tamil "செய்யவும்" came back with Malayalam letters in the middle.
    expect(hasForeignScript('செலുത്തவும்', 'ta')).toBe(true);
  });

  it('accepts clean text in the expected script', () => {
    expect(hasForeignScript('தயவுசெய்து இன்றே செலுத்தவும்', 'ta')).toBe(false);
    expect(hasForeignScript('कृपया आज ही भुगतान करें।', 'hi')).toBe(false);
    expect(hasForeignScript('దయచేసి ఈ రోజే చెల్లించండి', 'te')).toBe(false);
    expect(hasForeignScript('ದಯವಿಟ್ಟು ಇಂದೇ ಪಾವತಿಸಿ', 'kn')).toBe(false);
    expect(hasForeignScript('ദയവായി ഇന്ന് തന്നെ അടയ്ക്കുക', 'ml')).toBe(false);
    expect(hasForeignScript('অনুগ্রহ করে আজই পরিশোধ করুন।', 'bn')).toBe(false);
  });

  it('ignores Latin letters, digits and punctuation', () => {
    expect(hasForeignScript('PAN [PAN] Rs. 12,500 by 2026-12-31 (CPC/2526)', 'ta')).toBe(false);
  });

  it('treats Hindi and Marathi as the same script', () => {
    expect(hasForeignScript('कृपया पैसे भरा', 'mr')).toBe(false);
    expect(hasForeignScript('कृपया पैसे भरें', 'hi')).toBe(false);
  });

  it('allows the shared danda mark in Bengali', () => {
    expect(hasForeignScript('আজই দিন।', 'bn')).toBe(false);
  });

  it('flags a script from another language, including Devanagari in Tamil', () => {
    expect(hasForeignScript('தயவுசெய்து भुगतान செய்யவும்', 'ta')).toBe(true);
    expect(hasForeignScript('অনুগ্রহ করে पैसे दें', 'bn')).toBe(true);
  });

  it('never checks English, because documents may carry names in any script', () => {
    expect(hasForeignScript('Sender: राम कुमार', 'en')).toBe(false);
  });
});
