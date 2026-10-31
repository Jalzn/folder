import { AppError, type Owner } from '@tinyfold/core/application';
import { deviceLabel, renewalIntervalMs, sessionLifetimeMs, validatePassword } from '../domain/index.js';
import type { AuthDependencies, StoredOwner } from './ports.js';

const profile = (owner: StoredOwner): Owner => ({ name: owner.name, installationId: owner.installationId });

export function authService(deps: AuthDependencies) {
  async function ensureOwner(input: { name: string; password?: string }) {
    const existing = await deps.read.owner();
    if (existing) return profile(existing);
    if (!input.password) throw new Error('Defina OWNER_PASSWORD para criar sua conta na primeira inicialização.');
    validatePassword(input.password);
    const passwordHash = await deps.password.hash(input.password);
    return deps.transaction(async (repo) => {
      const concurrent = await repo.owner();
      if (concurrent) return profile(concurrent);
      const owner: StoredOwner = {
        name: input.name.trim().slice(0, 100) || 'Você',
        installationId: deps.id(),
        passwordHash,
        passwordChangedAt: deps.now().toISOString(),
      };
      await repo.createOwner(owner);
      return profile(owner);
    });
  }

  async function login(input: { password: string }, client: { ip: string; userAgent?: string | undefined }) {
    const now = deps.now();
    deps.throttle.check(client.ip, now.getTime());
    const owner = await deps.read.owner();
    if (!owner || input.password.length > 256 || !(await deps.password.verify(input.password, owner.passwordHash)))
      throw new AppError('UNAUTHENTICATED', 'Senha incorreta. Tente novamente.');
    const { token, digest } = deps.tokens.create();
    const expiresAt = new Date(now.getTime() + sessionLifetimeMs);
    return deps.transaction(async (repo) => {
      const current = await repo.owner();
      if (!current || current.passwordHash !== owner.passwordHash)
        throw new AppError('UNAUTHENTICATED', 'A senha mudou. Entre novamente.');
      await repo.deleteExpiredSessions(now.toISOString());
      const sessionId = deps.id();
      await repo.createSession({
        id: sessionId,
        digest,
        deviceLabel: deviceLabel(client.userAgent),
        createdAt: now.toISOString(),
        lastUsedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
      return { owner: profile(current), sessionId, token, expiresAt };
    });
  }

  async function authenticate(token: string | undefined) {
    if (!token || !deps.tokens.valid(token)) return undefined;
    const digest = deps.tokens.digest(token);
    const now = deps.now();
    return deps.transaction(async (repo) => {
      const session = await repo.session(digest);
      if (!session) return undefined;
      if (session.expiresAt <= now.toISOString()) {
        await repo.deleteSession(session.id);
        return undefined;
      }
      const owner = await repo.owner();
      if (!owner) return undefined;
      const renewed = now.getTime() - Date.parse(session.lastUsedAt) >= renewalIntervalMs;
      let expiresAt = new Date(session.expiresAt);
      if (renewed) {
        expiresAt = new Date(now.getTime() + sessionLifetimeMs);
        await repo.renewSession(session.id, now.toISOString(), expiresAt.toISOString());
      }
      return { owner: profile(owner), sessionId: session.id, token, renewed, expiresAt };
    });
  }

  async function changePassword(sessionId: string, input: { currentPassword: string; newPassword: string }) {
    validatePassword(input.newPassword);
    const owner = await deps.read.owner();
    if (!owner || !(await deps.password.verify(input.currentPassword, owner.passwordHash)))
      throw new AppError('VALIDATION', 'A senha atual está incorreta.');
    if (input.currentPassword === input.newPassword)
      throw new AppError('VALIDATION', 'Escolha uma senha diferente da atual.');
    const hash = await deps.password.hash(input.newPassword);
    await deps.transaction(async (repo) => {
      const current = await repo.owner();
      if (!current || current.passwordHash !== owner.passwordHash)
        throw new AppError('VERSION_CONFLICT', 'A senha foi alterada em outro dispositivo. Entre novamente.');
      const sessions = await repo.listSessions(deps.now().toISOString());
      if (!sessions.some((session) => session.id === sessionId))
        throw new AppError('UNAUTHENTICATED', 'Sua sessão terminou. Entre de novo.');
      await repo.updatePassword(hash, deps.now().toISOString());
      await repo.deleteSessionsExcept(sessionId);
    });
    return { ok: true as const };
  }

  /** Terminal recovery: a new password, and no session or access token survives, all in one transaction. */
  async function resetPassword(password: string) {
    validatePassword(password);
    const hash = await deps.password.hash(password);
    await deps.transaction(async (repo) => {
      if (!(await repo.owner())) throw new AppError('NOT_FOUND', 'A conta ainda não foi criada.');
      await repo.updatePassword(hash, deps.now().toISOString());
      await repo.deleteSessionsExcept();
      await repo.deleteAccessTokens();
    });
  }

  return {
    ensureOwner,
    login,
    authenticate,
    changePassword,
    resetPassword,
    async logout(sessionId: string) {
      await deps.read.deleteSession(sessionId);
      return { ok: true as const };
    },
    async listSessions(currentId: string) {
      return (await deps.read.listSessions(deps.now().toISOString())).map(({ digest: _digest, ...session }) => ({
        ...session,
        current: session.id === currentId,
      }));
    },
    async revokeSession(currentId: string, targetId: string) {
      if (currentId === targetId) throw new AppError('VALIDATION', 'Use Sair para encerrar esta sessão.');
      await deps.read.deleteSession(targetId);
      return { ok: true as const };
    },
    async revokeOtherSessions(currentId: string) {
      await deps.read.deleteSessionsExcept(currentId);
      return { ok: true as const };
    },
  };
}

export type AuthService = ReturnType<typeof authService>;
