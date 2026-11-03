import { describe, expect, it } from 'vitest';
import { lateHandlers } from './late-handlers';

describe('late command handlers', () => {
  it('keeps a callback identity while reading the current arguments and state', () => {
    let value = { amount: 1, run: (step: number) => step + 1 };
    const commands = lateHandlers(() => value);
    const run = commands.run;
    value = { amount: 8, run: (step) => step + 8 };
    expect(commands.run).toBe(run);
    expect(run(2)).toBe(10);
    expect(commands.amount).toBe(8);
  });
  it('does not advertise an optional action after its owner becomes read only', () => {
    let value: { done: boolean; toggle?: () => string } = { done: false, toggle: () => 'changed' };
    const commands = lateHandlers(() => value);
    const toggle = commands.toggle;
    value = { done: true };
    expect(commands.toggle).toBeUndefined();
    expect('toggle' in commands).toBe(false);
    expect({ ...commands }).toEqual({ done: true });
    expect(toggle?.()).toBeUndefined();
    value = { done: false, toggle: () => 'again' };
    expect(commands.toggle).toBe(toggle);
    expect(toggle?.()).toBe('again');
  });
});
