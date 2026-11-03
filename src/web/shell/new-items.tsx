import { useNavigate } from '@tanstack/react-router';
import { createContext, type ReactNode, useCallback, useContext, useRef } from 'react';
import { api } from '../lib/api';
import { useRequest } from '../lib/writes/use-request';
import { paths } from '../navigation/paths';
import { focusPageTitle } from '../ui';
import { type HeldTyping, type HeldTypingTarget, holdTyping } from './held-typing';
import { useAction } from './writes';

export interface NewItemsValue {
  /** Creates a document in the project, or in one of its folders, and opens it with the focus on its title. */
  newDocument: (projectId: string, folderId?: string) => Promise<void>;
  /**
   * Starts holding what is typed for the next `newDocument` (holdTyping) before it is called, as the ⌘K palette
   * runs its command a frame after it closes.
   */
  holdForNewDocument: () => void;
  /**
   * The page of a document calls it with its title as it opens: the title of the one `newDocument` just made
   * takes the focus, whichever path asked for it (the Novo menu, N or ⌘K), as the menu or the palette gives
   * the focus back to the page being left, and what was typed while it was on its way (holdTyping).
   */
  newDocumentOpened: (documentId: string, target: HeldTypingTarget) => void;
  /** Creates a drawing in the project, or in one of its folders, and opens it. */
  newCanvas: (projectId: string, folderId?: string) => Promise<void>;
  creatingDocument: boolean;
  creatingCanvas: boolean;
}

const NewItemsContext = createContext<NewItemsValue | null>(null);

/** How long the keys wait for a new document's page before they are let go, as when it never opens. */
const HOLD_MS = 15_000;

export function useNewItems() {
  const value = useContext(NewItemsContext);
  if (!value) throw new Error('Contexto do aplicativo indisponível');
  return value;
}

/** Making a document or a drawing and opening it, with the keys held for a new document's title (WF-4). */
export function NewItemsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const documentAction = useAction();
  const canvasAction = useAction();
  const documentRequest = useRequest();
  const canvasRequest = useRequest();
  /** The field off screen that holds the keys while a new document is on its way (holdTyping). */
  const holdField = useRef<HTMLTextAreaElement>(null);
  /** The document `newDocument` is making, with the keys held for it, until its page opens. */
  const making = useRef<{ documentId: string | null; held: HeldTyping | null; timer: number } | null>(null);
  /** Lets the keys go, typed text and all, when the new document's page will not open. */
  const letGo = useCallback(() => {
    const current = making.current;
    making.current = null;
    if (!current) return;
    clearTimeout(current.timer);
    current.held?.cancel();
    focusPageTitle();
  }, []);
  // From the request until the new title has the focus, the keys wait for it: the page shown meanwhile is the
  // one being left, and its title, its text or its shortcuts would take them.
  const holdForNewDocument = useCallback(() => {
    if (making.current) return;
    making.current = {
      documentId: null,
      held: holdField.current ? holdTyping(holdField.current) : null,
      timer: window.setTimeout(letGo, HOLD_MS),
    };
  }, [letGo]);
  /** A document being made: a second ask meanwhile does nothing, and the keys stay held for the first. */
  const creatingDocument = useRef(false);
  async function newDocument(projectId: string, folderId?: string) {
    if (creatingDocument.current) return;
    creatingDocument.current = true;
    holdForNewDocument();
    const input = { projectId, ...(folderId ? { folderId } : {}) };
    try {
      const made = await documentAction.run(
        () => api.workspace.createDocument({ ...input, requestId: documentRequest.for(input) }),
        (document) => {
          documentRequest.clear();
          if (making.current) making.current.documentId = document.id;
          void navigate({ href: paths.document(projectId, document.id) });
        },
      );
      if (!made) letGo();
    } finally {
      creatingDocument.current = false;
    }
  }
  const newDocumentOpened = useCallback((documentId: string, target: HeldTypingTarget) => {
    const current = making.current;
    if (!current || current.documentId !== documentId) return;
    making.current = null;
    clearTimeout(current.timer);
    if (current.held) current.held.release(target);
    else target.title.focus({ preventScroll: true });
  }, []);
  async function newCanvas(projectId: string, folderId?: string) {
    const input = { projectId, ...(folderId ? { folderId } : {}) };
    await canvasAction.run(
      () => api.workspace.createCanvas({ ...input, requestId: canvasRequest.for(input) }),
      (canvas) => {
        canvasRequest.clear();
        void navigate({ href: paths.drawing(projectId, canvas.id) });
      },
    );
  }
  const value: NewItemsValue = {
    newDocument,
    holdForNewDocument,
    newDocumentOpened,
    newCanvas,
    creatingDocument: documentAction.busy,
    creatingCanvas: canvasAction.busy,
  };
  return (
    <NewItemsContext.Provider value={value}>
      {children}
      {/* holdTyping's field: off screen and out of the Tab order, it only has the focus while a document opens. */}
      <textarea
        ref={holdField}
        className="sr-only"
        tabIndex={-1}
        aria-label="Abrindo o novo documento"
        data-holds-typing=""
      />
    </NewItemsContext.Provider>
  );
}
