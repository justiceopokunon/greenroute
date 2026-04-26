// Green Route - Advanced Security Hardening
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

class SecurityHardening {
  constructor() {
    this.securityLevel = 'maximum';
    this.threats = new Map();
    this.blockedIPs = new Set();
    this.suspiciousActivity = new Map();
  }

  // Advanced threat detection
  detectThreats(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    const timestamp = Date.now();
    
    // Detect suspicious patterns
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /burp/i,
      /metasploit/i,
      /python-requests/i,
      /curl/i,
      /wget/i,
      /powershell/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    
    if (isSuspicious) {
      this.logThreat('SUSPICIOUS_USER_AGENT', {
        ip: clientIP,
        userAgent,
        timestamp,
        url: req.url,
        method: req.method
      });
      
      // Block suspicious requests
      return res.status(403).json({
        error: 'Access denied',
        message: 'Suspicious activity detected'
      });
    }

    // Rate limiting per IP
    const key = `rate_limit_${clientIP}`;
    const requests = this.suspiciousActivity.get(key) || [];
    const now = Date.now();
    
    // Clean old requests (older than 1 minute)
    const recentRequests = requests.filter(time => now - time < 60000);
    
    // Check for too many requests
    if (recentRequests.length > 100) {
      this.logThreat('RATE_LIMIT_EXCEEDED', {
        ip: clientIP,
        requests: recentRequests.length,
        timestamp,
        url: req.url
      });
      
      this.blockedIPs.add(clientIP);
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded'
      });
    }
    
    recentRequests.push(now);
    this.suspiciousActivity.set(key, recentRequests);
    
    next();
  }

  // Advanced input validation
  validateInput(input, type = 'string') {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    const maxLength = {
      email: 254,
      name: 100,
      phone: 20,
      password: 128,
      address: 500,
      description: 1000
    };

    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\+?[\d\s\-\(\)]+$/,
      name: /^[a-zA-Z\s\-'\.]+$/,
      password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    };

    // Check length
    if (maxLength[type] && input.length > maxLength[type]) {
      throw new Error(`Input too long for ${type}`);
    }

    // Check pattern
    if (patterns[type] && !patterns[type].test(input)) {
      throw new Error(`Invalid format for ${type}`);
    }

    // Advanced XSS protection
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*<\/script>|[^<]*$)/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*<\/iframe>|[^<]*$)/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      /vbscript:/gi
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        this.logThreat('XSS_ATTEMPT', { input, pattern: pattern.source });
        throw new Error('Invalid input detected');
      }
    }

    return input.trim();
  }

  // SQL injection protection
  protectSQL(query, params = []) {
    const sqlInjectionPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(\b(or|and)\s+\d+\s*=\s*\d+)/gi,
      /(\b(or|and)\s+['"].*['"]\s*=\s*['"].*['"])/gi,
      /(--|#|\/\*|\*\/)/gi,
      /(\b(waitfor|delay)\s+\w+)/gi,
      /(\b(benchmark|sleep)\s*\()/gi
    ];

    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(query)) {
        this.logThreat('SQL_INJECTION_ATTEMPT', { query, pattern: pattern.source });
        throw new Error('Invalid query detected');
      }
    }

    // Validate parameter types
    params.forEach((param, index) => {
      if (typeof param === 'string' && sqlInjectionPatterns.some(p => p.test(param))) {
        this.logThreat('SQL_INJECTION_IN_PARAMS', { param, index });
        throw new Error('Invalid parameter detected');
      }
    });

    return { query, params: [...params] };
  }

  // CSRF protection with rotating tokens
  generateCSRFToken(userId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(32).toString('hex');
    const token = crypto.createHash('sha256')
      .update(`${userId}:${timestamp}:${random}`)
      .digest('hex');
    
    return {
      token,
      timestamp,
      expires: timestamp + 3600000 // 1 hour
    };
  }

  validateCSRFToken(token, userId, userToken) {
    if (!token || !userToken) {
      return false;
    }

    const now = Date.now();
    const tokenData = this.parseCSRFToken(userToken);
    
    if (!tokenData || tokenData.expires < now) {
      return false;
    }

    const expectedToken = crypto.createHash('sha256')
      .update(`${userId}:${tokenData.timestamp}:${tokenData.random}`)
      .digest('hex');

    return token === expectedToken;
  }

  parseCSRFToken(token) {
    try {
      // In a real implementation, this would decode the token
      // For now, return a mock structure
      return {
        timestamp: Date.now() - 1000,
        random: crypto.randomBytes(32).toString('hex'),
        expires: Date.now() + 3600000
      };
    } catch (error) {
      return null;
    }
  }

  // Advanced password hashing with pepper
  async hashPassword(password, pepper = process.env.PASSWORD_PEPPER || 'default-pepper') {
    const salt = crypto.randomBytes(32).toString('hex');
    const pepperedPassword = password + pepper;
    
    const hash = crypto.pbkdf2Sync(pepperedPassword, salt, 200000, 64, 'sha512');
    
    return {
      hash: hash.toString('hex'),
      salt,
      algorithm: 'pbkdf2',
      iterations: 200000,
      keyLength: 64,
      hashFunction: 'sha512'
    };
  }

  async verifyPassword(password, hashData, pepper = process.env.PASSWORD_PEPPER || 'default-pepper') {
    const { hash, salt, iterations, keyLength, hashFunction } = hashData;
    
    const pepperedPassword = password + pepper;
    const verifyHash = crypto.pbkdf2Sync(pepperedPassword, salt, iterations, keyLength, hashFunction);
    
    return verifyHash.toString('hex') === hash;
  }

  // Session security
  secureSession(session) {
    // Regenerate session ID
    if (session.regenerate) {
      session.regenerate((err) => {
        if (err) console.error('Session regeneration error:', err);
      });
    }

    // Set secure session properties
    session.cookie = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    };

    // Add session fingerprint
    session.fingerprint = crypto.createHash('sha256')
      .update(JSON.stringify({
        ip: session.ip,
        userAgent: session.userAgent,
        timestamp: Date.now()
      }))
      .digest('hex');

    return session;
  }

  // Logging security events
  logThreat(threatType, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      threatType,
      details,
      severity: this.getThreatSeverity(threatType),
      blocked: this.shouldBlock(threatType)
    };

    console.warn('🚨 SECURITY THREAT:', logEntry);

    // Store for analysis
    if (!this.threats.has(threatType)) {
      this.threats.set(threatType, []);
    }
    this.threats.get(threatType).push(logEntry);

    // Auto-block certain threats
    if (this.shouldBlock(threatType) && details.ip) {
      this.blockedIPs.add(details.ip);
    }
  }

  getThreatSeverity(threatType) {
    const severityMap = {
      'XSS_ATTEMPT': 'HIGH',
      'SQL_INJECTION_ATTEMPT': 'CRITICAL',
      'CSRF_VIOLATION': 'HIGH',
      'RATE_LIMIT_EXCEEDED': 'MEDIUM',
      'SUSPICIOUS_USER_AGENT': 'MEDIUM',
      'BRUTE_FORCE_ATTEMPT': 'HIGH',
      'SESSION_HIJACKING': 'CRITICAL',
      'DATA_EXFILTRATION': 'CRITICAL'
    };

    return severityMap[threatType] || 'LOW';
  }

  shouldBlock(threatType) {
    const blockMap = {
      'XSS_ATTEMPT': true,
      'SQL_INJECTION_ATTEMPT': true,
      'CSRF_VIOLATION': true,
      'BRUTE_FORCE_ATTEMPT': true,
      'SESSION_HIJACKING': true,
      'DATA_EXFILTRATION': true
    };

    return blockMap[threatType] || false;
  }

  // Security headers middleware
  securityHeaders() {
    return (req, res, next) => {
      // Basic security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      // HSTS in production
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }

      // Content Security Policy
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: https://tile.openstreetmap.org",
        "connect-src 'self'",
        "frame-src 'none'",
        "object-src 'none'",
        "media-src 'self'",
        "manifest-src 'self'"
      ].join('; ');

      res.setHeader('Content-Security-Policy', csp);

      // Permissions Policy
      const permissions = [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()'
      ].join(',');

      res.setHeader('Permissions-Policy', permissions);

      next();
    };
  }

  // Advanced rate limiting
  createAdvancedRateLimit(options = {}) {
    const config = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
      },
      skip: (req) => {
        // Skip rate limiting for trusted IPs
        const trustedIPs = ['127.0.0.1', '::1'];
        return trustedIPs.includes(req.ip);
      },
      onLimitReached: (req, res, options) => {
        this.logThreat('RATE_LIMIT_EXCEEDED', {
          ip: req.ip,
          url: req.url,
          userAgent: req.get('User-Agent')
        });
      },
      ...options
    };

    return rateLimit(config);
  }

  // Get security statistics
  getSecurityStats() {
    const stats = {
      totalThreats: 0,
      blockedIPs: this.blockedIPs.size,
      threatTypes: {},
      recentThreats: []
    };

    for (const [type, threats] of this.threats) {
      stats.threatTypes[type] = threats.length;
      stats.totalThreats += threats.length;
      
      // Get recent threats (last hour)
      const oneHourAgo = Date.now() - 3600000;
      const recent = threats.filter(t => new Date(t.timestamp).getTime() > oneHourAgo);
      stats.recentThreats.push(...recent);
    }

    return stats;
  }

  // Apply all security hardening
  applyHardening(app) {
    console.log('🔒 Applying advanced security hardening...');

    // Apply security headers
    app.use(this.securityHeaders());

    // Apply threat detection
    app.use(this.detectThreats.bind(this));

    // Apply advanced rate limiting
    app.use('/api', this.createAdvancedRateLimit({
      max: 50, // Stricter for API
      windowMs: 15 * 60 * 1000
    }));

    // Apply auth-specific rate limiting
    app.use('/api/auth', this.createAdvancedRateLimit({
      max: 5, // Very strict for auth
      windowMs: 15 * 60 * 1000
    }));

    console.log('Security hardening applied');
    return {
      headers: 'applied',
      threatDetection: 'active',
      rateLimiting: 'active',
      blockedIPs: this.blockedIPs.size
    };
  }
}

// Auto-apply in production
if (process.env.NODE_ENV === 'production') {
  const security = new SecurityHardening();
  module.exports = security;
} else {
  module.exports = SecurityHardening;
}
