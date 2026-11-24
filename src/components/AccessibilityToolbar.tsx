'use client';

import { Icon } from '@/components/Icon';
import { usePreferences } from '@/hooks/usePreferences';
import type { TextSize } from '@/lib/client/preferences';

const SIZE_BUTTONS: ReadonlyArray<{ size: TextSize; label: string; name: string }> = [
  { size: 'small', label: 'A-', name: 'Smaller text' },
  { size: 'normal', label: 'A', name: 'Normal text' },
  { size: 'large', label: 'A+', name: 'Larger text' },
];

/** Text size (A-, A, A+) and high-contrast controls. Choices are remembered on this device. */
export function AccessibilityToolbar(): React.ReactElement {
  const [preferences, update] = usePreferences();

  return (
    <nav aria-label="Display settings" className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Text size" className="flex gap-1.5">
        {SIZE_BUTTONS.map(({ size, label, name }) => (
          <button
            key={size}
            type="button"
            className="btn btn-secondary px-3"
            aria-label={name}
            aria-pressed={preferences.textSize === size}
            onClick={() => update({ textSize: size })}
          >
            <span aria-hidden="true">{label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-secondary px-3"
        title="High contrast"
        aria-pressed={preferences.highContrast}
        onClick={() => update({ highContrast: !preferences.highContrast })}
      >
        <Icon name="contrast" />
        <span className="sr-only">High contrast</span>
      </button>
    </nav>
  );
}
