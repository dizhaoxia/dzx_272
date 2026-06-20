import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { allQuery, getQuery, runQuery } from '../database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { Order, OrderStatus } from '../types';

const router = Router();

const createOrderSchema = z.object({
  caregiver_id: z.string(),
  booking_mode: z.enum(['daily', 'hourly']),
  service_type: z.enum(['normal', 'intensive', 'night']),
  start_date: z.string(),
  end_date: z.string(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  total_hours: z.number().optional().nullable(),
  total_days: z.number().optional().nullable(),
  total_price: z.number().positive(),
  patient_name: z.string().min(1),
  patient_age: z.number().min(0).max(150),
  patient_condition: z.string().min(1),
  notes: z.string().optional().default(''),
});

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['pending_service', 'cancelled'],
  pending_service: ['in_service', 'cancelled'],
  in_service: ['completed'],
  completed: [],
  cancelled: [],
};

async function checkScheduleConflict(
  caregiverId: string,
  startDate: string,
  endDate: string,
  startTime: string | null,
  endTime: string | null,
  excludeOrderId?: string
): Promise<boolean> {
  const sql = `
    SELECT id FROM orders
    WHERE caregiver_id = ?
      AND status NOT IN ('cancelled', 'completed')
      AND start_date <= ?
      AND end_date >= ?
      ${excludeOrderId ? 'AND id != ?' : ''}
  `;
  const params: any[] = [caregiverId, endDate, startDate];
  if (excludeOrderId) params.push(excludeOrderId);

  const conflictingOrders = await allQuery(sql, params);

  if (conflictingOrders.length === 0) return false;

  if (startTime && endTime) {
    for (const order of conflictingOrders) {
      const detail: any = await getQuery(
        'SELECT start_time, end_time, start_date, end_date FROM orders WHERE id = ?',
        [order.id]
      );
      if (!detail.start_time || !detail.end_time) continue;

      const sameDay = detail.start_date === startDate || detail.end_date === startDate;
      if (sameDay) {
        const overlap =
          (startTime < detail.end_time && endTime > detail.start_time);
        if (overlap) return true;
      }
    }
  }

  return conflictingOrders.length > 0;
}

router.post('/', authMiddleware, requireRole('patient'), async (req: AuthRequest, res) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const now = new Date().toISOString();

    const caregiver = await getQuery('SELECT id FROM caregiver_profiles WHERE id = ?', [data.caregiver_id]);
    if (!caregiver) {
      res.status(404).json({ message: '护工不存在' });
      return;
    }

    const hasConflict = await checkScheduleConflict(
      data.caregiver_id,
      data.start_date,
      data.end_date,
      data.start_time || null,
      data.end_time || null
    );
    if (hasConflict) {
      res.status(400).json({ message: '该护工在此时间段已有预约，请选择其他时间' });
      return;
    }

    const orderId = uuidv4();
    await runQuery(
      `INSERT INTO orders (
        id, patient_id, caregiver_id, booking_mode, service_type,
        start_date, end_date, start_time, end_time, total_hours, total_days,
        total_price, patient_name, patient_age, patient_condition, notes,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId, req.user!.id, data.caregiver_id, data.booking_mode, data.service_type,
        data.start_date, data.end_date, data.start_time || null, data.end_time || null,
        data.total_hours || null, data.total_days || null,
        data.total_price, data.patient_name, data.patient_age, data.patient_condition, data.notes,
        'pending_payment', now, now
      ]
    );

    const order = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.json({ order });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0].message });
    } else {
      res.status(500).json({ message: err.message || '创建订单失败' });
    }
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT o.*, 
             u.name as patient_name_user,
             cp.user_id as caregiver_user_id,
             uc.name as caregiver_name
      FROM orders o
      INNER JOIN users u ON o.patient_id = u.id
      INNER JOIN caregiver_profiles cp ON o.caregiver_id = cp.id
      INNER JOIN users uc ON cp.user_id = uc.id
      WHERE o.patient_id = ?
    `;
    const params: any[] = [req.user!.id];

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

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const order = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }

    if (order.patient_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ message: '无权查看此订单' });
      return;
    }

    res.json({ order });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/pay', authMiddleware, requireRole('patient'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const order = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }

    if (order.patient_id !== req.user!.id) {
      res.status(403).json({ message: '无权操作此订单' });
      return;
    }

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes('paid')) {
      res.status(400).json({ message: '当前订单状态无法支付' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', ['paid', now, id]);

    const updated = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    res.json({ order: updated });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const order = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }

    if (order.patient_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ message: '无权操作此订单' });
      return;
    }

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes('cancelled')) {
      res.status(400).json({ message: '当前订单状态无法取消' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', ['cancelled', now, id]);

    const updated = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [id]);
    res.json({ order: updated });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
