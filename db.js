const path = require('path');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();

// Connection logic: Use PostgreSQL if DATABASE_URL is present (e.g., Supabase/Railway)
// Otherwise fallback to local SQLite for development
const isPostgres = !!process.env.DATABASE_URL;
let db;
let pool;

if (isPostgres) {
  console.log('Using PostgreSQL database');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for most cloud DBs
  });
} else {
  console.log('Using local SQLite database');
  const dbPath = path.join(__dirname, 'data/greenroute.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error opening SQLite database:', err);
  });
}

// Helper to convert SQLite '?' placeholders to Postgres '$1, $2'
const convertSql = (sql) => {
  if (!isPostgres) return sql;
  let count = 1;
  return sql.replace(/\?/g, () => `$${count++}`);
};

const initDB = async () => {
  const schema = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      profilePhoto TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      vehicleType TEXT,
      licensePlate TEXT,
      vehicleModel TEXT,
      rating REAL DEFAULT 0,
      trustScore REAL DEFAULT 0,
      isOnline BOOLEAN DEFAULT false,
      latitude REAL,
      longitude REAL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id)
    )`,
    `CREATE TABLE IF NOT EXISTS rides (
      id TEXT PRIMARY KEY,
      driverId TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      fare REAL NOT NULL,
      seats INTEGER NOT NULL,
      capacity INTEGER NOT NULL,
      status TEXT DEFAULT 'available',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (driverId) REFERENCES drivers (id)
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      rideId TEXT NOT NULL,
      passengerId TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      passengerLat REAL,
      passengerLon REAL,
      fare REAL,
      seats INTEGER,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rideId) REFERENCES rides (id),
      FOREIGN KEY (passengerId) REFERENCES users (id)
    )`
  ];

  for (const sql of schema) {
    await run(sql);
  }

  // Create unique index for email/role
  try {
    if (isPostgres) {
      await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role)`);
    } else {
      await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role)`);
    }
  } catch (e) {
    // Index might already exist
  }
};

const run = (sql, params = []) => {
  const finalSql = convertSql(sql);
  if (isPostgres) {
    return pool.query(finalSql, params).then(res => ({ id: null, changes: res.rowCount }));
  } else {
    return new Promise((resolve, reject) => {
      db.run(finalSql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

const get = (sql, params = []) => {
  const finalSql = convertSql(sql);
  if (isPostgres) {
    return pool.query(finalSql, params).then(res => res.rows[0]);
  } else {
    return new Promise((resolve, reject) => {
      db.get(finalSql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

const all = (sql, params = []) => {
  const finalSql = convertSql(sql);
  if (isPostgres) {
    return pool.query(finalSql, params).then(res => res.rows);
  } else {
    return new Promise((resolve, reject) => {
      db.all(finalSql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

const transaction = async (operations) => {
  if (isPostgres) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const op of operations) {
        await client.query(convertSql(op.sql), op.params || []);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) return reject(err);
          let completed = 0;
          operations.forEach(({ sql, params = [] }) => {
            db.run(convertSql(sql), params, (err) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
              completed++;
              if (completed === operations.length) {
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) reject(commitErr);
                  else resolve();
                });
              }
            });
          });
        });
      });
    });
  }
};

const close = () => {
  if (isPostgres) return pool.end();
  return new Promise((resolve, reject) => {
    db.close(err => err ? reject(err) : resolve());
  });
};

module.exports = { initDB, run, get, all, transaction, close };
