// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaperworkApp } from '@/components/PaperworkApp';
import { ReadAloudButton } from '@/components/ReadAloudButton';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { validAnalysis } from './fixtures';

function mockServer(
  handlers: { analyze?: () => Response | Promise<Response> } = {},
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/analyze')
      return handlers.analyze ? handlers.analyze() : Response.json(validAnalysis);
    return Response.json({ answer: 'You have until 31 December.' });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('main flow with a mocked server', () => {
  it('runs a sample document, announces progress, and focuses the result', async () => {
    const fetchMock = mockServer();
    const user = userEvent.setup();
    render(<PaperworkApp />);

    await user.click(screen.getByRole('button', { name: /Income tax notice/ }));
    expect(await screen.findByRole('heading', { name: 'Income Tax Notice' })).toHaveFocus();
    expect(document.querySelector('[role="status"][aria-live="polite"]')).toHaveTextContent(
      /Result ready/,
    );

    const body = (fetchMock.mock.calls[0]?.[1] as RequestInit).body as FormData;
    expect(body.get('language')).toBe('en');
    expect(String(body.get('text'))).toContain('SAMPLE DOCUMENT (FAKE)');
    expect(screen.getByLabelText('Text of your letter')).toHaveValue(String(body.get('text')));
  });

  describe('one document at a time', () => {
    const pdf = (): File => new File(['%PDF-1.4'], 'letter.pdf', { type: 'application/pdf' });
    const sentForm = (fetchMock: ReturnType<typeof vi.fn>, call: number): FormData =>
      (fetchMock.mock.calls[call]?.[1] as RequestInit).body as FormData;

    it('explains the uploaded file, not an earlier sample, when a file is chosen afterwards', async () => {
      const fetchMock = mockServer();
      const user = userEvent.setup();
      render(<PaperworkApp />);

      await user.click(screen.getByRole('button', { name: /Income tax notice/ }));
      await screen.findByRole('heading', { name: 'Income Tax Notice' });

      await user.upload(screen.getByLabelText(/Photo or PDF of your letter/), pdf());
      expect(screen.getByLabelText('Text of your letter')).toHaveValue('');
      expect(screen.getByText(/pasted text was cleared/i)).toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: /I understand this file is sent/ }));
      await user.click(screen.getByRole('button', { name: 'Explain my document' }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      const form = sentForm(fetchMock, 1);
      expect(form.get('file')).toBeInstanceOf(File);
      expect(form.get('text')).toBeNull();
    });

    it('drops a chosen file when the person types text instead', async () => {
      const fetchMock = mockServer();
      const user = userEvent.setup();
      render(<PaperworkApp />);

      await user.upload(screen.getByLabelText(/Photo or PDF of your letter/), pdf());
      expect(screen.getByText(/letter\.pdf/)).toBeInTheDocument();
      await user.type(screen.getByLabelText('Text of your letter'), 'Pay the fee');
      expect(screen.queryByText(/letter\.pdf/)).toBeNull();
      expect(screen.getByText(/file was removed/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Explain my document' }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const form = sentForm(fetchMock, 0);
      expect(form.get('file')).toBeNull();
      expect(form.get('text')).toBe('Pay the fee');
    });

    it('drops a chosen file when a sample is clicked, so only the sample is explained', async () => {
      const fetchMock = mockServer();
      const user = userEvent.setup();
      render(<PaperworkApp />);

      await user.upload(screen.getByLabelText(/Photo or PDF of your letter/), pdf());
      await user.click(screen.getByRole('button', { name: /Bank loan reminder/ }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      expect(screen.queryByText(/letter\.pdf/)).toBeNull();
      const form = sentForm(fetchMock, 0);
      expect(form.get('file')).toBeNull();
      expect(String(form.get('text'))).toContain('SAMPLE DOCUMENT (FAKE)');
    });

    it('keeps typed text when no file is chosen', async () => {
      mockServer();
      const user = userEvent.setup();
      render(<PaperworkApp />);
      await user.type(screen.getByLabelText('Text of your letter'), 'Pay the fee');
      expect(screen.getByLabelText('Text of your letter')).toHaveValue('Pay the fee');
      expect(screen.queryByText(/was cleared|was removed/i)).toBeNull();
    });
  });

  it('sends the selected language', async () => {
    const fetchMock = mockServer();
    const user = userEvent.setup();
    render(<PaperworkApp />);
    await user.selectOptions(screen.getByLabelText('Explain it in this language'), 'ta');
    await user.type(screen.getByLabelText('Text of your letter'), 'Pay the fee');
    await user.click(screen.getByRole('button', { name: 'Explain my document' }));
    await screen.findByRole('heading', { name: 'Income Tax Notice' });
    expect(((fetchMock.mock.calls[0]?.[1] as RequestInit).body as FormData).get('language')).toBe(
      'ta',
    );
  });

  it('announces a friendly error and shows what to do next', async () => {
    mockServer({
      analyze: () =>
        Response.json(
          {
            error: {
              code: 'payload_too_large',
              message: 'The file is too large. Please use a file under 5 MB.',
            },
          },
          { status: 413 },
        ),
    });
    const user = userEvent.setup();
    render(<PaperworkApp />);
    await user.click(screen.getByRole('button', { name: /Bank loan reminder/ }));
    const message = 'The file is too large. Please use a file under 5 MB.';
    await waitFor(() =>
      expect(document.querySelector('[role="status"]')).toHaveTextContent(message),
    );
    expect(screen.getByRole('heading', { name: /could not explain/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explain my document' })).toBeEnabled();
  });

  it('can be cancelled while loading and announces it', async () => {
    mockServer({ analyze: () => new Promise<Response>(() => undefined) });
    const user = userEvent.setup();
    render(<PaperworkApp />);
    await user.click(screen.getByRole('button', { name: /Scheme verification/ }));
    expect(document.querySelector('[role="status"]')).toHaveTextContent(/Analyzing/);
    expect(screen.getByRole('button', { name: 'Explain my document' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(document.querySelector('[role="status"]')).toHaveTextContent(/Cancelled/);
    expect(screen.getByRole('button', { name: 'Explain my document' })).toBeEnabled();
    expect(screen.queryByRole('heading', { name: 'Income Tax Notice' })).toBeNull();
  });

  it('answers a follow-up with the Enter key and keeps focus in the field', async () => {
    const fetchMock = mockServer();
    const user = userEvent.setup();
    render(<PaperworkApp />);
    await user.click(screen.getByRole('button', { name: /Income tax notice/ }));
    await screen.findByRole('heading', { name: 'Income Tax Notice' });

    await user.type(screen.getByLabelText('Your question'), 'When is the deadline?{Enter}');
    const log = screen.getByRole('log', { name: 'Conversation' });
    await waitFor(() => expect(log).toHaveTextContent('You have until 31 December.'));
    expect(log).toHaveTextContent('When is the deadline?');
    await waitFor(() => expect(screen.getByLabelText('Your question')).toHaveFocus());

    const chatCall = fetchMock.mock.calls.find(([url]) => url === '/api/chat');
    const payload = JSON.parse((chatCall?.[1] as RequestInit).body as string);
    expect(payload.question).toBe('When is the deadline?');
    expect(payload.context).toContain('Income Tax Notice');
  });
});

describe('read aloud', () => {
  const hindiVoice = { lang: 'hi-IN', name: 'Hindi' } as SpeechSynthesisVoice;

  function installSpeech(voices: SpeechSynthesisVoice[]) {
    const synth = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: () => voices,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        lang = '';
        voice: unknown = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(public text: string) {}
      },
    );
    return synth;
  }

  afterEach(() => {
    Reflect.deleteProperty(window, 'speechSynthesis');
  });

  it('explains when the browser cannot read aloud', () => {
    render(<ReadAloudButton text="Hello." lang="en-IN" languageName="English" />);
    expect(screen.getByText(/Read aloud is not supported/)).toBeInTheDocument();
  });

  it('speaks with a voice that matches the language, and supports pause, resume and stop', async () => {
    const synth = installSpeech([hindiVoice]);
    const user = userEvent.setup();
    render(<ReadAloudButton text="पहला वाक्य। दूसरा वाक्य।" lang="hi-IN" languageName="Hindi" />);

    await user.click(screen.getByRole('button', { name: /Read aloud/ }));
    expect(synth.speak).toHaveBeenCalled();
    const utterance = synth.speak.mock.calls[0]?.[0];
    expect(utterance.lang).toBe('hi-IN');
    expect(utterance.voice).toBe(hindiVoice);

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(synth.pause).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    expect(synth.resume).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(synth.cancel).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Read aloud/ })).toBeInTheDocument();
  });

  it('warns when the device has no voice for the language', () => {
    installSpeech([{ lang: 'en-US', name: 'English' } as SpeechSynthesisVoice]);
    render(<ReadAloudButton text="Hello." lang="ta-IN" languageName="Tamil" />);
    expect(screen.getByText(/no Tamil voice installed/)).toBeInTheDocument();
  });
});

describe('voice input with speech recognition', () => {
  class FakeRecognizer {
    static instance: FakeRecognizer | null = null;
    lang = '';
    continuous = false;
    interimResults = false;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    constructor() {
      FakeRecognizer.instance = this;
    }
    start = vi.fn();
    stop = vi.fn(() => this.onend?.());
  }

  beforeEach(() => {
    Object.defineProperty(window, 'SpeechRecognition', {
      value: FakeRecognizer,
      configurable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'SpeechRecognition');
  });

  it('listens in the chosen language and passes on what was said', async () => {
    const onText = vi.fn();
    const user = userEvent.setup();
    render(<VoiceInputButton lang="hi-IN" onText={onText} />);
    await user.click(screen.getByRole('button', { name: /Speak instead of typing/ }));

    const recognizer = FakeRecognizer.instance;
    expect(recognizer?.lang).toBe('hi-IN');
    expect(recognizer?.start).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Stop listening/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    recognizer?.onresult?.({
      resultIndex: 0,
      results: [Object.assign([{ transcript: ' नमस्ते ' }], { isFinal: true })],
    });
    expect(onText).toHaveBeenCalledWith('नमस्ते');

    await user.click(screen.getByRole('button', { name: /Stop listening/ }));
    expect(screen.getByRole('button', { name: /Speak instead of typing/ })).toBeInTheDocument();
  });

  it('shows a clear message when the microphone is blocked', async () => {
    const user = userEvent.setup();
    render(<VoiceInputButton lang="en-IN" onText={() => undefined} />);
    await user.click(screen.getByRole('button', { name: /Speak instead of typing/ }));
    FakeRecognizer.instance?.onerror?.({ error: 'not-allowed' });
    await waitFor(() => expect(screen.getByText(/microphone is blocked/i)).toBeInTheDocument());
  });
});
