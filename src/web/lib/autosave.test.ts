import { describe, expect, it, vi } from 'vitest';
import { AutosaveController, parseDraft, type SaveAck, type SaveInput, type Snapshot } from './autosave';

const initial: Snapshot = { title: 'Ideia', projectId: 'p', content: [] };
const changed = { ...initial, title: 'Nova ideia' };
function setup(
  send: (input: SaveInput) => Promise<{ id: string; version: number; updatedAt: string }>,
  stored: string | null = null,
  remoteVersion = 1,
  hooks: {
    onSaved?: (ack: SaveAck, snapshot: Snapshot) => void;
    onAdopted?: (snapshot: Snapshot, version: number) => void;
  } = {},
) {
  let value = stored;
  let next = 0;
  const controller = new AutosaveController({
    id: 'doc',
    snapshot: initial,
    version: remoteVersion,
    send,
    idFactory: () => `id-${++next}`,
    classifyError: (error) => (error as { code?: string }).code,
    ...hooks,
    storage: {
      read: () => value,
      write: (v) => {
        value = v;
      },
      remove: () => {
        value = null;
      },
    },
  });
  return { controller, stored: () => value };
}

describe('document autosave', () => {
  it('reuses the exact request after a lost response, then sends newer edits', async () => {
    const calls: SaveInput[] = [];
    const { controller } = setup(async (input) => {
      calls.push(input);
      if (calls.length === 1) throw new Error('response lost');
      return { id: input.id, version: input.expectedVersion + 1, updatedAt: 'now' };
    });
    controller.change(changed);
    expect(await controller.flush()).toBe(false);
    controller.change({ ...changed, title: 'Terceira ideia' });
    await controller.flush();
    expect(calls).toHaveLength(3);
    expect(calls[0]).toEqual(calls[1]);
    expect(calls[2]?.title).toBe('Terceira ideia');
    expect(calls[2]?.expectedVersion).toBe(2);
    expect(calls[2]?.requestId).not.toBe(calls[0]?.requestId);
    expect(controller.getState().status).toBe('saved');
  });
  it('relocates after saving pending edits, takes the moved version and project, then saves later edits', async () => {
    const calls: SaveInput[] = [];
    let release: (() => void) | undefined;
    const { controller } = setup(async (input) => {
      calls.push(input);
      return { id: input.id, version: input.expectedVersion + 1, updatedAt: 'now' };
    });
    controller.change(changed);
    const moving = controller.relocate(async (version) => {
      expect(version).toBe(2);
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { version: version + 1, patch: { projectId: 'b' } };
    });
    await vi.waitFor(() => expect(release).toBeDefined());
    controller.change({ ...changed, title: 'Escrito durante a mudança' });
    release?.();
    expect(await moving).toBe(true);
    expect(controller.getState().snapshot.projectId).toBe('b');
    expect(controller.getState().version).toBe(3);
    await controller.flush();
    expect(calls).toHaveLength(2);
    expect(calls[1]?.expectedVersion).toBe(3);
    expect(calls[1]?.title).toBe('Escrito durante a mudança');
    expect(controller.getState().status).toBe('saved');
  });

  it('keeps everything as it was when the move is refused', async () => {
    const { controller } = setup(async (input) => ({
      id: input.id,
      version: input.expectedVersion + 1,
      updatedAt: 'now',
    }));
    await expect(
      controller.relocate(async () => {
        throw Object.assign(new Error('arquivado'), { code: 'VALIDATION' });
      }),
    ).rejects.toThrow('arquivado');
    expect(controller.getState().snapshot.projectId).toBe('p');
    expect(controller.getState().version).toBe(1);
    expect(controller.getState().status).toBe('saved');
  });

  it('preserves a local draft when a newer remote version is observed', () => {
    const { controller, stored } = setup(vi.fn());
    controller.change(changed);
    controller.receiveRemote({ ...initial, title: 'Outro dispositivo' }, 2);
    expect(controller.getState().status).toBe('conflict');
    expect(controller.getState().snapshot.title).toBe('Nova ideia');
    expect(parseDraft(stored())?.snapshot.title).toBe('Nova ideia');
  });
  it('hydrates an unacknowledged request and retries it despite a newer remote version', async () => {
    const pending = { ...changed, id: 'doc', expectedVersion: 1, requestId: 'stable-id' };
    const send = vi.fn(async () => ({ id: 'doc', version: 2, updatedAt: 'now' }));
    const { controller } = setup(send, JSON.stringify({ format: 1, baseVersion: 1, snapshot: changed, pending }), 2);
    await controller.flush();
    expect(send).toHaveBeenCalledWith(pending);
    expect(controller.getState().status).toBe('saved');
  });
  it('serializes edits made while a save is in flight', async () => {
    let finish!: (value: { id: string; version: number; updatedAt: string }) => void;
    const calls: SaveInput[] = [];
    const { controller } = setup((input) => {
      calls.push(input);
      return calls.length === 1
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : Promise.resolve({ id: 'doc', version: 3, updatedAt: 'later' });
    });
    controller.change(changed);
    const pending = controller.flush();
    controller.change({ ...changed, title: 'Enquanto salva' });
    expect(calls).toHaveLength(1);
    finish({ id: 'doc', version: 2, updatedAt: 'now' });
    await pending;
    expect(calls[1]?.expectedVersion).toBe(2);
    expect(controller.getState().snapshot.title).toBe('Enquanto salva');
    expect(controller.getState().status).toBe('saved');
  });
  it('does not roll back a known newer remote version when replay returns an older acknowledgment', async () => {
    const pending = { ...changed, id: 'doc', expectedVersion: 1, requestId: 'stable-id' };
    const { controller } = setup(
      async () => ({ id: 'doc', version: 2, updatedAt: 'now' }),
      JSON.stringify({ format: 1, baseVersion: 1, snapshot: changed, pending }),
      3,
    );
    controller.change({ ...changed, title: 'Ainda não enviado' });
    await controller.flush();
    expect(controller.getState().status).toBe('conflict');
    expect(controller.getState().snapshot.title).toBe('Ainda não enviado');
  });
  it('reports a newer remote version it takes over while nothing is pending', () => {
    const onAdopted = vi.fn();
    const { controller } = setup(vi.fn(), null, 1, { onAdopted });
    const remote = { ...initial, title: 'Outro dispositivo' };
    controller.receiveRemote(remote, 2);
    expect(controller.getState()).toMatchObject({ status: 'saved', version: 2, snapshot: remote });
    expect(onAdopted).toHaveBeenCalledExactlyOnceWith(remote, 2);
  });
  it('acknowledges its own save and then reports the newer remote version that replaces it', async () => {
    const answer = Promise.withResolvers<SaveAck>();
    const onSaved = vi.fn();
    const onAdopted = vi.fn();
    const { controller } = setup(() => answer.promise, null, 1, { onSaved, onAdopted });
    controller.change(changed);
    const flushing = controller.flush();
    const remote = { ...changed, title: 'Salvo depois em outro dispositivo' };
    controller.receiveRemote(remote, 3);
    answer.resolve({ id: 'doc', version: 2, updatedAt: 'now' });
    expect(await flushing).toBe(true);
    expect(controller.getState()).toMatchObject({ status: 'saved', version: 3, snapshot: remote });
    expect(onSaved).toHaveBeenCalledExactlyOnceWith({ id: 'doc', version: 2, updatedAt: 'now' }, changed);
    expect(onAdopted).toHaveBeenCalledExactlyOnceWith(remote, 3);
  });
  it('reports no adoption for its own saves', async () => {
    const onAdopted = vi.fn();
    const { controller } = setup(async () => ({ id: 'doc', version: 2, updatedAt: 'now' }), null, 1, { onAdopted });
    controller.change(changed);
    await controller.flush();
    controller.receiveRemote(changed, 2);
    expect(onAdopted).not.toHaveBeenCalled();
  });
  it('keeps editing state even when draft storage is unavailable', async () => {
    const controller = new AutosaveController({
      id: 'doc',
      version: 1,
      snapshot: initial,
      send: async () => ({ id: 'doc', version: 2, updatedAt: 'now' }),
      idFactory: () => 'id',
      classifyError: () => undefined,
      storage: {
        read: () => null,
        write: () => {
          throw new Error('quota');
        },
        remove: () => undefined,
      },
    });
    controller.change(changed);
    expect(controller.getState().storageFailed).toBe(true);
    await controller.flush();
    expect(controller.getState().status).toBe('saved');
  });
  it('ignores malformed stored drafts', () => {
    expect(parseDraft('{')).toBeNull();
    expect(parseDraft('{"format":1}')).toBeNull();
    expect(
      parseDraft(
        JSON.stringify({ format: 1, baseVersion: 1, snapshot: { ...initial, content: [123] }, pending: null }),
      ),
    ).toBeNull();
  });
  it('never replays a stored request for a different document', async () => {
    const pending = { ...changed, id: 'different-document', expectedVersion: 1, requestId: 'old-id' };
    const send = vi.fn(async () => ({ id: 'doc', version: 2, updatedAt: 'now' }));
    const { controller } = setup(send, JSON.stringify({ format: 1, baseVersion: 1, snapshot: changed, pending }));
    await controller.flush();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ id: 'doc', title: changed.title, requestId: 'id-1' }));
  });
  it('preserves an unreadable recovery record for a raw download', () => {
    const raw = '{"format":1,"snapshot":{"content":"a corrupted but recoverable text"}}';
    const { controller } = setup(vi.fn(), raw);
    expect(controller.getState().recoveryData).toBe(raw);
    expect(controller.getState().snapshot).toEqual(initial);
  });
  it('opens a draft a Tab nested under a card, with the nested text after the card', () => {
    const card = { id: 'c', type: 'taskEmbed', props: { taskId: '0b4f2a4e-8f8c-4a5e-9d55-1f2a3b4c5d6e' } };
    const typed = { id: 'p', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'Depois', styles: {} }] };
    const nested = { ...changed, content: [{ ...card, children: [{ ...typed, children: [] }] }] };
    const pending = { ...nested, id: 'doc', expectedVersion: 1, requestId: 'old-id' };
    const restored = parseDraft(JSON.stringify({ format: 1, baseVersion: 1, snapshot: nested, pending }));
    const lifted = [
      { ...card, children: [] },
      { ...typed, children: [] },
    ];
    expect(restored?.snapshot.content).toEqual(lifted);
    expect(restored?.pending?.content).toEqual(lifted);
  });
  it('recovers an oversized valid draft so it can be shortened or exported', () => {
    const large = { ...changed, content: [{ type: 'paragraph', content: 'x'.repeat(1024 * 1024 + 100) }] };
    const restored = parseDraft(JSON.stringify({ format: 1, baseVersion: 1, snapshot: large, pending: null }));
    expect(restored?.snapshot.content).toEqual(large.content);
  });
});
