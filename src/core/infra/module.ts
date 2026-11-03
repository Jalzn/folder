export interface MigrationModuleDefinition {
  id: string;
  migrations: URL;
  /**
   * SQL functions the module's migrations call, registered on the connection before any migration
   * runs and kept for its life. Deterministic: the same text always gives the same result.
   */
  sqlFunctions?: Record<string, (value: string) => string>;
}
export const defineMigrationModule = (module: MigrationModuleDefinition): MigrationModuleDefinition => module;

export const coreModule = defineMigrationModule({ id: 'core', migrations: new URL('./migrations/', import.meta.url) });
