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

Need to run this locally? You'll need Python 3.x since we're using Python's built-in HTTP server.

Clone the repo and start the dev server on port 3000:

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser. If you want to run it on 8000 instead:

```bash
npm start
```

## How It Works

**Passengers** start at the home page, sign up or log in, then can book rides.

**Drivers** go to the driver app, create an account, and manage ride requests from their dashboard.

Theme preference and user info get saved to localStorage, so you'll stay logged in and keep your theme choice.

## Development

This is vanilla JavaScript—no frameworks, no build tools. Just HTML, CSS, and JS. The whole state management runs through localStorage.

The main logic is in `app.js` and styles are in `app.css`. Each page is its own HTML file (`index.html`, `signin.html`, `code.html`, etc.).

Running `npm test` will execute smoke tests if you've set those up.

## Scripts

- `npm run dev` - Starts server on port 3000
- `npm start` - Starts server on port 8000
- `npm test` - Runs smoke tests

## Browser Support

Works on modern browsers—Chrome, Firefox, Safari, Edge.

## License

MIT. See [LICENSE](LICENSE) for details.
