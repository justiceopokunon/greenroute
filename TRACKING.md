# Live Driver Tracking Integration

## How It Works

When a passenger books a ride, they can see the driver approaching in real-time with:
- Google Maps showing driver location
- Live ETA countdown
- Driver info (name, vehicle, rating, contact)
- Distance to pickup point

## Integration Example

In your booking code, after confirming a booking:

```javascript
// When user books a ride
const booking = await api.bookRide(rideId, passengerId);

// Start live tracking
Tracking.startTracking(rideId, booking.id, passengerId);

// Tracking modal will appear with:
// - Real-time Google Map
// - Driver location marker (blue)
// - Passenger location marker (green)
// - Distance and ETA
// - Driver info card with contact options
```

## Frontend Events

The tracking modal is automatically created on page load. To show/hide tracking:

```javascript
// Start tracking
Tracking.startTracking(rideId, bookingId, userId);

// Stop tracking (also hides modal)
Tracking.stopTracking();

// Hide modal without stopping
Tracking.hideTrackingModal();
```

## Features

✅ Real-time driver location on map
✅ Auto-updates every 3 seconds
✅ Calculates distance and ETA
✅ Shows driver info card
✅ One-tap call/text driver
✅ Route visualization (line from driver to passenger)
✅ Auto-fit map to show both locations

## Requires

- Google Maps API key (see `GOOGLE_MAPS_SETUP.md`)
- Backend API returning driver location data in rides endpoint
- Database with driver latitude/longitude fields

## Testing Without Maps API Key

The tracking modal will still load, but the map won't render. Get a free API key to enable live tracking:
1. Go to https://console.cloud.google.com/
2. Create API key for Maps JavaScript API
3. Add key to `code.html` script tag

## Next Steps

Optional enhancements:
- WebSocket support for real-time updates instead of polling
- Driver marker rotation to show direction
- Route polyline showing full trip path
- Estimated arrival notifications
- Conversation/chat with driver
- Trip receipt and rating after completion
