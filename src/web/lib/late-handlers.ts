/** Stable callable identities, with live values and optional commands that really stay absent. */
export function lateHandlers<T extends object>(read: () => T): T {
  const handlers = new Map<PropertyKey, (...args: unknown[]) => unknown>();
  return new Proxy({} as T, {
    get: (_target, key) => {
      const value = Reflect.get(read(), key);
      if (typeof value !== 'function') return value;
      let handler = handlers.get(key);
      if (!handler) {
        handler = (...args) => {
          const current = read();
          const call = Reflect.get(current, key);
          return typeof call === 'function' ? Reflect.apply(call, current, args) : undefined;
        };
        handlers.set(key, handler);
      }
      return handler;
    },
    has: (_target, key) => Reflect.has(read(), key),
    ownKeys: () => Reflect.ownKeys(read()),
    getOwnPropertyDescriptor: (_target, key) =>
      Reflect.has(read(), key) ? { enumerable: true, configurable: true } : undefined,
  });
}
