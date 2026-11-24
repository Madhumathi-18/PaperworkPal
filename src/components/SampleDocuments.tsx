import { Icon } from '@/components/Icon';
import { SAMPLE_DOCUMENTS } from '@/samples';

interface SampleDocumentsProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

/** One-click demo documents (all fake) so nobody has to upload anything to try the app. */
export function SampleDocuments({ onSelect, disabled }: SampleDocumentsProps): React.ReactElement {
  return (
    <section aria-labelledby="samples-heading">
      <h2 id="samples-heading" className="card-title">
        Try a sample document
      </h2>
      <p className="mt-1 text-muted">These are made-up letters. Nothing personal is used.</p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {SAMPLE_DOCUMENTS.map((sample) => (
          <li key={sample.id}>
            <button
              type="button"
              className="btn btn-secondary h-full w-full flex-col items-start gap-1 rounded-2xl p-4 text-left"
              disabled={disabled}
              onClick={() => onSelect(sample.build(new Date()))}
            >
              <span className="icon-chip mb-1">
                <Icon name="file" />
              </span>
              <span>{sample.title}</span>
              <span className="text-sm font-normal text-muted">{sample.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
