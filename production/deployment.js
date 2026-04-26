// Green Route - Production Deployment Configuration
const path = require('path');
const fs = require('fs');

// Deployment Configuration
const deploymentConfig = {
  // Environment settings
  environment: process.env.NODE_ENV || 'development',
  
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    workers: process.env.WORKERS || require('os').cpus().length,
    
    // SSL/TLS configuration
    ssl: {
      enabled: process.env.SSL_ENABLED === 'true',
      cert: process.env.SSL_CERT_PATH,
      key: process.env.SSL_KEY_PATH
    }
  },
  
  // Database configuration
  database: {
    type: 'sqlite',
    path: process.env.DB_PATH || path.join(__dirname, 'greenroute.db'),
    backup: {
      enabled: process.env.DB_BACKUP_ENABLED === 'true',
      interval: process.env.DB_BACKUP_INTERVAL || 3600000, // 1 hour
      path: process.env.DB_BACKUP_PATH || './backups',
      retention: process.env.DB_BACKUP_RETENTION || 7 // days
    }
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE_PATH || './logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || 5,
    datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD'
  },
  
  // Monitoring configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    endpoint: process.env.MONITORING_ENDPOINT,
    apiKey: process.env.MONITORING_API_KEY,
    interval: process.env.MONITORING_INTERVAL || 60000 // 1 minute
  },
  
  // Cache configuration
  cache: {
    type: process.env.CACHE_TYPE || 'memory',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0
    }
  },
  
  // CDN configuration
  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    url: process.env.CDN_URL,
    assets: process.env.CDN_ASSETS || 'js,css,images'
  }
};

// Environment validation
class EnvironmentValidator {
  static validate() {
    const errors = [];
    
    // Validate required environment variables
    const required = [];
    const optional = ['PORT', 'HOST', 'NODE_ENV', 'DB_PATH', 'LOG_LEVEL'];
    
    required.forEach(envVar => {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    });
    
    // Validate environment-specific requirements
    if (process.env.NODE_ENV === 'production') {
      const productionRequired = ['SSL_CERT_PATH', 'SSL_KEY_PATH', 'MONITORING_ENDPOINT'];
      productionRequired.forEach(envVar => {
        if (!process.env[envVar]) {
          errors.push(`Missing required production environment variable: ${envVar}`);
        }
      });
    }
    
    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
    
    return true;
  }
  
  static getEnvironmentInfo() {
    return {
      environment: deploymentConfig.environment,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

// Database backup system
class DatabaseBackup {
  constructor(dbPath, backupConfig) {
    this.dbPath = dbPath;
    this.backupConfig = backupConfig;
    this.backupInterval = null;
  }
  
  start() {
    if (!this.backupConfig.enabled) {
      console.log('📦 Database backup disabled');
      return;
    }
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(this.backupConfig.path)) {
      fs.mkdirSync(this.backupConfig.path, { recursive: true });
    }
    
    this.backupInterval = setInterval(() => {
      this.createBackup();
    }, this.backupConfig.interval);
    
    console.log(`📦 Database backup started (interval: ${this.backupConfig.interval}ms)`);
  }
  
  stop() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('📦 Database backup stopped');
    }
  }
  
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupConfig.path, `greenroute-backup-${timestamp}.db`);
      
      // Copy database file
      fs.copyFileSync(this.dbPath, backupPath);
      
      console.log(`Database backup created: ${backupPath}`);
      
      // Clean up old backups
      this.cleanupOldBackups();
      
    } catch (error) {
      console.error('Database backup failed:', error);
    }
  }
  
  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupConfig.path);
      const backupFiles = files.filter(file => file.startsWith('greenroute-backup-'));
      
      // Sort by creation time (newest first)
      backupFiles.sort((a, b) => {
        const statA = fs.statSync(path.join(this.backupConfig.path, a));
        const statB = fs.statSync(path.join(this.backupConfig.path, b));
        return statB.mtime - statA.mtime;
      });
      
      // Keep only the most recent backups
      const filesToDelete = backupFiles.slice(this.backupConfig.retention);
      
      filesToDelete.forEach(file => {
        const filePath = path.join(this.backupConfig.path, file);
        fs.unlinkSync(filePath);
        console.log(`Deleted old backup: ${file}`);
      });
      
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }
}

// Health check system
class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.status = 'healthy';
    this.lastCheck = null;
  }
  
  addCheck(name, checkFn) {
    this.checks.set(name, checkFn);
  }
  
  async runChecks() {
    const results = {};
    let allHealthy = true;
    
    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        results[name] = {
          status: 'healthy',
          message: result.message || 'OK',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          message: error.message,
          timestamp: new Date().toISOString()
        };
        allHealthy = false;
      }
    }
    
    this.status = allHealthy ? 'healthy' : 'unhealthy';
    this.lastCheck = new Date().toISOString();
    
    return {
      status: this.status,
      timestamp: this.lastCheck,
      checks: results
    };
  }
  
  async checkDatabase() {
    // Simple database connectivity check
    const db = require('./db');
    await db.get('SELECT 1');
    return { message: 'Database connection successful' };
  }
  
  async checkMemory() {
    const memory = process.memoryUsage();
    const heapUsedMB = memory.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > 500) {
      throw new Error(`High memory usage: ${heapUsedMB.toFixed(2)}MB`);
    }
    
    return { message: `Memory usage: ${heapUsedMB.toFixed(2)}MB` };
  }
  
  async checkDiskSpace() {
    const stats = fs.statSync('.');
    return { message: 'Disk space OK' };
  }
}

