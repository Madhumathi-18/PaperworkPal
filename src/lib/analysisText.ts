import type { CalendarEvent } from '@/lib/calendar';
import type { Analysis } from '@/types';

/** The model sometimes answers "Not mentioned" in English even for other languages. */
const NOT_MENTIONED = /^\s*not mentioned\.?\s*$/i;

/** What happens if the deadline is missed, or an empty string when the document says nothing. */
export function consequenceText(analysis: Analysis): string {
  const text = analysis.deadline.consequenceIfMissed;
  return NOT_MENTIONED.test(text) ? '' : text.trim();
}

/** Compact text version of the result, sent with follow-up questions as the only context. */
export function buildChatContext(analysis: Analysis): string {
  const lines = [
    `Document type: ${analysis.documentType}`,
    `Sender: ${analysis.sender}`,
    `Summary: ${analysis.summary}`,
    `What they want: ${analysis.whatTheyWant}`,
    ...analysis.keyFacts.map((fact) => `${fact.label}: ${fact.value}`),
    `Deadline: ${analysis.deadline.date ?? 'Not mentioned'}. If missed: ${analysis.deadline.consequenceIfMissed}`,
    `Steps: ${analysis.actionSteps.map((step, index) => `${index + 1}. ${step}`).join(' ')}`,
    `Risk: ${analysis.risk.level}. ${analysis.risk.reason}`,
  ];
  return lines.join('\n');
}

/** The text that "Read aloud" speaks: content only, in the result's own language. */
export function buildReadAloudText(analysis: Analysis, formattedDeadline: string | null): string {
  const parts = [analysis.summary, analysis.whatTheyWant];
  const consequence = consequenceText(analysis);
  if (formattedDeadline) {
    parts.push(consequence ? `${formattedDeadline}. ${consequence}` : `${formattedDeadline}.`);
  }
  parts.push(...analysis.actionSteps.map((step, index) => `${index + 1}. ${step}`));
  return parts.join('\n');
}

/** Calendar entry for the deadline, or null when the document has no date. */
export function buildDeadlineEvent(analysis: Analysis): CalendarEvent | null {
  const { date } = analysis.deadline;
  if (!date) return null;
  const consequence = consequenceText(analysis);
  return {
    title: `Deadline: ${analysis.documentType}`,
    date,
    details: `${analysis.whatTheyWant}${consequence ? `\n\nIf missed: ${consequence}` : ''}\n\nExplained by Paperwork Pal. This is a simple explanation, not legal or financial advice.`,
  };
}
