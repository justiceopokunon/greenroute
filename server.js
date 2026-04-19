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
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize database
initDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);

// Catch-all for serving frontend files
app.get('/:page', (req, res) => {
  const page = req.params.page;
  res.sendFile(path.join(__dirname, `${page}.html`));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
