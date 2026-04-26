// Green Route - Security Best Practices Implementation
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// Security Configuration
const securityConfig = {
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  },
  
  // Session configuration
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://greenroute.com'] 
      : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "https://tile.openstreetmap.org"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  }
};

// Password validation and hashing
class PasswordSecurity {
  static validatePassword(password) {
    const errors = [];
    
    if (password.length < securityConfig.password.minLength) {
      errors.push(`Password must be at least ${securityConfig.password.minLength} characters long`);
    }
    
    if (securityConfig.password.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (securityConfig.password.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (securityConfig.password.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (securityConfig.password.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static async hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }
  
  static async verifyPassword(password, salt, hash) {
    const hashVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
  }
  
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

// Input sanitization
class InputSanitizer {
  static sanitizeString(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove potential JS injection
      .replace(/on\w+=/gi, ''); // Remove potential event handlers
  }
  
  static sanitizeEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = this.sanitizeString(email);
    return emailRegex.test(sanitized) ? sanitized : '';
  }
  
  static sanitizePhone(phone) {
    const sanitized = this.sanitizeString(phone);
    return sanitized.replace(/[^\d+\-\s()]/g, '');
  }
  
  static sanitizeCoordinates(lat, lng) {
    const sanitizedLat = parseFloat(lat);
    const sanitizedLng = parseFloat(lng);
    
    if (isNaN(sanitizedLat) || isNaN(sanitizedLng)) {
      return null;
    }
    
    // Validate reasonable coordinates (Accra area)
    if (sanitizedLat < -90 || sanitizedLat > 90 || 
        sanitizedLng < -180 || sanitizedLng > 180) {
      return null;
    }
    
    return { lat: sanitizedLat, lng: sanitizedLng };
  }
}

// Rate limiting middleware
const createRateLimit = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || securityConfig.rateLimit.windowMs,
    max: options.max || securityConfig.rateLimit.max,
    message: options.message || securityConfig.rateLimit.message,
    standardHeaders: securityConfig.rateLimit.standardHeaders,
    legacyHeaders: securityConfig.rateLimit.legacyHeaders,
    keyGenerator: options.keyGenerator || ((req) => {
      return req.ip || req.connection.remoteAddress;
    })
  });
};

// Security-specific rate limits
const authRateLimit = createRateLimit({
  max: 5, // Stricter limit for auth endpoints
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many authentication attempts, please try again later.'
});

const bookingRateLimit = createRateLimit({
  max: 10, // Moderate limit for booking
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many booking attempts, please try again later.'
});

const driverRateLimit = createRateLimit({
  max: 20, // Higher limit for driver operations
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many driver operations, please try again later.'
});

// XSS Protection
class XSSProtection {
  static escapeHtml(text) {
    if (typeof text !== 'string') return '';
    
    const htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'\/]/g, (match) => htmlEscapes[match]);
  }
  
  static sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*<\/script>|[^<]*$)/gi, '') // Remove scripts
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*<\/iframe>|[^<]*$)/gi, '') // Remove iframes
      .replace(/javascript:/gi, '') // Remove JS URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
  
  static validateInput(input, type = 'string') {
    const sanitized = this.sanitizeInput(input);
    
    switch (type) {
      case 'email':
        return InputSanitizer.sanitizeEmail(sanitized);
      case 'phone':
        return InputSanitizer.sanitizePhone(sanitized);
      case 'coordinates':
        if (typeof input === 'object' && input.lat && input.lng) {
          return InputSanitizer.sanitizeCoordinates(input.lat, input.lng);
        }
        return null;
      default:
        return sanitized;
    }
  }
}

// CSRF Protection
class CSRFProtection {
  static generateToken() {
    return PasswordSecurity.generateSecureToken(32);
  }
  
  static validateToken(token, sessionToken) {
    return token && sessionToken && token === sessionToken;
  }
  
  static middleware() {
    return (req, res, next) => {
      // Skip CSRF for GET requests and API endpoints
      if (req.method === 'GET' || req.path.startsWith('/api/')) {
        return next();
      }
      
      const token = req.headers['x-csrf-token'];
      const sessionToken = req.session?.csrfToken;
      
      if (!CSRFProtection.validateToken(token, sessionToken)) {
        return res.status(403).json({
          error: 'Invalid CSRF token',
          message: 'Security validation failed'
        });
      }
      
      next();
    };
  }
}

// SQL Injection Protection
class SQLProtection {
  static sanitizeSQL(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potential SQL injection patterns
    return input
      .replace(/[';\\]/g, '') // Remove dangerous characters
      .replace(/\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi, '') // Remove SQL keywords
      .trim();
  }
  
  static validateId(id) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
  
  static validateCoordinates(lat, lng) {
    const sanitized = InputSanitizer.sanitizeCoordinates(lat, lng);
    return sanitized !== null;
  }
}

// Security Headers Middleware
const securityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy
  const cspDirectives = Object.entries(securityConfig.csp.directives)
    .map(([directive, sources]) => {
      const sourceString = sources.join(' ');
      return `${directive} ${sourceString}`;
    })
    .join('; ');
  
  res.setHeader('Content-Security-Policy', cspDirectives);
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// Input Validation Middleware
const validateInput = (req, res, next) => {
  if (req.body) {
    // Sanitize request body
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = XSSProtection.validateInput(req.body[key]);
      }
    }
  }
  
  if (req.query) {
    // Sanitize query parameters
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = XSSProtection.validateInput(req.query[key]);
      }
    }
  }
  
  if (req.params) {
    // Validate URL parameters
    for (const key in req.params) {
      if (key.includes('id') && !SQLProtection.validateId(req.params[key])) {
        return res.status(400).json({
          error: 'Invalid ID format',
          message: 'Invalid identifier provided'
        });
      }
    }
  }
  
  next();
};

// Security Audit Logging
class SecurityAudit {
  static logSecurityEvent(event, details = {}) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      event,
      details: {
        ...details,
        ip: details.ip || 'unknown',
        userAgent: details.userAgent || 'unknown',
        userId: details.userId || 'anonymous'
      },
      severity: this.getSeverity(event)
    };
    
    console.warn('SECURITY AUDIT:', auditLog);
    
    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to external security monitoring service
    }
  }
  
  static getSeverity(event) {
    const highSeverityEvents = [
      'LOGIN_FAILED',
      'LOGIN_SUCCESS',
      'PASSWORD_CHANGE',
      'ACCOUNT_LOCKED',
      'SUSPICIOUS_ACTIVITY',
      'RATE_LIMIT_EXCEEDED',
      'CSRF_VIOLATION',
      'XSS_ATTEMPT',
      'SQL_INJECTION_ATTEMPT'
    ];
    
    return highSeverityEvents.includes(event) ? 'HIGH' : 'MEDIUM';
  }
}

// Export all security utilities
module.exports = {
  securityConfig,
  PasswordSecurity,
  InputSanitizer,
  XSSProtection,
  CSRFProtection,
  SQLProtection,
  createRateLimit,
  authRateLimit,
  bookingRateLimit,
  driverRateLimit,
  securityHeaders,
  validateInput,
  SecurityAudit
};
