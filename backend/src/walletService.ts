import { v4 as uuidv4 } from 'uuid';
import { getQuery, runQuery } from './database';
import { Wallet } from './types';

export async function ensureWallet(userId: string): Promise<Wallet> {
  let wallet = await getQuery<Wallet>('SELECT * FROM wallets WHERE user_id = ?', [userId]);
  if (!wallet) {
    const now = new Date().toISOString();
    await runQuery(
      'INSERT INTO wallets (user_id, balance, updated_at) VALUES (?, ?, ?)',
      [userId, 0, now]
    );
    wallet = { user_id: userId, balance: 0, updated_at: now };
  }
  return wallet;
}

export async function adjustWallet(
  userId: string,
  type: 'recharge' | 'payment' | 'refund',
  delta: number,
  relatedOrderId: string | null,
  description: string
): Promise<Wallet> {
  const wallet = await ensureWallet(userId);
  const newBalance = Math.round((wallet.balance + delta) * 100) / 100;
  const now = new Date().toISOString();
  await runQuery(
    'UPDATE wallets SET balance = ?, updated_at = ? WHERE user_id = ?',
    [newBalance, now, userId]
  );
  await runQuery(
    `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, related_order_id, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), userId, type, Math.abs(delta), newBalance, relatedOrderId, description, now]
  );
  return { user_id: userId, balance: newBalance, updated_at: now };
}
