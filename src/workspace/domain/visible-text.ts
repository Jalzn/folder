/**
 * Characters that draw nothing: format characters (`\p{Cf}`, such as the zero-width space, the soft
 * hyphen, the word joiner, the BOM and the tag characters), the Hangul fillers and the variation
 * selectors. A name of them looks empty, a name with them looks like another, and they can carry a
 * hidden text for an agent: tags spell ASCII, and each selector can stand for a byte. Three kinds
 * stay, only where they draw something:
 *
 * - the tags of the three subdivision flags emoji draw (England, Scotland and Wales: the black flag,
 *   the tags of "gbeng", "gbsct" or "gbwls", then the cancel tag). Any other tag text is hidden text,
 *   even in a flag's shape, since one flag could carry any message and many short ones could split
 *   it; its tags go and the black flag stays;
 * - the zero-width joiner between two emoji (the technologist, the family), and both joiners after a
 *   letter or mark of a script they shape (Persian, Devanagari, Sinhala), before another letter;
 * - the text and emoji presentation selectors (U+FE0E, U+FE0F) right after a character that has an
 *   emoji form (the heart, the keycap digits). Every other selector goes, U+E0100 to U+E01EF included.
 */
const INVISIBLE = /[\p{Cf}\u{115F}\u{1160}\u{3164}\u{FFA0}]|[\u{FE00}-\u{FE0F}]|[\u{E0100}-\u{E01EF}]/u;
const PRESENTATION = /[\u{FE0E}\u{FE0F}]/u;
const EMOJI = /\p{Emoji}/u;
const TAG = /[\u{E0000}-\u{E007F}]/u;
const TAG_SPEC = /[\u{E0020}-\u{E007E}]/u;
/** The subdivision flags in the emoji set (RGI), by the letters their tags spell. */
const SUBDIVISION_FLAGS = new Set(['gbeng', 'gbsct', 'gbwls']);
const SUBDIVISION_LENGTH = 5;
const BLACK_FLAG = '\u{1F3F4}';
const CANCEL_TAG = '\u{E007F}';
const ZWJ = '\u{200D}';
const ZWNJ = '\u{200C}';
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
/** What may stand between an emoji and its joiner: a skin tone or the emoji presentation selector. */
const EMOJI_TRAIL = /\p{Emoji_Modifier}|\u{FE0F}/u;
const LETTER_OR_MARK = /[\p{L}\p{M}]/u;
/** Scripts the joiners never shape, where a joiner is only hidden text. */
const UNSHAPED = /[\p{sc=Latin}\p{sc=Greek}\p{sc=Cyrillic}\p{sc=Common}\p{sc=Inherited}]/u;

/** What draws something: not a space, a mark or an invisible character. */
const VISIBLE = /[^\s\p{Cf}\p{M}\u{115F}\u{1160}\u{3164}\u{FFA0}]/u;

/** Whether the joiner at `index` joins two emoji, past the skin tone or selector of the first. */
export function joinsEmoji(points: readonly string[], index: number): boolean {
  let before = index - 1;
  while (before >= 0 && EMOJI_TRAIL.test(points[before] ?? '')) before -= 1;
  return PICTOGRAPHIC.test(points[before] ?? '') && PICTOGRAPHIC.test(points[index + 1] ?? '');
}

/** Whether the joiner at `index` shapes a script: after one of its letters or marks, before a letter. */
function shapesScript(points: readonly string[], index: number): boolean {
  const before = points[index - 1] ?? '';
  return LETTER_OR_MARK.test(before) && !UNSHAPED.test(before) && LETTER_OR_MARK.test(points[index + 1] ?? '');
}

/** The ASCII a tag character stands for, or nothing for any other character. */
const tagLetter = (point: string | undefined) =>
  point !== undefined && TAG_SPEC.test(point) ? String.fromCodePoint((point.codePointAt(0) ?? 0) - 0xe0000) : '';

/** The positions of the tags that make one of the three subdivision flags. */
function flagTags(points: readonly string[]): Set<number> {
  const kept = new Set<number>();
  points.forEach((point, start) => {
    if (point !== BLACK_FLAG) return;
    const tags = points.slice(start + 1, start + 1 + SUBDIVISION_LENGTH);
    const end = start + 1 + SUBDIVISION_LENGTH;
    if (SUBDIVISION_FLAGS.has(tags.map(tagLetter).join('')) && points[end] === CANCEL_TAG)
      for (let tag = start + 1; tag <= end; tag += 1) kept.add(tag);
  });
  return kept;
}

/**
 * The text without the characters that draw nothing where they are (see INVISIBLE), and nothing else
 * changed: spaces and line breaks stay. Names and titles go through it as they are stored
 * (visibleText), and everything the MCP returns goes through it again, for what was stored before
 * and for document content.
 */
export function withoutHidden(text: string): string {
  if (!INVISIBLE.test(text)) return text;
  const points = Array.from(text);
  const tags = flagTags(points);
  return points
    .filter((point, index) => {
      if (TAG.test(point)) return tags.has(index);
      if (point === ZWJ) return joinsEmoji(points, index) || shapesScript(points, index);
      if (point === ZWNJ) return shapesScript(points, index);
      if (PRESENTATION.test(point)) return EMOJI.test(points[index - 1] ?? '');
      return !INVISIBLE.test(point);
    })
    .join('');
}

/**
 * A name or title as stored: without the characters that draw nothing (withoutHidden), nor spaces
 * at the ends. Empty when nothing visible is left, so that a name of only those or marks reads as none.
 */
export function visibleText(raw: string): string {
  const text = withoutHidden(raw).trim();
  return VISIBLE.test(text) ? text : '';
}
