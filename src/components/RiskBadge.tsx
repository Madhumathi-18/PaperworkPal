import { getLabels } from '@/lib/labels';
import { DEFAULT_LANGUAGE, type LanguageCode } from '@/lib/languages';
import type { RiskLevel } from '@/types';

type RiskLabel = 'riskLow' | 'riskMedium' | 'riskHigh';

const LEVELS: Record<RiskLevel, { label: RiskLabel; className: string; icon: React.ReactElement }> =
  {
    low: {
      label: 'riskLow',
      className: 'risk-low',
      icon: <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />,
    },
    medium: {
      label: 'riskMedium',
      className: 'risk-medium',
      icon: <path d="M12 3 22 21H2Z" fill="none" stroke="currentColor" strokeWidth="2.5" />,
    },
    high: {
      label: 'riskHigh',
      className: 'risk-high',
      icon: (
        <path
          d="M8 2h8l6 6v8l-6 6H8l-6-6V8Z M12 7v6 M12 16v2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      ),
    },
  };

/**
 * Risk level shown as an icon shape plus words, so it never depends on colour alone. The words
 * are in the language of the explanation.
 */
export function RiskBadge({
  level,
  language = DEFAULT_LANGUAGE,
}: {
  level: RiskLevel;
  language?: LanguageCode;
}): React.ReactElement {
  const { label, className, icon } = LEVELS[level];
  const text = getLabels(language)[label];
  return (
    <span
      className={`${className} inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-1 font-bold shadow-sm`}
    >
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true" focusable="false">
        {icon}
      </svg>
      {text}
    </span>
  );
}
