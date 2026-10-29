import { defineModule } from '@tinyfold/core/infra';
export const authModule = defineModule({ id: 'auth', migrations: new URL('./migrations/', import.meta.url) });
