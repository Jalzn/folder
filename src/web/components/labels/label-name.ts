import { displayName, LABEL_LIMITS, nameKey } from '@tinyfold/workspace/domain';
import { LABEL_TOO_LONG, labelTakenText } from './label-text';

/** What a typed label name does: nothing, an error under the field, or a write with the tidied name. */
export type LabelNameCheck = { kind: 'unchanged' } | { kind: 'error'; text: string } | { kind: 'ok'; name: string };

/**
 * A label's typed name, checked as the server will (docs/etapas/10-quadro-tarefa.md, decision 7): an empty
 * name, or the one it had, changes nothing; one longer than 30 characters, or one another label has ignoring
 * case and accents, is an error naming that label. The label itself may change its own name's case.
 */
export function checkLabelName(raw: string, initial: string, taken: readonly string[]): LabelNameCheck {
  const name = displayName(raw);
  if (!name || !nameKey(name) || name === initial) return { kind: 'unchanged' };
  if (Array.from(name).length > LABEL_LIMITS.nameChars) return { kind: 'error', text: LABEL_TOO_LONG };
  const other = taken.find((each) => nameKey(each) === nameKey(name));
  if (other !== undefined) return { kind: 'error', text: labelTakenText(other) };
  return { kind: 'ok', name };
}
