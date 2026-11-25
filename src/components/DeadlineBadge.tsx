'use client';

import { Icon } from '@/components/Icon';
import { buildDeadlineEvent } from '@/lib/analysisText';
import { buildGoogleCalendarUrl, buildIcs } from '@/lib/calendar';
import { downloadTextFile } from '@/lib/client/download';
import { daysUntil, formatIsoDate } from '@/lib/dates';
import { describeDays, getLabels } from '@/lib/labels';
import { DEFAULT_LANGUAGE, type LanguageCode } from '@/lib/languages';
import type { Analysis } from '@/types';

/** Short phrase such as "in 8 days", "today" or "3 days ago", in the given language. */
export function describeDaysLeft(days: number, language: LanguageCode = DEFAULT_LANGUAGE): string {
  return describeDays(days, getLabels(language));
}

/**
 * The deadline card: the date on the left and the calendar helpers on the right, in one row.
 * On small screens the two stack. (What happens if the date is missed is shown in the main
 * result card, next to who sent the letter and what they want.)
 */
export function DeadlineBadge({ analysis }: { analysis: Analysis }): React.ReactElement {
  const { date } = analysis.deadline;
  const labels = getLabels(analysis.language);
  const event = buildDeadlineEvent(analysis);
  const days = date ? daysUntil(date) : null;
  const urgent = days !== null && days <= 3;

  return (
    <section aria-labelledby="deadline-heading" className="card">
      <h3 id="deadline-heading" className="card-title">
        <span className="icon-chip">
          <Icon name="calendar" />
        </span>
        {labels.deadline}
      </h3>
      {date && days !== null && event ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div>
            <p className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
              <Icon
                name={urgent ? 'clock' : 'calendar'}
                className="size-7 shrink-0 text-primary-ink"
              />
              {formatIsoDate(date, analysis.language)}
            </p>
            <p
              className={
                urgent
                  ? 'risk-high mt-2 inline-block rounded-full px-3 py-0.5 font-bold'
                  : 'mt-1 font-semibold text-muted'
              }
            >
              {days < 0 ? labels.passed : urgent ? labels.soon : ''}
              {describeDays(days, labels)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="btn btn-primary"
              href={buildGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="calendar" />
              {labels.addToCalendar}
              <span className="sr-only">{labels.opensNewTab}</span>
            </a>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                downloadTextFile('paperwork-pal-deadline.ics', buildIcs(event), 'text/calendar')
              }
            >
              <Icon name="download" />
              {labels.downloadIcs}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3">{labels.noDeadline}</p>
      )}
    </section>
  );
}
