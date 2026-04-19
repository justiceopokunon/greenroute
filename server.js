const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const bookingRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://greenroute.com'] 
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Initialize database
try {
  initDB();
} catch (err) {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve frontend files with proper caching
const htmlFiles = ['index', 'code', 'driver', 'signin', 'signup', 'driver-signin', 'driver-signup'];
htmlFiles.forEach(file => {
  app.get(`/${file}`, (req, res) => {
    res.sendFile(path.join(__dirname, `${file}.html`));
  });
});

// Root redirect
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful startup
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
