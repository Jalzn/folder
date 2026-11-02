/** The shapes of an autosave, for any snapshot. */
export type SaveInput<T> = T & {
  id: string;
  requestId: string;
  expectedVersion: number;
};
export interface SaveAck {
  id: string;
  version: number;
  updatedAt: string;
}
export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';
/** A snapshot as a draft from before every item had a project may hold it: with `projectId: null`. */
export type Legacy<T extends { projectId: string }> = Omit<T, 'projectId'> & { projectId: string | null };
export interface SavedDraft<T> {
  format: 1;
  baseVersion: number;
  snapshot: T;
  pending: SaveInput<T> | null;
  recoveryData?: string | null;
}
export interface SaveState<T> {
  snapshot: T;
  version: number;
  status: SaveStatus;
  error: unknown;
  /** The last save was refused for good (DEFINITIVE_REFUSALS): sending it again would only repeat the refusal. */
  refused: boolean;
  storageFailed: boolean;
  recovered: boolean;
  remoteEpoch: number;
  recoveryData: string | null;
}
export interface DraftStorage {
  read(): string | null;
  write(value: string): void;
  remove(): void;
}
