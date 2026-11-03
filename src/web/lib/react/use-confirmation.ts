import { useState } from 'react';

/** The value stays while the dialog closes, so its outgoing content never flashes empty. */
export interface Confirmation<Value> {
  open: boolean;
  value: Value;
}

export function useConfirmation<Value>() {
  const [current, setCurrent] = useState<Confirmation<Value> | null>(null);
  const close = (closing?: Confirmation<Value>) =>
    setCurrent((latest) => {
      const value = closing ?? latest;
      return value && { ...value, open: false };
    });
  return { current, open: current?.open ?? false, ask: (value: Value) => setCurrent({ open: true, value }), close };
}
