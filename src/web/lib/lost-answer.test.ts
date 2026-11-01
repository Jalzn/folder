import { describe, expect, it, vi } from 'vitest';
import { Refusal } from './errors';
import { isLostAnswer, onceMoreIfLost } from './lost-answer';

const refused = (code: string) => Object.assign(new Error(code), { data: { code } });

describe('onceMoreIfLost', () => {
  it('sends once more when the answer was lost, and gives the replayed answer', async () => {
    const send = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce('lists');
    expect(await onceMoreIfLost(send)).toBe('lists');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('does not repeat a refusal, and gives up after the second loss', async () => {
    const conflict = vi.fn().mockRejectedValue(refused('VERSION_CONFLICT'));
    await expect(onceMoreIfLost(conflict)).rejects.toThrow('VERSION_CONFLICT');
    expect(conflict).toHaveBeenCalledOnce();
    const lost = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(onceMoreIfLost(lost)).rejects.toThrow('Failed to fetch');
    expect(lost).toHaveBeenCalledTimes(2);
  });

  it('tells a lost answer from an answer', () => {
    expect(isLostAnswer(new TypeError('Failed to fetch'))).toBe(true);
    expect(isLostAnswer(new DOMException('timeout', 'TimeoutError'))).toBe(true);
    expect(isLostAnswer(refused('NOT_FOUND'))).toBe(false);
    expect(isLostAnswer(new Refusal('Não.'))).toBe(false);
  });
});
