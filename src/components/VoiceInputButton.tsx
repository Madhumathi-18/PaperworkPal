'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/Icon';
import { isRecognitionSupported, startDictation } from '@/lib/speech';

const subscribeToNothing = (): (() => void) => () => undefined;

interface VoiceInputButtonProps {
  /** BCP-47 tag of the language being spoken, for example "hi-IN". */
  lang: string;
  onText: (text: string) => void;
}

/** Microphone button that types what the person says into the text box. */
export function VoiceInputButton({ lang, onText }: VoiceInputButtonProps): React.ReactElement {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const stopRef = useRef<(() => void) | null>(null);
  // Support is only known in the browser; the server render assumes "supported".
  const supported = useSyncExternalStore(subscribeToNothing, isRecognitionSupported, () => true);

  useEffect(() => () => stopRef.current?.(), []);

  const toggle = (): void => {
    if (listening) {
      stopRef.current?.();
      return;
    }
    setMessage('');
    stopRef.current = startDictation(lang, {
      onText,
      onError: (problem) => {
        setMessage(problem);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    setListening(stopRef.current !== null);
  };

  return (
    <div>
      <button
        type="button"
        className="btn btn-secondary"
        aria-pressed={listening}
        disabled={!supported}
        onClick={toggle}
      >
        <Icon name={listening ? 'stop' : 'mic'} />
        {listening ? 'Stop listening' : 'Speak instead of typing'}
      </button>
      <p className="mt-1 text-sm text-muted" role="status">
        {supported
          ? listening
            ? 'Listening… speak now.'
            : message
          : 'Voice typing is not supported in this browser. Please type or paste instead.'}
      </p>
    </div>
  );
}
