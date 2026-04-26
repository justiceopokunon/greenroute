// Green Route - Performance Optimization System
const cluster = require('cluster');
const os = require('os');

// Performance Configuration
const performanceConfig = {
  // Cache configuration
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000, // Max cached items
    cleanupInterval: 60 * 1000 // Clean up every minute
  },
  
  // Database optimization
  database: {
    connectionPool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },
    queryTimeout: 5000,
    slowQueryThreshold: 1000
  },
  
  // Compression
  compression: {
    level: 6,
    threshold: 1024,
    chunkSize: 16 * 1024
  },
  
  // Static file optimization
  staticFiles: {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    }
  }
};

// Simple in-memory cache
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.maxSize = performanceConfig.cache.maxSize;
    this.ttl = performanceConfig.cache.ttl;
    
    // Start cleanup interval
    setInterval(() => this.cleanup(), performanceConfig.cache.cleanupInterval);
  }
  
  set(key, value) {
    // Remove oldest item if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const item = {
      value,
      timestamp: Date.now()
    };
    
    this.cache.set(key, item);
  }
  
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  has(key) {
    return this.get(key) !== null;
  }
  
  delete(key) {
    return this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
  
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`Cache cleanup: removed ${keysToDelete.length} expired items`);
    }
  }
  
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }
}

// Database query optimization
class QueryOptimizer {
  constructor(db) {
    this.db = db;
    this.slowQueries = [];
    this.queryStats = {
      total: 0,
      slow: 0,
      avgDuration: 0
    };
  }
  
  async executeQuery(sql, params = []) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Query timeout'));
      }, performanceConfig.database.queryTimeout);
      
      this.db.all(sql, params, (err, rows) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        
        // Update stats
        this.queryStats.total++;
        if (duration > performanceConfig.database.slowQueryThreshold) {
          this.queryStats.slow++;
          this.slowQueries.push({
            sql,
            params,
            duration,
            timestamp: new Date().toISOString()
          });
          
          console.warn(`🐌 Slow query detected (${duration}ms):`, sql);
        }
        
        this.queryStats.avgDuration = 
          (this.queryStats.avgDuration * (this.queryStats.total - 1) + duration) / this.queryStats.total;
        
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  getQueryStats() {
    return {
      ...this.queryStats,
      slowQueries: this.slowQueries.slice(-10) // Last 10 slow queries
    };
  }
}

// Memory monitoring
class MemoryMonitor {
  constructor() {
    this.thresholds = {
      warning: 100 * 1024 * 1024, // 100MB
      critical: 200 * 1024 * 1024 // 200MB
    };
    
    this.monitoring = false;
    this.interval = null;
  }
  
