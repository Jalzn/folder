import { toIsoInstant } from '#core/domain';
import { deviceLabel, PASSWORD_LIMITS, sessionLifetimeMs } from '../domain/index.js';
import { authErrors } from './errors.js';
import type { AuthContext } from './ports.js';

export async function login(
  deps: AuthContext,
  input: { password: string },
  client: { ip: string; userAgent?: string | undefined },
) {
  const now = deps.now();
  deps.throttle.check(client.ip, now.getTime());
  const owner = await deps.store.owner();
  if (
    !owner ||
    input.password.length > PASSWORD_LIMITS.max ||
    !(await deps.password.verify(input.password, owner.passwordHash))
  )
    throw authErrors.wrongPassword();
  const { token, digest } = deps.tokens.create();
  const expiresAt = new Date(now.getTime() + sessionLifetimeMs);
  return deps.transaction(async (repo) => {
    const current = await repo.owner();
    if (!current || current.passwordHash !== owner.passwordHash) throw authErrors.passwordChanged();
    await repo.deleteExpiredSessions(toIsoInstant(now));
    const sessionId = deps.id();
    await repo.createSession({
      id: sessionId,
      digest,
      deviceLabel: deviceLabel(client.userAgent),
      createdAt: toIsoInstant(now),
      lastUsedAt: toIsoInstant(now),
      expiresAt: toIsoInstant(expiresAt),
    });
    return { owner: deps.profile(current), sessionId, token, expiresAt };
  });
}
