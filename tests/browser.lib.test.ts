// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadTextFile } from '@/lib/client/download';
import { compressImage } from '@/lib/client/files';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('downloadTextFile', () => {
  it('creates a temporary link, clicks it and cleans up', () => {
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    downloadTextFile('deadline.ics', 'BEGIN:VCALENDAR', 'text/calendar');

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toBe('text/calendar;charset=utf-8');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});

describe('compressImage in the browser', () => {
  function stubCanvas(outputBytes: number): { width: number; height: number } {
    const size = { width: 0, height: 0 };
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 3200, height: 2400, close: vi.fn() })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback,
    ) {
      size.width = this.width;
      size.height = this.height;
      callback(new Blob([new Uint8Array(outputBytes)], { type: 'image/jpeg' }));
    });
    return size;
  }

  it('shrinks a large photo to at most 1600 px and re-encodes it as JPEG', async () => {
    const size = stubCanvas(1_000);
    const original = new File([new Uint8Array(500_000)], 'letter.png', { type: 'image/png' });

    const result = await compressImage(original);

    expect(size).toEqual({ width: 1600, height: 1200 });
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('letter.jpg');
    expect(result.size).toBeLessThan(original.size);
  });

  it('keeps the original when compression would make it bigger', async () => {
    stubCanvas(900_000);
    const original = new File([new Uint8Array(1_000)], 'tiny.jpg', { type: 'image/jpeg' });
    expect(await compressImage(original)).toBe(original);
  });
});
