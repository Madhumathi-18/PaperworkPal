'use client';

import { useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Icon } from '@/components/Icon';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { ALLOWED_UPLOAD_TYPES, DEFAULT_MAX_UPLOAD_MB, MAX_TEXT_CHARS } from '@/lib/constants';
import { checkFile } from '@/lib/client/files';
import { getLanguage, type LanguageCode } from '@/lib/languages';

interface DocumentInputProps {
  language: LanguageCode;
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  loading: boolean;
  onSubmit: (input: { file?: File; text?: string }) => void;
  onCancel: () => void;
}

const FILE_TYPES = ALLOWED_UPLOAD_TYPES.join(',');

/** The two ways to give us a document: a photo or PDF, or pasted (or spoken) text. */
export function DocumentInput({
  language,
  text,
  setText,
  loading,
  onSubmit,
  onCancel,
}: DocumentInputProps): React.ReactElement {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');

  // Only one document is explained at a time, and whatever the person added last wins.
  // Otherwise old pasted text could ride along with a new file and be explained instead of it.
  const chooseFile = (chosen: File | undefined): void => {
    const message = chosen ? checkFile(chosen) : null;
    const accepted = chosen && !message ? chosen : null;
    setProblem(message ?? '');
    setConsent(false);
    setFile(accepted);
    if (message && fileInput.current) fileInput.current.value = '';
    if (accepted && text.trim()) {
      setText('');
      setNotice('The pasted text was cleared, so only your file will be explained.');
    } else {
      setNotice('');
    }
  };

  const removeFile = (): void => {
    setFile(null);
    setConsent(false);
    setNotice('');
    if (fileInput.current) fileInput.current.value = '';
  };

  /** Typing, pasting or dictating text replaces a chosen file. */
  const changeText = (update: SetStateAction<string>): void => {
    setText(update);
    if (!file) return;
    removeFile();
    setNotice('Your file was removed, so only the text will be explained.');
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!file && !trimmed) return setProblem('Please paste some text or choose a file first.');
    if (file && !consent) return setProblem('Please tick the box to agree before sending a file.');
    setProblem('');
    onSubmit(file ? { file, text: undefined } : { file: undefined, text: trimmed });
  };

  return (
    <form onSubmit={submit} className="card space-y-6" noValidate>
      {/* On wide screens both sections share the same rows (title, label, box, caption),
          so the boxes and their captions line up at any text size. */}
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-0">
        <section
          aria-labelledby="upload-heading"
          className="lg:row-span-4 lg:grid lg:grid-rows-subgrid"
        >
          <h2 id="upload-heading" className="card-title">
            <span className="icon-chip">
              <Icon name="upload" />
            </span>
            Upload or take a photo
          </h2>
          <label htmlFor="file" className="mt-2 block text-muted">
            Photo or PDF of your letter
          </label>
          <div className="dropzone mt-2 h-64">
            <input
              ref={fileInput}
              id="file"
              type="file"
              accept={FILE_TYPES}
              disabled={loading}
              aria-describedby="file-hint"
              title="Choose a photo or PDF"
              onChange={(event) => chooseFile(event.target.files?.[0])}
              className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
            <div className="pointer-events-none flex flex-col items-center gap-2">
              <span className="icon-chip size-12 bg-surface shadow-card">
                <Icon name="upload" />
              </span>
              <span className="text-lg font-bold text-primary-ink">
                {file ? 'Choose a different file' : 'Choose a photo or PDF'}
              </span>
              <span className="text-sm text-muted">or drag and drop it here</span>
            </div>
          </div>
          <p id="file-hint" className="mt-2 flex min-h-11 items-center text-sm text-muted">
            JPG, PNG, WEBP or PDF, up to {DEFAULT_MAX_UPLOAD_MB} MB
          </p>
        </section>

        <hr className="border-edge-soft lg:hidden" />

        <section
          aria-labelledby="paste-heading"
          className="lg:row-span-4 lg:grid lg:grid-rows-subgrid"
        >
          <h2 id="paste-heading" className="card-title">
            <span className="icon-chip">
              <Icon name="text" />
            </span>
            Or paste the text
          </h2>
          <label htmlFor="document-text" className="mt-2 block text-muted">
            Text of your letter
          </label>
          <textarea
            id="document-text"
            className="field mt-2 h-64 resize-none"
            rows={8}
            maxLength={MAX_TEXT_CHARS}
            value={text}
            disabled={loading}
            aria-describedby="text-count"
            onChange={(event) => changeText(event.target.value)}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p id="text-count" className="text-sm text-muted">
              {text.length.toLocaleString('en-IN')} of {MAX_TEXT_CHARS.toLocaleString('en-IN')}{' '}
              characters
            </p>
            <VoiceInputButton
              lang={getLanguage(language).bcp47}
              onText={(spoken) =>
                changeText((previous) => (previous ? `${previous} ${spoken}` : spoken))
              }
            />
          </div>
        </section>
      </div>

      {file && (
        <div className="space-y-3">
          <p className="tile flex flex-wrap items-center justify-between gap-3">
            <span>
              Selected: <strong>{file.name}</strong>
            </span>
            <button type="button" className="btn btn-secondary" onClick={removeFile}>
              <Icon name="trash" className="size-4" />
              Remove file
            </button>
          </p>
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-6 shrink-0"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              I understand this file is sent to Google&apos;s Gemini AI, and personal details in it
              cannot be hidden automatically.
            </span>
          </label>
        </div>
      )}

      {problem && (
        <p className="flex items-start gap-2 rounded-xl border-2 border-danger bg-danger-bg p-3 font-semibold text-danger">
          <Icon name="info" className="mt-1 size-5 shrink-0" />
          {problem}
        </p>
      )}

      {notice && (
        <p role="status" className="tile flex items-start gap-2 font-semibold">
          <Icon name="info" className="mt-1 size-5 shrink-0 text-primary-ink" />
          {notice}
        </p>
      )}

      <div className="flex flex-col items-start gap-3">
        <button
          type="submit"
          className="btn btn-primary min-h-14 px-6 text-lg sm:px-8"
          disabled={loading}
        >
          <Icon name="file" />
          Explain my document
        </button>
        {loading && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2" aria-hidden="true">
              <span className="size-5 animate-spin rounded-full border-4 border-edge border-t-primary" />
              Analyzing… this can take up to 30 seconds.
            </span>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
