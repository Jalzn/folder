import { highlightParts } from '../lib/highlight';

/** A title or excerpt with the query's words in bold, as search results show them (no yellow fill). */
export function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((part, index) =>
        part.match ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: The parts of one text never reorder.
          <mark key={index} className="highlight">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
