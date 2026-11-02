import { config } from './config.js';

export type TransactionType = 'EXPENSE' | 'INCOME';

export interface Ref {
  id: number;
  name: string;
}

export interface Parsed {
  amount: number | null;
  type: TransactionType;
  occurredOn: string;
  description: string | null;
  category: Ref | null;
  merchant: Ref | null;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string | null;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  description: string | null;
  occurredOn: string;
  category: Category;
  merchant: Ref | null;
}

export interface Totals {
  income: number;
  expense: number;
  balance: number;
}

export interface Goal {
  id: number;
  name: string;
  target: number;
  saved: number;
  percent: number;
  monthlyNeeded: number | null;
}

export interface Summary {
  userName: string;
  monthLabel: string;
  month: Totals;
  topExpenses: { name: string; total: number; percent: number }[];
  goals: { balance: number; allocated: number; available: number; goals: Goal[] };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title: string | undefined,
    message: string,
  ) {
    super(message);
  }

  get notLinked(): boolean {
    return this.status === 404 && this.title === 'DISCORD_NOT_LINKED';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${config.apiUrl}/api/bot${path}`, {
    method,
    headers: {
      'X-Bot-Key': config.botApiKey,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as { title?: string; detail?: string };
    throw new ApiError(res.status, problem.title, problem.detail ?? `Erro ${res.status} na API`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const q = (discordUserId: string) => `discordUserId=${encodeURIComponent(discordUserId)}`;

export const api = {
  link: (discordUserId: string, code: string) =>
    request<{ userName: string }>('POST', '/link', { discordUserId, code }),
  unlink: (discordUserId: string) => request<void>('POST', '/unlink', { discordUserId }),
  parse: (discordUserId: string, text: string) => request<Parsed>('POST', '/parse', { discordUserId, text }),
  categories: (discordUserId: string, type: TransactionType) =>
    request<Category[]>('GET', `/categories?${q(discordUserId)}&type=${type}`),
  createTransaction: (body: {
    discordUserId: string;
    categoryId: number;
    merchantId: number | null;
    amount: number;
    description: string | null;
    occurredOn: string;
  }) => request<Transaction>('POST', '/transactions', body),
  deleteTransaction: (discordUserId: string, id: number) =>
    request<void>('DELETE', `/transactions/${id}?${q(discordUserId)}`),
  summary: (discordUserId: string) => request<Summary>('GET', `/summary?${q(discordUserId)}`),
};
