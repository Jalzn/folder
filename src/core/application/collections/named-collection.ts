import { AppError } from '../errors.js';
import { assertNameFree, type NamedThing, readName } from './name-rules.js';

interface NamedItem {
  id: string;
  name: string;
}
export function namedCollection(options: { thing: NamedThing; maxChars: number; limit: number; fullMessage: string }) {
  return {
    readName: (raw: string) => readName(raw, options.thing, options.maxChars),
    assertNameFree: (items: readonly NamedItem[], name: string, except?: string, suffix = '') =>
      assertNameFree(items, name, options.thing, { ...(except ? { except } : {}), suffix }),
    assertRoom: (items: readonly unknown[]) => {
      if (items.length >= options.limit) throw new AppError('DOMAIN_RULE', options.fullMessage);
    },
  };
}
/** Write only changed positions, sequentially within the caller's transaction. */
export async function renumber(
  items: readonly { id: string; position: number }[],
  setPosition: (id: string, position: number) => Promise<void>,
): Promise<void> {
  for (const [position, item] of items.entries()) if (item.position !== position) await setPosition(item.id, position);
}
