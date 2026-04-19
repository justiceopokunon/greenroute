const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db');

const router = express.Router();

/**
 * Validate ride creation input
 */
const validateRideInput = (data) => {
  const { driverId, origin, destination, fare, seats, capacity } = data;
  const errors = [];

  if (!driverId || typeof driverId !== 'string' || driverId.trim() === '') {
    errors.push('Driver ID is required');
  }

  if (!origin || typeof origin !== 'string' || origin.trim() === '') {
    errors.push('Origin is required');
  } else if (origin.length > 200) {
    errors.push('Origin is too long');
  }

  if (!destination || typeof destination !== 'string' || destination.trim() === '') {
    errors.push('Destination is required');
  } else if (destination.length > 200) {
    errors.push('Destination is too long');
  }

  if (fare === undefined || fare === null) {
    errors.push('Fare is required');
  } else {
    const fareNum = Number(fare);
    if (isNaN(fareNum) || fareNum < 0) {
      errors.push('Fare must be a valid non-negative number');
    } else if (fareNum > 10000) {
      errors.push('Fare seems too high');
    }
  }

  if (seats === undefined || seats === null) {
    errors.push('Available seats is required');
  } else {
    const seatsNum = Number(seats);
    if (!Number.isInteger(seatsNum) || seatsNum < 0 || seatsNum > 100) {
      errors.push('Available seats must be an integer between 0 and 100');
    }
  }

  if (capacity === undefined || capacity === null) {
    errors.push('Total capacity is required');
  } else {
    const capacityNum = Number(capacity);
    if (!Number.isInteger(capacityNum) || capacityNum < 1 || capacityNum > 100) {
      errors.push('Capacity must be an integer between 1 and 100');
    }
  }

  // Ensure seats don't exceed capacity
  if (seats !== undefined && capacity !== undefined) {
    if (Number(seats) > Number(capacity)) {
      errors.push('Available seats cannot exceed total capacity');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate ride ID parameter
 */
const validateRideId = (rideId) => {
  return rideId && typeof rideId === 'string' && rideId.trim() !== '';
};

// Driver: Create a new ride
router.post('/create', async (req, res) => {
  try {
    const validation = validateRideInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const { driverId, origin, destination, fare, seats, capacity } = req.body;

    // Verify driver exists
    const driver = await get('SELECT id FROM drivers WHERE id = ?', [driverId]);
    if (!driver) {
      return res.status(404).json({
        error: 'Driver not found',
        message: 'The specified driver does not exist'
      });
    }

    const rideId = uuidv4();
    await run(
      'INSERT INTO rides (id, driverId, origin, destination, fare, seats, capacity, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [rideId, driverId, origin.trim(), destination.trim(), parseFloat(fare), parseInt(seats), parseInt(capacity), 'available', new Date().toISOString()]
    );

    return res.status(201).json({
      id: rideId,
      message: 'Ride created successfully'
    });
  } catch (err) {
    console.error('Create ride error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to create ride'
    });
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
      LIMIT 50
    `);

    return res.json(rides || []);
  } catch (err) {
    console.error('Get available rides error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch available rides'
    });
  }
});

// Driver: Update driver location and status
router.put('/driver/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { latitude, longitude, isOnline } = req.body;

    if (!driverId || typeof driverId !== 'string' || driverId.trim() === '') {
      return res.status(400).json({
        error: 'Invalid driver ID',
        message: 'Driver ID must be a non-empty string'
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Latitude and longitude are required']
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Latitude and longitude must be valid numbers']
      });
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Latitude must be between -90 and 90, longitude between -180 and 180']
      });
    }

    // Verify driver exists
    const driver = await get('SELECT id FROM drivers WHERE id = ?', [driverId]);
    if (!driver) {
      return res.status(404).json({
        error: 'Driver not found',
        message: 'The specified driver does not exist'
      });
    }

    await run(
      'UPDATE drivers SET latitude = ?, longitude = ?, isOnline = ?, updatedAt = ? WHERE id = ?',
      [lat, lon, isOnline ? 1 : 0, new Date().toISOString(), driverId]
    );

    return res.json({ message: 'Driver status updated successfully' });
  } catch (err) {
    console.error('Update driver error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to update driver status'
    });
  }
});

// Get ride details with full information
router.get('/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params;

    if (!validateRideId(rideId)) {
      return res.status(400).json({
        error: 'Invalid ride ID',
        message: 'Ride ID must be a non-empty string'
      });
    }

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
    `, [rideId]);

    if (!ride) {
      return res.status(404).json({
        error: 'Ride not found',
        message: 'The specified ride does not exist'
      });
    }

    return res.json(ride);
  } catch (err) {
    console.error('Get ride error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch ride details'
    });
  }
});

// Get rides by driver
router.get('/driver/:driverId/active', async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId || typeof driverId !== 'string' || driverId.trim() === '') {
      return res.status(400).json({
        error: 'Invalid driver ID',
        message: 'Driver ID must be a non-empty string'
      });
    }

    const rides = await all(`
      SELECT id, origin, destination, fare, seats, capacity, status, createdAt
      FROM rides
      WHERE driverId = ? AND status IN ('available', 'in-progress')
      ORDER BY createdAt DESC
    `, [driverId]);

    return res.json(rides || []);
  } catch (err) {
    console.error('Get driver rides error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch driver rides'
    });
  }
});

module.exports = router;
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
