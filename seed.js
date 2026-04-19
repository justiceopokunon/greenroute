const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { run, db } = require('./db');

const seedDatabase = async () => {
  try {
    // Clear existing data
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('DELETE FROM bookings');
        db.run('DELETE FROM rides');
        db.run('DELETE FROM drivers');
        db.run('DELETE FROM users', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Create sample drivers
    const driver1Id = uuidv4();
    const driver2Id = uuidv4();
    const driverId1 = uuidv4();
    const driverId2 = uuidv4();

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Driver 1
    await run(
      'INSERT INTO users (id, email, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [driver1Id, 'kwame@greenroute.com', hashedPassword, 'Kwame Mensah', 'driver', '+233201234567']
    );
    await run(
      'INSERT INTO drivers (id, userId, vehicleType, licensePlate, vehicleModel, rating, trustScore, isOnline, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [driverId1, driver1Id, 'Toyota Hiace', 'GR-214', 'Toyota Hiace 2020', 4.8, 4.8, 1, 5.616, -0.196]
    );

    // Driver 2
    await run(
      'INSERT INTO users (id, email, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [driver2Id, 'yaw@greenroute.com', hashedPassword, 'Yaw Boateng', 'driver', '+233244567890']
    );
    await run(
      'INSERT INTO drivers (id, userId, vehicleType, licensePlate, vehicleModel, rating, trustScore, isOnline, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [driverId2, driver2Id, 'Hyundai County', 'GR-301', 'Hyundai County 2021', 4.6, 4.6, 1, 5.634, -0.181]
    );

    // Create sample rides
    await run(
      'INSERT INTO rides (id, driverId, origin, destination, fare, seats, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['rq1', driverId1, 'Madina', 'Circle', 2.5, 2, 14]
    );

    await run(
      'INSERT INTO rides (id, driverId, origin, destination, fare, seats, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['rq2', driverId2, 'Adenta', 'Accra Central', 3.2, 8, 18]
    );

    await run(
      'INSERT INTO rides (id, driverId, origin, destination, fare, seats, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['rq3', driverId1, 'Kaneshie', 'Tema Station', 4.0, 3, 14]
    );

    await run(
      'INSERT INTO rides (id, driverId, origin, destination, fare, seats, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['rq4', driverId2, 'Circle', 'Madina', 2.5, 1, 18]
    );

    console.log('Database seeded with sample data');
  } catch (err) {
    console.error('Seed error:', err);
  }
};

seedDatabase();
