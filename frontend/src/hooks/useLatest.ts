import { useRef } from 'react';

/** Ref that always holds the latest value (for rAF loops and event handlers). */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
