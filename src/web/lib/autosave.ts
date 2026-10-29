import { RECOVERY_DOCUMENT_LIMITS, readDocumentContent } from '@tinyfold/workspace/domain';
import type { DocumentContent } from './types';

export interface Snapshot {
  title: string;
  projectId: string | null;
  content: DocumentContent;
}
export interface SaveInput extends Snapshot {
  id: string;
  requestId: string;
  expectedVersion: number;
}
export interface SaveAck {
  id: string;
  version: number;
  updatedAt: string;
}
export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';
export interface SavedDraft {
  format: 1;
  baseVersion: number;
  snapshot: Snapshot;
  pending: SaveInput | null;
  recoveryData?: string | null;
}
export interface SaveState {
  snapshot: Snapshot;
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
export function sameSnapshot(a: Snapshot, b: Snapshot) {
  return JSON.stringify(a) === JSON.stringify(b);
}
export function parseDraft(value: string | null): SavedDraft | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value) as SavedDraft;
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
    data.snapshot.content = readDocumentContent(data.snapshot.content, RECOVERY_DOCUMENT_LIMITS);
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
          data.pending.content = readDocumentContent(data.pending.content, RECOVERY_DOCUMENT_LIMITS);
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
export class AutosaveController {
  private state: SaveState;
  private pending: SaveInput | null = null;
  private savedSnapshot: Snapshot;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private inFlight: Promise<boolean> | null = null;
  private remote: { snapshot: Snapshot; version: number };

  constructor(
    private options: {
      id: string;
      snapshot: Snapshot;
      version: number;
      storage: DraftStorage;
      send: (input: SaveInput) => Promise<SaveAck>;
      idFactory: () => string;
      classifyError: (error: unknown) => string | undefined;
      onSaved?: (ack: SaveAck, snapshot: Snapshot) => void;
    },
  ) {
    this.savedSnapshot = clone(options.snapshot);
    this.remote = { snapshot: clone(options.snapshot), version: options.version };
    let draft: SavedDraft | null = null;
    let storageFailed = false;
    let rawDraft: string | null = null;
    try {
      rawDraft = options.storage.read();
      draft = parseDraft(rawDraft);
    } catch {
      storageFailed = true;
    }
    if (draft?.pending && draft.pending.id !== options.id) draft.pending = null;
    const hasDraft = draft !== null && (!sameSnapshot(draft.snapshot, options.snapshot) || draft.pending !== null);
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
  private emit(patch: Partial<SaveState> = {}) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  private persist() {
    try {
      this.options.storage.write(
        JSON.stringify({
          format: 1,
          baseVersion: this.state.version,
          snapshot: this.state.snapshot,
          pending: this.pending,
          recoveryData: this.state.recoveryData,
        } satisfies SavedDraft),
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
  change(snapshot: Snapshot) {
    if (sameSnapshot(snapshot, this.state.snapshot)) return;
    const blocked = ['error', 'conflict'].includes(this.state.status);
    this.emit({
      snapshot: clone(snapshot),
      status: blocked ? this.state.status : this.inFlight ? 'saving' : 'dirty',
      recovered: false,
    });
    this.persist();
    if (!blocked) this.schedule();
  }
  async flush(): Promise<boolean> {
    clearTimeout(this.timer);
    if (this.inFlight) {
      await this.inFlight;
      return this.state.status === 'saved' || (this.state.status === 'dirty' ? this.flush() : false);
    }
    if (this.state.status === 'conflict') return false;
    if (!this.pending && sameSnapshot(this.state.snapshot, this.savedSnapshot)) {
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
        this.savedSnapshot = { title: sent.title, projectId: sent.projectId, content: sent.content };
        const caughtUp = sameSnapshot(this.state.snapshot, this.savedSnapshot);
        const newerRemote = this.remote.version > ack.version;
        if (newerRemote && caughtUp) {
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
        this.options.onSaved?.(ack, this.savedSnapshot);
        return this.state.status !== 'conflict';
      } catch (error) {
        const code = this.options.classifyError(error);
        if (code === 'VERSION_CONFLICT' || code === 'CONFLICT') {
          this.pending = null;
          this.emit({ status: 'conflict', error });
        } else {
          // Validation is a definitive refusal. A corrected document gets a new request.
          if (['VALIDATION', 'DOMAIN_RULE', 'BAD_REQUEST', 'PAYLOAD_TOO_LARGE'].includes(code ?? ''))
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
  receiveRemote(snapshot: Snapshot, version: number) {
    if (version <= this.remote.version) return;
    this.remote = { snapshot: clone(snapshot), version };
    if (this.inFlight || this.pending) return;
    if (this.state.status === 'saved') this.acceptRemote(snapshot, version);
    else if (version !== this.state.version) {
      this.emit({ status: 'conflict' });
      this.persist();
    }
  }
  acceptRemote(snapshot: Snapshot, version: number) {
    clearTimeout(this.timer);
    if (this.inFlight) return;
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
