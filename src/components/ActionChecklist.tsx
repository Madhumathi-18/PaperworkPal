'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { getLabels } from '@/lib/labels';
import { DEFAULT_LANGUAGE, type LanguageCode } from '@/lib/languages';

interface ActionChecklistProps {
  steps: readonly string[];
  language?: LanguageCode;
}

/** Step-by-step checklist. Ticking a step is remembered only while the page is open. */
export function ActionChecklist({
  steps,
  language = DEFAULT_LANGUAGE,
}: ActionChecklistProps): React.ReactElement {
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  const labels = getLabels(language);

  const toggle = (index: number): void =>
    setDone((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const percent = steps.length === 0 ? 0 : Math.round((done.size / steps.length) * 100);

  return (
    <section aria-labelledby="steps-heading" className="card">
      <h3 id="steps-heading" className="card-title">
        <span className="icon-chip">
          <Icon name="checks" />
        </span>
        {labels.whatToDo}
      </h3>
      <ol className="mt-4 list-decimal space-y-3 pl-8 font-extrabold marker:font-extrabold marker:text-primary">
        {steps.map((step, index) => (
          <li key={`${index}-${step}`} className="pl-1">
            <label
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 font-normal transition-colors hover:border-primary ${
                done.has(index) ? 'border-primary bg-primary-soft' : 'border-edge-soft bg-bg'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-6 shrink-0"
                checked={done.has(index)}
                onChange={() => toggle(index)}
              />
              <span className={done.has(index) ? 'text-muted line-through' : undefined}>
                {step}
              </span>
            </label>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex items-center gap-3">
        <div
          aria-hidden="true"
          className="h-2.5 flex-1 overflow-hidden rounded-full border border-edge-soft bg-bg"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm font-semibold text-muted" aria-live="polite">
          {labels.doneOf(done.size, steps.length)}
        </p>
      </div>
    </section>
  );
}
