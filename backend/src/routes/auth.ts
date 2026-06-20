import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { allQuery, getQuery, runQuery } from '../database';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';
import { ensureWallet } from '../walletService';
import { User } from '../types';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  password: z.string().min(6, '密码至少6个字符'),
  name: z.string().min(1, '姓名不能为空'),
  phone: z.string().min(11, '手机号格式不正确'),
  role: z.enum(['patient', 'caregiver']),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await getQuery<User>('SELECT * FROM users WHERE username = ?', [data.username]);
    if (existing) {
      res.status(400).json({ message: '用户名已存在' });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const userId = uuidv4();
    const now = new Date().toISOString();

    await runQuery(
      'INSERT INTO users (id, username, password, name, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, data.username, hashedPassword, data.name, data.phone, data.role, now]
    );

    if (data.role === 'caregiver') {
      await runQuery(
        'INSERT INTO caregiver_profiles (id, user_id, avatar, bio, certificate_url, work_years, service_types, hourly_rate, daily_rate, rating, rating_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, '', '', '', 0, 'normal', 50, 300, 5.0, 0, now]
      );
    } else {
      await ensureWallet(userId);
    }

    const token = generateToken({ id: userId, username: data.username, role: data.role, name: data.name });
    res.json({ token, user: { id: userId, username: data.username, name: data.name, role: data.role, phone: data.phone } });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0].message });
    } else {
      res.status(500).json({ message: err.message || '注册失败' });
    }
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await getQuery<User>('SELECT * FROM users WHERE username = ?', [data.username]);
    if (!user) {
      res.status(400).json({ message: '用户名或密码错误' });
      return;
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      res.status(400).json({ message: '用户名或密码错误' });
      return;
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role, name: user.name });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, phone: user.phone } });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: err.errors[0].message });
    } else {
      res.status(500).json({ message: err.message || '登录失败' });
    }
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await getQuery<User>('SELECT id, username, name, phone, role, created_at FROM users WHERE id = ?', [req.user!.id]);
    if (!user) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    let profile = null;
    if (user.role === 'caregiver') {
      profile = await getQuery('SELECT * FROM caregiver_profiles WHERE user_id = ?', [user.id]);
    }

    res.json({ user, profile });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
