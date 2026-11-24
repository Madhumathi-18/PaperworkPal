import type { LanguageCode } from '@/lib/languages';
import { redactPii } from '@/lib/security/redact';
import type { ChatMessage } from '@/types';
import { generate } from './client';
import { buildChatContents, buildChatSystemPrompt } from './prompts';

export interface ChatInput {
  context: string;
  history: ChatMessage[];
  question: string;
  language: LanguageCode;
}

const hide = (value: string): string => redactPii(value).text;

/**
 * Answers a follow-up question using only the document summary. Everything the user typed is
 * redacted again here, because people sometimes type their own numbers into the chat.
 */
export async function answerQuestion(input: ChatInput): Promise<string> {
  return generate({
    systemInstruction: buildChatSystemPrompt(input.language),
    contents: buildChatContents({
      context: hide(input.context),
      history: input.history.map((message) => ({ ...message, content: hide(message.content) })),
      question: hide(input.question),
    }),
  });
}
