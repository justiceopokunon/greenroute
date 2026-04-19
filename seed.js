/**
 * Seed script for Green Route database
 * Populates database with test data for development and testing
 */

const { run, get, all, initDB } = require('./db');
const crypto = require('crypto');

const PASSWORD_SALT = process.env.PASSWORD_SALT || 'greenroute-salt';

const hashPassword = (password) => {
  return crypto
    .createHash('sha256')
    .update(password + PASSWORD_SALT)
    .digest('hex');
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...');
    
    // Initialize database
    initDB();
    console.log('✅ Database initialized');

    // Clear existing data (optional - comment out if you want to preserve)
    // await run('DELETE FROM bookings');
    // await run('DELETE FROM rides');
    // await run('DELETE FROM drivers');
    // await run('DELETE FROM users');
    // console.log('🧹 Cleared existing data');

    // Create test passengers
    const passenger1Id = crypto.randomUUID();
    const passenger2Id = crypto.randomUUID();

    await run(
      `INSERT OR IGNORE INTO users (id, email, password, name, phone, role, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [passenger1Id, 'passenger1@test.com', hashPassword('password123'), 'Alice Johnson', '024 123 4567', 'passenger', new Date().toISOString()]
    );

    await run(
      `INSERT OR IGNORE INTO users (id, email, password, name, phone, role, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [passenger2Id, 'passenger2@test.com', hashPassword('password123'), 'Bob Smith', '024 234 5678', 'passenger', new Date().toISOString()]
    );

    console.log('✅ Created 2 test passengers');

    // Create test drivers
    const driver1UserId = crypto.randomUUID();
    const driver1Id = crypto.randomUUID();
    const driver2UserId = crypto.randomUUID();
    const driver2Id = crypto.randomUUID();

    await run(
      `INSERT OR IGNORE INTO users (id, email, password, name, phone, role, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [driver1UserId, 'driver1@test.com', hashPassword('password123'), 'Kofi Mensah', '024 345 6789', 'driver', new Date().toISOString()]
    );

    await run(
      `INSERT OR IGNORE INTO users (id, email, password, name, phone, role, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [driver2UserId, 'driver2@test.com', hashPassword('password123'), 'Ama Osei', '024 456 7890', 'driver', new Date().toISOString()]
    );

    await run(
      `INSERT OR IGNORE INTO drivers (id, userId, vehicleType, licensePlate, vehicleModel, rating, trustScore, isOnline, latitude, longitude, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [driver1Id, driver1UserId, 'Trotro', 'GR-001', 'Toyota Hiace', 4.8, 95, 1, 5.678, -0.165, new Date().toISOString()]
    );

    await run(
      `INSERT OR IGNORE INTO drivers (id, userId, vehicleType, licensePlate, vehicleModel, rating, trustScore, isOnline, latitude, longitude, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [driver2Id, driver2UserId, 'Trotro', 'GR-002', 'Nissan Urvan', 4.9, 98, 1, 5.640, -0.148, new Date().toISOString()]
    );

    console.log('✅ Created 2 test drivers');

    // Create test rides
    const ride1Id = crypto.randomUUID();
    const ride2Id = crypto.randomUUID();
    const ride3Id = crypto.randomUUID();

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await run(
      `INSERT OR IGNORE INTO rides (id, driverId, origin, destination, fare, seats, capacity, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ride1Id, driver1Id, 'Madina', 'Circle', 5.50, 3, 4, 'available', now.toISOString()]
    );

    await run(
      `INSERT OR IGNORE INTO rides (id, driverId, origin, destination, fare, seats, capacity, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ride2Id, driver2Id, 'Kaneshie', 'Tema Station', 8.00, 2, 5, 'available', now.toISOString()]
    );

    await run(
      `INSERT OR IGNORE INTO rides (id, driverId, origin, destination, fare, seats, capacity, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ride3Id, driver1Id, 'Adenta', 'East Legon', 6.50, 4, 4, 'available', tomorrow.toISOString()]
    );

    console.log('✅ Created 3 test rides');

    // Create test bookings
    const booking1Id = crypto.randomUUID();
    const booking2Id = crypto.randomUUID();

    await run(
      `INSERT OR IGNORE INTO bookings (id, rideId, passengerId, status, createdAt) 
       VALUES (?, ?, ?, ?, ?)`,
      [booking1Id, ride1Id, passenger1Id, 'confirmed', now.toISOString()]
    );

    await run(
      `INSERT OR IGNORE INTO bookings (id, rideId, passengerId, status, createdAt) 
       VALUES (?, ?, ?, ?, ?)`,
      [booking2Id, ride2Id, passenger2Id, 'confirmed', now.toISOString()]
    );

    console.log('✅ Created 2 test bookings');

    // Verify seed data
    const users = await all('SELECT COUNT(*) as count FROM users');
    const drivers = await all('SELECT COUNT(*) as count FROM drivers');
    const rides = await all('SELECT COUNT(*) as count FROM rides');
    const bookings = await all('SELECT COUNT(*) as count FROM bookings');

    console.log('\n📊 Seed Summary:');
    console.log(`   Users: ${users[0]?.count || 0}`);
    console.log(`   Drivers: ${drivers[0]?.count || 0}`);
    console.log(`   Rides: ${rides[0]?.count || 0}`);
    console.log(`   Bookings: ${bookings[0]?.count || 0}`);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('   Passenger 1: passenger1@test.com / password123');
    console.log('   Passenger 2: passenger2@test.com / password123');
    console.log('   Driver 1: driver1@test.com / password123');
    console.log('   Driver 2: driver2@test.com / password123');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

// Run seed if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
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
