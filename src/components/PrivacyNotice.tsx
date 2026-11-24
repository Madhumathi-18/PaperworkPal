/** Short, always-visible explanation of what happens to the person's document. */
export function PrivacyNotice(): React.ReactElement {
  return (
    <section aria-labelledby="privacy-heading" className="card">
      <h2 id="privacy-heading" className="text-lg font-bold">
        Your privacy
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>We do not save your document or the explanation. Nothing is stored on our servers.</li>
        <li>
          The text is sent to Google&apos;s Gemini AI to be explained. Before that, we hide Aadhaar,
          PAN, phone, email, bank and card numbers.
        </li>
        <li>
          Photos and PDFs cannot be hidden automatically. Cover personal details before you upload,
          or try a sample document instead.
        </li>
        <li>
          Voice typing is done by your browser, which may send your voice to its speech service.
        </li>
      </ul>
    </section>
  );
}
