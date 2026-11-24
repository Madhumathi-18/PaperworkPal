'use client';

import { buildDeadlineEvent } from '@/lib/analysisText';
import { buildGoogleCalendarUrl, buildIcs } from '@/lib/calendar';
import { downloadTextFile } from '@/lib/client/download';
import { daysUntil, formatIsoDate } from '@/lib/dates';
import type { Analysis } from '@/types';

/** Short phrase such as "in 8 days", "today" or "3 days ago". */
export function describeDaysLeft(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** The deadline card: date, what happens if missed, and calendar helpers. */
export function DeadlineBadge({ analysis }: { analysis: Analysis }): React.ReactElement {
  const { date, consequenceIfMissed } = analysis.deadline;
  const event = buildDeadlineEvent(analysis);
  const days = date ? daysUntil(date) : null;
  const urgent = days !== null && days <= 3;

  return (
    <section aria-labelledby="deadline-heading" className="card">
      <h3 id="deadline-heading" lang="en" className="text-xl font-bold">
        Deadline
      </h3>
      {date && days !== null && event ? (
        <>
          <p className="mt-2 text-2xl font-bold">
            <span aria-hidden="true">{urgent ? '⏰ ' : '📅 '}</span>
            {formatIsoDate(date, analysis.language)}
          </p>
          <p lang="en" className={urgent ? 'font-bold' : 'text-muted'}>
            {days < 0 ? 'This date has passed: ' : urgent ? 'Soon: ' : ''}
            {describeDaysLeft(days)}
          </p>
          <p className="mt-3">
            <strong lang="en">If you miss it: </strong>
            {consequenceIfMissed}
          </p>
          <div className="mt-4 flex flex-wrap gap-3" lang="en">
            <a
              className="btn btn-primary"
              href={buildGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Add to Google Calendar<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                downloadTextFile('paperwork-pal-deadline.ics', buildIcs(event), 'text/calendar')
              }
            >
              Download .ics file
            </button>
          </div>
        </>
      ) : (
        <p className="mt-2">
          <span lang="en">No deadline was found in this document. </span>
          {consequenceIfMissed}
        </p>
      )}
    </section>
  );
}
