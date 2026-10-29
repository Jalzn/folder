export interface ModuleDefinition {
  id: string;
  migrations: URL;
}
export const defineModule = (module: ModuleDefinition): ModuleDefinition => module;

export const coreModule = defineModule({ id: 'core', migrations: new URL('./migrations/', import.meta.url) });
