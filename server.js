const cors = require('cors');
const express = require('express');
const path = require('path');
const { initDB } = require('./db');

// Import routes
const authRoutes = require('./backend/routes/auth');
const rideRoutes = require('./backend/routes/rides');
const bookingRoutes = require('./backend/routes/bookings');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://greenroute.com']
    : ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve JS files from root directory
app.get('/road-routing.js', (req, res) => {
  const filePath = path.join(__dirname, 'road-routing.js');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving road-routing.js:', err);
      res.status(404).json({ error: 'road-routing.js not found' });
    }
  });
});

app.get('/api.js', (req, res) => {
  const filePath = path.join(__dirname, 'api.js');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving api.js:', err);
      res.status(404).json({ error: 'api.js not found' });
    }
  });
});

app.get('/app.js', (req, res) => {
  const filePath = path.join(__dirname, 'app.js');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving app.js:', err);
      res.status(404).json({ error: 'app.js not found' });
    }
  });
});

app.get('/road-routing.js', (req, res) => {
  const filePath = path.join(__dirname, 'road-routing.js');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving road-routing.js:', err);
      res.status(404).json({ error: 'road-routing.js not found' });
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);


// Serve frontend files
const htmlFiles = ['index', 'code', 'driver', 'signin', 'signup', 'driver-signin', 'driver-signup'];
htmlFiles.forEach(file => {
  app.get('/' + file, (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/html', file + '.html'));
  });
  app.get('/' + file + '.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/html', file + '.html'));
  });
});

// Root redirect
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/html/index.html'));
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

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting GreenRoute server...');
    
    // Initialize database with better error handling
    console.log('📊 Initializing database...');
    try {
      await initDB();
      console.log('✅ Database initialized successfully');
    } catch (dbError) {
      console.warn('⚠️  Database initialization failed:', dbError.message);
      console.log('🔄 Continuing server startup without database...');
    }
    
    const server = app.listen(PORT, () => {
      console.log(`🌐 Server running on http://localhost:${PORT}`);
      console.log(`📍 Frontend: http://localhost:${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log('');
      console.log('🎯 GreenRoute is ready!');
    });

    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please kill the process or use a different port.`);
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});
