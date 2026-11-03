import { useRef } from 'react';

/** The request ID of one user intent, from useRequest: a retry of the same input replays the first answer. */
export type RequestFor = (input: unknown) => string;

/**
 * A request ID per distinct input, so a retry of the same input reuses the ID and the server answers it
 * idempotently. `clear` starts a new request after success.
 */
export function useRequest() {
  const current = useRef<{ fingerprint: string; id: string } | null>(null);
  return {
    for(input: unknown) {
      const fingerprint = JSON.stringify(input);
      if (current.current?.fingerprint !== fingerprint) current.current = { fingerprint, id: crypto.randomUUID() };
      return current.current.id;
    },
    clear() {
      current.current = null;
    },
  };
}
