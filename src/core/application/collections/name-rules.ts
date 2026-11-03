import { displayName, nameKey, nameTakenBy } from '../../domain/collections/names.js';
import { nameErrors as workspaceErrors } from './errors.js';

/** What a name names, as the messages say it: "o nome da pasta". */
export type NamedThing = 'pasta' | 'coluna' | 'etiqueta';

/**
 * A name as stored (displayName), from 1 to `maxChars` characters, with something left to tell it
 * apart and no control character: line breaks and tabs are spaces by then, and the others, a NUL
 * above all, which SQLite counts as the end of the text, are refused.
 */
export function readName(raw: string, thing: NamedThing, maxChars: number): string {
  const name = displayName(raw);
  if (/\p{Cc}/u.test(name)) throw workspaceErrors.invalidNameCharacters(thing);
  if (!name || !nameKey(name)) throw workspaceErrors.nameRequired(thing);
  if (Array.from(name).length > maxChars) throw workspaceErrors.nameTooLong(thing, maxChars);
  return name;
}

/**
 * Refuses a name another of `named` already has, by its key, naming that one. `except` is the one
 * being renamed, which may keep its own name in another case; `suffix` ends the message.
 */
export function assertNameFree(
  named: readonly { id: string; name: string }[],
  name: string,
  thing: NamedThing,
  { except, suffix = '' }: { except?: string; suffix?: string } = {},
): void {
  const taken = nameTakenBy(named, name, except);
  if (taken) throw workspaceErrors.nameTaken(thing, taken.name, suffix);
}
