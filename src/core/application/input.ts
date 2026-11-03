import { z } from 'zod';
import { toIsoInstant, visibleText } from '../domain/index.js';

/** Fields every aggregate's inputs share. */
export const id = z.string().uuid();
export const version = z.number().int().positive();
export const request = { requestId: id };
export const edit = { ...request, id, expectedVersion: version };
/**
 * An instant a client sends back, such as a completion or a pin time from an undo list, stored in
 * the one form the server writes (toISOString: UTC with milliseconds), so stored instants sort as
 * text and the cursors built from them read back. Any ISO form in UTC is accepted.
 */
export const instant = z.iso.datetime().transform((value) => toIsoInstant(new Date(value)));
/**
 * A project name or an item title: without characters that draw nothing nor edge spaces
 * (visibleText), then checked by `checked`, which sees the empty text a name of only those has.
 */
export const visible = <T extends z.ZodType<string, string>>(checked: T) =>
  z.string().transform(visibleText).pipe(checked);
