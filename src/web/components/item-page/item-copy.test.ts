import { describe, expect, it } from 'vitest';
import { copyTitle, isFinalRefusal } from './item-copy';

/** A refusal as the RPC client throws it, with the server's code. */
const refusal = (code: string) => Object.assign(new Error(code), { code, data: { code } });

describe('a copy beside an item', () => {
  it('is titled "<título> — cópia", untitled as "Sem título", within 300 characters', () => {
    expect(copyTitle('Plano')).toBe('Plano — cópia');
    expect(copyTitle('')).toBe('Sem título — cópia');
    expect(copyTitle('x'.repeat(400))).toHaveLength(300);
  });

  it('ends its request on a final refusal, and on a missing item only when asked', () => {
    expect(isFinalRefusal(refusal('VALIDATION'))).toBe(true);
    expect(isFinalRefusal(refusal('PAYLOAD_TOO_LARGE'))).toBe(true);
    expect(isFinalRefusal(refusal('CONFLICT'))).toBe(false);
    expect(isFinalRefusal(new Error('rede'))).toBe(false);
    expect(isFinalRefusal(refusal('NOT_FOUND'))).toBe(false);
    expect(isFinalRefusal(refusal('NOT_FOUND'), { notFound: true })).toBe(true);
  });
});
