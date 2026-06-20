import sqlite3 from 'sqlite3';
import path from 'path';

let db: sqlite3.Database;

const ORDERS_SCHEMA = `
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  caregiver_id TEXT NOT NULL,
  booking_mode TEXT NOT NULL CHECK (booking_mode IN ('daily', 'hourly')),
  service_type TEXT NOT NULL CHECK (service_type IN ('normal', 'intensive', 'night')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  total_hours REAL,
  total_days REAL,
  total_price REAL NOT NULL,
  patient_name TEXT NOT NULL,
  patient_age INTEGER NOT NULL,
  patient_condition TEXT NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'pending_service', 'in_service', 'pending_completion', 'completed', 'cancelled')),
  checkin_time TEXT,
  checkin_location TEXT,
  actual_end_time TEXT,
  completed_by TEXT,
  payment_method TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES users(id),
  FOREIGN KEY (caregiver_id) REFERENCES caregiver_profiles(id)
`;

const OLD_ORDER_COLUMNS = [
  'id', 'patient_id', 'caregiver_id', 'booking_mode', 'service_type',
  'start_date', 'end_date', 'start_time', 'end_time', 'total_hours', 'total_days',
  'total_price', 'patient_name', 'patient_age', 'patient_condition', 'notes',
  'status', 'checkin_time', 'checkin_location', 'created_at', 'updated_at',
];

async function migrateOrdersStatus(): Promise<void> {
  const row = await getQuery<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'"
  );
  if (!row || !row.sql) return;
  if (row.sql.includes('pending_completion')) return;

  await runQuery('BEGIN');
  try {
    await runQuery(`CREATE TABLE orders_new (${ORDERS_SCHEMA})`);
    const colList = OLD_ORDER_COLUMNS.join(', ');
    await runQuery(`INSERT INTO orders_new (${colList}) SELECT ${colList} FROM orders`);
    await runQuery('DROP TABLE orders');
    await runQuery('ALTER TABLE orders_new RENAME TO orders');
    await runQuery(
      'CREATE INDEX IF NOT EXISTS idx_orders_caregiver_date ON orders(caregiver_id, start_date, end_date)'
    );
    await runQuery('COMMIT');
    console.log('✅ orders 表已迁移：新增 pending_completion 状态及结算相关字段');
  } catch (err) {
    await runQuery('ROLLBACK');
    throw err;
  }
}

async function seedConfigDefaults(): Promise<void> {
  const defaults: Record<string, string> = {
    commission_rate: '0.10',
    overtime_rate: '1.5',
    min_billing_unit_hours: '0.5',
  };
  for (const [key, value] of Object.entries(defaults)) {
    const existing = await getQuery('SELECT key FROM system_config WHERE key = ?', [key]);
    if (!existing) {
      await runQuery('INSERT INTO system_config (key, value) VALUES (?, ?)', [key, value]);
    }
  }
}

export async function initDatabase() {
  const dbPath = path.join(__dirname, '..', 'data.db');
  db = new sqlite3.Database(dbPath);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('patient', 'caregiver', 'admin')),
      created_at TEXT NOT NULL
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS caregiver_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      avatar TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      certificate_url TEXT DEFAULT '',
      work_years INTEGER DEFAULT 0,
      service_types TEXT DEFAULT 'normal',
      hourly_rate REAL DEFAULT 0,
      daily_rate REAL DEFAULT 0,
      rating REAL DEFAULT 5.0,
      rating_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await runQuery(`CREATE TABLE IF NOT EXISTS orders (${ORDERS_SCHEMA})`);
  await migrateOrdersStatus();
  await runQuery(
    'CREATE INDEX IF NOT EXISTS idx_orders_caregiver_date ON orders(caregiver_id, start_date, end_date)'
  );

  await runQuery(`
    CREATE TABLE IF NOT EXISTS service_records (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      caregiver_id TEXT NOT NULL,
      content TEXT NOT NULL,
      images TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (caregiver_id) REFERENCES caregiver_profiles(id)
    )
  `);
  await runQuery(
    'CREATE INDEX IF NOT EXISTS idx_service_records_order ON service_records(order_id, created_at)'
  );

  await runQuery(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      patient_id TEXT NOT NULL,
      caregiver_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      content TEXT NOT NULL,
      images TEXT DEFAULT '[]',
      reply TEXT,
      replied_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (caregiver_id) REFERENCES caregiver_profiles(id)
    )
  `);
  await runQuery(
    'CREATE INDEX IF NOT EXISTS idx_reviews_caregiver ON reviews(caregiver_id, created_at)'
  );

  await runQuery(`
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      caregiver_id TEXT NOT NULL,
      booking_mode TEXT NOT NULL,
      base_fee REAL NOT NULL,
      overtime_fee REAL NOT NULL DEFAULT 0,
      total_fee REAL NOT NULL,
      platform_fee REAL NOT NULL,
      caregiver_income REAL NOT NULL,
      agreed_units REAL,
      actual_units REAL,
      overtime_units REAL DEFAULT 0,
      details TEXT,
      completed_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (caregiver_id) REFERENCES caregiver_profiles(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS wallets (
      user_id TEXT PRIMARY KEY,
      balance REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('recharge', 'payment', 'refund')),
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      related_order_id TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await runQuery(
    'CREATE INDEX IF NOT EXISTS idx_wallet_txn_user ON wallet_transactions(user_id, created_at)'
  );

  await runQuery(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await seedConfigDefaults();

  console.log('✅ 数据库初始化完成');
}

export function getDatabase(): sqlite3.Database {
  return db;
}

export function runQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function getQuery<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export function allQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export async function getConfig(key: string, fallback: string): Promise<string> {
  const row = await getQuery<{ value: string }>('SELECT value FROM system_config WHERE key = ?', [key]);
  return row?.value ?? fallback;
}

export async function getNumericConfig(key: string, fallback: number): Promise<number> {
  const value = await getConfig(key, String(fallback));
  const num = parseFloat(value);
  return Number.isNaN(num) ? fallback : num;
}
