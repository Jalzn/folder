import { type RefObject, useEffect } from 'react';

/** Publish after commit, in a passive effect; leaving an old owner never clears a newer command. */
export function useCommandSlot<T>(slot: RefObject<T>, value: T, empty: T) {
  useEffect(() => {
    slot.current = value;
    return () => {
      if (slot.current === value) slot.current = empty;
    };
  }, [slot, value, empty]);
}
