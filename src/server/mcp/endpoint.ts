import { createMcpHandler } from '@modelcontextprotocol/server';
import type { Hono } from 'hono';
import type { AccessTokenService } from '#auth';
import { createSlidingWindow } from '#core/infra';
import { clientIp } from '../client-ip.js';
import type { Config } from '../config.js';
import type { AgentTool } from '../workspace/index.js';
import { readBearer } from './bearer.js';
import { mcpServerFactory } from './mcp-server.js';
import { parseJson, readBodyText } from './request-body.js';

export const MCP_LIMITS = {
  /** MCP requests are small; the documents travel in responses. */
  bodyBytes: 64 * 1024,
  failuresPerIpPerMinute: 10,
  requestsPerTokenPerMinute: 240,
} as const;

export interface McpDependencies {
  accessTokens: AccessTokenService;
  tools: readonly AgentTool[];
  config: Pick<Config, 'appOrigin' | 'trustProxy'>;
  clock: () => Date;
  logError: (error: unknown) => void;
}

/** HTTP errors in the OAuth shape, in Portuguese, never cached. */
function errorResponse(status: number, error: string, description: string, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error, error_description: description }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

const rateLimited = (waitMs: number) =>
  errorResponse(429, 'rate_limited', 'Muitas solicitações. Aguarde um pouco e tente de novo.', {
    'retry-after': String(Math.ceil(waitMs / 1000)),
  });

const tooLarge = () =>
  errorResponse(413, 'request_too_large', `A solicitação passa de ${MCP_LIMITS.bodyBytes / 1024} KiB.`);

/** A JSON-RPC error answered by the endpoint itself, before the SDK sees the request. */
const jsonRpcError = (code: number, message: string) =>
  new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code, message } }), {
    status: 400,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

function withNoStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Serves the read-only MCP endpoint for Claude Code on the app origin, authenticated by personal
 * access tokens only (cookies are ignored). Must be mounted before the SPA fallback.
 */
export function mountMcp(app: Hono, deps: McpDependencies): void {
  const handler = createMcpHandler(mcpServerFactory(deps.tools), {
    legacy: 'stateless',
    responseMode: 'json',
    maxRequestBodySize: MCP_LIMITS.bodyBytes,
    // The tool list never changes, and a listen stream would outlive the revocation of its token.
    maxSubscriptions: 0,
    onerror: deps.logError,
  });
  const failuresByIp = createSlidingWindow({
    limit: MCP_LIMITS.failuresPerIpPerMinute,
    windowMs: 60_000,
    maxKeys: 10_000,
  });
  const requestsByToken = createSlidingWindow({
    limit: MCP_LIMITS.requestsPerTokenPerMinute,
    windowMs: 60_000,
    maxKeys: 1_000,
  });

  // A client refused with 401 may look for OAuth metadata here; an HTML page would confuse it.
  app.all('/.well-known/*', () => errorResponse(404, 'not_found', 'Este endereço não existe.'));

  app.all('/mcp', async (c) => {
    const now = deps.clock().getTime();
    // Terminal clients send no Origin; a browser must come from the app (DNS rebinding protection).
    const origin = c.req.header('origin');
    if (origin !== undefined && origin !== deps.config.appOrigin)
      return errorResponse(403, 'forbidden_origin', 'A origem desta solicitação não é permitida.');
    if (Number(c.req.header('content-length') ?? 0) > MCP_LIMITS.bodyBytes) return tooLarge();

    const token = readBearer(c.req.header('authorization'));
    const accessToken = await deps.accessTokens.authenticate(token);
    if (!accessToken) {
      // Only failures are limited per IP, so others sharing an address never lock a valid token out.
      const ip = clientIp(c, deps.config.trustProxy);
      const ipWait = failuresByIp.blockedFor(ip, now);
      if (ipWait) return rateLimited(ipWait);
      failuresByIp.record(ip, now);
      return errorResponse(401, 'invalid_token', 'Token inválido ou revogado. Gere outro no Perfil do Tinyfold.', {
        'www-authenticate': token ? 'Bearer realm="tinyfold", error="invalid_token"' : 'Bearer realm="tinyfold"',
      });
    }
    const tokenWait = requestsByToken.blockedFor(accessToken.id, now);
    if (tokenWait) return rateLimited(tokenWait);
    requestsByToken.record(accessToken.id, now);

    // The secret never goes further: tools see the token ID only.
    const authInfo = { token: accessToken.id, clientId: accessToken.id, scopes: [accessToken.scope] };
    if (c.req.method !== 'POST') return withNoStore(await handler.fetch(c.req.raw, { authInfo }));
    // A body without a declared length is bounded here too. The SDK would serve up to 100 batched calls.
    const text = await readBodyText(c.req.raw, MCP_LIMITS.bodyBytes);
    if (text === undefined) return tooLarge();
    // The SDK only ever gets the body parsed here: parsing again, it would strip another byte order
    // mark and could find a batch this check never saw.
    const message = parseJson(text);
    if (!message.ok) return jsonRpcError(-32700, 'O corpo da solicitação não é JSON válido.');
    // One message per request keeps the per-token limit and the output budget meaningful.
    if (Array.isArray(message.value))
      return jsonRpcError(-32600, 'Lotes de mensagens não são aceitos. Envie uma mensagem por requisição.');
    const request = new Request(c.req.raw, { body: text });
    return withNoStore(await handler.fetch(request, { authInfo, parsedBody: message.value }));
  });
}
