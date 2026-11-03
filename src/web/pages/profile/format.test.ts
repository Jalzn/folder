import { toIsoInstant } from '@tinyfold/core/domain';
import { describe, expect, it } from 'vitest';
import { createdLabel, lastUseLabel } from './format';

const now = new Date(toIsoInstant(new Date('2026-10-31T12:00:00Z')));
const before = (milliseconds: number) => toIsoInstant(new Date(now.getTime() - milliseconds));

describe('lastUseLabel', () => {
  it('says when a token was never used', () => {
    expect(lastUseLabel(null, now)).toBe('Nunca usado');
  });

  it.each([
    [0, 'Último uso agora'],
    [59_000, 'Último uso agora'],
    [60_000, 'Último uso há 1 minuto'],
    [5 * 60_000, 'Último uso há 5 minutos'],
    [2 * 3_600_000 + 59 * 60_000, 'Último uso há 2 horas'],
    [86_400_000, 'Último uso há 1 dia'],
    [45 * 86_400_000, 'Último uso há 1 mês'],
    [800 * 86_400_000, 'Último uso há 2 anos'],
  ])('describes a use %d ms ago in Portuguese', (elapsed, label) => {
    expect(lastUseLabel(before(elapsed), now)).toBe(label);
  });

  it('treats a use slightly ahead of this clock as now', () => {
    expect(lastUseLabel(before(-30_000), now)).toBe('Último uso agora');
  });
});

describe('createdLabel', () => {
  it('shows the creation day in the Brazilian format', () => {
    expect(createdLabel(toIsoInstant(new Date('2026-10-30T12:00:00Z')))).toBe('Criado em 30/10/2026');
  });
});
