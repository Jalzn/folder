import { joinsEmoji, visibleText } from './visible-text.js';

/**
 * The names of folders, columns and labels: short, on one line, and unique by their key.
 *
 * A name as stored: without characters that draw nothing (visibleText), with every run of spaces,
 * line breaks included, as one space, and no edge spaces. Empty when nothing visible is left.
 */
export function displayName(raw: string): string {
  return visibleText(raw).replace(/\s+/gu, ' ');
}

const LETTER = /\p{L}/u;
/** Letters whose accents a key drops, as Portuguese reads "Ações" and "Acoes" as one name. */
const ACCENTED_SCRIPT = /[\p{sc=Latin}\p{sc=Greek}]/u;
const CYRILLIC = /\p{sc=Cyrillic}/u;
/**
 * In Cyrillic only the stress accents fold, the acute and the grave written over a vowel. The breve
 * and the diaeresis make other letters (й, ў, ї, ё), and so do the acute of Macedonian ѓ and ќ and the
 * grave of ѐ and ѝ, which Bulgarian and Macedonian write to tell words apart ("ѝ", her, from "и", and).
 */
const ACUTE = '\u{0301}';
const GRAVE = '\u{0300}';
const ACUTE_LETTER = /[\u{0413}\u{0433}\u{041A}\u{043A}]/u;
const GRAVE_LETTER = /[\u{0415}\u{0435}\u{0418}\u{0438}]/u;
const foldsStress = (base: string, mark: string) =>
  (mark === ACUTE && !ACUTE_LETTER.test(base)) || (mark === GRAVE && !GRAVE_LETTER.test(base));
const foldsOn = (base: string, mark: string) =>
  LETTER.test(base) && (ACCENTED_SCRIPT.test(base) || (CYRILLIC.test(base) && foldsStress(base, mark)));
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
 * What makes two names the same: case, Latin and Greek accents, Cyrillic stress, compatibility forms
 * and characters that draw nothing aside, so "Ａｃｏｅｓ" and "Aç\u{200B}ões" are "Ações". Folded again
 * after lowercasing, which can bring marks back ("İ").
 */
export function nameKey(name: string): string {
  return fold(fold(displayName(name)).toLocaleLowerCase('pt-BR'))
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * The one of `named` that already has the name, by its key, if any. `except` is the one being
 * renamed, which may keep its own name in another case.
 */
export function nameTakenBy<T extends { id: string; name: string }>(
  named: readonly T[],
  name: string,
  except?: string,
): T | undefined {
  const key = nameKey(name);
  return named.find((item) => item.id !== except && nameKey(item.name) === key);
}
