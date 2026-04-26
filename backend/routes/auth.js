const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { run, get } = require('../../db');

const router = express.Router();

const setSessionCookie = (res, sessionId) => {
  const maxAge = 7 * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production';
  const cookie = `sessionId=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${secure ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookie);
};

const clearSessionCookie = (res) => {
  const secure = process.env.NODE_ENV === 'production';
  const cookie = `sessionId=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secure ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookie);
};

const validateSignupInput = (data) => {
  const { email, password, name, phone, role } = data;
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required and must be a string');
  } else if (!email.includes('@')) {
    errors.push('Please provide a valid email address');
  } else if (email.length > 255) {
    errors.push('Email is too long');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required and must be a string');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (password.length > 128) {
    errors.push('Password is too long');
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Name is required');
  } else if (name.length > 100) {
    errors.push('Name is too long');
  }

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    errors.push('Phone number is required');
  } else if (phone.length > 20) {
    errors.push('Phone number is too long');
  }

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
 * Hash password with bcrypt
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Verify password with bcrypt
 */
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Passenger signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    const validation = validateSignupInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const existingUser = await get('SELECT id, role FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      const roleLabel = existingUser.role === 'driver' ? 'driver' : 'passenger';
      return res.status(409).json({
        error: 'Account already exists',
        message: `A ${roleLabel} account with this email already exists. Please sign in or use a different email.`
      });
    }

    const userId = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);

    await run(
      'INSERT INTO users (id, email, password, name, phone, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, email.toLowerCase(), hashedPassword, name.trim(), phone.trim(), role, new Date().toISOString()]
    );

    // Create session
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const sessionData = {
      userId: userId,
      email: email.toLowerCase(),
      name: name,
      role: role,
      createdAt: new Date()
    };
    
    // Store session
    global.sessions = global.sessions || new Map();
    global.sessions.set(sessionId, sessionData);

    setSessionCookie(res, sessionId);

    return res.status(201).json({
      id: userId,
      email: email.toLowerCase(),
      name,
      role,
      sessionId: sessionId,
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
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Create session
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: new Date()
    };
    
    // Store session (in a real app, use Redis or database)
    global.sessions = global.sessions || new Map();
    global.sessions.set(sessionId, sessionData);

    setSessionCookie(res, sessionId);

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      sessionId: sessionId,
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
    const { email, password, name, phone, vehicleType, licensePlate, vehicleModel, driverPhoto } = req.body;

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

    if (!driverPhoto || typeof driverPhoto !== 'string' || !driverPhoto.startsWith('data:image/')) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Driver photo is required and must be a valid image']
      });
    }

    if (driverPhoto.length > 3 * 1024 * 1024) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Driver photo is too large']
      });
    }

    // Check if an account already exists with this email
    const existingUser = await get('SELECT id, role FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      const roleLabel = existingUser.role === 'driver' ? 'driver' : 'passenger';
      return res.status(409).json({
        error: 'Account already exists',
        message: `A ${roleLabel} account with this email already exists. Please sign in or use a different email.`
      });
    }

    // Create driver user and profile
    const userId = crypto.randomUUID();
    const driverId = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);

    // Insert user
    await run(
      'INSERT INTO users (id, email, password, name, phone, role, profilePhoto, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email.toLowerCase(), hashedPassword, name.trim(), phone.trim(), 'driver', driverPhoto, new Date().toISOString()]
    );

    // Insert driver profile
    await run(
      'INSERT INTO drivers (id, userId, vehicleType, licensePlate, vehicleModel, rating, trustScore, isOnline, latitude, longitude, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [driverId, userId, vehicleType.trim(), licensePlate.trim(), vehicleModel?.trim() || '', 5.0, 100, 0, 5.6, -0.2, new Date().toISOString()]
    );

    // Create session
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const sessionData = {
      userId: userId,
      driverId: driverId,
      email: email.toLowerCase(),
      name: name,
      role: 'driver',
      createdAt: new Date()
    };
    
    // Store session
    global.sessions = global.sessions || new Map();
    global.sessions.set(sessionId, sessionData);

    setSessionCookie(res, sessionId);

    return res.status(201).json({
      userId,
      driverId,
      email: email.toLowerCase(),
      name,
      role: 'driver',
      sessionId: sessionId,
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
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Get driver profile
    const driver = await get('SELECT id, vehicleType, licensePlate, vehicleModel FROM drivers WHERE userId = ?', [user.id]);

    // Create session
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const sessionData = {
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
      createdAt: new Date()
    };
    
    // Store session
    global.sessions = global.sessions || new Map();
    global.sessions.set(sessionId, sessionData);

    setSessionCookie(res, sessionId);

    return res.json({
      userId: user.id,
      driverId: driver?.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      sessionId: sessionId,
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

// Sign out endpoint
router.post('/signout', (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId;
  
  if (sessionId && global.sessions) {
    global.sessions.delete(sessionId);
  }

  clearSessionCookie(res);
  
  return res.json({
    message: 'Sign out successful'
  });
});

module.exports = router;