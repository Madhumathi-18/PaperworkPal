'use client';

import { Icon } from '@/components/Icon';
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
      <h3 id="deadline-heading" lang="en" className="card-title">
        <span className="icon-chip">
          <Icon name="calendar" />
        </span>
        Deadline
      </h3>
      {date && days !== null && event ? (
        <>
          <p className="mt-4 flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
            <Icon
              name={urgent ? 'clock' : 'calendar'}
              className="size-7 shrink-0 text-primary-ink"
            />
            {formatIsoDate(date, analysis.language)}
          </p>
          <p
            lang="en"
            className={
              urgent
                ? 'risk-high mt-2 inline-block rounded-full px-3 py-0.5 font-bold'
                : 'mt-1 font-semibold text-muted'
            }
          >
            {days < 0 ? 'This date has passed: ' : urgent ? 'Soon: ' : ''}
            {describeDaysLeft(days)}
          </p>
          <p className="tile mt-4">
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
              <Icon name="calendar" />
              Add to Google Calendar<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                downloadTextFile('paperwork-pal-deadline.ics', buildIcs(event), 'text/calendar')
              }
            >
              <Icon name="download" />
              Download .ics file
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3">
          <span lang="en">No deadline was found in this document. </span>
          {consequenceIfMissed}
        </p>
      )}
    </section>
  );
}
