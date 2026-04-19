const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'greenroute.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

const initDB = () => {
  db.serialize(() => {
    // Users table
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

    // Drivers table (extends users)
    db.run(`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        userId TEXT UNIQUE NOT NULL,
        vehicleType TEXT,
        licensePlate TEXT,
        vehicleModel TEXT,
        rating REAL DEFAULT 4.8,
        trustScore REAL DEFAULT 4.8,
        isOnline BOOLEAN DEFAULT 0,
        latitude REAL,
        longitude REAL,
        FOREIGN KEY(userId) REFERENCES users(id)
      )
    `);

    // Rides table
    db.run(`
      CREATE TABLE IF NOT EXISTS rides (
        id TEXT PRIMARY KEY,
        driverId TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        fare REAL NOT NULL,
        seats INTEGER NOT NULL,
        capacity INTEGER NOT NULL,
        status TEXT DEFAULT 'available' CHECK(status IN ('available', 'in-transit', 'completed', 'cancelled')),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(driverId) REFERENCES drivers(id)
      )
    `);

    // Bookings table
    db.run(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        rideId TEXT NOT NULL,
        passengerId TEXT NOT NULL,
        status TEXT DEFAULT 'confirmed' CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(rideId) REFERENCES rides(id),
        FOREIGN KEY(passengerId) REFERENCES users(id)
      )
    `);

    console.log('Database tables initialized');
  });
};

// Helper functions
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

module.exports = {
  db,
  initDB,
  run,
  get,
  all
};
