const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db');

const router = express.Router();

// Passenger: Book a ride
router.post('/create', async (req, res) => {
  try {
    const { rideId, passengerId } = req.body;

    if (!rideId || !passengerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if ride exists and has seats
    const ride = await get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.seats <= 0) {
      return res.status(400).json({ error: 'No seats available' });
    }

    // Create booking
    const bookingId = uuidv4();
    await run(
      'INSERT INTO bookings (id, rideId, passengerId) VALUES (?, ?, ?)',
      [bookingId, rideId, passengerId]
    );

    // Decrement available seats
    await run(
      'UPDATE rides SET seats = seats - 1 WHERE id = ?',
      [rideId]
    );

    res.status(201).json({ id: bookingId, message: 'Booking confirmed' });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get passenger's bookings
router.get('/passenger/:passengerId', async (req, res) => {
  try {
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
    `, [req.params.passengerId]);

    res.json(bookings);
  } catch (err) {
    console.error('Get passenger bookings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get ride's bookings (for driver)
router.get('/ride/:rideId', async (req, res) => {
  try {
    const bookings = await all(`
      SELECT 
        b.id, b.passengerId, b.status, b.createdAt,
        u.name as passengerName, u.phone as passengerPhone
      FROM bookings b
      JOIN users u ON b.passengerId = u.id
      WHERE b.rideId = ?
    `, [req.params.rideId]);

    res.json(bookings);
  } catch (err) {
    console.error('Get ride bookings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel booking
router.delete('/:bookingId', async (req, res) => {
  try {
    const booking = await get('SELECT * FROM bookings WHERE id = ?', [req.params.bookingId]);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await run('DELETE FROM bookings WHERE id = ?', [req.params.bookingId]);
    await run('UPDATE rides SET seats = seats + 1 WHERE id = ?', [booking.rideId]);

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
