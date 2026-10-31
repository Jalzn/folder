import type { Page, Response } from '@playwright/test';

/** Whether a response answers exactly this procedure: `workspace/saveCanvas` is not `workspace/saveCanvasPreview`. */
export const answers = (response: Response, procedure: string) =>
  new URL(response.url()).pathname === `/rpc/${procedure}`;

/**
 * Calls an oRPC procedure with the page's session cookie but outside the app, the way another
 * device signed in to the same account would.
 */
export async function rpc<T>(page: Page, procedure: string, input: unknown): Promise<T> {
  const origin = new URL(page.url()).origin;
  const response = await page.request.post(`/rpc/${procedure}`, { data: { json: input }, headers: { origin } });
  if (!response.ok()) throw new Error(`${procedure} answered ${response.status()}: ${await response.text()}`);
  return ((await response.json()) as { json: T }).json;
}
