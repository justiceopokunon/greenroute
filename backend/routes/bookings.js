const express = require('express');
const { run, get, all, transaction } = require('../../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

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

router.post('/create', async (req, res) => {
  try {
    const { rideId, passengerId, seats = 1, passengerLat, passengerLon } = req.body;

    const validationErrors = validateBookingInput(rideId, passengerId);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    // Validate seats
    const seatsNum = Number(seats);
    if (!Number.isInteger(seatsNum) || seatsNum < 1 || seatsNum > 10) {
      return res.status(400).json({ error: 'Invalid seats number', details: ['Seats must be between 1 and 10'] });
    }

    // Check if ride exists and has seats
    const ride = await get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.seats < seatsNum) {
      return res.status(400).json({ error: 'Not enough seats available', details: [`Only ${ride.seats} seats available`] });
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

    // Calculate total fare
    const totalFare = ride.fare * seatsNum;

    // Create booking with fare information using transaction
    const bookingId = uuidv4();
    await transaction([
      {
        sql: 'INSERT INTO bookings (id, rideId, passengerId, status, passengerLat, passengerLon, fare, seats) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        params: [bookingId, rideId, passengerId, 'confirmed', passengerLat || null, passengerLon || null, totalFare, seatsNum]
      },
      {
        sql: 'UPDATE rides SET seats = seats - ? WHERE id = ? AND seats >= ?',
        params: [seatsNum, rideId, seatsNum]
      }
    ]);

    // Get driver details for the response
    const driverDetails = await get(`
      SELECT u.name as driverName, u.profilePhoto as driverPhoto, d.licensePlate 
      FROM drivers d 
      JOIN users u ON d.userId = u.id 
      WHERE d.id = ?
    `, [ride.driverId]);

    res.status(201).json({ 
      id: bookingId, 
      message: 'Booking confirmed successfully',
      rideId,
      passengerId,
      fare: totalFare,
      seats: seatsNum,
      driverName: driverDetails?.driverName || 'Driver',
      driverPhoto: driverDetails?.driverPhoto || null,
      licensePlate: driverDetails?.licensePlate || 'N/A'
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
        b.id, b.rideId, b.status, b.createdAt, b.fare as bookingFare, b.seats as bookingSeats,
        r.origin, r.destination, r.fare as rideFare, r.capacity, r.seats as availableSeats,
        d.vehicleType, d.licensePlate, d.vehicleModel, d.rating,
        u.name as driverName, u.phone as driverPhone, u.profilePhoto as driverPhoto
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
        b.id, b.passengerId, b.status, b.createdAt, b.passengerLat, b.passengerLon,
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
    await run('UPDATE rides SET seats = seats + ? WHERE id = ?', [booking.seats || 1, booking.rideId]);

    res.json({ message: 'Booking cancelled successfully', bookingId });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;