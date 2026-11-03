import type { IsoInstant } from '../domain/instant.js';

/** A confirmed change. Event identifiers are independent of entity identifiers. */
export interface ModuleEvent<Type extends string = string, Payload extends object = object> {
  readonly eventId: string;
  readonly type: Type;
  readonly occurredAt: IsoInstant;
  readonly entityId: string;
  readonly requestId?: string;
  readonly payload: Readonly<Payload>;
}

/** Metadata assigned by the outer write cannot be supplied by a participant. */
export type EventDraft<Event extends ModuleEvent> = Event extends ModuleEvent
  ? Omit<Event, 'eventId' | 'occurredAt' | 'requestId'>
  : never;

export interface EventSource<Event extends ModuleEvent> {
  on<Type extends Event['type']>(
    type: Type,
    handler: (event: Extract<Event, { type: Type }>) => void | Promise<void>,
  ): () => void;
}

/** Infrastructure receives this capability; a module exposes only its EventSource. */
export interface EventPublisher<Event extends ModuleEvent> {
  publish(event: Event): void;
}