  start() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.interval = setInterval(() => {
      this.checkMemory();
    }, 30000); // Check every 30 seconds
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.monitoring = false;
  }
  
  checkMemory() {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    
    if (heapUsed > this.thresholds.critical) {
      console.error('🚨 Critical memory usage detected:', {
        heapUsed: `${(heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(usage.external / 1024 / 1024).toFixed(2)}MB`
      });
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    } else if (heapUsed > this.thresholds.warning) {
      console.warn('High memory usage detected:', {
        heapUsed: `${(heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }
  
  getStats() {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      thresholds: this.thresholds,
      monitoring: this.monitoring
    };
  }
}

// Response time monitoring
class ResponseTimeMonitor {
  constructor() {
    this.requests = [];
    this.maxSize = 1000;
    this.thresholds = {
      warning: 2000, // 2 seconds
      critical: 5000  // 5 seconds
    };
  }
  
  recordRequest(req, res, duration) {
    const request = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };
    
    this.requests.push(request);
    
    // Keep only recent requests
    if (this.requests.length > this.maxSize) {
      this.requests.shift();
    }
    
    // Log slow requests
    if (duration > this.thresholds.critical) {
      console.error('Critical slow request:', request);
    } else if (duration > this.thresholds.warning) {
      console.warn('Slow request:', request);
    }
  }
  
  getStats() {
    if (this.requests.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        slowRequests: 0,
        errorRate: 0
      };
    }
    
    const total = this.requests.length;
    const durations = this.requests.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / total;
    const slowRequests = this.requests.filter(r => r.duration > this.thresholds.warning).length;
    const errorRequests = this.requests.filter(r => r.statusCode >= 400).length;
    const errorRate = (errorRequests / total) * 100;
    
    return {
      total,
      avgDuration,
      slowRequests,
      errorRate,
      thresholds: this.thresholds
    };
  }
}

// Compression middleware
const compression = require('compression');
const compressionMiddleware = compression({
  level: performanceConfig.compression.level,
  threshold: performanceConfig.compression.threshold,
  chunkSize: performanceConfig.compression.chunkSize,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return /json|text|javascript|css/.test(res.getHeader('Content-Type'));
  }
});

// Static file optimization middleware
const staticFileMiddleware = (express, path) => {
  return express.static(path, {
    maxAge: performanceConfig.staticFiles.maxAge,
    etag: performanceConfig.staticFiles.etag,
    lastModified: performanceConfig.staticFiles.lastModified,
    setHeaders: performanceConfig.staticFiles.setHeaders
  });
};

// Cluster management for production
class ClusterManager {
  constructor() {
    this.isMaster = cluster.isMaster;
    this.workers = [];
    this.workerCount = os.cpus().length;
  }
  
  start() {
    if (this.isMaster) {
      console.log(`Master process starting ${this.workerCount} workers`);
      
      // Fork workers
      for (let i = 0; i < this.workerCount; i++) {
        const worker = cluster.fork();
        this.workers.push(worker);
        
        worker.on('exit', (code, signal) => {
          console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
          console.log('Starting a new worker');
          const newWorker = cluster.fork();
          this.workers[i] = newWorker;
        });
      }
      
      // Handle worker messages
      cluster.on('message', (worker, message) => {
        this.handleWorkerMessage(worker, message);
      });
      
      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('Master received SIGTERM, shutting down gracefully');
        this.shutdown();
      });
      
    } else {
      console.log(`👷 Worker ${process.pid} started`);
    }
  }
  
  handleWorkerMessage(worker, message) {
    switch (message.type) {
      case 'stats':
        console.log(`Worker ${worker.process.pid} stats:`, message.data);
        break;
      case 'error':
        console.error(`Worker ${worker.process.pid} error:`, message.data);
        break;
      default:
        console.log(`Worker ${worker.process.pid}:`, message);
    }
  }
  
  shutdown() {
    console.log('Shutting down all workers...');
    
    this.workers.forEach(worker => {
      worker.kill('SIGTERM');
    });
    
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  }
  
  broadcast(message) {
    this.workers.forEach(worker => {
      worker.send(message);
    });
  }
}

// Performance monitoring dashboard
class PerformanceDashboard {
  constructor() {
    this.cache = new CacheManager();
    this.memoryMonitor = new MemoryMonitor();
    this.responseMonitor = new ResponseTimeMonitor();
  }
  
  start() {
    this.memoryMonitor.start();
    console.log('📊 Performance monitoring started');
  }
  
  stop() {
    this.memoryMonitor.stop();
    console.log('📊 Performance monitoring stopped');
  }
  
  getStats() {
    return {
      cache: this.cache.getStats(),
      memory: this.memoryMonitor.getStats(),
      responseTime: this.responseMonitor.getStats(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
  
  broadcastStats() {
    if (cluster.isMaster) {
      this.broadcast({
        type: 'stats',
        data: this.getStats()
      });
    }
  }
}

// Create performance middleware
const createPerformanceMiddleware = () => {
  const responseMonitor = new ResponseTimeMonitor();
  
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.end to measure response time
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      res.end = originalEnd;
      res.end(chunk, encoding);
      
      const duration = Date.now() - startTime;
      responseMonitor.recordRequest(req, res, duration);
    };
    
    next();
  };
};

// Export performance utilities
module.exports = {
  performanceConfig,
  CacheManager,
  QueryOptimizer,
  MemoryMonitor,
  ResponseTimeMonitor,
  ClusterManager,
  PerformanceDashboard,
  compressionMiddleware,
  staticFileMiddleware,
  createPerformanceMiddleware
};
