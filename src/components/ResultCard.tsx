'use client';

import { useEffect, useRef } from 'react';
import { ActionChecklist } from '@/components/ActionChecklist';
import { DeadlineBadge } from '@/components/DeadlineBadge';
import { FollowUpChat } from '@/components/FollowUpChat';
import { ReadAloudButton } from '@/components/ReadAloudButton';
import { RiskBadge } from '@/components/RiskBadge';
import { buildReadAloudText } from '@/lib/analysisText';
import { formatIsoDate } from '@/lib/dates';
import { getLanguage } from '@/lib/languages';
import type { Analysis } from '@/types';

/**
 * The full explanation. Focus moves to its heading when it appears, and the container carries
 * the output language so screen readers pronounce the content correctly.
 */
export function ResultCard({ analysis }: { analysis: Analysis }): React.ReactElement {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const language = getLanguage(analysis.language);
  const deadlineDate = analysis.deadline.date;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby="result-heading" lang={language.bcp47} className="space-y-5">
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="result-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold outline-offset-4"
          >
            {analysis.documentType}
          </h2>
          <RiskBadge level={analysis.risk.level} />
        </div>
        <p>{analysis.risk.reason}</p>

        <h3 lang="en" className="text-xl font-bold">
          Summary
        </h3>
        <p className="text-lg">{analysis.summary}</p>
        <dl className="space-y-2">
          <div>
            <dt lang="en" className="font-bold">
              Who sent it
            </dt>
            <dd>{analysis.sender}</dd>
          </div>
          <div>
            <dt lang="en" className="font-bold">
              What they want from you
            </dt>
            <dd>{analysis.whatTheyWant}</dd>
          </div>
        </dl>
        <ReadAloudButton
          text={buildReadAloudText(
            analysis,
            deadlineDate ? formatIsoDate(deadlineDate, language.bcp47) : null,
          )}
          lang={language.bcp47}
          languageName={language.label}
        />
      </div>

      <DeadlineBadge analysis={analysis} />
      <ActionChecklist steps={analysis.actionSteps} />

      {analysis.keyFacts.length > 0 && (
        <section aria-labelledby="facts-heading" className="card">
          <h3 id="facts-heading" lang="en" className="text-xl font-bold">
            Key facts
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {analysis.keyFacts.map((fact, index) => (
              <div key={`${index}-${fact.label}`}>
                <dt className="text-muted">{fact.label}</dt>
                <dd className="font-semibold">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p lang="en" className="mt-3 text-sm text-muted">
            Long reference numbers are partly hidden to protect your privacy.
            {analysis.redactionApplied &&
              ' Personal details in your text were hidden before analysis.'}
          </p>
        </section>
      )}

      {analysis.questionsToAsk.length > 0 && (
        <section aria-labelledby="questions-heading" className="card">
          <h3 id="questions-heading" lang="en" className="text-xl font-bold">
            Questions you can ask the sender
          </h3>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            {analysis.questionsToAsk.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      )}

      <FollowUpChat analysis={analysis} />

      <p lang="en" className="rounded-lg border-2 border-edge p-4 font-semibold">
        This is a simple explanation, not legal or financial advice. For decisions, contact the
        office that sent the document or a qualified professional.
      </p>
    </section>
  );
}
