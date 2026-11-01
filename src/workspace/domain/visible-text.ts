/**
 * Characters that draw nothing: format characters (`\p{Cf}`, such as the zero-width space, the soft
 * hyphen, the word joiner and the BOM) and the Hangul fillers. A name of them looks empty, and a name
 * with them looks like another. The joiners (U+200C and U+200D), which shape scripts and join emoji,
 * and the tag characters of flag emoji (U+E0020 to U+E007F) stay in what is stored; only keys that
 * compare names drop them (withoutInvisible).
 */
const INVISIBLE = /(?!\u{200C}|\u{200D}|[\u{E0020}-\u{E007F}])[\p{Cf}\u{115F}\u{1160}\u{3164}\u{FFA0}]/gu;

/** Everything that draws nothing on its own: those characters, the joiners and combining marks. */
const INVISIBLE_ALONE = /[\p{Cf}\p{M}\u{115F}\u{1160}\u{3164}\u{FFA0}]/gu;

/** What draws something: not a space, a mark or an invisible character. */
const VISIBLE = /[^\s\p{Cf}\p{M}\u{115F}\u{1160}\u{3164}\u{FFA0}]/u;

/**
 * A name or title as stored: without the characters that draw nothing, nor spaces at the ends. Empty
 * when nothing visible is left, so that a name of only invisible characters or marks reads as none.
 */
export function visibleText(raw: string): string {
  const text = raw.replace(INVISIBLE, '').trim();
  return VISIBLE.test(text) ? text : '';
}

/** The text without anything that draws nothing on its own, joiners and marks included, for keys. */
export function withoutInvisible(text: string): string {
  return text.replace(INVISIBLE_ALONE, '');
}
