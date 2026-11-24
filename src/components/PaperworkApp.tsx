'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { DocumentInput } from '@/components/DocumentInput';
import { LanguageSelect } from '@/components/LanguageSelect';
import { PrivacyNotice } from '@/components/PrivacyNotice';
import { SampleDocuments } from '@/components/SampleDocuments';
import { useAnalysisFlow, type FlowState } from '@/hooks/useAnalysisFlow';
import { DEFAULT_LANGUAGE, type LanguageCode } from '@/lib/languages';

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

      {state.status === 'error' && (
        <div className="card border-2 border-edge">
          <h2 className="text-xl font-bold text-danger">We could not explain this document</h2>
          <p className="mt-1">{state.message}</p>
        </div>
      )}

      {state.status === 'success' && (
        <ResultCard key={state.analysis.summary} analysis={state.analysis} />
      )}

      <SampleDocuments
        disabled={loading}
        onSelect={(sample) => {
          setText(sample);
          void run({ text: sample, language });
        }}
      />

      <PrivacyNotice />
    </div>
  );
}
