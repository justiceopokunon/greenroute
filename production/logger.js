// Green Route - Production-Grade Logging System
class Logger {
  constructor() {
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.currentLevel = process.env.NODE_ENV === 'production' 
      ? this.logLevels.WARN 
      : this.logLevels.DEBUG;
    
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs in memory
  }

  // Core logging method
  log(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: this.getLevelName(level),
      message,
      meta: {
        ...meta,
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
        memory: process.memoryUsage(),
        hostname: require('os').hostname()
      }
    };

    // Add to memory buffer
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console if level is appropriate
    if (level <= this.currentLevel) {
      this.outputLog(logEntry);
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production' && level <= this.logLevels.WARN) {
      this.sendToExternalService(logEntry);
    }
  }

  // Convenience methods
  error(message, meta = {}) {
    this.log(this.logLevels.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    this.log(this.logLevels.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(this.logLevels.INFO, message, meta);
  }

  debug(message, meta = {}) {
    this.log(this.logLevels.DEBUG, message, meta);
  }

  // HTTP request logging
  logRequest(req, res, duration) {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || 'anonymous'
    });
  }

  // Database operation logging
  logDatabase(operation, table, duration, error = null) {
    const level = error ? this.logLevels.ERROR : this.logLevels.DEBUG;
    this.log(level, `Database ${operation}`, {
      table,
      duration: `${duration}ms`,
      error: error?.message,
      stack: error?.stack
    });
  }

  // API error logging
  logApiError(error, req) {
    this.error('API Error', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
      body: req.body,
      params: req.params,
      query: req.query,
      userId: req.user?.id || 'anonymous',
      ip: req.ip || req.connection.remoteAddress
    });
  }

  // Security event logging
  logSecurity(event, details = {}) {
    this.warn(`Security Event: ${event}`, {
      ...details,
      timestamp: new Date().toISOString(),
      severity: 'HIGH'
    });
  }

  // Performance logging
  logPerformance(operation, duration, details = {}) {
    this.info(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...details,
      slow: duration > 1000 // Flag operations over 1 second
    });
  }

  // Get recent logs
  getRecentLogs(count = 100) {
    return this.logs.slice(-count);
  }

  // Get logs by level
  getLogsByLevel(level, count = 100) {
    const levelNum = this.logLevels[level.toUpperCase()];
    return this.logs
      .filter(log => this.logLevels[log.level] === levelNum)
      .slice(-count);
  }

  // Export logs for analysis
  exportLogs(format = 'json') {
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'message', 'meta'];
      const csvRows = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          log.timestamp,
          log.level,
          `"${log.message.replace(/"/g, '""')}"`,
          `"${JSON.stringify(log.meta).replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
    
    return JSON.stringify(this.logs, null, 2);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.info('Logs cleared');
  }

  // Private methods
  getLevelName(level) {
    const names = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    return names[level] || 'UNKNOWN';
  }

  outputLog(logEntry) {
    const { timestamp, level, message, meta } = logEntry;
    const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
    
    // Colorized console output for development
    if (process.env.NODE_ENV !== 'production') {
      const colors = {
        ERROR: '\x1b[31m', // Red
        WARN: '\x1b[33m',  // Yellow
        INFO: '\x1b[36m',  // Cyan
        DEBUG: '\x1b[37m' // White
      };
      
      const reset = '\x1b[0m';
      console.log(`${colors[level]}[${timestamp}] ${level}: ${message}${reset}`);
      
      if (metaString) {
        console.log(metaString);
      }
    } else {
      // Production logging (structured)
      console.log(JSON.stringify(logEntry));
    }
  }

  async sendToExternalService(logEntry) {
    // In production, send to logging service like Loggly, Papertrail, etc.
    // This is a placeholder for external logging integration
    try {
      // Example: Send to logging API
      // await fetch('https://logging-service.com/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logEntry)
      // });
    } catch (error) {
      // Don't let logging errors crash the app
      console.error('Failed to send log to external service:', error.message);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Express middleware for request logging
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  logger.debug('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent')
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    const duration = Date.now() - startTime;
    logger.logRequest(req, res, duration);
  };
  
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  logger.logApiError(err, req);
  
  // Don't expose stack traces in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: err.stack })
  });
};

// Uncaught exception handler
const uncaughtExceptionHandler = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', {
      error: err.message,
      stack: err.stack
    });
    
    // Graceful shutdown
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason.toString(),
      promise: promise.toString()
    });
    
    // Graceful shutdown in production
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
};

// Performance monitoring
const performanceMonitor = (name) => {
  return (target, propertyName, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const start = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;
        logger.logPerformance(name, duration, { success: true });
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.logPerformance(name, duration, { success: false, error: error.message });
        throw error;
      }
    };
    
    return descriptor;
  };
};

module.exports = {
  logger,
  requestLogger,
  errorHandler,
  uncaughtExceptionHandler,
  performanceMonitor
};
