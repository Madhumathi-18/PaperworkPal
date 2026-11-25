/**
 * Scrolls an element into view only if it is not already visible. People who ask their device
 * to reduce motion get an instant jump instead of a smooth scroll. Does nothing where the
 * browser has no scrolling support (for example in tests).
 */
export function revealElement(element: HTMLElement | null): void {
  if (!element || typeof element.scrollIntoView !== 'function') return;
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
}
