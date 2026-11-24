'use client';

import { useEffect, useRef } from 'react';
import { ActionChecklist } from '@/components/ActionChecklist';
import { DeadlineBadge } from '@/components/DeadlineBadge';
import { FollowUpChat } from '@/components/FollowUpChat';
import { Icon } from '@/components/Icon';
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
    <section aria-labelledby="result-heading" lang={language.bcp47} className="space-y-6">
      <div className="card result-card space-y-5" data-risk={analysis.risk.level}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="result-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-extrabold tracking-tight outline-offset-4 sm:text-3xl"
          >
            {analysis.documentType}
          </h2>
          <RiskBadge level={analysis.risk.level} />
        </div>
        <p className={`risk-${analysis.risk.level} rounded-2xl p-4`}>{analysis.risk.reason}</p>

        <div>
          <h3 lang="en" className="card-title">
            <span className="icon-chip">
              <Icon name="file" />
            </span>
            Summary
          </h3>
          <p className="mt-3 max-w-4xl text-lg leading-relaxed">{analysis.summary}</p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="tile">
            <dt lang="en" className="flex items-center gap-2 text-sm font-bold text-primary-ink">
              <Icon name="user" className="size-4" />
              Who sent it
            </dt>
            <dd className="mt-1 font-semibold">{analysis.sender}</dd>
          </div>
          <div className="tile">
            <dt lang="en" className="flex items-center gap-2 text-sm font-bold text-primary-ink">
              <Icon name="target" className="size-4" />
              What they want from you
            </dt>
            <dd className="mt-1 font-semibold">{analysis.whatTheyWant}</dd>
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

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <DeadlineBadge analysis={analysis} />
        <ActionChecklist steps={analysis.actionSteps} />
      </div>

      <div className="grid items-start gap-6 md:grid-cols-2">
        {analysis.keyFacts.length > 0 && (
          <section aria-labelledby="facts-heading" className="card">
            <h3 id="facts-heading" lang="en" className="card-title">
              <span className="icon-chip">
                <Icon name="list" />
              </span>
              Key facts
            </h3>
            <dl className="mt-4 space-y-3">
              {analysis.keyFacts.map((fact, index) => (
                <div key={`${index}-${fact.label}`} className="tile py-3">
                  <dt className="text-sm text-muted">{fact.label}</dt>
                  <dd className="font-semibold">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <p lang="en" className="mt-4 text-sm text-muted">
              Long reference numbers are partly hidden to protect your privacy.
              {analysis.redactionApplied &&
                ' Personal details in your text were hidden before analysis.'}
            </p>
          </section>
        )}

        {analysis.questionsToAsk.length > 0 && (
          <section aria-labelledby="questions-heading" className="card">
            <h3 id="questions-heading" lang="en" className="card-title">
              <span className="icon-chip">
                <Icon name="help" />
              </span>
              Questions you can ask the sender
            </h3>
            <ul className="mt-4 list-disc space-y-2 pl-6 marker:text-primary">
              {analysis.questionsToAsk.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <FollowUpChat analysis={analysis} />

      <p
        lang="en"
        className="tile flex items-start gap-3 border-2 border-edge-soft font-semibold text-muted"
      >
        <Icon name="info" className="mt-1 size-5 shrink-0" />
        This is a simple explanation, not legal or financial advice. For decisions, contact the
        office that sent the document or a qualified professional.
      </p>
    </section>
  );
}
