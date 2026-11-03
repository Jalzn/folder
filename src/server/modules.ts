import { authModule } from '#auth';
import { coreModule } from '#core/infra';
import { workspaceModule } from '#workspace';
export const modules = [coreModule, authModule, workspaceModule] as const;
