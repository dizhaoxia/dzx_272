import sqlite3 from 'sqlite3';
import path from 'path';

let db: sqlite3.Database;

export function initDatabase() {
  const dbPath = path.join(__dirname, '..', 'data.db');
  db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`
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

    db.run(`
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

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        caregiver_id TEXT NOT NULL,
        booking_mode TEXT NOT NULL CHECK (booking_mode IN ('daily', 'hourly')),
        service_type TEXT NOT NULL CHECK (service_type IN ('normal', 'intensive', 'night')),
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        total_hours INTEGER,
        total_days INTEGER,
        total_price REAL NOT NULL,
        patient_name TEXT NOT NULL,
        patient_age INTEGER NOT NULL,
        patient_condition TEXT NOT NULL,
        notes TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'pending_service', 'in_service', 'completed', 'cancelled')),
        checkin_time TEXT,
        checkin_location TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES users(id),
        FOREIGN KEY (caregiver_id) REFERENCES caregiver_profiles(id)
      )
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_orders_caregiver_date ON orders(caregiver_id, start_date, end_date)
    `);
  });

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
