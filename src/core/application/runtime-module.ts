import type { EventSource, ModuleEvent } from './module-events.js';

/** A module's public runtime contract, separate from its historical migration registration. */
export interface RuntimeModule<Commands, Queries, Event extends ModuleEvent> {
  readonly id: string;
  readonly commands: Commands;
  readonly queries: Queries;
  readonly events: EventSource<Event>;
}

export interface ModuleApi<Commands, Queries, Event extends ModuleEvent> {
  readonly commands: Commands;
  readonly queries: Queries;
  readonly events: EventSource<Event>;
}

/** Public runtime state only; infrastructure capabilities stay in the module definition. */
export abstract class Module<
  Id extends string = string,
  Commands = unknown,
  Queries = unknown,
  Event extends ModuleEvent = ModuleEvent,
> implements RuntimeModule<Commands, Queries, Event>
{
  readonly id: Id;
  readonly commands: Commands;
  readonly queries: Queries;
  readonly events: EventSource<Event>;

  protected constructor(id: Id, api: ModuleApi<Commands, Queries, Event>) {
    this.id = id;
    this.commands = api.commands;
    this.queries = api.queries;
    const source = api.events;
    this.events = Object.freeze({ on: (type, handler) => source.on(type, handler) } satisfies EventSource<Event>);
  }
}
