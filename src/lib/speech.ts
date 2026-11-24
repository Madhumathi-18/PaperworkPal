/** Helpers for the browser's Web Speech API: read aloud (synthesis) and dictation (recognition). */

const MAX_CHUNK_CHARS = 180;

/** Picks the best installed voice for a BCP-47 tag: exact match first, then same language. */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  bcp47: string,
): SpeechSynthesisVoice | null {
  const wanted = bcp47.toLowerCase();
  const base = wanted.split('-')[0];
  const normalized = (voice: SpeechSynthesisVoice): string =>
    voice.lang.toLowerCase().replace('_', '-');
  return (
    voices.find((voice) => normalized(voice) === wanted) ??
    voices.find((voice) => normalized(voice).split('-')[0] === base) ??
    null
  );
}

/**
 * Splits text into sentence-sized pieces. Some browsers silently stop long utterances,
 * so we speak a queue of short ones instead.
 */
export function chunkText(text: string, maxChars: number = MAX_CHUNK_CHARS): string[] {
  const sentences =
    text
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[^.!?।॥]+[.!?।॥]*/g) ?? [];
  const chunks: string[] = [];
  let current = '';
  const flush = (): void => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      flush();
      for (let start = 0; start < sentence.length; start += maxChars) {
        chunks.push(sentence.slice(start, start + maxChars).trim());
      }
    } else if ((current + sentence).length > maxChars) {
      flush();
      current = sentence;
    } else {
      current += sentence;
    }
  }
  flush();
  return chunks;
}

export function getSpeechSynthesis(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;
}

/** Minimal types for the recognition API, which TypeScript's DOM library does not include. */
interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  resultIndex: number;
}
interface RecognitionErrorEvent {
  error: string;
}
export interface Recognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognizerConstructor = new () => Recognizer;

function getRecognizerConstructor(): RecognizerConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognizerConstructor;
    webkitSpeechRecognition?: RecognizerConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export const isRecognitionSupported = (): boolean => getRecognizerConstructor() !== null;

export interface DictationHandlers {
  onText: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}

/** Plain-language message for a recognition error code. */
export function describeRecognitionError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'The microphone is blocked. Please allow it in your browser settings, or type instead.';
    case 'no-speech':
      return 'We did not hear anything. Please try again.';
    case 'audio-capture':
      return 'No microphone was found on this device.';
    case 'network':
      return 'Voice typing needs an internet connection. Please type instead.';
    case 'language-not-supported':
      return 'Voice typing is not available for this language on your device.';
    default:
      return 'Voice typing stopped. Please try again or type instead.';
  }
}

/** Starts listening and reports each finished phrase. Returns a function that stops listening. */
export function startDictation(lang: string, handlers: DictationHandlers): (() => void) | null {
  const Constructor = getRecognizerConstructor();
  if (!Constructor) return null;
  const recognizer = new Constructor();
  recognizer.lang = lang;
  recognizer.continuous = true;
  recognizer.interimResults = false;
  recognizer.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (result?.isFinal && result[0]) handlers.onText(result[0].transcript.trim());
    }
  };
  recognizer.onerror = (event) => handlers.onError(describeRecognitionError(event.error));
  recognizer.onend = handlers.onEnd;
  recognizer.start();
  return () => recognizer.stop();
}
