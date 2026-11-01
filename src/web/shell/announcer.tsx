import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

const AnnounceContext = createContext<(text: string) => void>(() => undefined);

/** Says something in the shell's live region; the function never changes. */
export const useAnnounce = () => useContext(AnnounceContext);

/**
 * The shell's live region and what speaks into it, apart from the rest of the shell's state, so a message
 * re-renders only the region. It stays readable while a modal hides the rest (top layer).
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('');
  const announce = useCallback((next: string) => {
    // A repeated message must still be read: clear first, then set.
    setText('');
    requestAnimationFrame(() => setText(next));
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <p className="sr-only" aria-live="polite" data-react-aria-top-layer="true">
        {text}
      </p>
    </AnnounceContext.Provider>
  );
}
