import { RECOVERY_DOCUMENT_LIMITS, readDocumentContent } from '@tinyfold/workspace/domain';
import { sanitizeEmbeds } from './sanitize-embeds';
import type { DocumentContent } from './types';

export interface Snapshot {
  title: string;
  projectId: string;
  content: DocumentContent;
}
export type SaveInput<T = Snapshot> = T & {
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
export interface SavedDraft<T = Snapshot> {
  format: 1;
  baseVersion: number;
  snapshot: T;
  pending: SaveInput<T> | null;
  recoveryData?: string | null;
}
export interface SaveState<T = Snapshot> {
  snapshot: T;
  version: number;
  status: SaveStatus;
  error: unknown;
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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function sameSnapshot(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}
/**
 * Reads a stored draft; one from before every item had a project may have `projectId: null` (withDraftProject).
 * Blocks a Tab once nested under an embed come out after it first, and an embed with an ID the server
 * refuses goes, so that draft opens (sanitizeEmbeds).
 */
export function parseDraft(value: string | null): SavedDraft<Legacy<Snapshot>> | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value) as SavedDraft<Legacy<Snapshot>>;
    if (
      data.format !== 1 ||
      !Number.isInteger(data.baseVersion) ||
      data.baseVersion < 1 ||
      !Array.isArray(data.snapshot?.content) ||
      typeof data.snapshot.title !== 'string' ||
      data.snapshot.title.length > 300 ||
      (data.snapshot.projectId !== null && typeof data.snapshot.projectId !== 'string')
    )
      return null;
    data.snapshot.content = readDocumentContent(sanitizeEmbeds(data.snapshot.content), RECOVERY_DOCUMENT_LIMITS, {
      embeds: true,
    });
    if (data.recoveryData !== undefined && data.recoveryData !== null && typeof data.recoveryData !== 'string')
      return null;
    if (data.pending) {
      if (
        typeof data.pending.id !== 'string' ||
        typeof data.pending.requestId !== 'string' ||
        !Number.isInteger(data.pending.expectedVersion) ||
        data.pending.expectedVersion < 1 ||
        typeof data.pending.title !== 'string' ||
        data.pending.title.length > 300 ||
        (data.pending.projectId !== null && typeof data.pending.projectId !== 'string')
      )
        data.pending = null;
      else {
        try {
          data.pending.content = readDocumentContent(sanitizeEmbeds(data.pending.content), RECOVERY_DOCUMENT_LIMITS, {
            embeds: true,
          });
        } catch {
          data.pending = null;
        }
      }
    }
    return data;
  } catch {
    return null;
  }
}

/** One immutable request is retried until acknowledged; newer edits stay in the draft. */
export class AutosaveController<T = Snapshot> {
  private state: SaveState<T>;
  private pending: SaveInput<T> | null = null;
  private savedSnapshot: T;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private draftTimer: ReturnType<typeof setTimeout> | undefined;
  private inFlight: Promise<boolean> | null = null;
  private remote: { snapshot: T; version: number };

