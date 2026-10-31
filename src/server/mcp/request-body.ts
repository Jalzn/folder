/** The text of a request body of at most `maxBytes`, or undefined when the body is longer. */
export async function readBodyText(request: Request, maxBytes: number): Promise<string | undefined> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    size += chunk.value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return undefined;
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  return text + decoder.decode();
}

/** The parsed JSON, or undefined for text that is not JSON (the MCP handler then answers a parse error). */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
