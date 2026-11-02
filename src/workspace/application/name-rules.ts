import { AppError } from '@tinyfold/core/application';
import { displayName, nameKey, nameTakenBy } from '../domain/names.js';

/** What a name names, as the messages say it: "o nome da pasta". */
export type NamedThing = 'pasta' | 'coluna' | 'etiqueta';

/**
 * A name as stored (displayName), from 1 to `maxChars` characters, with something left to tell it
 * apart and no control character: line breaks and tabs are spaces by then, and the others, a NUL
 * above all, which SQLite counts as the end of the text, are refused.
 */
export function readName(raw: string, thing: NamedThing, maxChars: number): string {
  const name = displayName(raw);
  if (/\p{Cc}/u.test(name))
    throw new AppError('VALIDATION', `Use só letras, números, espaços e símbolos no nome da ${thing}.`);
  if (!name || !nameKey(name)) throw new AppError('VALIDATION', `Dê um nome à ${thing}.`);
  if (Array.from(name).length > maxChars)
    throw new AppError('VALIDATION', `Use até ${maxChars} caracteres no nome da ${thing}.`);
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
  if (taken) throw new AppError('DOMAIN_RULE', `Já existe uma ${thing} ${taken.name}.${suffix}`);
}
