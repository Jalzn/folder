import { setTimeout as delay } from 'node:timers/promises';
import { expect, type Page, type Request, type Route } from '@playwright/test';
import type { Input, Procedure } from './rpc.js';

/** Installs one exact procedure handler; restore removes only this handler. */
async function intercept(page: Page, procedure: Procedure, handler: (route: Route) => Promise<void>) {
  const matches = (url: URL) => url.pathname === `/rpc/${procedure}`;
  await page.route(matches, handler);
  return () => page.unroute(matches, handler);
}

/** Fails before reaching the server, until the returned restore function is called. */
export const abortRpc = (page: Page, procedure: Procedure) =>
  intercept(page, procedure, (route) => route.abort('failed'));

/** Holds requests before they reach the server; intercepted resolves at the first arrival. */
export async function holdRpc(page: Page, procedure: Procedure) {
  let release = () => {};
  let announce = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const intercepted = new Promise<void>((resolve) => {
    announce = resolve;
  });
  page.once('close', release);
  const restore = await intercept(page, procedure, async (route) => {
    announce();
    await held;
    if (!page.isClosed()) await route.continue();
  });
  return {
    intercepted,
    release: () => {
      page.removeListener('close', release);
      release();
    },
    restore: async () => {
      page.removeListener('close', release);
      release();
      await restore();
    },
  };
}

/** The first write commits successfully, but its answer is lost. Captures every attempted payload. */
export async function loseFirstResponse<P extends Procedure>(page: Page, procedure: P) {
  const requests: string[] = [];
  const inputs: Input<P>[] = [];
  const restore = await intercept(page, procedure, async (route) => {
    requests.push(route.request().postData() ?? '');
    inputs.push((route.request().postDataJSON() as { json: Input<P> }).json);
    if (requests.length > 1) return route.continue();
    expect((await route.fetch()).status()).toBe(200);
    await route.abort('failed');
  });
  return { requests, inputs, restore };
}

/** Delays matching requests before the server sees them, preserving the real answer. */
export const delayRpc = (
  page: Page,
  procedure: Procedure,
  milliseconds: number,
  when: (request: Request) => boolean = () => true,
) =>
  intercept(page, procedure, async (route) => {
    if (when(route.request())) await delay(milliseconds);
    if (!page.isClosed()) await route.continue();
  });

/** Supplies an explicit RPC envelope, including deliberately invalid replies in error-page tests. */
export const replyRpc = (page: Page, procedure: Procedure, status: number, json: unknown) =>
  intercept(page, procedure, (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ json }) }),
  );
