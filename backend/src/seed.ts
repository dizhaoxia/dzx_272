import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, runQuery } from './database';

const seedData = async () => {
  initDatabase();

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

  for (const p of patients) {
    const id = uuidv4();
    await runQuery(
      'INSERT INTO users (id, username, password, name, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, p.username, password, p.name, p.phone, 'patient', now]
    );
  }
  console.log('✅ 测试患者账号创建成功 (patient1 / 123456, patient2 / 123456)');

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
      rating: 4.8,
      rating_count: 56,
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
      rating: 4.9,
      rating_count: 72,
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
      rating: 4.6,
      rating_count: 34,
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
      rating: 4.7,
      rating_count: 89,
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
      rating: 4.5,
      rating_count: 28,
    },
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
      [profileId, userId, c.avatar, c.bio, c.certificate_url, c.work_years, c.service_types, c.hourly_rate, c.daily_rate, c.rating, c.rating_count, now]
    );
  }
  console.log('✅ 测试护工账号创建成功 (caregiver1-5 / 123456)');

  console.log('\n🎉 种子数据初始化完成！');
  process.exit(0);
};

seedData().catch((err) => {
  console.error('❌ 种子数据初始化失败:', err);
  process.exit(1);
});
