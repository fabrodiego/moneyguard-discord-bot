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

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "Todo dia 5" / "Todo ano em 15/mar" */
export function scheduleText(r: { frequency: 'MONTHLY' | 'YEARLY'; dayOfMonth: number; monthOfYear: number | null }): string {
  return r.frequency === 'MONTHLY'
    ? `Todo dia ${r.dayOfMonth}`
    : `Todo ano em ${String(r.dayOfMonth).padStart(2, '0')}/${MONTHS[(r.monthOfYear ?? 1) - 1]}`;
}

export const BRAND_COLOR = 0x22d3ee;
export const EXPENSE_COLOR = 0xe66767;
export const INCOME_COLOR = 0x0ea5c6;
