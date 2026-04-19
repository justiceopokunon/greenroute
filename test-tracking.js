// Quick test for live tracking feature
// Run this in browser console while on code.html

// Example: Start tracking a ride (for testing)
function testTracking() {
  // Dummy ride ID (would come from booking in real flow)
  const rideId = '550e8400-e29b-41d4-a716-446655440000'; // You'll need a real ride ID
  const bookingId = '550e8400-e29b-41d4-a716-446655440001';
  const userId = 'user-123';

  // Note: This is a demo - actual rideId would come from successful booking
  console.log('Starting tracking demo...');
  console.log('Ride ID:', rideId);
  console.log('Booking ID:', bookingId);

  // Uncomment to test (requires valid rideId with driver location):
  // Tracking.startTracking(rideId, bookingId, userId);
}

// To test manually:
// 1. Book a ride using the UI
// 2. The tracking modal will appear automatically
// 3. Or run: testTracking() in console with a valid rideId

console.log('Tracking module loaded. Call testTracking() to demo.');
