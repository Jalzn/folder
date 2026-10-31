const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** A date as lists show it: "hoje", "ontem" or "27 out". */
export function shortDate(value: string, now = new Date()) {
  const date = new Date(value);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return dayMonth.format(date).replace('.', '').replace(' de ', ' ');
}
