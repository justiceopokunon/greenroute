const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { run, get } = require('../db');

const router = express.Router();

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role, phone } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['passenger', 'driver'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    await run(
      'INSERT INTO users (id, email, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, name, role, phone || null]
    );

    // If driver, create driver profile
    if (role === 'driver') {
      const driverId = uuidv4();
      await run(
        'INSERT INTO drivers (id, userId) VALUES (?, ?)',
        [driverId, userId]
      );
    }

    res.status(201).json({
      id: userId,
      email,
      name,
      role,
      message: 'Account created successfully'
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sign in
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get driver info if applicable
    let driverInfo = null;
    if (user.role === 'driver') {
      driverInfo = await get('SELECT * FROM drivers WHERE userId = ?', [user.id]);
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      driver: driverInfo
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.params.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let driverInfo = null;
    if (user.role === 'driver') {
      driverInfo = await get('SELECT * FROM drivers WHERE userId = ?', [user.id]);
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      driver: driverInfo
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
