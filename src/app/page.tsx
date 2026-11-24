import { AccessibilityToolbar } from '@/components/AccessibilityToolbar';
import { PaperworkApp } from '@/components/PaperworkApp';

export default function HomePage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="space-y-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xl font-extrabold">Paperwork Pal</p>
          <AccessibilityToolbar />
        </div>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Understand any official letter in your language
        </h1>
        <p className="text-lg text-muted">
          Add a letter from the government, a bank, an insurer or a landlord. We explain it in
          simple words, list what to do, and tell you the deadline.
        </p>
      </header>
      <main id="main" tabIndex={-1}>
        <PaperworkApp />
      </main>
      <footer className="mt-10 text-sm text-muted">
        <p>
          Paperwork Pal explains documents. It does not give legal, tax or financial advice. Powered
          by Google Gemini.
        </p>
      </footer>
    </div>
  );
}
