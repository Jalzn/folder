import { useApp, useOwnerToday } from '../../shell';
import { editedPhrase, savedTime } from './edited-phrase';
import type { EditedDetail } from './SaveState';

/** When an item was last edited, for its save state: "editado hoje" and "14:32", in the owner's time zone. */
export function useEdited(updatedAt: string): EditedDetail {
  const { timeZone } = useApp();
  const today = useOwnerToday();
  return { phrase: editedPhrase(updatedAt, today, timeZone), time: savedTime(updatedAt, timeZone) };
}
