import type { Page } from '@playwright/test';
import { type Input, rpc } from './rpc.js';

/** Creates setup data through the public API, with a fresh idempotency key for every item. */
export const seedProject = (page: Page, input: Omit<Input<'workspace/createProject'>, 'requestId'>) =>
  rpc(page, 'workspace/createProject', { requestId: crypto.randomUUID(), ...input });

export const seedDocument = (page: Page, input: Omit<Input<'workspace/createDocument'>, 'requestId'>) =>
  rpc(page, 'workspace/createDocument', { requestId: crypto.randomUUID(), ...input });

export const seedCanvas = (page: Page, input: Omit<Input<'workspace/createCanvas'>, 'requestId'>) =>
  rpc(page, 'workspace/createCanvas', { requestId: crypto.randomUUID(), ...input });

export const seedTask = (page: Page, input: Omit<Input<'workspace/createTask'>, 'requestId'>) =>
  rpc(page, 'workspace/createTask', { requestId: crypto.randomUUID(), ...input });

/** Folders return their ID directly, for placing documents and drawings in them. */
export const seedFolder = async (page: Page, input: Omit<Input<'workspace/createFolder'>, 'requestId'>) =>
  (await rpc(page, 'workspace/createFolder', { requestId: crypto.randomUUID(), ...input })).id;
