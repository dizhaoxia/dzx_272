import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, runQuery, getQuery } from './database';

const seedData = async () => {
  await initDatabase();

  await runQuery('DELETE FROM wallet_transactions');
  await runQuery('DELETE FROM wallets');
  await runQuery('DELETE FROM reviews');
  await runQuery('DELETE FROM settlements');
  await runQuery('DELETE FROM service_records');
  await runQuery('DELETE FROM orders');
  await runQuery('DELETE FROM caregiver_profiles');
  await runQuery('DELETE FROM users');

  const now = new Date().toISOString();
  const password = await bcrypt.hash('123456', 10);

  const adminId = uuidv4();
  await runQuery(
    'INSERT INTO users (id, username, password, name, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [adminId, 'admin', password, '系统管理员', '13800000000', 'admin', now]
  );
  console.log('✅ 管理员账号创建成功 (admin / 123456)');

  const patients = [
    { username: 'patient1', name: '张三家属', phone: '13900000001' },
    { username: 'patient2', name: '李四家属', phone: '13900000002' },
  ];

  const patientIds: string[] = [];
  for (const p of patients) {
    const id = uuidv4();
    patientIds.push(id);
    await runQuery(
      'INSERT INTO users (id, username, password, name, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, p.username, password, p.name, p.phone, 'patient', now]
    );
    await runQuery(
      'INSERT INTO wallets (user_id, balance, updated_at) VALUES (?, ?, ?)',
      [id, 5000, now]
    );
    await runQuery(
      `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, related_order_id, description, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
      [uuidv4(), id, 'recharge', 5000, 5000, '系统预充值（演示）', now]
    );
  }
  console.log('✅ 测试患者账号创建成功 (patient1 / 123456, patient2 / 123456)，钱包初始余额 5000');

  const caregivers = [
    {
      username: 'caregiver1',
      name: '王阿姨',
      phone: '13700000001',
      avatar: '',
      bio: '从事护工工作10年，擅长老年护理和术后康复护理。待人亲切，工作认真负责，获得患者及家属一致好评。',
      certificate_url: '',
      work_years: 10,
      service_types: 'normal,intensive',
      hourly_rate: 60,
      daily_rate: 400,
    },
    {
      username: 'caregiver2',
      name: '李阿姨',
      phone: '13700000002',
      avatar: '',
      bio: '护理专业毕业，持有执业护士资格证。擅长重症监护和夜间陪护，经验丰富，细心周到。',
      certificate_url: '',
      work_years: 8,
      service_types: 'intensive,night',
      hourly_rate: 80,
      daily_rate: 500,
    },
    {
      username: 'caregiver3',
      name: '张阿姨',
      phone: '13700000003',
      avatar: '',
      bio: '5年护工经验，擅长普通日常陪护。性格开朗，善于与患者沟通交流。',
      certificate_url: '',
      work_years: 5,
      service_types: 'normal,night',
      hourly_rate: 50,
      daily_rate: 300,
    },
    {
      username: 'caregiver4',
      name: '刘叔叔',
      phone: '13700000004',
      avatar: '',
      bio: '男性护工，12年从业经验，擅长重症护理和术后康复，力气大，能独立完成患者搬运工作。',
      certificate_url: '',
      work_years: 12,
      service_types: 'normal,intensive',
      hourly_rate: 70,
      daily_rate: 450,
    },
    {
      username: 'caregiver5',
      name: '陈阿姨',
      phone: '13700000005',
      avatar: '',
      bio: '从事夜间陪护工作7年，熟悉夜间护理流程，能及时发现并处理突发状况。',
      certificate_url: '',
      work_years: 7,
      service_types: 'night',
      hourly_rate: 65,
      daily_rate: 380,
    },
  ];

  const reviewPool = [
    { rating: 5, content: '服务非常贴心，护工很专业，家人恢复得很好，强烈推荐！' },
    { rating: 5, content: '态度亲切，护理细致，每天都会及时沟通患者情况，非常满意。' },
    { rating: 4, content: '按时到岗，照顾周到，沟通顺畅，个别细节还能更完善。' },
    { rating: 5, content: '护理到位，认真负责，家属很放心，下次还会选择。' },
    { rating: 4, content: '整体不错，专业能力较强，回复消息也比较及时。' },
    { rating: 3, content: '服务一般，基本满足需求，希望后续更主动一些。' },
    { rating: 5, content: '非常满意！夜间陪护也很细心，突发状况处理得很到位。' },
    { rating: 5, content: '经验丰富，对患者很有耐心，照顾得很周到。' },
  ];

  for (const c of caregivers) {
    const userId = uuidv4();
    await runQuery(
      'INSERT INTO users (id, username, password, name, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, c.username, password, c.name, c.phone, 'caregiver', now]
    );

    const profileId = uuidv4();
    await runQuery(
      `INSERT INTO caregiver_profiles (
        id, user_id, avatar, bio, certificate_url, work_years, 
        service_types, hourly_rate, daily_rate, rating, rating_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [profileId, userId, c.avatar, c.bio, c.certificate_url, c.work_years, c.service_types, c.hourly_rate, c.daily_rate, 5.0, 0, now]
    );

    const reviewCount = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < reviewCount; i++) {
      const r = reviewPool[(i + Math.floor(Math.random() * reviewPool.length)) % reviewPool.length];
      const daysAgo = i + 1;
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      await runQuery(
        `INSERT INTO reviews (id, order_id, patient_id, caregiver_id, rating, content, images, reply, replied_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, '[]', NULL, NULL, ?)`,
        [uuidv4(), uuidv4(), patientIds[i % patientIds.length], profileId, r.rating, r.content, createdAt]
      );
    }

    const stats: any = await getQuery(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE caregiver_id = ?',
      [profileId]
    );
    const avg = stats?.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 5.0;
    const cnt = stats?.cnt || 0;
    await runQuery(
      'UPDATE caregiver_profiles SET rating = ?, rating_count = ? WHERE id = ?',
      [avg, cnt, profileId]
    );
  }
  console.log('✅ 测试护工账号创建成功 (caregiver1-5 / 123456)，并生成演示评价数据');

  console.log('\n🎉 种子数据初始化完成！');
  process.exit(0);
};

void seedData().catch((err) => {
  console.error('❌ 种子数据初始化失败:', err);
  process.exit(1);
});
