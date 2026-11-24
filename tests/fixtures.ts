import type { Analysis, ModelAnalysis } from '@/types';

/** A valid model answer, shared by schema, Gemini-layer, API and component tests. */
export const validModelOutput: ModelAnalysis = {
  documentType: 'Income Tax Notice',
  summary: 'The tax office says you paid less tax than you owe.',
  sender: 'Income Tax Department',
  whatTheyWant: 'Pay the extra tax or reply with proof.',
  keyFacts: [{ label: 'Amount due', value: '₹12,500' }],
  deadline: { date: '2026-12-31', consequenceIfMissed: 'A penalty may be added.' },
  actionSteps: ['Read the notice.', 'Gather your tax papers.', 'Reply on the portal.'],
  risk: { level: 'medium', reason: 'There is a deadline and money is involved.' },
  questionsToAsk: ['Can I pay in parts?'],
};

export const validAnalysis: Analysis = {
  ...validModelOutput,
  language: 'en',
  redactionApplied: true,
};
