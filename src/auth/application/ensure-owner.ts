import { toIsoInstant } from '#core/domain';
import { ownerName, validatePassword } from '../domain/index.js';
import type { AuthContext, StoredOwner } from './ports.js';

export async function ensureOwner(deps: AuthContext, input: { name: string; password?: string }) {
  const existing = await deps.store.owner();
  if (existing) return deps.profile(existing);
  if (!input.password) throw new Error('Defina OWNER_PASSWORD para criar sua conta na primeira inicialização.');
  validatePassword(input.password);
  const passwordHash = await deps.password.hash(input.password);
  return deps.transaction(async (repo) => {
    const concurrent = await repo.owner();
    if (concurrent) return deps.profile(concurrent);
    const owner: StoredOwner = {
      name: ownerName(input.name),
      installationId: deps.id(),
      passwordHash,
      passwordChangedAt: toIsoInstant(deps.now()),
      timeZone: null,
    };
    await repo.createOwner(owner);
    return deps.profile(owner);
  });
}
