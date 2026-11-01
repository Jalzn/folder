/**
 * Characters that draw nothing: format characters (`\p{Cf}`, such as the zero-width space, the soft
 * hyphen, the word joiner, the BOM and the tag characters) and the Hangul fillers. A name of them
 * looks empty, a name with them looks like another, and tags can spell a hidden text for an agent.
 * Two kinds stay, only where they draw something:
 *
 * - tag characters inside a flag's tag sequence: the black flag, tags, then the cancel tag (the
 *   Scotland flag);
 * - the zero-width joiner between two emoji (the technologist, the family), and both joiners after a
 *   letter or mark of a script they shape (Persian, Devanagari, Sinhala), before another letter.
 */
const INVISIBLE = /[\p{Cf}\u{115F}\u{1160}\u{3164}\u{FFA0}]/u;
const TAG = /[\u{E0000}-\u{E007F}]/u;
const TAG_SPEC = /[\u{E0020}-\u{E007E}]/u;
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

/** The positions of the tags that belong to a flag's tag sequence. */
function flagTags(points: readonly string[]): Set<number> {
  const kept = new Set<number>();
  points.forEach((point, start) => {
    if (point !== BLACK_FLAG) return;
    let end = start + 1;
    while (TAG_SPEC.test(points[end] ?? '')) end += 1;
    if (end > start + 1 && points[end] === CANCEL_TAG) for (let tag = start + 1; tag <= end; tag += 1) kept.add(tag);
  });
  return kept;
}

/** The text without the characters that draw nothing where they are (see INVISIBLE). */
function withoutHidden(text: string): string {
  const points = Array.from(text);
  const tags = flagTags(points);
  return points
    .filter((point, index) => {
      if (TAG.test(point)) return tags.has(index);
      if (point === ZWJ) return joinsEmoji(points, index) || shapesScript(points, index);
      if (point === ZWNJ) return shapesScript(points, index);
      return !INVISIBLE.test(point);
    })
    .join('');
}

/**
 * The text without tag characters outside a flag's tag sequence, the hidden text an agent would read,
 * and nothing else changed. For what the MCP returns: names and titles stored before visibleText, and
 * document content, may still hold them.
 */
export function withoutStrayTags(text: string): string {
  if (!TAG.test(text)) return text;
  const points = Array.from(text);
  const tags = flagTags(points);
  return points.filter((point, index) => !TAG.test(point) || tags.has(index)).join('');
}

/**
 * A name or title as stored: without the characters that draw nothing (withoutHidden), nor spaces
 * at the ends. Empty when nothing visible is left, so that a name of only those or marks reads as none.
 */
export function visibleText(raw: string): string {
  const text = withoutHidden(raw).trim();
  return VISIBLE.test(text) ? text : '';
}
