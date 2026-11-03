import { z } from 'zod';
import { edit } from '#core/application';

export const PurgeTaskInput = z.object(edit);
export type PurgeTaskInput = z.infer<typeof PurgeTaskInput>;
