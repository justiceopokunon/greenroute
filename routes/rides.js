const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db');

const router = express.Router();

// Driver: Create a new ride
router.post('/create', async (req, res) => {
  try {
    const { driverId, origin, destination, fare, seats, capacity } = req.body;

    if (!driverId || !origin || !destination || !fare || !seats || !capacity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const rideId = uuidv4();
    await run(
      'INSERT INTO rides (id, driverId, origin, destination, fare, seats, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [rideId, driverId, origin, destination, fare, seats, capacity]
    );

    res.status(201).json({ id: rideId, message: 'Ride created' });
  } catch (err) {
    console.error('Create ride error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Passenger: Get available rides
router.get('/available', async (req, res) => {
  try {
    const rides = await all(`
      SELECT 
        r.id, r.driverId, r.origin, r.destination, r.fare, r.seats, r.capacity,
        r.status, r.createdAt,
        d.vehicleType, d.licensePlate, d.vehicleModel, d.rating, d.trustScore,
        d.latitude, d.longitude,
        u.name as driverName, u.phone as driverPhone
      FROM rides r
      JOIN drivers d ON r.driverId = d.id
      JOIN users u ON d.userId = u.id
      WHERE r.status = 'available' AND r.seats > 0
      ORDER BY r.createdAt DESC
    `);

    res.json(rides);
  } catch (err) {
    console.error('Get available rides error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Driver: Update driver location and status
router.put('/driver/:driverId', async (req, res) => {
  try {
    const { latitude, longitude, isOnline } = req.body;
    const { driverId } = req.params;

    await run(
      'UPDATE drivers SET latitude = ?, longitude = ?, isOnline = ? WHERE id = ?',
      [latitude, longitude, isOnline ? 1 : 0, driverId]
    );

    res.json({ message: 'Driver status updated' });
  } catch (err) {
    console.error('Update driver error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get ride details
router.get('/:rideId', async (req, res) => {
  try {
    const ride = await get(`
      SELECT 
        r.id, r.driverId, r.origin, r.destination, r.fare, r.seats, r.capacity,
        r.status, r.createdAt,
        d.vehicleType, d.licensePlate, d.vehicleModel, d.rating, d.trustScore,
        d.latitude, d.longitude,
        u.name as driverName, u.phone as driverPhone
      FROM rides r
      JOIN drivers d ON r.driverId = d.id
      JOIN users u ON d.userId = u.id
      WHERE r.id = ?
    `, [req.params.rideId]);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    res.json(ride);
  } catch (err) {
    console.error('Get ride error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
