import { assertDefinitionId } from './definition-id.js';
import type { ModuleEvent } from './module-events.js';
import type { RuntimeModule } from './runtime-module.js';

export type ApplicationModules = Readonly<Record<string, RuntimeModule<object, object, ModuleEvent>>>;
export type ApplicationServices = Record<string, unknown>;

export interface ApplicationSetup<Modules extends ApplicationModules, Services extends ApplicationServices> {
  modules: Modules;
  services: Services;
  /** Synchronous release after the host drains accepted work. Async resources belong to the host. */
  dispose(): undefined;
}

/** One composition owns its module instances and the adapters built from them. */
export class Application<Id extends string, Modules extends ApplicationModules, Services extends ApplicationServices> {
  readonly id: Id;
  readonly modules: Readonly<Modules>;
  readonly services: Readonly<Services>;
  #release: (() => undefined) | undefined;

  constructor(id: Id, setup: ApplicationSetup<Modules, Services>) {
    assertDefinitionId(id);
    for (const [name, module] of Object.entries(setup.modules)) {
      assertDefinitionId(module.id);
      if (name !== module.id) throw new Error(`Module key ${name} must match its id ${module.id}.`);
    }
    this.id = id;
    this.modules = Object.freeze({ ...setup.modules });
    this.services = Object.freeze({ ...setup.services });
    this.#release = () => setup.dispose();
  }

  readonly dispose = (): undefined => {
    const release = this.#release;
    this.#release = undefined;
    release?.();
  };
}

/** A reusable recipe; defining an application does not instantiate modules or perform I/O. */
export class ApplicationDefinition<
  Id extends string,
  Context,
  Modules extends ApplicationModules,
  Services extends ApplicationServices,
> {
  readonly id: Id;
  #setup: (context: Context) => ApplicationSetup<Modules, Services>;

  constructor(definition: { id: Id; setup(context: Context): ApplicationSetup<Modules, Services> }) {
    assertDefinitionId(definition.id);
    this.id = definition.id;
    this.#setup = definition.setup;
  }

  create(context: Context): Application<Id, Modules, Services> {
    const setup = this.#setup(context);
    try {
      return new Application(this.id, setup);
    } catch (error) {
      try {
        setup.dispose();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], `Failed to compose application ${this.id}.`);
      }
      throw error;
    }
  }
}

export function defineApplication<
  Id extends string,
  Context,
  Modules extends ApplicationModules,
  Services extends ApplicationServices,
>(definition: {
  id: Id;
  setup(context: Context): ApplicationSetup<Modules, Services>;
}): ApplicationDefinition<Id, Context, Modules, Services> {
  return new ApplicationDefinition(definition);
}
