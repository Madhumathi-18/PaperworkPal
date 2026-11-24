'use client';

import { useReadAloud } from '@/hooks/useReadAloud';

interface ReadAloudButtonProps {
  text: string;
  /** BCP-47 tag used to pick a matching voice, for example "ta-IN". */
  lang: string;
  languageName: string;
}

/** Reads the result aloud, with pause and stop. Explains clearly when the browser cannot. */
export function ReadAloudButton({
  text,
  lang,
  languageName,
}: ReadAloudButtonProps): React.ReactElement {
  const { supported, status, missingVoice, start, pause, resume, stop } = useReadAloud(text, lang);

  if (!supported) {
    return (
      <p lang="en" className="text-muted">
        Read aloud is not supported in this browser. Try Chrome, Edge or Safari.
      </p>
    );
  }

  return (
    <div lang="en" className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {status === 'idle' && (
          <button type="button" className="btn btn-primary" onClick={start}>
            <span aria-hidden="true">🔊</span> Read aloud
          </button>
        )}
        {status === 'speaking' && (
          <button type="button" className="btn btn-secondary" onClick={pause}>
            Pause
          </button>
        )}
        {status === 'paused' && (
          <button type="button" className="btn btn-primary" onClick={resume}>
            Resume
          </button>
        )}
        {status !== 'idle' && (
          <button type="button" className="btn btn-secondary" onClick={stop}>
            Stop
          </button>
        )}
      </div>
      {missingVoice && (
        <p className="text-sm text-muted">
          Your device has no {languageName} voice installed, so it may sound unclear. You can add
          one in your device&apos;s speech settings.
        </p>
      )}
    </div>
  );
}
