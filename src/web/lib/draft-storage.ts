/**
 * An editor's local draft, `tinyfold:draft:<identity>:<writer>`, as a document's or a task's text. A
 * duplicated browser tab inherits sessionStorage, so each opening writes to a fresh record and uses the
 * inherited pointer only to recover.
 */
export function draftStorage(identity: string) {
  const key = `tinyfold:draft:${identity}:${crypto.randomUUID()}`;
  const pointerKey = `tinyfold:draft-pointer:${identity}`;
  let previousKey: string | null = null;
  try {
    previousKey = sessionStorage.getItem(pointerKey);
  } catch {
    /* Local storage may still preserve this page's draft. */
  }
  return {
    read: () => {
      const value = localStorage.getItem(key) ?? (previousKey ? localStorage.getItem(previousKey) : null);
      if (value !== null) {
        // Copy before replacing the pointer, including drafts that cannot be rendered.
        try {
          localStorage.setItem(key, value);
          sessionStorage.setItem(pointerKey, key);
        } catch {
          /* Keep the predecessor pointer if storage is full. */
        }
      }
      return value;
    },
    write: (value: string) => {
      localStorage.setItem(key, value);
      sessionStorage.setItem(pointerKey, key);
    },
    remove: () => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(pointerKey);
    },
  };
}
