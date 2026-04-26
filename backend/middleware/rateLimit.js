
/**
 * Simple in-memory rate limiting middleware
 * Prevents abuse by limiting requests per IP address
 */

const requestCounts = new Map();
const WINDOW_SIZE = 60000; // 1 minute window
const MAX_REQUESTS = {
  default: 100,
  auth: 5, // Stricter limit for auth endpoints
  booking: 20, // Stricter limit for booking endpoints
};

/**
 * Get rate limit tier for a given path
 */
const getLimitTier = (path) => {
  if (path.includes('/auth/')) return 'auth';
  if (path.includes('/bookings/')) return 'booking';
  return 'default';
};

/**
 * Rate limiting middleware
 */
const rateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const tier = getLimitTier(req.path);
  const limit = MAX_REQUESTS[tier];
  const key = `${ip}:${tier}`;
  const now = Date.now();

  // Clean up old entries
  if (!requestCounts.has(key)) {
    requestCounts.set(key, []);
  }

  const requests = requestCounts.get(key);
  const windowStart = now - WINDOW_SIZE;
  
  // Remove requests outside current window
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  requestCounts.set(key, validRequests);

  // Check if limit exceeded
  if (validRequests.length >= limit) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please wait before making another request',
      retryAfter: Math.ceil((validRequests[0] + WINDOW_SIZE - now) / 1000)
    });
  }

  // Add current request
  validRequests.push(now);
  requestCounts.set(key, validRequests);

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': limit,
    'X-RateLimit-Remaining': limit - validRequests.length,
    'X-RateLimit-Reset': new Date(now + WINDOW_SIZE).toISOString()
  });

  next();
};

/**
 * Clean up old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, requests] of requestCounts.entries()) {
    const windowStart = now - WINDOW_SIZE;
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length === 0) {
      requestCounts.delete(key);
    } else {
      requestCounts.set(key, validRequests);
    }
  }
}, 60000); // Cleanup every minute

module.exports = rateLimit;