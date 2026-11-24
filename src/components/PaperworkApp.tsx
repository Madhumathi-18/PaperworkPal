'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { DocumentInput } from '@/components/DocumentInput';
import { Icon } from '@/components/Icon';
import { LanguageSelect } from '@/components/LanguageSelect';
import { PrivacyNotice } from '@/components/PrivacyNotice';
import { SampleDocuments } from '@/components/SampleDocuments';
import { useAnalysisFlow, type FlowState } from '@/hooks/useAnalysisFlow';
import { DEFAULT_LANGUAGE, type LanguageCode } from '@/lib/languages';

/** Grey placeholder shapes shown while Gemini works. Hidden from screen readers (the live region speaks). */
function LoadingSkeleton(): React.ReactElement {
  return (
    <div aria-hidden="true" className="card animate-pulse space-y-4">
      <div className="h-8 w-2/3 rounded-lg bg-primary-soft" />
      <div className="h-4 w-full rounded bg-primary-soft" />
      <div className="h-4 w-11/12 rounded bg-primary-soft" />
      <div className="h-4 w-3/4 rounded bg-primary-soft" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-16 rounded-2xl bg-primary-soft" />
        <div className="h-16 rounded-2xl bg-primary-soft" />
      </div>
    </div>
  );
}

// The result screen is only needed after an analysis, so it loads on demand.
const ResultCard = dynamic(() => import('@/components/ResultCard').then((m) => m.ResultCard), {
  loading: () => <p>Getting your result ready…</p>,
});

/** The sentence a screen reader announces for each stage of the flow. */
export function announcementFor(state: FlowState): string {
  switch (state.status) {
    case 'loading':
      return 'Analyzing your document…';
    case 'success':
      return 'Result ready. Your explanation is below.';
    case 'error':
      return state.message;
    default:
      return state.notice ?? '';
  }
}

/** The whole main screen: choose a language, give a document, read the explanation. */
export function PaperworkApp(): React.ReactElement {
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [text, setText] = useState('');
  const { state, run, cancel } = useAnalysisFlow();
  const loading = state.status === 'loading';

  return (
    <div className="space-y-8">
      <div role="status" aria-live="polite" className="sr-only">
        {announcementFor(state)}
      </div>

      <LanguageSelect value={language} onChange={setLanguage} disabled={loading} />

      <DocumentInput
        language={language}
        text={text}
        setText={setText}
        loading={loading}
        onSubmit={(input) => void run({ ...input, language })}
        onCancel={cancel}
      />

      <SampleDocuments
        disabled={loading}
        onSelect={(sample) => {
          setText(sample);
          void run({ text: sample, language });
        }}
      />

      {loading && <LoadingSkeleton />}

      {state.status === 'error' && (
        <div className="card flex items-start gap-4 border-2 border-danger bg-danger-bg">
          <span className="icon-chip">
            <Icon name="info" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-danger">We could not explain this document</h2>
            <p className="mt-1">{state.message}</p>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <ResultCard key={state.analysis.summary} analysis={state.analysis} />
      )}

      <PrivacyNotice />
    </div>
  );
}
