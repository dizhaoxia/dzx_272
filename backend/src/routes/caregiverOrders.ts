import { Router } from 'express';
import { z } from 'zod';
import { allQuery, getQuery, runQuery } from '../database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { Order, OrderStatus } from '../types';

const router = Router();

const checkinSchema = z.object({
  location: z.string().min(1, '签到位置不能为空'),
});

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['pending_service', 'cancelled'],
  pending_service: ['in_service', 'cancelled'],
  in_service: ['completed'],
  completed: [],
  cancelled: [],
};

router.get('/orders', authMiddleware, requireRole('caregiver'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    const profile: any = await getQuery('SELECT id FROM caregiver_profiles WHERE user_id = ?', [req.user!.id]);
    if (!profile) {
      res.status(404).json({ message: '护工信息不存在' });
      return;
    }

    let sql = `
      SELECT o.*, 
             u.name as patient_name_user,
             u.phone as patient_phone
      FROM orders o
      INNER JOIN users u ON o.patient_id = u.id
      WHERE o.caregiver_id = ?
    `;
    const params: any[] = [profile.id];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';

    const orders = await allQuery(sql, params);
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/orders/:id/accept', authMiddleware, requireRole('caregiver'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const profile: any = await getQuery('SELECT id FROM caregiver_profiles WHERE user_id = ?', [req.user!.id]);
    if (!profile) {
      res.status(404).json({ message: '护工信息不存在' });
      return;
    }

    const order = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }

    if (order.caregiver_id !== profile.id) {
      res.status(403).json({ message: '无权操作此订单' });
      return;
    }

    if (order.status !== 'pending_service') {
      res.status(400).json({ message: '当前订单状态无法接单' });
      return;
    }

    res.json({ order, message: '接单成功（订单已处于待服务状态）' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/orders/:id/reject', authMiddleware, requireRole('caregiver'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const profile: any = await getQuery('SELECT id FROM caregiver_profiles WHERE user_id = ?', [req.user!.id]);
    if (!profile) {
      res.status(404).json({ message: '护工信息不存在' });
      return;
    }

    const order = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }

    if (order.caregiver_id !== profile.id) {
      res.status(403).json({ message: '无权操作此订单' });
      return;
    }

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes('cancelled')) {
      res.status(400).json({ message: '当前订单状态无法拒单' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', ['cancelled', now, id]);

    const updated = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    res.json({ order: updated, message: '已拒单' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/orders/:id/checkin', authMiddleware, requireRole('caregiver'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = checkinSchema.parse(req.body);
    const profile: any = await getQuery('SELECT id FROM caregiver_profiles WHERE user_id = ?', [req.user!.id]);
    if (!profile) {
      res.status(404).json({ message: '护工信息不存在' });
      return;
    }

    const order = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }

    if (order.caregiver_id !== profile.id) {
      res.status(403).json({ message: '无权操作此订单' });
      return;
    }

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes('in_service')) {
      res.status(400).json({ message: '当前订单状态无法签到' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery(
      'UPDATE orders SET status = ?, checkin_time = ?, checkin_location = ?, updated_at = ? WHERE id = ?',
      ['in_service', now, data.location, now, id]
    );

    const updated = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    res.json({ order: updated, message: '签到成功' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0].message });
    } else {
      res.status(500).json({ message: err.message });
    }
  }
});

router.post('/orders/:id/complete', authMiddleware, requireRole('caregiver'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const profile: any = await getQuery('SELECT id FROM caregiver_profiles WHERE user_id = ?', [req.user!.id]);
    if (!profile) {
      res.status(404).json({ message: '护工信息不存在' });
      return;
    }

    const order = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }

    if (order.caregiver_id !== profile.id) {
      res.status(403).json({ message: '无权操作此订单' });
      return;
    }

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes('completed')) {
      res.status(400).json({ message: '当前订单状态无法完成服务' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', ['completed', now, id]);

    const updated = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    res.json({ order: updated, message: '服务已完成' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
