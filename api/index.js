const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Mock data for serverless deployment
const mockUsers = [
  {
    id: 'ca1f1983-a755-4359-8a5d-6699a1988c29',
    email: 'passenger@example.com',
    name: 'Justice Opoku',
    role: 'passenger',
    phone: '1234567890'
  },
  {
    id: 'c260f9d0-228c-4149-9150-ec68dcb9a4ed',
    email: 'driver@example.com',
    name: 'Driver Opoku',
    role: 'driver',
    phone: '0987654321'
  }
];

const mockDrivers = [
  {
    id: 'driver-c260f9d0-228c-4149-9150-ec68dcb9a4ed',
    userId: 'c260f9d0-228c-4149-9150-ec68dcb9a4ed',
    licensePlate: 'GR-214',
    vehicleType: 'trotro',
    capacity: 14,
    status: 'offline'
  }
];

const mockRides = [];

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: 'production',
    platform: 'vercel-serverless'
  });
});

// Mock auth endpoints
app.post('/auth/signup', (req, res) => {
  const { email, password, name, role, phone } = req.body;
  const newUser = {
    id: uuidv4(),
    email,
    name,
    role,
    phone,
    createdAt: new Date().toISOString()
  };
  mockUsers.push(newUser);
  res.json({ 
    id: newUser.id, 
    email: newUser.email, 
    name: newUser.name, 
    role: newUser.role,
    message: 'Account created successfully' 
  });
});

app.post('/auth/signin', (req, res) => {
  const { email, password } = req.body;
  const user = mockUsers.find(u => u.email === email);
  if (user) {
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token: 'mock-token-' + uuidv4()
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/auth/driver-signin', (req, res) => {
  const { email, password } = req.body;
  const user = mockUsers.find(u => u.email === email && u.role === 'driver');
  const driver = mockDrivers.find(d => d.userId === user?.id);
  
  if (user && driver) {
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      driverId: driver.id,
      token: 'mock-token-' + uuidv4()
    });
  } else {
    res.status(401).json({ error: 'Invalid driver credentials' });
  }
});

// Mock ride endpoints
app.get('/rides/available', (req, res) => {
  const availableRides = mockRides.filter(ride => ride.status === 'available');
  res.json(availableRides);
});

app.post('/rides/create', (req, res) => {
  const { driverId, origin, destination, fare, seats, capacity } = req.body;
  const newRide = {
    id: uuidv4(),
    driverId,
    origin,
    destination,
    fare: parseFloat(fare) || 5.50,
    seats: parseInt(seats) || 14,
    capacity: parseInt(capacity) || 14,
    status: 'available',
    createdAt: new Date().toISOString(),
    latitude: 5.550,
    longitude: -0.206
  };
  mockRides.push(newRide);
  res.json(newRide);
});

app.put('/rides/driver/:driverId', (req, res) => {
  const { driverId } = req.params;
  const { latitude, longitude, status } = req.body;
  
  const driver = mockDrivers.find(d => d.id === driverId);
  if (driver) {
    driver.status = status || 'online';
    driver.latitude = latitude;
    driver.longitude = longitude;
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Driver not found' });
  }
});

// Mock booking endpoints
app.post('/bookings/create', (req, res) => {
  const { rideId, passengerId, seats } = req.body;
  const ride = mockRides.find(r => r.id === rideId);
  const passenger = mockUsers.find(u => u.id === passengerId);
  
  if (!ride || !passenger) {
    return res.status(404).json({ error: 'Ride or passenger not found' });
  }
  
  if (ride.seats < seats) {
    return res.status(400).json({ error: 'Not enough seats available' });
  }
  
  const booking = {
    id: uuidv4(),
    rideId,
    passengerId,
    seats,
    status: 'confirmed',
    fare: ride.fare * seats,
    createdAt: new Date().toISOString()
  };
  
  ride.seats -= seats;
  if (ride.seats === 0) {
    ride.status = 'full';
  }
  
  res.json(booking);
});

app.get('/bookings/passenger/:passengerId', (req, res) => {
  const { passengerId } = req.params;
  const bookings = mockRides.filter(ride => 
    ride.bookings && ride.bookings.some(b => b.passengerId === passengerId)
  );
  res.json(bookings);
});

// Export for Vercel
module.exports = app;
