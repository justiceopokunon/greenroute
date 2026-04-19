const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db');

const router = express.Router();

// Input validation helper
const validateBookingInput = (rideId, passengerId) => {
  const errors = [];
  if (!rideId || typeof rideId !== 'string' || rideId.trim() === '') {
    errors.push('Valid rideId is required');
  }
  if (!passengerId || typeof passengerId !== 'string' || passengerId.trim() === '') {
    errors.push('Valid passengerId is required');
  }
  return errors;
};

// Passenger: Book a ride
router.post('/create', async (req, res) => {
  try {
    const { rideId, passengerId } = req.body;

    // Validate input
    const validationErrors = validateBookingInput(rideId, passengerId);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    // Check if ride exists and has seats
    const ride = await get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.seats <= 0) {
      return res.status(400).json({ error: 'No seats available for this ride' });
    }

    // Check if passenger exists
    const passenger = await get('SELECT id FROM users WHERE id = ?', [passengerId]);
    if (!passenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    // Check for duplicate booking
    const existingBooking = await get(
      'SELECT id FROM bookings WHERE rideId = ? AND passengerId = ? AND status != ?',
      [rideId, passengerId, 'cancelled']
    );
    if (existingBooking) {
      return res.status(400).json({ error: 'You already have an active booking for this ride' });
    }

    // Create booking
    const bookingId = uuidv4();
    await run(
      'INSERT INTO bookings (id, rideId, passengerId, status) VALUES (?, ?, ?, ?)',
      [bookingId, rideId, passengerId, 'confirmed']
    );

    // Decrement available seats
    await run(
      'UPDATE rides SET seats = seats - 1 WHERE id = ?',
      [rideId]
    );

    res.status(201).json({ 
      id: bookingId, 
      message: 'Booking confirmed successfully',
      rideId,
      passengerId
    });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
  }
});

// Get passenger's bookings
router.get('/passenger/:passengerId', async (req, res) => {
  try {
    const { passengerId } = req.params;
    
    if (!passengerId || typeof passengerId !== 'string') {
      return res.status(400).json({ error: 'Valid passengerId is required' });
    }

    const bookings = await all(`
      SELECT 
        b.id, b.rideId, b.status, b.createdAt,
        r.origin, r.destination, r.fare, r.capacity, r.seats,
        d.vehicleType, d.licensePlate, d.vehicleModel, d.rating,
        u.name as driverName, u.phone as driverPhone
      FROM bookings b
      JOIN rides r ON b.rideId = r.id
      JOIN drivers d ON r.driverId = d.id
      JOIN users u ON d.userId = u.id
      WHERE b.passengerId = ?
      ORDER BY b.createdAt DESC
    `, [passengerId]);

    res.json(bookings || []);
  } catch (err) {
    console.error('Get passenger bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get ride's bookings (for driver)
router.get('/ride/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params;
    
    if (!rideId || typeof rideId !== 'string') {
      return res.status(400).json({ error: 'Valid rideId is required' });
    }

    const bookings = await all(`
      SELECT 
        b.id, b.passengerId, b.status, b.createdAt,
        u.name as passengerName, u.phone as passengerPhone
      FROM bookings b
      JOIN users u ON b.passengerId = u.id
      WHERE b.rideId = ?
      ORDER BY b.createdAt DESC
    `, [rideId]);

    res.json(bookings || []);
  } catch (err) {
    console.error('Get ride bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch ride bookings' });
  }
});

// Cancel booking
router.delete('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    if (!bookingId || typeof bookingId !== 'string') {
      return res.status(400).json({ error: 'Valid bookingId is required' });
    }

    const booking = await get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    await run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', bookingId]);
    await run('UPDATE rides SET seats = seats + 1 WHERE id = ?', [booking.rideId]);

    res.json({ message: 'Booking cancelled successfully', bookingId });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
