const express = require('express');
const { run, get, all } = require('../../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory store for driver trackers
const driverTrackers = new Map();

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
        u.name as driverName, u.phone as driverPhone, u.profilePhoto as driverPhoto
      FROM rides r
      JOIN drivers d ON r.driverId = d.id
      JOIN users u ON d.userId = u.id
      WHERE r.status = 'available' AND r.seats > 0
      ORDER BY r.createdAt DESC
      LIMIT 50
    `);

    // Inject tracker count for each ride
    const ridesWithTrackers = (rides || []).map(ride => ({
      ...ride,
      trackerCount: driverTrackers.has(ride.driverId) ? driverTrackers.get(ride.driverId).size : 0
    }));

    return res.json(ridesWithTrackers);
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

    // Validate isOnline parameter
    if (isOnline !== undefined && typeof isOnline !== 'boolean' && isOnline !== 'true' && isOnline !== 'false') {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['isOnline must be a boolean value']
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
        u.name as driverName, u.phone as driverPhone, u.profilePhoto as driverPhoto
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
      WHERE driverId = ? AND status IN ('available', 'in-transit')
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

// Update ride seats
router.put('/:rideId/seats', async (req, res) => {
  try {
    const { rideId } = req.params;
    const { availableSeats, capacity } = req.body;

    if (!validateRideId(rideId)) {
      return res.status(400).json({
        error: 'Invalid ride ID',
        message: 'Ride ID must be a non-empty string'
      });
    }

    // Check if ride exists
    const ride = await get('SELECT id, capacity, seats FROM rides WHERE id = ?', [rideId]);
    if (!ride) {
      return res.status(404).json({
        error: 'Ride not found',
        message: 'The specified ride does not exist'
      });
    }

    let newSeats = availableSeats !== undefined ? Number(availableSeats) : ride.seats;
    let newCapacity = capacity !== undefined ? Number(capacity) : ride.capacity;

    if (newCapacity < 1 || newCapacity > 100) {
      return res.status(400).json({ error: 'Invalid capacity', message: 'Capacity must be between 1 and 100' });
    }

    if (newSeats > newCapacity) {
      return res.status(400).json({
        error: 'Invalid seats number',
        message: 'Available seats cannot exceed total capacity'
      });
    }

    await run('UPDATE rides SET seats = ?, capacity = ? WHERE id = ?', [newSeats, newCapacity, rideId]);

    return res.json({
      message: 'Ride seats and capacity updated successfully',
      availableSeats: newSeats,
      capacity: newCapacity
    });
  } catch (err) {
    console.error('Update ride seats error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to update ride seats'
    });
  }
});

// Get driver profile (joined with user)
router.get('/driver/:driverId/profile', async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!driverId || typeof driverId !== 'string' || driverId.trim() === '') {
      return res.status(400).json({ error: 'Invalid driver ID', message: 'Driver ID must be a non-empty string' });
    }

    const profile = await get(`
      SELECT d.id, d.userId, d.vehicleType, d.licensePlate, d.vehicleModel, d.rating, d.trustScore, d.isOnline, d.latitude, d.longitude,
             u.name, u.email, u.phone, u.profilePhoto
      FROM drivers d
      JOIN users u ON d.userId = u.id
      WHERE d.id = ?
    `, [driverId]);

    if (!profile) {
      return res.status(404).json({ error: 'Driver not found', message: 'The specified driver does not exist' });
    }

    return res.json(profile);
  } catch (err) {
    console.error('Get driver profile error:', err);
    return res.status(500).json({ error: 'Server error', message: 'Failed to fetch driver profile' });
  }
});

// In-memory tracking store: { driverId: Map<passengerId, {lat, lng, lastSeen}> }
// Passenger: Start tracking a driver
router.post('/driver/:driverId/track-start', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { passengerId, latitude, longitude, destination, name, photo } = req.body;

    if (!driverId || typeof driverId !== 'string' || driverId.trim() === '') {
      return res.status(400).json({ error: 'Invalid driver ID', message: 'Driver ID must be a non-empty string' });
    }

    if (!passengerId || typeof passengerId !== 'string' || passengerId.trim() === '') {
      return res.status(400).json({ error: 'Invalid passenger ID', message: 'Passenger ID must be a non-empty string' });
    }

    // Verify driver exists
    const driver = await get('SELECT id FROM drivers WHERE id = ?', [driverId]);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found', message: 'The specified driver does not exist' });
    }

    // Initialize tracker map if not exists
    if (!driverTrackers.has(driverId)) {
      driverTrackers.set(driverId, new Map());
    }

    // Add/Update passenger in tracking map
    if (latitude && longitude) {
      driverTrackers.get(driverId).set(passengerId, {
        id: passengerId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        destination: destination || 'Unknown destination',
        name: name || 'Passenger',
        photo: photo || '../assets/default-passenger.svg',
        lastSeen: Date.now()
      });
    }

    return res.json({
      success: true,
      message: 'Started tracking driver',
      trackingCount: driverTrackers.get(driverId).size
    });
  } catch (err) {
    console.error('Start tracking error:', err);
    return res.status(500).json({ error: 'Server error', message: 'Failed to start tracking' });
  }
});

// Passenger: Stop tracking a driver
router.post('/driver/:driverId/track-stop', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { passengerId } = req.body;

    if (!driverId || typeof driverId !== 'string' || driverId.trim() === '') {
      return res.status(400).json({ error: 'Invalid driver ID', message: 'Driver ID must be a non-empty string' });
    }

    if (!passengerId || typeof passengerId !== 'string' || passengerId.trim() === '') {
      return res.status(400).json({ error: 'Invalid passenger ID', message: 'Passenger ID must be a non-empty string' });
    }

    // Remove passenger from tracking set
    if (driverTrackers.has(driverId)) {
      driverTrackers.get(driverId).delete(passengerId);

      // Clean up empty sets
      if (driverTrackers.get(driverId).size === 0) {
        driverTrackers.delete(driverId);
      }
    }

    return res.json({
      success: true,
      message: 'Stopped tracking driver',
      trackingCount: driverTrackers.has(driverId) ? driverTrackers.get(driverId).size : 0
    });
  } catch (err) {
    console.error('Stop tracking error:', err);
    return res.status(500).json({ error: 'Server error', message: 'Failed to stop tracking' });
  }
});

// Driver: Get full tracking details (locations)
router.get('/driver/:driverId/trackers', async (req, res) => {
  try {
    const { driverId } = req.params;
    
    // Cleanup old trackers (older than 2 minutes)
    if (driverTrackers.has(driverId)) {
      const trackers = driverTrackers.get(driverId);
      const now = Date.now();
      for (const [id, data] of trackers.entries()) {
        if (now - data.lastSeen > 120000) {
          trackers.delete(id);
        }
      }
    }

    const trackersMap = driverTrackers.get(driverId) || new Map();
    const trackersList = Array.from(trackersMap.values());

    return res.json({
      success: true,
      count: trackersList.length,
      trackers: trackersList
    });
  } catch (err) {
    console.error('Get trackers error:', err);
    return res.status(500).json({ error: 'Server error', message: 'Failed to fetch trackers' });
  }
});

module.exports = router;