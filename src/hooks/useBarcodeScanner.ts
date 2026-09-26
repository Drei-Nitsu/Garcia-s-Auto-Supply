import { useEffect, useRef } from 'react';

/**
 * Detects USB/Bluetooth barcode scanners (which "type" very fast and end with Enter)
 * without stealing normal keyboard input. Fires onScan when a burst of >= minLength
 * characters arrives with < maxGapMs between keystrokes, terminated by Enter.
 *
 * Works even when focus is not in the search box. Keystrokes into other inputs
 * (e.g. discount fields) are ignored unless `captureInInputs` is true.
 */
export function useBarcodeScanner(
  onScan: (code: string) => void,
  { minLength = 4, maxGapMs = 35, captureInInputs = false }: { minLength?: number; maxGapMs?: number; captureInInputs?: boolean } = {},
) {
  const buffer = useRef('');
  const lastTime = useRef(0);
  const cb = useRef(onScan);
  cb.current = onScan;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (inField && !captureInInputs && !target?.dataset.scannerTarget) return;

      const now = performance.now();
      if (now - lastTime.current > maxGapMs) buffer.current = '';
      lastTime.current = now;

      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          const code = buffer.current;
          buffer.current = '';
          e.preventDefault();
          e.stopPropagation(); // don't let the focused input also handle this Enter
          cb.current(code);
        }
        buffer.current = '';
        return;
      }
      if (e.key.length === 1) buffer.current += e.key;
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [minLength, maxGapMs, captureInInputs]);
}
