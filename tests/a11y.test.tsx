// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessibilityToolbar } from '@/components/AccessibilityToolbar';
import { ActionChecklist } from '@/components/ActionChecklist';
import { DeadlineBadge } from '@/components/DeadlineBadge';
import { DocumentInput } from '@/components/DocumentInput';
import { LanguageSelect } from '@/components/LanguageSelect';
import { PrivacyNotice } from '@/components/PrivacyNotice';
import { ResultCard } from '@/components/ResultCard';
import { RiskBadge } from '@/components/RiskBadge';
import { SampleDocuments } from '@/components/SampleDocuments';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { PREFERENCES_KEY, preferencesStore } from '@/lib/client/preferences';
import { expectNoA11yViolations } from './axe';
import { validAnalysis } from './fixtures';

const noop = (): void => undefined;

beforeEach(() => {
  window.localStorage.clear();
  preferencesStore.reset();
});

afterEach(() => {
  document.documentElement.removeAttribute('data-text-size');
  document.documentElement.removeAttribute('data-contrast');
});

describe('automated accessibility checks (axe)', () => {
  it('has no violations in the input form', async () => {
    const { container } = render(
      <main>
        <h1>Title</h1>
        <LanguageSelect value="en" onChange={noop} />
        <DocumentInput
          language="en"
          text=""
          setText={noop}
          loading={false}
          onSubmit={noop}
          onCancel={noop}
        />
        <SampleDocuments onSelect={noop} />
        <PrivacyNotice />
      </main>,
    );
    await expectNoA11yViolations(container);
  });

  it('has no violations while loading', async () => {
    const { container } = render(
      <main>
        <h1>Title</h1>
        <DocumentInput
          language="en"
          text="Some text"
          setText={noop}
          loading
          onSubmit={noop}
          onCancel={noop}
        />
      </main>,
    );
    await expectNoA11yViolations(container);
  });

  it('has no violations in the toolbar', async () => {
    const { container } = render(<AccessibilityToolbar />);
    await expectNoA11yViolations(container);
  });

  it.each([
    ['medium risk with a deadline', validAnalysis],
    [
      'high risk without a deadline',
      {
        ...validAnalysis,
        risk: { level: 'high' as const, reason: 'Urgent.' },
        deadline: { date: null, consequenceIfMissed: 'Not mentioned' },
        keyFacts: [],
        questionsToAsk: [],
      },
    ],
    ['Hindi output', { ...validAnalysis, language: 'hi' as const }],
  ])('has no violations in the result: %s', async (_name, analysis) => {
    const { container } = render(
      <main>
        <h1>Title</h1>
        <ResultCard analysis={analysis} />
      </main>,
    );
    await expectNoA11yViolations(container);
  });
});

