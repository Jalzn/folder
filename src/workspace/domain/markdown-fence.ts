/** A fence of `character` one longer than its longest run in `text`, and at least `minimum` long. */
export function fenceFor(text: string, character: '`' | '$', minimum: number): string {
  let longest = 0;
  let run = 0;
  for (const current of text) {
    run = current === character ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return character.repeat(Math.max(minimum, longest + 1));
}
