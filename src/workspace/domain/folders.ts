import { joinsEmoji, visibleText } from './visible-text.js';

/** Bounds of folders: the name, the active folders of a project, and the items a restore takes back. */
export const FOLDER_LIMITS = {
  nameChars: 100,
  perProject: 200,
  /** Items a deletion lists, and a restore takes back, in each of its two lists. */
  restoredItems: 1_000,
} as const;

/**
 * A folder groups documents and drawings of one project, on one level. A deleted folder keeps its
 * row, named as the origin of trashed items, until a restore brings it back.
 */
export interface Folder {
  id: string;
  projectId: string;
  name: string;
  /** Manual order among the project's active folders, from 0; a deleted folder keeps its last one. */
  position: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * A folder's name as stored: without characters that draw nothing (visibleText), with every run of
 * spaces, line breaks included, as one space, and no edge spaces. Empty when nothing visible is left.
 */
export function folderName(raw: string): string {
  return visibleText(raw).replace(/\s+/gu, ' ');
}

const LETTER = /\p{L}/u;
/** Letters whose accents a key drops, as Portuguese reads "Ações" and "Acoes" as one name. */
const ACCENTED_SCRIPT = /[\p{sc=Latin}\p{sc=Greek}]/u;
const CYRILLIC = /\p{sc=Cyrillic}/u;
/**
 * In Cyrillic only the stress accents fold, the acute and the grave written over a vowel. The breve
 * and the diaeresis make other letters (й, ў, ї, ё), and so does the acute of Macedonian ѓ and ќ.
 */
const STRESS = /[\u{0300}\u{0301}]/u;
const ACUTE_LETTER = /[\u{0413}\u{0433}\u{041A}\u{043A}]/u;
const foldsOn = (base: string, mark: string) =>
  LETTER.test(base) &&
  (ACCENTED_SCRIPT.test(base) ||
    (CYRILLIC.test(base) && STRESS.test(mark) && !(mark === '\u{0301}' && ACUTE_LETTER.test(base))));
const MARK = /\p{M}/u;
/** The text and emoji presentation selectors: one heart either way. */
const PRESENTATION = /[\u{FE0E}\u{FE0F}]/u;
const JOINER = /[\u{200C}\u{200D}]/u;

/**
 * Compatibility forms (full width, ligatures) as their plain letters (NFKD), without the marks of
 * Latin and Greek letters, the stress accents of Cyrillic ones, the presentation selectors, nor
 * joiners other than an emoji's.
 * Marks of other scripts stay, since in Hindi and Thai they are letters and tones ("काम" is not
 * "कम"), and so do emoji sequences (the family is not three people, the Scotland flag not England's).
 */
function fold(text: string): string {
  const points = Array.from(text.normalize('NFKD'));
  let base = '';
  return points
    .filter((point, index) => {
      if (PRESENTATION.test(point)) return false;
      if (JOINER.test(point)) return point === '\u{200D}' && joinsEmoji(points, index);
      if (!MARK.test(point)) {
        base = point;
        return true;
      }
      return !foldsOn(base, point);
    })
    .join('');
}

/**
 * What makes two names the same folder: case, Latin and Greek accents, Cyrillic stress, compatibility forms
 * and characters that draw nothing aside, so "Ａｃｏｅｓ" and "Aç\u{200B}ões" are "Ações". Folded again
 * after lowercasing, which can bring marks back ("İ").
 */
export function folderNameKey(name: string): string {
  return fold(fold(folderName(name)).toLocaleLowerCase('pt-BR'))
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * The order of `ids` with `id` moved before `beforeId`, or to the end when `beforeId` is null.
 * Undefined when either is not in the list, or when they are the same.
 */
export function folderOrder(ids: readonly string[], id: string, beforeId: string | null): string[] | undefined {
  if (!ids.includes(id) || id === beforeId) return undefined;
  const others = ids.filter((other) => other !== id);
  const index = beforeId === null ? others.length : others.indexOf(beforeId);
  if (index < 0) return undefined;
  return [...others.slice(0, index), id, ...others.slice(index)];
}

/** Where a restored folder goes back: the position it had, or the end when fewer folders remain. */
export function restoredPosition(position: number, activeFolders: number): number {
  return Math.min(Math.max(position, 0), activeFolders);
}
