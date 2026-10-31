import { z } from 'zod';

/** Fields every aggregate's inputs share. */
export const id = z.string().uuid();
export const version = z.number().int().positive();
export const request = { requestId: id };
export const edit = { ...request, id, expectedVersion: version };
