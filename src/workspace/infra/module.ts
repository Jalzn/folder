import { defineModule } from '@tinyfold/core/infra';

export const workspaceModule = defineModule({ id: 'workspace', migrations: new URL('./migrations/', import.meta.url) });
