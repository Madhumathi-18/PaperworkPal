'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { preferencesStore, type Preferences } from '@/lib/client/preferences';

/** Reads saved display preferences and applies them to the page (`<html>` data attributes). */
export function usePreferences(): [Preferences, (change: Partial<Preferences>) => void] {
  const preferences = useSyncExternalStore(
    preferencesStore.subscribe,
    preferencesStore.getSnapshot,
    preferencesStore.getServerSnapshot,
  );

  useEffect(() => {
    document.documentElement.dataset.textSize = preferences.textSize;
    document.documentElement.dataset.contrast = preferences.highContrast ? 'high' : 'normal';
  }, [preferences]);

  return [preferences, preferencesStore.update];
}
