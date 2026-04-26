
const API_BASE = '/api';

const api = {
  signup: async (email, password, name, role, phone) => {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role, phone })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  signin: async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  getProfile: async (userId) => {
    const response = await fetch(`${API_BASE}/auth/${userId}`);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Rides
  getAvailableRides: async () => {
    const response = await fetch(`${API_BASE}/rides/available`);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  createRide: async (driverId, origin, destination, fare, seats, capacity) => {
    const response = await fetch(`${API_BASE}/rides/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, origin, destination, fare, seats, capacity })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  getRide: async (rideId) => {
    const response = await fetch(`${API_BASE}/rides/${rideId}`);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  updateDriverLocation: async (driverId, latitude, longitude, isOnline) => {
    const response = await fetch(`${API_BASE}/rides/driver/${driverId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude, isOnline })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  updateRideSeats: async (rideId, availableSeats) => {
    const response = await fetch(`${API_BASE}/rides/${rideId}/seats`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableSeats })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Bookings
  createBooking: async (rideId, passengerId, seats, passengerLat, passengerLon) => {
    const response = await fetch(`${API_BASE}/bookings/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rideId, passengerId, seats, passengerLat, passengerLon })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  bookRide: async (rideId, passengerId, latitude, longitude) => {
    const response = await fetch(`${API_BASE}/bookings/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rideId, passengerId, latitude, longitude })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  getPassengerBookings: async (passengerId) => {
    const response = await fetch(`${API_BASE}/bookings/passenger/${passengerId}`);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  getRideBookings: async (rideId) => {
    const response = await fetch(`${API_BASE}/bookings/ride/${rideId}`);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  cancelBooking: async (bookingId) => {
    const response = await fetch(`${API_BASE}/bookings/${bookingId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Get active booking for passenger
  getActiveBooking: async (passengerId) => {
    try {
      const bookings = await this.getPassengerBookings(passengerId);
      return bookings.find(b => b.status === 'confirmed') || null;
    } catch {
      return null;
    }
  }
};

// Expose API to window global so it can be accessed from other scripts
window.api = api;