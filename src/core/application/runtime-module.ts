import type { EventSource, ModuleEvent } from './module-events.js';

/** A module's public runtime contract, separate from its historical migration registration. */
export interface RuntimeModule<Commands, Queries, Event extends ModuleEvent> {
  readonly id: string;
  readonly commands: Commands;
  readonly queries: Queries;
  readonly events: EventSource<Event>;
}
