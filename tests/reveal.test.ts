// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { revealElement } from '@/lib/client/reveal';

function elementWithScroll(): { element: HTMLElement; scrollIntoView: ReturnType<typeof vi.fn> } {
  const element = document.createElement('div');
  const scrollIntoView = vi.fn();
  element.scrollIntoView = scrollIntoView;
  return { element, scrollIntoView };
}

function mockReducedMotion(matches: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query }));
}

describe('revealElement', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scrolls smoothly, and only as far as needed', () => {
    mockReducedMotion(false);
    const { element, scrollIntoView } = elementWithScroll();
    revealElement(element);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it('jumps instead of animating when the person prefers reduced motion', () => {
    mockReducedMotion(true);
    const { element, scrollIntoView } = elementWithScroll();
    revealElement(element);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'nearest' });
  });

  it('still works when the browser cannot report motion preferences', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { element, scrollIntoView } = elementWithScroll();
    revealElement(element);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it('does nothing without an element or without scroll support', () => {
    expect(() => revealElement(null)).not.toThrow();
    const bare = document.createElement('div');
    Object.defineProperty(bare, 'scrollIntoView', { value: undefined });
    expect(() => revealElement(bare)).not.toThrow();
  });
});
