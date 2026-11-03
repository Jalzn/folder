/** Visual-test subprocesses share a wall clock; timers and ordinary E2E workers remain real. */
const value = process.env.TINYFOLD_E2E_FIXED_TIME;
const instant = value ? Date.parse(value) : Number.NaN;
if (!Number.isFinite(instant)) throw new Error('A fixed visual-test instant is required.');
const SystemDate = Date;
globalThis.Date = new Proxy(SystemDate, {
  construct(target, argumentsList, newTarget) {
    return Reflect.construct(target, argumentsList.length ? argumentsList : [instant], newTarget);
  },
  apply() {
    return new SystemDate(instant).toString();
  },
  get(target, key, receiver) {
    return key === 'now' ? () => instant : Reflect.get(target, key, receiver);
  },
});
