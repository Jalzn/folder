import { assertDefinitionId } from './definition-id.js';
import type { ModuleEvent } from './module-events.js';
import { Module, type ModuleApi } from './runtime-module.js';

export interface ModuleDefinition<
  Id extends string,
  Dependencies,
  State,
  Commands,
  Queries,
  Event extends ModuleEvent,
> {
  readonly id: Id;
  readonly Module: new (dependencies: Dependencies) => Module<Id, Commands, Queries, Event>;
  stateOf(instance: Module<Id, Commands, Queries, Event>): State;
}

/** Each private definition owns its instances' state; public module objects carry only their API. */
export function defineModule<
  const Id extends string,
  Dependencies,
  State,
  Commands,
  Queries,
  Event extends ModuleEvent,
>(definition: {
  id: Id;
  setup(dependencies: Dependencies): State;
  api(state: State): ModuleApi<Commands, Queries, Event>;
}): ModuleDefinition<Id, Dependencies, State, Commands, Queries, Event> {
  const { id, setup, api } = definition;
  assertDefinitionId(id);
  const states = new WeakMap<Module<Id, Commands, Queries, Event>, State>();
  class DefinedModule extends Module<Id, Commands, Queries, Event> {
    constructor(dependencies: Dependencies) {
      const state = setup(dependencies);
      super(id, api(state));
      states.set(this, state);
    }
  }
  return Object.freeze({
    id,
    Module: DefinedModule,
    stateOf(instance: Module<Id, Commands, Queries, Event>): State {
      if (!states.has(instance)) throw new Error(`Instance does not belong to module definition ${id}.`);
      return states.get(instance) as State;
    },
  });
}
