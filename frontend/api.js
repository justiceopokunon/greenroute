
const API_BASE = '/api';

// Session management
let currentSessionId = null;

const api = {
  signup: async (email, password, name, role, phone) => {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role, phone })
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    if (data.sessionId) {
      currentSessionId = data.sessionId;
      localStorage.setItem('sessionId', data.sessionId);
    }
    return data;
  },

  signin: async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    if (data.sessionId) {
      currentSessionId = data.sessionId;
      localStorage.setItem('sessionId', data.sessionId);
    }
    return data;
  },

  getProfile: async (userId) => {
    const response = await fetch(`${API_BASE}/auth/${userId}`);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Rides
  getAvailableRides: async () => {
    const response = await fetch(`${API_BASE}/rides/available`, addSessionHeader());
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  createRide: async (driverId, origin, destination, fare, seats, capacity) => {
    const response = await fetch(`${API_BASE}/rides/create`, {
      method: 'POST',
      headers: addSessionHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ driverId, origin, destination, fare, seats, capacity })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  getRide: async (rideId) => {
    const response = await fetch(`${API_BASE}/rides/${rideId}`, addSessionHeader());
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  updateDriverLocation: async (driverId, latitude, longitude, isOnline) => {
    const response = await fetch(`${API_BASE}/rides/driver/${driverId}`, {
      method: 'PUT',
      headers: addSessionHeader({ 'Content-Type': 'application/json' }),
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
      const bookings = await api.getPassengerBookings(passengerId);
      return bookings.find(b => b.status === 'confirmed') || null;
    } catch {
      return null;
    }
  },

  // Sign out
  signout: async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/signout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-id': currentSessionId
        }
      });
      if (!response.ok) throw new Error(await response.text());
      currentSessionId = null;
      localStorage.removeItem('sessionId');
      localStorage.removeItem('passengerId');
      localStorage.removeItem('driverId');
      return response.json();
    } catch {
      return null;
    }
  }
};

// Initialize session from localStorage
currentSessionId = localStorage.getItem('sessionId');


// Helper function to add session header to fetch options
const addSessionHeader = (options = {}) => {
  if (currentSessionId) {
    options.headers = {
      ...options.headers,
      'x-session-id': currentSessionId
    };
  }
  return options;
};

// Update all API calls to include session header
Object.keys(api).forEach(key => {
  if (typeof api[key] === 'function' && key !== 'signout') {
    const originalMethod = api[key];
    api[key] = async (...args) => {
      // Add session header to fetch calls
      if (args.length > 0 && typeof args[0] === 'object' && args[0].url) {
        args[0] = addSessionHeader(args[0]);
      } else if (typeof args[0] === 'string' && args[0].startsWith(API_BASE)) {
        // For calls like fetch(url, options)
        const urlIndex = args.findIndex(arg => typeof arg === 'string' && arg.startsWith(API_BASE));
        const optionsIndex = urlIndex + 1;
        if (args[optionsIndex]) {
          args[optionsIndex] = addSessionHeader(args[optionsIndex]);
        }
      }
      return originalMethod(...args);
    };
  }
});

// Expose API to window global so it can be accessed from other scripts
window.api = api;