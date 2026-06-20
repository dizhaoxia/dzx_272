import express from 'express';
import cors from 'cors';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import caregiverRoutes from './routes/caregivers';
import orderRoutes from './routes/orders';
import caregiverOrderRoutes from './routes/caregiverOrders';

const app = express();
const PORT = 30003;

app.use(cors());
app.use(express.json());

initDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/caregiver', caregiverOrderRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '医院陪护系统后端运行正常' });
});

app.listen(PORT, () => {
  console.log(`🚀 后端服务器已启动: http://localhost:${PORT}`);
});
