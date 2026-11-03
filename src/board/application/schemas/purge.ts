import { edit } from '@tinyfold/core/application';
import { z } from 'zod';

export const PurgeTaskInput = z.object(edit);
export type PurgeTaskInput = z.infer<typeof PurgeTaskInput>;
