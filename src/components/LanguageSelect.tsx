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
    <div>
      <label htmlFor="language" className="block text-lg font-semibold">
        Explain it in this language
      </label>
      <select
        id="language"
        className="field mt-2 min-h-11 sm:max-w-xs"
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
