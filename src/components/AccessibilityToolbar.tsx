'use client';

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
      <div role="group" aria-label="Text size" className="flex gap-2">
        {SIZE_BUTTONS.map(({ size, label, name }) => (
          <button
            key={size}
            type="button"
            className="btn btn-secondary"
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
        className="btn btn-secondary"
        aria-pressed={preferences.highContrast}
        onClick={() => update({ highContrast: !preferences.highContrast })}
      >
        High contrast
      </button>
    </nav>
  );
}
