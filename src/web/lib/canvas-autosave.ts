import {
  type CanvasElement,
  type CanvasScene,
  compactCanvasScene,
  emptyCanvasScene,
  RECOVERY_CANVAS_LIMITS,
  readCanvasScene,
} from '@tinyfold/workspace/domain';
import type { DraftStorage, Legacy, SavedDraft, SaveInput } from './autosave';
import { fileNameFrom } from './download';

export interface CanvasSnapshot {
  title: string;
  projectId: string;
  scene: CanvasScene;
}

function readSnapshot(value: unknown): Legacy<CanvasSnapshot> {
  if (!value || typeof value !== 'object') throw new Error('Rascunho inválido.');
  const snapshot = value as Legacy<CanvasSnapshot>;
  if (
    typeof snapshot.title !== 'string' ||
    snapshot.title.length > 300 ||
    (snapshot.projectId !== null && typeof snapshot.projectId !== 'string')
  )
    throw new Error('Rascunho inválido.');
  return {
    title: snapshot.title,
    projectId: snapshot.projectId,
    scene: readCanvasScene(snapshot.scene, RECOVERY_CANVAS_LIMITS),
  };
}

export function parseCanvasDraft(raw: string | null): SavedDraft<Legacy<CanvasSnapshot>> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as SavedDraft<Legacy<CanvasSnapshot>>;
    if (value.format !== 1 || !Number.isSafeInteger(value.baseVersion) || value.baseVersion < 1) return null;
    const snapshot = readSnapshot(value.snapshot);
    if (value.recoveryData !== undefined && value.recoveryData !== null && typeof value.recoveryData !== 'string')
      return null;
    let pending: SaveInput<Legacy<CanvasSnapshot>> | null = null;
    if (value.pending) {
      try {
        if (
          typeof value.pending.id !== 'string' ||
          typeof value.pending.requestId !== 'string' ||
          !Number.isSafeInteger(value.pending.expectedVersion) ||
          value.pending.expectedVersion < 1
        )
          throw new Error('Pedido inválido.');
        pending = {
          ...readSnapshot(value.pending),
          id: value.pending.id,
          requestId: value.pending.requestId,
          expectedVersion: value.pending.expectedVersion,
        };
      } catch {
        // A corrupt pending request must not prevent recovery of the valid current scene.
      }
    }
    return { format: 1, baseVersion: value.baseVersion, snapshot, pending, recoveryData: value.recoveryData ?? null };
  } catch {
    return null;
  }
}

/** A fresh writer record prevents duplicated tabs from overwriting one another's drafts. */
export function canvasDraftStorage(installationId: string, canvasId: string): DraftStorage {
  const identity = `${installationId}:${canvasId}`;
  const key = `tinyfold:canvas-draft:${identity}:${crypto.randomUUID()}`;
  const pointer = `tinyfold:canvas-draft-pointer:${identity}`;
  let predecessor: string | null = null;
  try {
    predecessor = sessionStorage.getItem(pointer);
  } catch {
    // Draft writes below still report whether local storage is usable.
  }
  return {
    read() {
      const value = localStorage.getItem(key) ?? (predecessor ? localStorage.getItem(predecessor) : null);
      if (value !== null) {
        try {
          localStorage.setItem(key, value);
          sessionStorage.setItem(pointer, key);
        } catch {
          // Preserve the predecessor pointer when copying fails.
        }
      }
      return value;
    },
    write(value) {
      localStorage.setItem(key, value);
      sessionStorage.setItem(pointer, key);
    },
    remove() {
      localStorage.removeItem(key);
      sessionStorage.removeItem(pointer);
    },
  };
}

/** Control characters and the Unicode line separators, which the server refuses anywhere in a link. */
const breakingCharacters = /[\p{Cc}\u2028\u2029]/gu;

/** An element whose link loses those characters and its surrounding spaces; anything else unchanged. */
function cleanLink(element: unknown): unknown {
  if (!element || typeof element !== 'object') return element;
  const { link } = element as { link?: unknown };
  if (typeof link !== 'string') return element;
  const cleaned = link.replace(breakingCharacters, '').trim();
  return cleaned === link ? element : { ...element, link: cleaned || null };
}

/**
 * Excalidraw files, pasted content and older scenes can carry line breaks or other control
 * characters in a link, which the server refuses. They are removed where a scene enters the editor,
 * as a browser drops tabs and line breaks from an address, so one link never blocks the import or
 * every later save.
 */
export function withCleanLinks(scene: CanvasScene): CanvasScene {
  const elements = scene.elements.map(cleanLink) as CanvasElement[];
  return elements.every((element, index) => element === scene.elements[index]) ? scene : { ...scene, elements };
}

export function readCanvasImport(raw: string): CanvasScene {
  const value = JSON.parse(raw) as Record<string, unknown>;
  if (!value || typeof value !== 'object' || value.type !== 'excalidraw' || value.version !== 2)
    throw new Error('Escolha um arquivo editável .excalidraw válido.');
  if (value.files && (typeof value.files !== 'object' || Object.keys(value.files).length > 0))
    throw new Error('Imagens ainda não são suportadas nos desenhos. O desenho aberto foi preservado.');
  const appState = value.appState as { viewBackgroundColor?: unknown } | undefined;
  return readCanvasScene(
    compactCanvasScene(
      readCanvasScene(
        {
          elements: Array.isArray(value.elements) ? value.elements.map(cleanLink) : value.elements,
          appState: {
            viewBackgroundColor: appState?.viewBackgroundColor ?? emptyCanvasScene().appState.viewBackgroundColor,
          },
        },
        RECOVERY_CANVAS_LIMITS,
      ),
    ),
  );
}

export function canvasFile(snapshot: Pick<CanvasSnapshot, 'scene'>): string {
  const scene = compactCanvasScene(snapshot.scene);
  return JSON.stringify(
    {
      type: 'excalidraw',
      version: 2,
      source: 'tinyfold',
      elements: scene.elements,
      appState: scene.appState,
      files: {},
    },
    null,
    2,
  );
}

export const canvasFileName = (title: string, extension: string) => fileNameFrom(title, 'desenho', extension);
