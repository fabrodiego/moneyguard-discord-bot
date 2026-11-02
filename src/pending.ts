import { randomBytes } from 'node:crypto';
import type { Parsed, TransactionType } from './api.js';

/** Lancamento aguardando o Confirmar. Fica em memoria por 10 minutos. */
export interface Pending {
  discordUserId: string;
  amount: number;
  type: TransactionType;
  occurredOn: string;
  description: string | null;
  category: { id: number; name: string } | null;
  merchant: { id: number; name: string } | null;
  expiresAt: number;
}

interface Undo {
  discordUserId: string;
  expiresAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const pendings = new Map<string, Pending>();
const undos = new Map<number, Undo>();

export function createPending(discordUserId: string, parsed: Parsed & { amount: number }): string {
  const id = randomBytes(6).toString('hex');
  pendings.set(id, {
    discordUserId,
    amount: parsed.amount,
    type: parsed.type,
    occurredOn: parsed.occurredOn,
    description: parsed.description,
    category: parsed.category,
    merchant: parsed.merchant,
    expiresAt: Date.now() + TTL_MS,
  });
  return id;
}

export function getPending(id: string): Pending | undefined {
  const p = pendings.get(id);
  if (p && p.expiresAt < Date.now()) {
    pendings.delete(id);
    return undefined;
  }
  return p;
}

export function deletePending(id: string): void {
  pendings.delete(id);
}

export function allowUndo(transactionId: number, discordUserId: string): void {
  undos.set(transactionId, { discordUserId, expiresAt: Date.now() + TTL_MS });
}

export function takeUndo(transactionId: number, discordUserId: string): boolean {
  const u = undos.get(transactionId);
  if (!u || u.discordUserId !== discordUserId || u.expiresAt < Date.now()) return false;
  undos.delete(transactionId);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, p] of pendings) if (p.expiresAt < now) pendings.delete(id);
  for (const [id, u] of undos) if (u.expiresAt < now) undos.delete(id);
}, 60_000).unref();
