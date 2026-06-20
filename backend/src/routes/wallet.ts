import { Router } from 'express';
import { z } from 'zod';
import { allQuery } from '../database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { ensureWallet, adjustWallet } from '../walletService';

const router = Router();

const rechargeSchema = z.object({
  amount: z.number().positive('充值金额必须大于 0'),
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const wallet = await ensureWallet(req.user!.id);
    res.json({ wallet });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/recharge', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = rechargeSchema.parse(req.body);
    const wallet = await adjustWallet(
      req.user!.id,
      'recharge',
      data.amount,
      null,
      '账户充值'
    );
    res.json({ wallet, message: '充值成功' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0].message });
    } else {
      res.status(500).json({ message: err.message || '充值失败' });
    }
  }
});

router.get('/transactions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const transactions = await allQuery(
      'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user!.id]
    );
    res.json({ transactions });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
