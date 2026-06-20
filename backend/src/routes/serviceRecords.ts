import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { allQuery, getQuery, runQuery } from '../database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const createRecordSchema = z.object({
  content: z.string().min(1, '护理内容不能为空'),
  images: z.array(z.string()).optional().default([]),
});

async function getCaregiverProfileId(userId: string): Promise<string | undefined> {
  const profile: any = await getQuery('SELECT id FROM caregiver_profiles WHERE user_id = ?', [userId]);
  return profile?.id;
}

const parseImages = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

router.post('/orders/:id/records', authMiddleware, requireRole('caregiver'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = createRecordSchema.parse(req.body);
    const profileId = await getCaregiverProfileId(req.user!.id);
    if (!profileId) {
      res.status(404).json({ message: '护工信息不存在' });
      return;
    }

    const order: any = await getQuery('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }
    if (order.caregiver_id !== profileId) {
      res.status(403).json({ message: '无权操作此订单' });
      return;
    }
    if (!['in_service', 'pending_completion'].includes(order.status)) {
      res.status(400).json({ message: '当前订单状态无法添加服务记录' });
      return;
    }

    const now = new Date().toISOString();
    const recordId = uuidv4();
    const imagesJson = JSON.stringify(data.images || []);
    await runQuery(
      'INSERT INTO service_records (id, order_id, caregiver_id, content, images, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [recordId, id, profileId, data.content, imagesJson, now]
    );

    const recordRaw: any = await getQuery('SELECT * FROM service_records WHERE id = ?', [recordId]);
    const record = { ...recordRaw, images: parseImages(recordRaw?.images) };
    res.json({ record, message: '服务记录已保存' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0].message });
    } else {
      res.status(500).json({ message: err.message || '保存服务记录失败' });
    }
  }
});

router.get('/orders/:id/records', authMiddleware, requireRole('caregiver'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const profileId = await getCaregiverProfileId(req.user!.id);
    if (!profileId) {
      res.status(404).json({ message: '护工信息不存在' });
      return;
    }

    const order: any = await getQuery('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }
    if (order.caregiver_id !== profileId) {
      res.status(403).json({ message: '无权操作此订单' });
      return;
    }

    const recordsRaw = await allQuery(
      `SELECT sr.*, u.name as caregiver_name
       FROM service_records sr
       LEFT JOIN caregiver_profiles cp ON sr.caregiver_id = cp.id
       LEFT JOIN users u ON cp.user_id = u.id
       WHERE sr.order_id = ? ORDER BY sr.created_at ASC`,
      [id]
    );
    const records = recordsRaw.map((r: any) => ({ ...r, images: parseImages(r.images) }));
    res.json({ records });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
