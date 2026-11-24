'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { chunkText, getSpeechSynthesis, pickVoice } from '@/lib/speech';

export type ReadAloudStatus = 'idle' | 'speaking' | 'paused';

export interface ReadAloud {
  supported: boolean;
  status: ReadAloudStatus;
  /** True when the device has no voice for the language and will use its default voice. */
  missingVoice: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/** Reads text aloud with the browser's speech synthesis, choosing a voice for the language. */
export function useReadAloud(text: string, bcp47: string): ReadAloud {
  const synthesis = useMemo(() => getSpeechSynthesis(), []);
  const [status, setStatus] = useState<ReadAloudStatus>('idle');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!synthesis) return undefined;
    const load = (): void => setVoices(synthesis.getVoices());
    load();
    synthesis.addEventListener('voiceschanged', load);
    return () => {
      synthesis.removeEventListener('voiceschanged', load);
      synthesis.cancel();
    };
  }, [synthesis]);

  const voice = useMemo(() => pickVoice(voices, bcp47), [voices, bcp47]);

  const start = useCallback((): void => {
    if (!synthesis) return;
    synthesis.cancel();
    const chunks = chunkText(text);
    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = bcp47;
      if (voice) utterance.voice = voice;
      if (index === chunks.length - 1) utterance.onend = () => setStatus('idle');
      utterance.onerror = () => setStatus('idle');
      synthesis.speak(utterance);
    });
    setStatus('speaking');
  }, [synthesis, text, bcp47, voice]);

  const pause = useCallback((): void => {
    synthesis?.pause();
    setStatus('paused');
  }, [synthesis]);

  const resume = useCallback((): void => {
    synthesis?.resume();
    setStatus('speaking');
  }, [synthesis]);

  const stop = useCallback((): void => {
    synthesis?.cancel();
    setStatus('idle');
  }, [synthesis]);

  return {
    supported: synthesis !== null,
    status,
    missingVoice: synthesis !== null && voices.length > 0 && voice === null,
    start,
    pause,
    resume,
    stop,
  };
}
