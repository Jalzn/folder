import { defineMigrationModule } from '#core/infra';
export const authModule = defineMigrationModule({ id: 'auth', migrations: new URL('./migrations/', import.meta.url) });
