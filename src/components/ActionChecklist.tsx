'use client';

import { useState } from 'react';

/** Step-by-step checklist. Ticking a step is remembered only while the page is open. */
export function ActionChecklist({ steps }: { steps: readonly string[] }): React.ReactElement {
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());

  const toggle = (index: number): void =>
    setDone((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <section aria-labelledby="steps-heading" className="card">
      <h3 id="steps-heading" lang="en" className="text-xl font-bold">
        What to do
      </h3>
      <ol className="mt-3 list-decimal space-y-2 pl-8 font-bold marker:font-bold">
        {steps.map((step, index) => (
          <li key={`${index}-${step}`} className="pl-1">
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-1 font-normal">
              <input
                type="checkbox"
                className="mt-1 size-6 shrink-0"
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
      <p lang="en" className="mt-3 text-muted" aria-live="polite">
        {done.size} of {steps.length} done
      </p>
    </section>
  );
}
