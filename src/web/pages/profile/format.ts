import type { IsoInstant } from '#core/domain';

const relativeTime = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'always' });
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "Último uso há 2 horas". The server records a use at most once a minute, so finer steps say "agora". */
export function lastUseLabel(lastUsedAt: IsoInstant | null, now: Date = new Date()): string {
  if (lastUsedAt === null) return 'Nunca usado';
  const elapsed = now.getTime() - Date.parse(lastUsedAt);
  for (const [unit, size] of units) {
    if (elapsed >= size) return `Último uso ${relativeTime.format(-Math.floor(elapsed / size), unit)}`;
  }
  return 'Último uso agora';
}

export function createdLabel(createdAt: IsoInstant): string {
  return `Criado em ${new Date(createdAt).toLocaleDateString('pt-BR')}`;
}