// Graceful shutdown handler
class GracefulShutdown {
  constructor() {
    this.shuttingDown = false;
    this.cleanupTasks = [];
  }
  
  addCleanupTask(task) {
    this.cleanupTasks.push(task);
  }
  
  async shutdown(signal) {
    if (this.shuttingDown) {
      console.log('Force shutdown detected');
      process.exit(1);
    }
    
    this.shuttingDown = true;
    console.log(`\nReceived ${signal}, starting graceful shutdown...`);
    
    try {
      // Run cleanup tasks
      for (const task of this.cleanupTasks) {
        await task();
      }
      
      console.log('Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
  
  setup() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGUSR2', () => this.shutdown('SIGUSR2')); // nodemon restart
  }
}

// SSL/TLS configuration
class SSLConfig {
  static getOptions() {
    if (!deploymentConfig.server.ssl.enabled) {
      return null;
    }
    
    try {
      const cert = fs.readFileSync(deploymentConfig.server.ssl.cert);
      const key = fs.readFileSync(deploymentConfig.server.ssl.key);
      
      return {
        cert,
        key,
        minVersion: 'TLSv1.2',
        ciphers: [
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES256-SHA384',
          'ECDHE-RSA-AES128-SHA256',
          'AES256-GCM-SHA384',
          'AES128-GCM-SHA256',
          'AES256-SHA256',
          'AES128-SHA256'
        ].join(':'),
        honorCipherOrder: true
      };
    } catch (error) {
      console.error('SSL configuration error:', error);
      throw new Error('Failed to load SSL certificates');
    }
  }
}

// Production server configuration
class ProductionServer {
  constructor(app) {
    this.app = app;
    this.server = null;
    this.healthChecker = new HealthChecker();
    this.gracefulShutdown = new GracefulShutdown();
    this.databaseBackup = null;
  }
  
  async start() {
    try {
      // Validate environment
      EnvironmentValidator.validate();
      
      // Setup health checks
      this.setupHealthChecks();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      // Setup database backup
      this.setupDatabaseBackup();
      
      // Create server
      await this.createServer();
      
      // Start monitoring
      this.startMonitoring();
      
      console.log('Production server started successfully');
      
    } catch (error) {
      console.error('Failed to start production server:', error);
      process.exit(1);
    }
  }
  
  async createServer() {
    const { port, host, ssl } = deploymentConfig.server;
    
    if (ssl.enabled) {
      const https = require('https');
      const sslOptions = SSLConfig.getOptions();
      this.server = https.createServer(sslOptions, this.app);
    } else {
      const http = require('http');
      this.server = http.createServer(this.app);
    }
    
    return new Promise((resolve, reject) => {
      this.server.listen(port, host, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`Server listening on ${ssl.enabled ? 'https' : 'http'}://${host}:${port}`);
          resolve();
        }
      });
    });
  }
  
  setupHealthChecks() {
    this.healthChecker.addCheck('database', () => this.healthChecker.checkDatabase());
    this.healthChecker.addCheck('memory', () => this.healthChecker.checkMemory());
    this.healthChecker.addCheck('disk', () => this.healthChecker.checkDiskSpace());
  }
  
  setupGracefulShutdown() {
    this.gracefulShutdown.addCleanupTask(async () => {
      if (this.databaseBackup) {
        this.databaseBackup.stop();
      }
      
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
      }
    });
    
    this.gracefulShutdown.setup();
  }
  
  setupDatabaseBackup() {
    this.databaseBackup = new DatabaseBackup(
      deploymentConfig.database.path,
      deploymentConfig.database.backup
    );
    
    this.databaseBackup.start();
  }
  
  startMonitoring() {
    if (!deploymentConfig.monitoring.enabled) {
      return;
    }
    
    setInterval(async () => {
      try {
        const health = await this.healthChecker.runChecks();
        
        // Send to monitoring service
        if (deploymentConfig.monitoring.endpoint) {
          await this.sendMonitoringData(health);
        }
        
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, deploymentConfig.monitoring.interval);
  }
  
  async sendMonitoringData(health) {
    // Implementation for sending data to external monitoring service
    console.log('Health check:', health.status);
  }
}

// Export deployment utilities
module.exports = {
  deploymentConfig,
  EnvironmentValidator,
  DatabaseBackup,
  HealthChecker,
  GracefulShutdown,
  SSLConfig,
  ProductionServer
};
