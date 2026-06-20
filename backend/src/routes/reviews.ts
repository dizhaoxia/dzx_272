import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { allQuery, getQuery, runQuery } from '../database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const createReviewSchema = z.object({
  rating: z.number().int().min(1, '评分至少 1 星').max(5, '评分最多 5 星'),
  content: z.string().min(1, '评价内容不能为空'),
  images: z.array(z.string()).optional().default([]),
});

const replySchema = z.object({
  reply: z.string().min(1, '回复内容不能为空'),
});

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

const normalizeReview = (r: any) => (r ? { ...r, images: parseImages(r.images) } : null);

async function recomputeCaregiverRating(caregiverId: string): Promise<void> {
  const stats: any = await getQuery(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE caregiver_id = ?',
    [caregiverId]
  );
  const avg = stats?.avg_rating ? Math.round(stats.avg_rating * 100) / 100 : 0;
  const cnt = stats?.cnt || 0;
  await runQuery(
    'UPDATE caregiver_profiles SET rating = ?, rating_count = ? WHERE id = ?',
    [avg, cnt, caregiverId]
  );
}

router.post('/order/:orderId', authMiddleware, requireRole('patient'), async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;
    const data = createReviewSchema.parse(req.body);
    const order: any = await getQuery('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }
    if (order.patient_id !== req.user!.id) {
      res.status(403).json({ message: '无权评价此订单' });
      return;
    }
    if (order.status !== 'completed') {
      res.status(400).json({ message: '只有已完成的订单才能评价' });
      return;
    }

    const existing = await getQuery('SELECT id FROM reviews WHERE order_id = ?', [orderId]);
    if (existing) {
      res.status(400).json({ message: '该订单已评价' });
      return;
    }

    const now = new Date().toISOString();
    const reviewId = uuidv4();
    const imagesJson = JSON.stringify(data.images || []);
    await runQuery(
      `INSERT INTO reviews (id, order_id, patient_id, caregiver_id, rating, content, images, reply, replied_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [reviewId, orderId, req.user!.id, order.caregiver_id, data.rating, data.content, imagesJson, now]
    );

    await recomputeCaregiverRating(order.caregiver_id);

    const reviewRaw = await getQuery('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    res.json({ review: normalizeReview(reviewRaw), message: '评价已提交' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0].message });
    } else {
      res.status(500).json({ message: err.message || '提交评价失败' });
    }
  }
});

router.get('/order/:orderId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;
    const review = await getQuery(
      `SELECT r.*, u.name as patient_name
       FROM reviews r
       LEFT JOIN users u ON r.patient_id = u.id
       WHERE r.order_id = ?`,
      [orderId]
    );
    res.json({ review: normalizeReview(review) || null });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:reviewId/reply', authMiddleware, requireRole('caregiver'), async (req: AuthRequest, res) => {
  try {
    const { reviewId } = req.params;
    const data = replySchema.parse(req.body);
    const profile: any = await getQuery('SELECT id FROM caregiver_profiles WHERE user_id = ?', [req.user!.id]);
    if (!profile) {
      res.status(404).json({ message: '护工信息不存在' });
      return;
    }

    const review: any = await getQuery('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    if (!review) {
      res.status(404).json({ message: '评价不存在' });
      return;
    }
    if (review.caregiver_id !== profile.id) {
      res.status(403).json({ message: '无权回复此评价' });
      return;
    }

    const now = new Date().toISOString();
    await runQuery('UPDATE reviews SET reply = ?, replied_at = ? WHERE id = ?', [data.reply, now, reviewId]);
    const updated = await getQuery('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    res.json({ review: normalizeReview(updated), message: '回复成功' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0].message });
    } else {
      res.status(500).json({ message: err.message });
    }
  }
});

router.get('/caregiver/:caregiverId', async (req, res) => {
  try {
    const { caregiverId } = req.params;
    const all = await allQuery<{ rating: number }>(
      'SELECT rating FROM reviews WHERE caregiver_id = ?',
      [caregiverId]
    );
    const total = all.length;
    const sum = all.reduce((s, r) => s + r.rating, 0);
    const average = total ? Math.round((sum / total) * 100) / 100 : 0;
    const distribution = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: all.filter((r) => r.rating === rating).length,
    }));

    const latestRaw = await allQuery(
      `SELECT r.*, u.name as patient_name
       FROM reviews r
       LEFT JOIN users u ON r.patient_id = u.id
       WHERE r.caregiver_id = ?
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [caregiverId]
    );
    const latest = latestRaw.map(normalizeReview);

    res.json({ stats: { average, total, distribution }, reviews: latest });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
