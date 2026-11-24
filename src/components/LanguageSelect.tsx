import { Icon } from '@/components/Icon';
import { LANGUAGES, type LanguageCode } from '@/lib/languages';

interface LanguageSelectProps {
  value: LanguageCode;
  onChange: (language: LanguageCode) => void;
  disabled?: boolean;
}

/** Chooses the language of the explanation. Each option is announced in its own language. */
export function LanguageSelect({
  value,
  onChange,
  disabled,
}: LanguageSelectProps): React.ReactElement {
  return (
    <div className="card flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <label htmlFor="language" className="flex items-center gap-3 text-lg font-semibold">
        <span className="icon-chip">
          <Icon name="globe" />
        </span>
        Explain it in this language
      </label>
      <select
        id="language"
        className="field min-h-11 sm:max-w-xs"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as LanguageCode)}
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code} lang={language.bcp47}>
            {language.nativeLabel === language.label
              ? language.label
              : `${language.nativeLabel} (${language.label})`}
          </option>
        ))}
      </select>
    </div>
  );
}