  constructor(
    private options: {
      id: string;
      snapshot: T;
      version: number;
      storage: DraftStorage;
      send: (input: SaveInput<T>) => Promise<SaveAck>;
      readDraft?: (value: string | null) => SavedDraft<T> | null;
      equal?: (left: T, right: T) => boolean;
      draftDelayMs?: number;
      idFactory: () => string;
      classifyError: (error: unknown) => string | undefined;
      /** The request was acknowledged; `snapshot` is what that version holds. */
      onSaved?: (ack: SaveAck, snapshot: T) => void;
      /** The editor took over a newer version saved elsewhere, without local changes to keep. */
      onAdopted?: (snapshot: T, version: number) => void;
    },
  ) {
    this.savedSnapshot = clone(options.snapshot);
    this.remote = { snapshot: clone(options.snapshot), version: options.version };
    let draft: SavedDraft<T> | null = null;
    let storageFailed = false;
    let rawDraft: string | null = null;
    try {
      rawDraft = options.storage.read();
      draft = options.readDraft
        ? options.readDraft(rawDraft)
        : (parseDraft(rawDraft) as unknown as SavedDraft<T> | null);
    } catch {
      storageFailed = true;
    }
    if (draft?.pending && draft.pending.id !== options.id) draft.pending = null;
    const hasDraft = draft !== null && (!this.equal(draft.snapshot, options.snapshot) || draft.pending !== null);
    this.pending = hasDraft && draft ? draft.pending : null;
    this.state = {
      snapshot: clone(hasDraft && draft ? draft.snapshot : options.snapshot),
      version: hasDraft && draft ? draft.baseVersion : options.version,
      status: hasDraft
        ? draft?.pending
          ? 'error'
          : draft?.baseVersion !== options.version
            ? 'conflict'
            : 'dirty'
        : 'saved',
      error: null,
      storageFailed,
      recovered: hasDraft,
      remoteEpoch: 0,
      recoveryData: draft?.recoveryData ?? (rawDraft && !draft ? rawDraft : null),
    };
    if (this.state.status === 'dirty') this.schedule();
  }
  getState = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(patch: Partial<SaveState<T>> = {}) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  private equal(left: T, right: T) {
    return this.options.equal ? this.options.equal(left, right) : sameSnapshot(left, right);
  }
  private persist() {
    clearTimeout(this.draftTimer);
    this.draftTimer = undefined;
    try {
      this.options.storage.write(
        JSON.stringify({
          format: 1,
          baseVersion: this.state.version,
          snapshot: this.state.snapshot,
          pending: this.pending,
          recoveryData: this.state.recoveryData,
        } satisfies SavedDraft<T>),
      );
      if (this.state.storageFailed) this.emit({ storageFailed: false });
    } catch {
      this.emit({ storageFailed: true });
    }
  }
  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 650);
  }
  persistDraft() {
    if (this.state.status !== 'saved' || this.state.recoveryData) this.persist();
  }
  change(snapshot: T) {
    if (this.equal(snapshot, this.state.snapshot)) return;
    const blocked = ['error', 'conflict'].includes(this.state.status);
    this.emit({
      snapshot: clone(snapshot),
      status: blocked ? this.state.status : this.inFlight ? 'saving' : 'dirty',
      recovered: false,
    });
    if (this.options.draftDelayMs) {
      this.draftTimer ??= setTimeout(() => this.persist(), this.options.draftDelayMs);
    } else this.persist();
    if (!blocked) this.schedule();
  }
  async flush(): Promise<boolean> {
    clearTimeout(this.timer);
    if (this.inFlight) {
      await this.inFlight;
      return this.state.status === 'saved' || (this.state.status === 'dirty' ? this.flush() : false);
    }
    if (this.state.status === 'conflict') return false;
    if (!this.pending && this.equal(this.state.snapshot, this.savedSnapshot)) {
      this.emit({ status: 'saved' });
      return true;
    }
    this.pending ??= {
      ...clone(this.state.snapshot),
      id: this.options.id,
      expectedVersion: this.state.version,
      requestId: this.options.idFactory(),
    };
    const sent = this.pending;
    this.persist();
    this.emit({ status: 'saving', error: null });
    const work = async () => {
      try {
        const ack = await this.options.send(sent);
        this.pending = null;
        const { id: _id, requestId: _requestId, expectedVersion: _version, ...sentSnapshot } = sent;
        this.savedSnapshot = sentSnapshot as T;
        const caughtUp = this.equal(this.state.snapshot, this.savedSnapshot);
        const newerRemote = this.remote.version > ack.version;
        const adopted = newerRemote && caughtUp;
        if (adopted) {
          this.savedSnapshot = clone(this.remote.snapshot);
          this.emit({
            snapshot: clone(this.remote.snapshot),
            version: this.remote.version,
            status: 'saved',
            error: null,
            recovered: false,
            remoteEpoch: this.state.remoteEpoch + 1,
          });
        } else {
          this.emit({
            version: ack.version,
            status: newerRemote ? 'conflict' : caughtUp ? 'saved' : 'dirty',
            error: null,
            recovered: false,
          });
          if (!newerRemote) this.remote = { snapshot: clone(this.savedSnapshot), version: ack.version };
        }
        this.persist();
        if (caughtUp && !this.state.recoveryData) {
          try {
            this.options.storage.remove();
          } catch {
            /* A successful server save remains successful. */
          }
        }
        this.options.onSaved?.(ack, sentSnapshot as T);
        if (adopted) this.options.onAdopted?.(clone(this.remote.snapshot), this.remote.version);
        return this.state.status !== 'conflict';
      } catch (error) {
        const code = this.options.classifyError(error);
        if (code === 'VERSION_CONFLICT' || code === 'CONFLICT') {
          this.pending = null;
          this.emit({ status: 'conflict', error });
        } else {
          // Validation is a definitive refusal. A corrected document gets a new request.
          if (['VALIDATION', 'DOMAIN_RULE', 'BAD_REQUEST', 'PAYLOAD_TOO_LARGE', 'REFUSED'].includes(code ?? ''))
            this.pending = null;
          this.emit({ status: 'error', error });
        }
        this.persist();
        return false;
      } finally {
        this.inFlight = null;
      }
    };
    this.inFlight = work();
    const success = await this.inFlight;
    if (success && this.state.status === 'dirty') return this.flush();
    return success;
  }
  /**
   * Changes where the item lives without sending its content: saves what is pending, then lets `apply`
   * write the change at the saved version (a move to another project) and takes the version and fields it
   * returns. Edits made meanwhile wait and go out afterwards at the new version. False when the content
   * cannot be saved first; an error from `apply` leaves everything as it was and is thrown.
   */
  async relocate(apply: (version: number) => Promise<{ version: number; patch: Partial<T> }>): Promise<boolean> {
    if (!(await this.flush()) || this.state.status !== 'saved') return false;
    clearTimeout(this.timer);
    let failure: unknown = null;
    const work = async () => {
      try {
        const { version, patch } = await apply(this.state.version);
        this.savedSnapshot = { ...this.savedSnapshot, ...patch };
        this.remote = { snapshot: { ...this.remote.snapshot, ...patch }, version };
        const snapshot = { ...this.state.snapshot, ...patch };
        this.emit({ snapshot, version, status: this.equal(snapshot, this.savedSnapshot) ? 'saved' : 'dirty' });
        return true;
      } catch (error) {
        failure = error;
        this.emit({ status: this.equal(this.state.snapshot, this.savedSnapshot) ? 'saved' : 'dirty' });
        return false;
      } finally {
        this.inFlight = null;
        this.persist();
      }
    };
    this.inFlight = work();
    const moved = await this.inFlight;
    // Edits made while the move ran go out now, at the new version.
    if (this.getState().status === 'dirty') this.schedule();
    if (!moved) throw failure;
    return true;
  }
  receiveRemote(snapshot: T, version: number) {
    if (version <= this.remote.version) return;
    this.remote = { snapshot: clone(snapshot), version };
    if (this.inFlight || this.pending) return;
    if (this.state.status === 'saved') this.acceptRemote(snapshot, version);
    else if (version !== this.state.version) {
      this.emit({ status: 'conflict' });
      this.persist();
    }
  }
  acceptRemote(snapshot: T, version: number) {
    if (this.inFlight) return;
    clearTimeout(this.timer);
    clearTimeout(this.draftTimer);
    this.draftTimer = undefined;
    this.pending = null;
    this.savedSnapshot = clone(snapshot);
    this.remote = { snapshot: clone(snapshot), version };
    this.emit({
      snapshot: clone(snapshot),
      version,
      status: 'saved',
      error: null,
      recovered: false,
      remoteEpoch: this.state.remoteEpoch + 1,
    });
    if (this.state.recoveryData) this.persist();
    else {
      try {
        this.options.storage.remove();
      } catch {
        this.emit({ storageFailed: true });
      }
    }
    this.options.onAdopted?.(clone(snapshot), version);
  }
  recoveryDownloaded() {
    this.emit({ recoveryData: null });
    if (this.state.status !== 'saved') this.persist();
    else {
      try {
        this.options.storage.remove();
      } catch {
        this.emit({ storageFailed: true });
      }
    }
  }
}
