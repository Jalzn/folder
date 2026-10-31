const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** How many calendar days before `now` a moment was, on this device's clock: 0 today, 1 yesterday. */
export function daysAgo(value: string, now = new Date()) {
  return Math.round((startOfDay(now) - startOfDay(new Date(value))) / 86_400_000);
}

/** A date as lists show it: "hoje", "ontem" or "27 out". */
export function shortDate(value: string, now = new Date()) {
  const date = new Date(value);
  const days = daysAgo(value, now);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return dayMonth.format(date).replace('.', '').replace(' de ', ' ');
}
