import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  Application,
  type ApplicationServices,
  type ApplicationSetup,
  defineApplication,
} from './define-application.js';
import { defineProject } from './define-project.js';
import type { EventSource, ModuleEvent } from './module-events.js';

function counter(initial: number) {
  let value = initial;
  const events: EventSource<ModuleEvent<'counter.changed', { value: number }>> = { on: () => () => {} };
  return {
    id: 'counter' as const,
    commands: { increment: () => ++value },
    queries: { value: () => value },
    events,
  };
}

describe('project and application composition', () => {
  it('defines recipes without starting them, preserving concrete context and service types', () => {
    const release = vi.fn(() => undefined);
    const setup = vi.fn(({ initial }: { initial: number }) => {
      const module = counter(initial);
      return { modules: { counter: module }, services: { current: module.queries.value }, dispose: release };
    });
    const definition = defineApplication({ id: 'server', setup });
    const project = defineProject({ id: 'tinyfold', applications: { server: definition } });
    expect(setup).not.toHaveBeenCalled();
    expectTypeOf(project.id).toEqualTypeOf<'tinyfold'>();
    expectTypeOf(project.applications.server.create).parameter(0).toEqualTypeOf<{ initial: number }>();

    const first = project.applications.server.create({ initial: 2 });
    const second = project.applications.server.create({ initial: 10 });
    expect(first).toBeInstanceOf(Application);
    expectTypeOf(first.id).toEqualTypeOf<'server'>();
    expectTypeOf(first.modules.counter.queries.value).returns.toEqualTypeOf<number>();
    const increment = first.modules.counter.commands.increment;
    increment();
    expect(first.services.current()).toBe(3);
    expect(second.services.current()).toBe(10);
    const dispose = first.dispose;
    dispose();
    dispose();
    expect(release).toHaveBeenCalledTimes(1);
    second.dispose();
    expect(release).toHaveBeenCalledTimes(2);
  });

  it('releases an invalid composition and preserves cleanup errors', () => {
    const release = vi.fn(() => undefined);
    const definition = defineApplication({
      id: 'server',
      setup: () => ({ modules: { wrong: counter(0) }, services: {}, dispose: release }),
    });
    expect(() => definition.create(undefined)).toThrow('Module key wrong must match its id counter.');
    expect(release).toHaveBeenCalledTimes(1);
    release.mockImplementation(() => {
      throw new Error('Cleanup failed');
    });
    try {
      definition.create(undefined);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors.map((item: Error) => item.message)).toEqual([
        'Module key wrong must match its id counter.',
        'Cleanup failed',
      ]);
    }
  });

  it('never releases a composition twice even if cleanup fails', () => {
    const dispose = vi.fn(() => {
      throw new Error('Cleanup failed');
    });
    const application = defineApplication({
      id: 'server',
      setup: () => ({ modules: { counter: counter(0) }, services: {}, dispose }),
    }).create(undefined);
    expect(() => application.dispose()).toThrow('Cleanup failed');
    expect(() => application.dispose()).not.toThrow();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps registration snapshots separate from caller-owned records', () => {
    const modules = { counter: counter(1) };
    const services = { name: 'original' };
    const server = defineApplication({ id: 'server', setup: () => ({ modules, services, dispose: () => undefined }) });
    const applications = { server };
    const project = defineProject({ id: 'tinyfold', applications });
    const instance = server.create(undefined);
    modules.counter = counter(9);
    services.name = 'changed';
    applications.server = defineApplication({
      id: 'server',
      setup: () => ({ modules, services, dispose: () => undefined }),
    });
    expect(instance.modules.counter.queries.value()).toBe(1);
    expect(instance.services.name).toBe('original');
    expect(project.applications.server).toBe(server);
    expect(Object.isFrozen(instance.modules)).toBe(true);
    expect(Object.isFrozen(project.applications)).toBe(true);
  });

  it('rejects invalid IDs and mismatched application names before running a recipe', () => {
    const setup = vi.fn(() => ({ modules: {}, services: {}, dispose: () => undefined }));
    expect(() => defineApplication({ id: '../server', setup })).toThrow();
    expect(() => defineProject({ id: '', applications: {} })).toThrow();
    const server = defineApplication({ id: 'server', setup });
    expect(() => defineProject({ id: 'tinyfold', applications: { wrong: server } })).toThrow(
      'Application key wrong must match its id server.',
    );
    expect(setup).not.toHaveBeenCalled();
  });

  it('requires synchronous cleanup and a service map in its typed contract', () => {
    type Cleanup = ApplicationSetup<Record<string, never>, Record<string, never>>['dispose'];
    expectTypeOf<() => Promise<void>>().not.toMatchTypeOf<Cleanup>();
    expectTypeOf<() => void>().not.toMatchTypeOf<Cleanup>();
    expectTypeOf<() => undefined>().toMatchTypeOf<Cleanup>();
    class Service {
      value() {
        return 1;
      }
    }
    expectTypeOf<Service>().not.toMatchTypeOf<ApplicationServices>();
    expectTypeOf<{ service: Service }>().toMatchTypeOf<ApplicationServices>();
  });
});