describe('result screen semantics', () => {
  it('moves focus to the result heading and sets the output language', () => {
    render(<ResultCard analysis={{ ...validAnalysis, language: 'ta' }} />);
    const heading = screen.getByRole('heading', { level: 2, name: 'Income Tax Notice' });
    expect(heading).toHaveFocus();
    expect(heading.closest('section')).toHaveAttribute('lang', 'ta-IN');
  });

  it('shows the fixed headings and buttons in the language of the explanation', () => {
    render(<ResultCard analysis={{ ...validAnalysis, language: 'ta' }} />);
    expect(screen.getByRole('heading', { level: 3, name: 'சுருக்கம்' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'கடைசி தேதி' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'செய்ய வேண்டியவை' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'மேலும் கேள்வி கேளுங்கள்' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'கேளுங்கள்' })).toBeInTheDocument();
    expect(screen.getByText('நடுத்தர ஆபத்து')).toBeInTheDocument();
    expect(screen.queryByText('Medium risk')).toBeNull();
    // No English headings are left behind.
    expect(screen.queryByRole('heading', { name: 'Summary' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Deadline' })).toBeNull();
  });

  it('keeps the heading order logical (h2 then h3s)', () => {
    render(<ResultCard analysis={validAnalysis} />);
    const levels = screen.getAllByRole('heading').map((heading) => Number(heading.tagName[1]));
    expect(levels[0]).toBe(2);
    expect(levels.slice(1).every((level) => level === 3)).toBe(true);
  });

  it('shows the disclaimer and masked-values note', () => {
    render(<ResultCard analysis={validAnalysis} />);
    expect(screen.getByText(/not legal or financial advice/i)).toBeInTheDocument();
    expect(screen.getByText(/partly hidden/i)).toBeInTheDocument();
  });

  it.each([
    ['low', 'Low risk'],
    ['medium', 'Medium risk'],
    ['high', 'High risk'],
  ] as const)('shows %s risk as text and an icon, not colour alone', (level, text) => {
    const { container } = render(<RiskBadge level={level} />);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('keyboard operation', () => {
  it('lets the checklist be ticked with the space bar and counts progress', async () => {
    const user = userEvent.setup();
    render(<ActionChecklist steps={['One.', 'Two.', 'Three.']} />);
    await user.tab();
    expect(screen.getByRole('checkbox', { name: 'One.' })).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox', { name: 'One.' })).toBeChecked();
    expect(screen.getByText('1 of 3 done')).toBeInTheDocument();
  });

  it('reaches every control in the toolbar by tabbing, with no trap', async () => {
    const user = userEvent.setup();
    render(
      <>
        <AccessibilityToolbar />
        <button type="button">After</button>
      </>,
    );
    for (let index = 0; index < 4; index += 1) await user.tab();
    expect(screen.getByRole('button', { name: 'High contrast' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });
});

describe('accessibility toolbar', () => {
  it('changes text size, marks the active choice and remembers it', async () => {
    const user = userEvent.setup();
    render(<AccessibilityToolbar />);
    await user.click(screen.getByRole('button', { name: 'Larger text' }));
    expect(screen.getByRole('button', { name: 'Larger text' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Normal text' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(document.documentElement.dataset.textSize).toBe('large');
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? '{}').textSize).toBe('large');
  });

  it('toggles high contrast', async () => {
    const user = userEvent.setup();
    render(<AccessibilityToolbar />);
    const button = screen.getByRole('button', { name: 'High contrast' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.contrast).toBe('high');
    await user.click(button);
    expect(document.documentElement.dataset.contrast).toBe('normal');
  });

  it('restores saved preferences', () => {
    window.localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ textSize: 'small', highContrast: true }),
    );
    preferencesStore.reset();
    render(<AccessibilityToolbar />);
    expect(document.documentElement.dataset.textSize).toBe('small');
    expect(document.documentElement.dataset.contrast).toBe('high');
  });

  it('still works when storage is blocked', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<AccessibilityToolbar />);
    await user.click(screen.getByRole('button', { name: 'Larger text' }));
    expect(document.documentElement.dataset.textSize).toBe('large');
    vi.restoreAllMocks();
  });
});

describe('input form', () => {
  const setup = (overrides: Partial<Parameters<typeof DocumentInput>[0]> = {}) => {
    const onSubmit = vi.fn();
    render(
      <DocumentInput
        language="en"
        text=""
        setText={noop}
        loading={false}
        onSubmit={onSubmit}
        onCancel={noop}
        {...overrides}
      />,
    );
    return { onSubmit, user: userEvent.setup() };
  };

  it('labels every field', () => {
    setup();
    expect(screen.getByLabelText(/Photo or PDF of your letter/)).toBeInTheDocument();
    expect(screen.getByLabelText('Text of your letter')).toBeInTheDocument();
  });

  it('asks for input instead of sending an empty request', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Explain my document' }));
    expect(screen.getByText(/paste some text or choose a file/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits pasted text', async () => {
    const { onSubmit, user } = setup({ text: '  A letter  ' });
    await user.click(screen.getByRole('button', { name: 'Explain my document' }));
    expect(onSubmit).toHaveBeenCalledWith({ file: undefined, text: 'A letter' });
  });

  it('rejects unsupported files with a friendly message', async () => {
    setup();
    // Bypass the input's accept filter, as a browser's "All files" option would.
    const user = userEvent.setup({ applyAccept: false });
    const input = screen.getByLabelText(/Photo or PDF of your letter/);
    await user.upload(input, new File(['x'], 'a.gif', { type: 'image/gif' }));
    expect(screen.getByText(/only read JPG, PNG, WEBP/)).toBeInTheDocument();
  });

  it('requires consent before a file is sent', async () => {
    const { onSubmit, user } = setup();
    const file = new File(['%PDF-1.4'], 'letter.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/Photo or PDF of your letter/), file);
    await user.click(screen.getByRole('button', { name: 'Explain my document' }));
    expect(screen.getByText(/tick the box/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox', { name: /sent to Google/ }));
    await user.click(screen.getByRole('button', { name: 'Explain my document' }));
    expect(onSubmit).toHaveBeenCalledWith({ file, text: undefined });
  });

  it('disables submit while loading and offers cancel', async () => {
    const onCancel = vi.fn();
    const { user } = setup({ loading: true, text: 'x', onCancel });
    expect(screen.getByRole('button', { name: 'Explain my document' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('deadline helpers', () => {
  it('links to Google Calendar safely and offers an .ics download', () => {
    render(<DeadlineBadge analysis={validAnalysis} />);
    const link = screen.getByRole('link', { name: /Add to Google Calendar/ });
    const url = new URL(link.getAttribute('href') ?? '');
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('dates')).toBe('20261231/20270101');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByRole('button', { name: /Download .ics/ })).toBeInTheDocument();
  });

  it('says so when there is no deadline and offers no calendar buttons', () => {
    render(
      <DeadlineBadge
        analysis={{
          ...validAnalysis,
          deadline: { date: null, consequenceIfMissed: 'Not mentioned' },
        }}
      />,
    );
    expect(screen.getByText(/No deadline was found/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Calendar/ })).toBeNull();
  });

  it('renders model text as plain text, never as HTML', () => {
    render(
      <DeadlineBadge
        analysis={{
          ...validAnalysis,
          deadline: { date: '2026-12-31', consequenceIfMissed: '<img src=x onerror=alert(1)>' },
        }}
      />,
    );
    const card = screen.getByRole('region', { name: 'Deadline' });
    expect(card.querySelector('img')).toBeNull();
    expect(within(card).getByText(/<img src=x/)).toBeInTheDocument();
  });
});

describe('voice input', () => {
  it('explains clearly when speech recognition is not supported', () => {
    render(<VoiceInputButton lang="en-IN" onText={noop} />);
    expect(screen.getByText(/not supported in this browser/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Speak instead of typing/ })).toBeDisabled();
  });
});
