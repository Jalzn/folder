/** The first `count` UTF-16 units of `text`, one fewer where the cut would split a surrogate pair. */
export function codePointPrefix(text: string, count: number): string {
  const code = text.charCodeAt(count - 1);
  return text.slice(0, code >= 0xd800 && code <= 0xdbff ? count - 1 : count);
}
