import { z } from 'zod';

/** Fields every aggregate's inputs share. */
export const id = z.string().uuid();
export const version = z.number().int().positive();
export const request = { requestId: id };
export const edit = { ...request, id, expectedVersion: version };
/**
 * The project of an item. Null is accepted only while the interface from before every item had a
 * project is still in use: creating with null takes the first active project, saving with null
 * keeps the current one, and a null filter matches nothing.
 */
export const projectId = id.nullable();
