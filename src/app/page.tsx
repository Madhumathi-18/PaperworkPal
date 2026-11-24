import { AccessibilityToolbar } from '@/components/AccessibilityToolbar';
import { Icon, LogoMark, type IconName } from '@/components/Icon';
import { PaperworkApp } from '@/components/PaperworkApp';

const TRUST_POINTS: ReadonlyArray<{ icon: IconName; text: string }> = [
  { icon: 'lock', text: 'Your document is never stored' },
  { icon: 'globe', text: '8 languages' },
  { icon: 'volume', text: 'Read aloud and voice typing' },
];

const STEPS: ReadonlyArray<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'upload',
    title: 'Add your letter',
    text: 'Take a photo, upload a PDF or paste the text.',
  },
  {
    icon: 'file',
    title: 'Read it in plain words',
    text: 'Get a short summary and what the sender wants.',
  },
  {
    icon: 'checks',
    title: 'Know what to do',
    text: 'Follow a simple checklist and never miss the deadline.',
  },
];

export default function HomePage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <header className="space-y-6 py-5 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-3 text-xl font-extrabold tracking-tight">
            <LogoMark />
            Paperwork Pal
          </p>
          <AccessibilityToolbar />
        </div>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-stretch">
          <div className="hero flex flex-col justify-center space-y-5">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Understand any official letter in your language
            </h1>
            <p className="max-w-2xl text-lg text-muted sm:text-xl">
              Add a letter from the government, a bank, an insurer or a landlord. We explain it in
              simple words, list what to do, and tell you the deadline.
            </p>
            <ul className="flex flex-wrap gap-2 pt-1">
              {TRUST_POINTS.map(({ icon, text }) => (
                <li key={text} className="pill">
                  <Icon name={icon} className="size-4 text-primary-ink" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <ol aria-label="How it works" className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {STEPS.map(({ icon, title, text }, index) => (
              <li key={title} className="card flex gap-4 p-4 sm:p-5">
                <span className="icon-chip size-12">
                  <Icon name={icon} className="size-6" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-primary-ink">Step {index + 1}</span>
                  <span className="block font-bold leading-snug">{title}</span>
                  <span className="mt-1 block text-sm text-muted">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <PaperworkApp />
      </main>

      <footer className="mt-12 border-t border-edge-soft pt-6 text-sm text-muted">
        <p className="flex items-start gap-2">
          <Icon name="info" className="mt-0.5 size-4 shrink-0" />
          <span>
            Paperwork Pal explains documents. It does not give legal, tax or financial advice.
            Powered by Google Gemini.
          </span>
        </p>
      </footer>
    </div>
  );
}
