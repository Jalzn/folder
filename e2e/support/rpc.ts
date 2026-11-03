import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { Page, Response } from '@playwright/test';
import type { AppClient } from '../../src/server/router.js';

export type Api = AppClient;
export type Procedure = { [G in keyof Api]: `${G}/${keyof Api[G] & string}` }[keyof Api];
type Method<P extends Procedure> = P extends `${infer G extends keyof Api}/${infer N}`
  ? N extends keyof Api[G]
    ? Api[G][N]
    : never
  : never;
export type Input<P extends Procedure> = Method<P> extends (input: infer I, ...args: never[]) => unknown ? I : never;
type Output<P extends Procedure> = Method<P> extends (...args: never[]) => infer O ? Awaited<O> : never;

/** The real RPC client, using the browser context's cookies, also for fixture setup. */
export function apiFor(page: Page): Api {
  const origin = new URL(page.url()).origin;
  return createORPCClient(
    new RPCLink({
      url: `${origin}/rpc`,
      fetch: async (request) => {
        const response = await page.request.fetch(request.url, {
          method: request.method,
          headers: { ...Object.fromEntries(request.headers), origin },
          data: request.body ? Buffer.from(await request.arrayBuffer()) : undefined,
        });
        return new globalThis.Response(Uint8Array.from(await response.body()), {
          status: response.status(),
          headers: response.headers(),
        });
      },
    }),
  );
}

/** Whether a response answers exactly this procedure: `workspace/saveCanvas` is not `workspace/saveCanvasPreview`. */
export const answers = (response: Response, procedure: string) =>
  new URL(response.url()).pathname === `/rpc/${procedure}`;

/**
 * Calls an oRPC procedure with the page's session cookie but outside the app, the way another
 * device signed in to the same account would.
 */
export async function rpc<P extends Procedure>(page: Page, procedure: P, input: Input<P>): Promise<Output<P>> {
  const origin = new URL(page.url()).origin;
  const response = await page.request.post(`${origin}/rpc/${procedure}`, {
    data: { json: input },
    headers: { origin },
  });
  if (!response.ok()) throw new Error(`${procedure} answered ${response.status()}: ${await response.text()}`);
  return ((await response.json()) as { json: Output<P> }).json;
}
