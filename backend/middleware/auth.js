
/**
 * Authentication middleware
 * Validates user session/token from request
 */

/**
 * Verify user authentication
 * In a production app, this would verify JWT tokens or session IDs
 * For now, we check if userId is provided and valid
 */
const authenticate = (req, res, next) => {
  // Get user ID from query params, body, or headers
  const userId = req.query.userId || 
                 req.body?.userId || 
                 req.headers['x-user-id'] ||
                 req.session?.userId;

  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'User authentication required. Please sign in.',
      details: 'No valid user ID found in request'
    });
  }

  // In production, verify the token/session here
  // For now, we just attach it to the request
  req.userId = userId;
  next();
};

/**
 * Verify that the user ID matches the requested resource owner
 * Prevents users from accessing other users' data
 */
const authorizeOwner = (paramName = 'userId') => {
  return (req, res, next) => {
    const userId = req.userId;
    const resourceUserId = req.params[paramName];

    if (userId !== resourceUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
        details: `Requested resource belongs to different user`
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't block, just sets userId if available
 */
const optionalAuth = (req, res, next) => {
  const userId = req.query.userId || 
                 req.body?.userId || 
                 req.headers['x-user-id'] ||
                 req.session?.userId;

  if (userId) {
    req.userId = userId;
  }

  next();
};

module.exports = {
  authenticate,
  authorizeOwner,
  optionalAuth
};