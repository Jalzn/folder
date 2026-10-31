import type { AppState } from '@excalidraw/excalidraw/types';
import { useEffect, useRef } from 'react';

const SAVE_DELAY_MS = 250;

function readViewport(key: string): Partial<AppState> {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null') as {
      scrollX: number;
      scrollY: number;
      zoom: number;
    } | null;
    if (
      value &&
      Number.isFinite(value.scrollX) &&
      Number.isFinite(value.scrollY) &&
      Number.isFinite(value.zoom) &&
      value.zoom >= 0.1 &&
      value.zoom <= 30
    )
      return {
        scrollX: value.scrollX,
        scrollY: value.scrollY,
        zoom: { value: value.zoom as AppState['zoom']['value'] },
      };
  } catch {
    // A viewport preference is optional and never affects the recoverable content.
  }
  return {};
}

/** Where the drawing was scrolled and zoomed on this device, kept a moment after each change. */
export function useViewport(key: string) {
  const viewport = useRef(readViewport(key));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function changed(scrollX: number, scrollY: number, zoom: AppState['zoom']) {
    viewport.current = { scrollX, scrollY, zoom };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({ scrollX, scrollY, zoom: zoom.value }));
      } catch {
        /* View preferences are optional. */
      }
    }, SAVE_DELAY_MS);
  }
  return { saved: () => viewport.current, changed };
}
