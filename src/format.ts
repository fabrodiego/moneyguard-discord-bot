const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function money(value: number): string {
  // Intl usa espaco nao separavel; o Discord mostra melhor com espaco normal.
  return brl.format(value).replace(/ /g, ' ');
}

export function dateBr(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Barra de progresso em texto: ▰▰▰▱▱▱▱▱▱▱ */
export function progressBar(percent: number, size = 10): string {
  const filled = Math.max(0, Math.min(size, Math.round((percent / 100) * size)));
  return '▰'.repeat(filled) + '▱'.repeat(size - filled);
}

export function percentText(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export const BRAND_COLOR = 0x22d3ee;
export const EXPENSE_COLOR = 0xe66767;
export const INCOME_COLOR = 0x0ea5c6;
