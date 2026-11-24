import type { LanguageCode } from '@/lib/languages';
import { redactPii } from '@/lib/security/redact';
import { hasForeignScript } from '@/lib/scripts';
import type { ChatMessage } from '@/types';
import { generate } from './client';
import { buildChatContents, buildChatSystemPrompt, buildScriptRetryNote } from './prompts';

export interface ChatInput {
  context: string;
  history: ChatMessage[];
  question: string;
  language: LanguageCode;
}

const hide = (value: string): string => redactPii(value).text;

/**
 * Answers a follow-up question using only the document summary. Everything the user typed is
 * redacted again here, because people sometimes type their own numbers into the chat. If the
 * answer mixes in letters from another script, it asks once more with a stricter instruction.
 */
export async function answerQuestion(input: ChatInput): Promise<string> {
  const request = {
    systemInstruction: buildChatSystemPrompt(input.language),
    contents: buildChatContents({
      context: hide(input.context),
      history: input.history.map((message) => ({ ...message, content: hide(message.content) })),
      question: hide(input.question),
    }),
  };
  const answer = await generate(request);
  if (!hasForeignScript(answer, input.language)) return answer;
  return generate({
    ...request,
    systemInstruction: request.systemInstruction + buildScriptRetryNote(input.language),
  });
}
