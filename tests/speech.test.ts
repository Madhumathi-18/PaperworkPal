import { describe, expect, it } from 'vitest';
import { chunkText, describeRecognitionError, pickVoice } from '@/lib/speech';

const voice = (lang: string, name = lang): SpeechSynthesisVoice =>
  ({ lang, name }) as SpeechSynthesisVoice;

describe('pickVoice', () => {
  const voices = [voice('en-US'), voice('hi-IN'), voice('ta_IN'), voice('en-IN', 'Indian English')];

  it('prefers an exact language and region match', () => {
    expect(pickVoice(voices, 'en-IN')?.name).toBe('Indian English');
  });

  it('falls back to the same language with another region', () => {
    expect(pickVoice([voice('en-GB')], 'en-IN')?.lang).toBe('en-GB');
  });

  it('understands underscores in voice tags', () => {
    expect(pickVoice(voices, 'ta-IN')?.lang).toBe('ta_IN');
  });

  it('returns null when nothing matches', () => {
    expect(pickVoice(voices, 'ml-IN')).toBeNull();
    expect(pickVoice([], 'en-IN')).toBeNull();
  });
});

describe('chunkText', () => {
  it('keeps short text in one piece', () => {
    expect(chunkText('Pay now. Keep the receipt.')).toEqual(['Pay now. Keep the receipt.']);
  });

  it('splits at sentence ends and keeps every chunk under the limit', () => {
    const text = Array.from({ length: 12 }, (_, i) => `This is sentence number ${i}.`).join(' ');
    const chunks = chunkText(text, 80);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 80)).toBe(true);
    expect(chunks.join(' ')).toBe(text);
  });

  it('splits at the Hindi sentence mark', () => {
    expect(chunkText('पहला वाक्य। दूसरा वाक्य।', 14)).toEqual(['पहला वाक्य।', 'दूसरा वाक्य।']);
  });

  it('breaks up a single very long sentence', () => {
    const chunks = chunkText('a'.repeat(250), 100);
    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 100, 50]);
  });

  it('returns nothing for blank text', () => {
    expect(chunkText('   ')).toEqual([]);
  });
});

describe('describeRecognitionError', () => {
  it('gives a clear next step for common problems', () => {
    expect(describeRecognitionError('not-allowed')).toMatch(/blocked/);
    expect(describeRecognitionError('no-speech')).toMatch(/try again/);
    expect(describeRecognitionError('network')).toMatch(/internet/);
    expect(describeRecognitionError('something-else')).toMatch(/type instead/);
  });
});
