'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { buildChatContext } from '@/lib/analysisText';
import { messageFromError, requestFollowUp } from '@/lib/client/api';
import { MAX_CHAT_HISTORY, MAX_QUESTION_CHARS } from '@/lib/constants';
import { getLanguage } from '@/lib/languages';
import type { Analysis, ChatMessage } from '@/types';

/** Lets the person ask questions about this one document. Answers come only from its summary. */
export function FollowUpChat({ analysis }: { analysis: Analysis }): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const ask = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(true);
    setError('');
    try {
      const answer = await requestFollowUp(
        {
          context: buildChatContext(analysis),
          history: messages.slice(-MAX_CHAT_HISTORY),
          question: trimmed,
          language: analysis.language,
        },
        controller.signal,
      );
      setMessages((previous) => [
        ...previous,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: answer },
      ]);
      setQuestion('');
    } catch (failure) {
      if (!controller.signal.aborted) setError(messageFromError(failure));
    } finally {
      if (!controller.signal.aborted) {
        setPending(false);
        // The field was disabled while waiting, which drops focus. Put it back for keyboard users.
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }
  };

  return (
    <section aria-labelledby="chat-heading" className="card">
      <h3 id="chat-heading" lang="en" className="card-title">
        <span className="icon-chip">
          <Icon name="chat" />
        </span>
        Ask a follow-up
      </h3>
      <p lang="en" className="mt-2 text-muted">
        Ask about this document only. If the answer is not in it, we will say so.
      </p>

      <div role="log" aria-live="polite" aria-label="Conversation" className="mt-4 space-y-3">
        {messages.map((message, index) => (
          <p
            key={`${message.role}-${index}`}
            lang={message.role === 'assistant' ? getLanguage(analysis.language).bcp47 : undefined}
            className={
              message.role === 'user'
                ? 'ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-primary px-4 py-3 font-semibold text-on-primary'
                : 'w-fit max-w-[90%] rounded-2xl rounded-bl-md border border-edge-soft bg-bg px-4 py-3'
            }
          >
            <span lang="en" className="sr-only">
              {message.role === 'user' ? 'You asked: ' : 'Answer: '}
            </span>
            {message.content}
          </p>
        ))}
        {pending && (
          <p lang="en" className="animate-pulse text-muted">
            Thinking…
          </p>
        )}
      </div>

      <form onSubmit={ask} className="mt-4 space-y-3">
        <label htmlFor="follow-up" lang="en" className="block font-semibold">
          Your question
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            ref={inputRef}
            id="follow-up"
            type="text"
            className="field flex-1"
            maxLength={MAX_QUESTION_CHARS}
            value={question}
            disabled={pending}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button
            type="submit"
            lang="en"
            className="btn btn-primary px-6"
            disabled={pending || !question.trim()}
          >
            <Icon name="send" className="size-4" />
            Ask
          </button>
        </div>
        {error && (
          <p lang="en" className="font-semibold text-danger">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
