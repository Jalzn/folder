import { authModule } from '@tinyfold/auth';
import { coreModule } from '@tinyfold/core/infra';
import { workspaceModule } from '@tinyfold/workspace';
export const modules = [coreModule, authModule, workspaceModule] as const;
