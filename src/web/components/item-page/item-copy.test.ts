import { describe, expect, it } from 'vitest';
import { copyTitle, isFinalRefusal } from './item-copy';

/** A refusal as the RPC client throws it, with the server's code. */
const refusal = (code: string) => Object.assign(new Error(code), { code, data: { code } });

describe('a copy beside an item', () => {
  it('is titled "<título> — cópia" without the title’s outer spaces, untitled as "Sem título", within 300 characters', () => {
    expect(copyTitle('Plano')).toBe('Plano — cópia');
    expect(copyTitle('  Plano da semana \n')).toBe('Plano da semana — cópia');
    expect(copyTitle('   ')).toBe('Sem título — cópia');
    expect(copyTitle('')).toBe('Sem título — cópia');
    expect(copyTitle('x'.repeat(400))).toHaveLength(300);
  });

  it('ends its request on a final refusal, and when its target is gone', () => {
    expect(isFinalRefusal(refusal('VALIDATION'))).toBe(true);
    expect(isFinalRefusal(refusal('PAYLOAD_TOO_LARGE'))).toBe(true);
    expect(isFinalRefusal(refusal('NOT_FOUND'))).toBe(true);
    expect(isFinalRefusal(refusal('CONFLICT'))).toBe(false);
    expect(isFinalRefusal(new Error('rede'))).toBe(false);
  });
});
