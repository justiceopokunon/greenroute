const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'data/greenroute.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  }
});

const initDB = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Ensure users table exists and supports multiple accounts per email if roles differ.
      // We'll create or migrate the table so that `email` is NOT globally UNIQUE,
      // and instead enforce uniqueness on (email, role).

      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('passenger', 'driver')),
          phone TEXT,
          profilePhoto TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create a unique index on (email, role) to allow same email across different roles
      db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role)`);

      // Migrate existing DB if it had a single-column unique constraint on email
      db.all("PRAGMA index_list('users')", (err, indexes) => {
        if (err || !indexes) return;

        const emailUniqueIndex = indexes.find(idx => idx.unique === 1);
        if (!emailUniqueIndex) return;

        // Check if the unique index is on the single column 'email'
        db.all(`PRAGMA index_info(${emailUniqueIndex.name})`, (err2, cols) => {
          if (err2 || !cols) return;
          if (cols.length === 1 && cols[0].name === 'email') {
            // Perform migration: recreate table without single-column unique on email
            db.serialize(() => {
              db.run('BEGIN TRANSACTION');
              db.run(`
                CREATE TABLE IF NOT EXISTS users_new (
                  id TEXT PRIMARY KEY,
                  email TEXT NOT NULL,
                  password TEXT NOT NULL,
                  name TEXT NOT NULL,
                  role TEXT NOT NULL CHECK(role IN ('passenger', 'driver')),
                  phone TEXT,
                  profilePhoto TEXT,
                  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `);
              db.run(`INSERT OR IGNORE INTO users_new (id, email, password, name, role, phone, profilePhoto, createdAt) SELECT id, email, password, name, role, phone, profilePhoto, createdAt FROM users`);
              db.run('DROP TABLE users');
              db.run('ALTER TABLE users_new RENAME TO users');
              db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role)');
              db.run('COMMIT');
            });
          }
        });
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS drivers (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          vehicleType TEXT,
          licensePlate TEXT,
          vehicleModel TEXT,
          rating REAL DEFAULT 0,
          trustScore REAL DEFAULT 0,
          isOnline BOOLEAN DEFAULT 0,
          latitude REAL,
          longitude REAL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME,
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `);

      // Ensure existing databases have the updatedAt column on drivers
      db.all("PRAGMA table_info(drivers)", (err, cols) => {
        if (err || !cols) return;
        const hasUpdatedAt = cols.some(c => c && c.name === 'updatedAt');
        if (!hasUpdatedAt) {
          // Add updatedAt column if it doesn't exist
          db.run('ALTER TABLE drivers ADD COLUMN updatedAt DATETIME', (alterErr) => {
            if (alterErr) {
              // Not critical; log and continue
              console.warn('Could not add updatedAt column to drivers table:', alterErr.message || alterErr);
            }
          });
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS rides (
          id TEXT PRIMARY KEY,
          driverId TEXT NOT NULL,
          origin TEXT NOT NULL,
          destination TEXT NOT NULL,
          fare REAL NOT NULL,
          seats INTEGER NOT NULL,
          capacity INTEGER NOT NULL,
          status TEXT DEFAULT 'available',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (driverId) REFERENCES drivers (id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
          id TEXT PRIMARY KEY,
          rideId TEXT NOT NULL,
          passengerId TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          passengerLat REAL,
          passengerLon REAL,
          fare REAL,
          seats INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (rideId) REFERENCES rides (id),
          FOREIGN KEY (passengerId) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const transaction = async (operations) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }

        let completed = 0;
        const total = operations.length;

        operations.forEach(({ sql, params = [] }, index) => {
          db.run(sql, params, function(err) {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
              return;
            }

            completed++;
            if (completed === total) {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  reject(commitErr);
                } else {
                  resolve();
                }
              });
            }
          });
        });
      });
    });
  });
};

const close = () => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

module.exports = {
  db,
  initDB,
  run,
  get,
  all,
  transaction,
  close
};
