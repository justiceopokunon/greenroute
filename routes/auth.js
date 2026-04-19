const express = require('express');
const { run, get } = require('../db');
const crypto = require('crypto');

const router = express.Router();

/**
 * Validate signup input
 */
const validateSignupInput = (data) => {
  const { email, password, name, phone, role } = data;
  const errors = [];

  // Validate email
  if (!email || typeof email !== 'string') {
    errors.push('Email is required and must be a string');
  } else if (!email.includes('@')) {
    errors.push('Please provide a valid email address');
  } else if (email.length > 255) {
    errors.push('Email is too long');
  }

  // Validate password
  if (!password || typeof password !== 'string') {
    errors.push('Password is required and must be a string');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (password.length > 128) {
    errors.push('Password is too long');
  }

  // Validate name
  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Name is required');
  } else if (name.length > 100) {
    errors.push('Name is too long');
  }

  // Validate phone
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    errors.push('Phone number is required');
  } else if (phone.length > 20) {
    errors.push('Phone number is too long');
  }

  // Validate role
  if (!role || !['passenger', 'driver'].includes(role)) {
    errors.push('Role must be either "passenger" or "driver"');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate signin input
 */
const validateSigninInput = (email, password) => {
  const errors = [];

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    errors.push('Please provide a valid email address');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Hash password with salt
 */
const hashPassword = (password) => {
  return crypto
    .createHash('sha256')
    .update(password + process.env.PASSWORD_SALT || 'greenroute-salt')
    .digest('hex');
};

// Passenger signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    // Validate input
    const validation = validateSignupInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    // Check if user already exists
    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Create user
    const userId = crypto.randomUUID();
    const hashedPassword = hashPassword(password);

    await run(
      'INSERT INTO users (id, email, password, name, phone, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, email.toLowerCase(), hashedPassword, name.trim(), phone.trim(), role, new Date().toISOString()]
    );

    return res.status(201).json({
      id: userId,
      email: email.toLowerCase(),
      name,
      role,
      message: 'Account created successfully'
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to create account'
    });
  }
});

// Passenger signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    const validation = validateSigninInput(email, password);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    // Find user
    const user = await get(
      'SELECT id, email, password, name, phone, role FROM users WHERE email = ? AND role = ?',
      [email.toLowerCase(), 'passenger']
    );

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      message: 'Sign in successful'
    });
  } catch (err) {
    console.error('Signin error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to sign in'
    });
  }
});

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'User ID must be a non-empty string'
      });
    }

    const user = await get(
      'SELECT id, email, name, phone, role, createdAt FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with this ID'
      });
    }

    return res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch user profile'
    });
  }
});

// Driver signup
router.post('/driver-signup', async (req, res) => {
  try {
    const { email, password, name, phone, vehicleType, licensePlate, vehicleModel } = req.body;

    // Validate input
    const validation = validateSignupInput({
      email,
      password,
      name,
      phone,
      role: 'driver'
    });

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    // Validate vehicle details
    if (!vehicleType || typeof vehicleType !== 'string' || vehicleType.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Vehicle type is required']
      });
    }

    if (!licensePlate || typeof licensePlate !== 'string' || licensePlate.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['License plate is required']
      });
    }

    // Check if driver already exists
    const existingDriver = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingDriver) {
      return res.status(409).json({
        error: 'Driver account already exists',
        message: 'An account with this email already exists'
      });
    }

    // Create driver user and profile
    const userId = crypto.randomUUID();
    const driverId = crypto.randomUUID();
    const hashedPassword = hashPassword(password);

    // Insert user
    await run(
      'INSERT INTO users (id, email, password, name, phone, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, email.toLowerCase(), hashedPassword, name.trim(), phone.trim(), 'driver', new Date().toISOString()]
    );

    // Insert driver profile
    await run(
      'INSERT INTO drivers (id, userId, vehicleType, licensePlate, vehicleModel, rating, trustScore, isOnline, latitude, longitude, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [driverId, userId, vehicleType.trim(), licensePlate.trim(), vehicleModel?.trim() || '', 5.0, 100, 0, 5.6, -0.2, new Date().toISOString()]
    );

    return res.status(201).json({
      userId,
      driverId,
      email: email.toLowerCase(),
      name,
      role: 'driver',
      message: 'Driver account created successfully'
    });
  } catch (err) {
    console.error('Driver signup error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to create driver account'
    });
  }
});

// Driver signin
router.post('/driver-signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    const validation = validateSigninInput(email, password);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    // Find driver user
    const user = await get(
      'SELECT id, email, password, name, phone, role FROM users WHERE email = ? AND role = ?',
      [email.toLowerCase(), 'driver']
    );

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Get driver profile
    const driver = await get('SELECT id, vehicleType, licensePlate, vehicleModel FROM drivers WHERE userId = ?', [user.id]);

    return res.json({
      userId: user.id,
      driverId: driver?.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      vehicle: driver ? {
        type: driver.vehicleType,
        licensePlate: driver.licensePlate,
        model: driver.vehicleModel
      } : null,
      message: 'Driver sign in successful'
    });
  } catch (err) {
    console.error('Driver signin error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Failed to sign in'
    });
  }
});

module.exports = router;
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
