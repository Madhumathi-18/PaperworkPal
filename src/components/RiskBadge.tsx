import type { RiskLevel } from '@/types';

const LEVELS: Record<RiskLevel, { label: string; className: string; icon: React.ReactElement }> = {
  low: {
    label: 'Low risk',
    className: 'risk-low',
    icon: <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />,
  },
  medium: {
    label: 'Medium risk',
    className: 'risk-medium',
    icon: <path d="M12 3 22 21H2Z" fill="none" stroke="currentColor" strokeWidth="2.5" />,
  },
  high: {
    label: 'High risk',
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

/** Risk level shown as an icon shape plus words, so it never depends on colour alone. */
export function RiskBadge({ level }: { level: RiskLevel }): React.ReactElement {
  const { label, className, icon } = LEVELS[level];
  return (
    <span
      lang="en"
      className={`${className} inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-1 font-bold`}
    >
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true" focusable="false">
        {icon}
      </svg>
      {label}
    </span>
  );
}
