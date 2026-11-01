import { describe, expect, it } from 'vitest';
import { enterRow } from './palette-focus';

describe('enterRow', () => {
  const order = ['command:new-folder', 'item:document:a', 'item:document:b'];

  it('runs the highlighted row while it is on screen', () => {
    expect(enterRow(order, 'item:document:b')).toBe('item:document:b');
  });

  it('runs the first row when nothing is highlighted', () => {
    expect(enterRow(order, null)).toBe('command:new-folder');
  });

  it('never runs a row of an earlier list: the first row of this one goes instead', () => {
    expect(enterRow(order, 'item:document:gone')).toBe('command:new-folder');
  });

  it('runs nothing when there are no results', () => {
    expect(enterRow([], 'item:document:gone')).toBeNull();
    expect(enterRow([], null)).toBeNull();
  });
});
