const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { initDB } = require('./db');
const authRoutes = require('./backend/routes/auth');
const rideRoutes = require('./backend/routes/rides');
const bookingRoutes = require('./backend/routes/bookings');

const app = express();
const PORT = process.env.PORT || 3000;

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://greenroute.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:5500'],
  credentials: true
}));

// Middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Frontend routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/html/index.html'));
});

app.get('/code', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/html/code.html'));
});

app.get('/driver', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/html/driver.html'));
});

app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/html/signin.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/html/signup.html'));
});

app.get('/driver-signin', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/html/driver-signin.html'));
});

app.get('/driver-signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/html/driver-signup.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
  try {
    await initDB();
    console.log(`Server running on port ${PORT}`);
    app.listen(PORT, () => {
      console.log(`Green Route ready at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
