const number = new Intl.NumberFormat('pt-BR');

/** A count as the interface writes it, grouped by thousands: "1.000". */
export const formatCount = (n: number) => number.format(n);

/** A count and its noun, in the singular for one: "1 item", "1.000 itens". */
export const countOf = (n: number, one: string, many: string) => `${formatCount(n)} ${n === 1 ? one : many}`;
