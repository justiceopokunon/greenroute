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
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('passenger', 'driver')),
          phone TEXT,
          profilePhoto TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

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
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `);

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
