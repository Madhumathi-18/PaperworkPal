/** Every fixed piece of text on the result screen. Text from Gemini is already translated. */
export interface Labels {
  summary: string;
  whoSentIt: string;
  whatTheyWant: string;
  deadline: string;
  ifYouMissIt: string;
  whatToDo: string;
  keyFacts: string;
  questions: string;
  followUp: string;
  followUpHint: string;
  yourQuestion: string;
  ask: string;
  thinking: string;
  youAsked: string;
  answer: string;
  riskLow: string;
  riskMedium: string;
  riskHigh: string;
  today: string;
  tomorrow: string;
  yesterday: string;
  inDays: (days: number) => string;
  daysAgo: (days: number) => string;
  soon: string;
  passed: string;
  noDeadline: string;
  addToCalendar: string;
  opensNewTab: string;
  downloadIcs: string;
  doneOf: (done: number, total: number) => string;
  readAloud: string;
  pause: string;
  resume: string;
  stop: string;
  disclaimer: string;
}
