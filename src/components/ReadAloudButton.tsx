'use client';

import { Icon } from '@/components/Icon';
import { useReadAloud } from '@/hooks/useReadAloud';
import { getLabels } from '@/lib/labels';
import { DEFAULT_LANGUAGE, type LanguageCode } from '@/lib/languages';

interface ReadAloudButtonProps {
  text: string;
  /** BCP-47 tag used to pick a matching voice, for example "ta-IN". */
  lang: string;
  languageName: string;
  /** Language of the button labels. Defaults to English. */
  language?: LanguageCode;
}

/** Reads the result aloud, with pause and stop. Explains clearly when the browser cannot. */
export function ReadAloudButton({
  text,
  lang,
  languageName,
  language = DEFAULT_LANGUAGE,
}: ReadAloudButtonProps): React.ReactElement {
  const { supported, status, missingVoice, start, pause, resume, stop } = useReadAloud(text, lang);
  const labels = getLabels(language);

  if (!supported) {
    return (
      <p lang="en" className="text-muted">
        Read aloud is not supported in this browser. Try Chrome, Edge or Safari.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {status === 'idle' && (
          <button type="button" className="btn btn-primary" onClick={start}>
            <Icon name="volume" />
            {labels.readAloud}
          </button>
        )}
        {status === 'speaking' && (
          <button type="button" className="btn btn-secondary" onClick={pause}>
            {labels.pause}
          </button>
        )}
        {status === 'paused' && (
          <button type="button" className="btn btn-primary" onClick={resume}>
            {labels.resume}
          </button>
        )}
        {status !== 'idle' && (
          <button type="button" className="btn btn-secondary" onClick={stop}>
            {labels.stop}
          </button>
        )}
      </div>
      {missingVoice && (
        <p
          lang="en"
          className="tile flex items-start gap-2 border-2 border-edge-soft text-sm font-semibold"
        >
          <Icon name="info" className="mt-0.5 size-5 shrink-0 text-primary-ink" />
          <span>
            This browser has no {languageName} voice installed, so read aloud will sound wrong. Try
            Microsoft Edge, which has free {languageName} voices, or Chrome on an Android phone. You
            can also add a voice in your device&apos;s speech settings.
          </span>
        </p>
      )}
    </div>
  );
}
