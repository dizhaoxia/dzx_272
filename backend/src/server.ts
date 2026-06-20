import express from 'express';
import cors from 'cors';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import caregiverRoutes from './routes/caregivers';
import orderRoutes from './routes/orders';
import caregiverOrderRoutes from './routes/caregiverOrders';
import serviceRecordRoutes from './routes/serviceRecords';
import reviewRoutes from './routes/reviews';
import walletRoutes from './routes/wallet';

const app = express();
const PORT = 30003;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

initDatabase()
  .then(() => {
    app.use('/api/auth', authRoutes);
    app.use('/api/caregivers', caregiverRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/caregiver', caregiverOrderRoutes);
    app.use('/api/caregiver', serviceRecordRoutes);
    app.use('/api/reviews', reviewRoutes);
    app.use('/api/wallet', walletRoutes);

    app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', message: '医院陪护系统后端运行正常' });
    });

    app.listen(PORT, () => {
      console.log(`🚀 后端服务器已启动: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ 数据库初始化失败:', err);
    process.exit(1);
  });
