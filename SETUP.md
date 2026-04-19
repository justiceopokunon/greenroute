# Green Route MVP Setup Guide

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Seed the database with sample data** (optional but recommended):
   ```bash
   node seed.js
   ```

3. **Start the server**:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Test Accounts

### Drivers
- **Email**: kwame@greenroute.com
- **Password**: password123

- **Email**: yaw@greenroute.com
- **Password**: password123

### Create a Passenger Account
Go to the sign-up page and create a new passenger account.

## Live Driver Tracking (Already Included!)

Real-time live tracking with interactive maps is **already included and working** - no setup needed!

- Driver location appears on a live OpenStreetMap (free, no API key required)
- ETA and distance updates every 3 seconds
- Powered by Leaflet (lightweight, open-source)
- Works immediately after booking a ride

See [GOOGLE_MAPS_SETUP.md](GOOGLE_MAPS_SETUP.md) or [TRACKING.md](TRACKING.md) for details.

## What's Working

✅ User authentication (sign up and sign in for passengers and drivers)
✅ View available rides
✅ Book a ride (passengers)
✅ Create rides (drivers)
✅ Real-time driver location tracking with Google Maps
✅ Live ETA and distance calculations
✅ Driver info display with contact options
✅ Ride booking management

## API Endpoints

All endpoints are prefixed with `/api/`

### Authentication
- `POST /auth/signup` - Create account
- `POST /auth/signin` - Sign in
- `GET /auth/:userId` - Get user profile

### Rides
- `GET /rides/available` - List available rides
- `POST /rides/create` - Create a new ride (drivers)
- `GET /rides/:rideId` - Get ride details
- `PUT /rides/driver/:driverId` - Update driver location

### Bookings
- `POST /bookings/create` - Book a ride
- `GET /bookings/passenger/:passengerId` - Get passenger's bookings
- `GET /bookings/ride/:rideId` - Get ride's passengers
- `DELETE /bookings/:bookingId` - Cancel booking

## Database

The app uses SQLite (`greenroute.db`) which is created automatically on first run.

**Tables**:
- `users` - All users (passengers and drivers)
- `drivers` - Driver-specific info
- `rides` - Available rides
- `bookings` - Ride bookings

## Development Notes

- Backend: Node.js + Express + SQLite
- Frontend: Vanilla JavaScript + HTML + CSS
- Password hashing: bcryptjs
- Database: SQLite (local file-based)

To reset the database:
```bash
rm greenroute.db
npm run dev
node seed.js
```
