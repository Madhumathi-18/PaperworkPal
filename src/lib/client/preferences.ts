export type TextSize = 'small' | 'normal' | 'large';

export interface Preferences {
  textSize: TextSize;
  highContrast: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = { textSize: 'normal', highContrast: false };
export const PREFERENCES_KEY = 'paperwork-pal:preferences';

const TEXT_SIZES: readonly TextSize[] = ['small', 'normal', 'large'];

/** Parses saved preferences, ignoring anything unexpected. */
export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const value = JSON.parse(raw) as Partial<Preferences>;
    return {
      textSize: TEXT_SIZES.includes(value.textSize as TextSize)
        ? (value.textSize as TextSize)
        : DEFAULT_PREFERENCES.textSize,
      highContrast: value.highContrast === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function readStored(): Preferences {
  try {
    return parsePreferences(window.localStorage.getItem(PREFERENCES_KEY));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writeStored(preferences: Preferences): void {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Storage can be blocked (private mode, strict settings). The choice still applies this visit.
  }
}

/** Tiny store so React can read preferences with `useSyncExternalStore`. */
let current: Preferences | undefined;
const listeners = new Set<() => void>();

export const preferencesStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): Preferences {
    current ??= readStored();
    return current;
  },
  getServerSnapshot(): Preferences {
    return DEFAULT_PREFERENCES;
  },
  update(change: Partial<Preferences>): void {
    current = { ...preferencesStore.getSnapshot(), ...change };
    writeStored(current);
    listeners.forEach((listener) => listener());
  },
  /** Forgets the in-memory copy so the next read goes to storage again. Used by tests. */
  reset(): void {
    current = undefined;
    listeners.forEach((listener) => listener());
  },
};
