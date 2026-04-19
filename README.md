# Green Route

A rideshare app where passengers can request rides and drivers can pick them up. Built with vanilla JavaScript and designed to work seamlessly on desktop and mobile.

## What's Included

- Separate sign up and sign in flows for passengers and drivers
- Light and dark theme toggle (your choice saves across sessions)
- Works on mobile and desktop
- Trip tracking so you know where your ride is
- Real-time dispatch queue for drivers
- Uses localStorage to keep your session and preferences

## Project Structure

```
green-route/
├── index.html           # Landing page
├── signin.html          # Passenger sign in
├── signup.html          # Passenger sign up
├── code.html            # Passenger app interface
├── driver-signin.html   # Driver sign in
├── driver-signup.html   # Driver sign up
├── driver.html          # Driver app interface
├── app.js               # Main application logic (vanilla JS)
├── app.css              # Shared styles
├── package.json         # Project metadata and scripts
├── LICENSE              # MIT License
└── README.md            # This file
```

## Getting Started

Need to run this locally? You'll need Node.js installed (v16+).

1. Install dependencies:
```bash
npm install
```

2. Start the server (port 3000 by default):
```bash
npm run dev
```

Then open `http://localhost:3000` in your browser. To run on a different port:
```bash
PORT=8000 npm start
```

## How It Works

**Passengers** start at the home page, sign up or log in, then can book rides.

**Drivers** go to the driver app, create an account, and manage ride requests from their dashboard.

Theme preference and user info get saved to localStorage, so you'll stay logged in and keep your theme choice.

## Development

This runs Node.js/Express on the backend with SQLite for the database. The frontend is vanilla JavaScript.

**Backend**:
- Express server handles API routes
- SQLite stores users, rides, and bookings
- Endpoints in `/routes/` directory (auth, rides, bookings)
- Password hashing with bcryptjs

**Frontend**:
- Vanilla JS in `app.js` and individual HTML pages
- Calls API at `http://localhost:3000/api/*`
- LocalStorage manages theme and session preferences
- Real-time driver tracking with Leaflet + OpenStreetMap (`tracking.js`)

**Live Driver Tracking**:
- Shows driver location on interactive map (completely FREE, no API key needed!)
- Uses OpenStreetMap tiles powered by Leaflet
- Displays ETA and real-time distance
- Driver info card with name, vehicle, and contact options
- Auto-refreshes every 3 seconds
- Works offline after first load

Running `npm test` will run smoke tests if you've set those up.

## Scripts

- `npm run dev` - Starts server on port 3000
- `npm start` - Starts server on port 8000
- `npm test` - Runs smoke tests

## Browser Support

Works on modern browsers—Chrome, Firefox, Safari, Edge.

## License

MIT. See [LICENSE](LICENSE) for details.
