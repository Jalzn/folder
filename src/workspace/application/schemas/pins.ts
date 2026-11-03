import { z } from 'zod';
import { id } from '#core/application';
import { NAV_ITEM_TYPES } from '../../domain/navigation.js';

/** Pinning repeats safely, so it carries no requestId. */
export const PinItemInput = z.object({ type: z.enum(NAV_ITEM_TYPES), id });

export type PinItemInput = z.infer<typeof PinItemInput>;
