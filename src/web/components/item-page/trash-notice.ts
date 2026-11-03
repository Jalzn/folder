import type { IsoInstant } from '@tinyfold/core/domain';
import type { SaveState } from '../../lib/autosave';

/**
 * Whether an item in the trash shows only the way to the trash: nothing local to keep, no draft recovered or
 * left to download, and the storage working. With local work, its editor stays, with the trashed band and the
 * copy (decision 1 of stage 12, as the drawing did since stage 06).
 */
export const onlyTrashNotice = (deletedAt: IsoInstant | null, state: SaveState<unknown>) =>
  Boolean(deletedAt) && state.status === 'saved' && !state.recovered && !state.recoveryData && !state.storageFailed;
