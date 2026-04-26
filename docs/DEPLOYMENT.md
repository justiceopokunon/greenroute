# Green Route - Production Deployment Guide

## Production-Grade Rideshare Application

Green Route is a fully production-ready rideshare application with comprehensive security, performance optimization, monitoring, and scalability features.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Security](#security)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 10GB available space
- **OS**: Linux (Ubuntu 20.04+), macOS, Windows 10+

### Optional Dependencies
- **Redis**: For distributed caching (optional)
- **SSL Certificates**: For HTTPS (production)
- **Domain**: For production deployment
- **CDN**: For static asset delivery (optional)

## 🌍 Environment Setup

### 1. Create Environment File

Create a `.env` file in the project root:

```bash
# Environment
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DB_PATH=./greenroute.db
DB_BACKUP_ENABLED=true
DB_BACKUP_INTERVAL=3600000
DB_BACKUP_PATH=./backups
DB_BACKUP_RETENTION=7

# SSL/TLS (Production)
SSL_ENABLED=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Monitoring
MONITORING_ENABLED=true
MONITORING_ENDPOINT=https://your-monitoring-service.com/api/logs
MONITORING_API_KEY=your-api-key
MONITORING_INTERVAL=60000

# Cache
CACHE_TYPE=memory
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# CDN (Optional)
CDN_ENABLED=false
CDN_URL=https://cdn.yourdomain.com
CDN_ASSETS=js,css,images
```

### 2. Create Required Directories

```bash
mkdir -p logs backups
```

## 📦 Installation

### 1. Clone Repository
```bash
git clone https://github.com/greenroute/green-route.git
cd green-route
```

### 2. Install Dependencies
```bash
npm install --production
```

### 3. Initialize Database
```bash
npm run seed
```

### 4. Run Tests
```bash
npm run test:production
```

## Configuration

### Server Configuration
The production server automatically configures:
- **Security Headers**: Helmet.js with CSP, HSTS, XSS protection
- **Rate Limiting**: Tiered limits for different endpoints
- **Compression**: Gzip compression for responses
- **Static Files**: Optimized caching headers
- **Error Handling**: Comprehensive error logging and reporting

### Database Configuration
- **SQLite**: Primary database with connection pooling
- **Backups**: Automated hourly backups with retention
- **Query Optimization**: Slow query detection and logging
- **Performance Monitoring**: Query statistics and optimization

### Security Configuration
- **Password Security**: PBKDF2 with salt, complexity requirements
- **Input Validation**: XSS protection, SQL injection prevention
- **CSRF Protection**: Token-based CSRF validation
- **Rate Limiting**: IP-based request throttling
- **Audit Logging**: Security event tracking

## Deployment

### Development Deployment
```bash
npm run dev
```

### Production Deployment
```bash
npm start
```

### Cluster Deployment (Multi-core)
```bash
npm run start:cluster
```

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run seed

EXPOSE 3000
CMD ["npm", "start"]
```

### PM2 Deployment
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

Example `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'green-route',
    script: 'server-production.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## 📊 Monitoring

### Health Check Endpoint
```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "version": "2.0.0",
  "uptime": 3600,
  "memory": {
    "heapUsed": 67108864,
    "heapTotal": 134217728
  },
  "cache": {
    "size": 150,
    "maxSize": 1000
  },
  "database": {
    "status": "connected",
    "totalQueries": 1250,
    "slowQueries": 2
  }
}
```

### Performance Metrics
```bash
curl http://localhost:3000/api/metrics
```

### Application Logs
```bash
npm run logs
```

### Database Backup
```bash
npm run backup
```

## 🔒 Security

### Security Headers
- **X-Content-Type-Options**: nosniff
- **X-Frame-Options**: DENY
- **X-XSS-Protection**: 1; mode=block
- **Strict-Transport-Security**: max-age=31536000
- **Content-Security-Policy**: Custom CSP policy
- **Referrer-Policy**: strict-origin-when-cross-origin

### Rate Limiting
- **Auth Endpoints**: 5 requests per 15 minutes
- **Booking Endpoints**: 10 requests per hour
- **Driver Endpoints**: 20 requests per 15 minutes
- **General API**: 100 requests per 15 minutes

### Input Validation
- **XSS Protection**: HTML sanitization
- **SQL Injection**: Parameter validation
- **CSRF Protection**: Token validation
- **File Upload**: Size and type restrictions

### Password Security
- **Minimum Length**: 8 characters
- **Complexity**: Uppercase, lowercase, numbers, special chars
- **Hashing**: PBKDF2 with 100,000 iterations
- **Rate Limiting**: 5 failed attempts = 15 minute lockout

## ⚡ Performance

### Caching Strategy
- **Memory Cache**: In-memory caching with TTL
- **Static Files**: Long-term caching for assets
- **Database**: Query result caching
- **HTTP Headers**: Proper cache control headers

### Optimization Features
- **Compression**: Gzip compression for responses
- **Minification**: CSS/JS minification (build process)
- **Image Optimization**: WebP format support
- **Lazy Loading**: Component lazy loading
- **CDN Support**: Static asset CDN integration

### Monitoring Metrics
- **Response Time**: Average and percentile tracking
- **Memory Usage**: Heap and RSS monitoring
- **Database Performance**: Query optimization
- **Error Rates**: Comprehensive error tracking
- **Throughput**: Requests per second monitoring

## 🐛 Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check environment variables
npm run monitor

# Check logs
npm run logs

# Check health
npm run health
```

#### Database Issues
```bash
# Check database connection
sqlite3 greenroute.db ".tables"

# Recreate database
rm greenroute.db
npm run seed
```

#### High Memory Usage
```bash
# Check memory metrics
curl http://localhost:3000/api/metrics

# Restart application
pm2 restart green-route
```

#### SSL Certificate Issues
```bash
# Verify certificate files
openssl x509 -in cert.pem -text -noout

# Check certificate permissions
ls -la cert.pem key.pem
```

### Performance Issues

#### Slow Queries
```bash
# Check query statistics
curl http://localhost:3000/api/metrics | jq '.database.slowQueries'
```

#### High Response Times
```bash
# Check response time metrics
curl http://localhost:3000/api/metrics | jq '.responseTime'
```

#### Memory Leaks
```bash
# Monitor memory usage
watch -n 5 "curl -s http://localhost:3000/api/metrics | jq '.memory.heapUsed'"
```

### Security Issues

#### Rate Limiting
```bash
# Check rate limit status
curl -H "X-Forwarded-For: 1.2.3.4" http://localhost:3000/api/health
```

#### Security Events
```bash
# Check security logs
grep "SECURITY AUDIT" logs/app.log
```

## 📱 Mobile Responsiveness

The application is fully responsive and works across all devices:

- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

### Responsive Features
- **Touch Targets**: Minimum 44px for mobile
- **Viewport Optimization**: Proper meta tags
- **Performance**: Optimized for mobile networks
- **Accessibility**: WCAG 2.1 AA compliant

## 🔧 Maintenance

### Daily Tasks
- Monitor application health
- Check error logs
- Verify backups are running
- Review performance metrics

### Weekly Tasks
- Update security patches
- Review slow queries
- Clean up old logs
- Check SSL certificates

### Monthly Tasks
- Database maintenance
- Performance optimization review
- Security audit
- Backup verification

## 📞 Support

### Emergency Contacts
- **Technical Support**: support@greenroute.com
- **Security Issues**: security@greenroute.com
- **Documentation**: docs@greenroute.com

### Resources
- **API Documentation**: https://docs.greenroute.com
- **Status Page**: https://status.greenroute.com
- **GitHub Issues**: https://github.com/greenroute/green-route/issues

## Production Readiness Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database seeded and backed up
- [ ] Security headers configured
- [ ] Rate limits tested
- [ ] Monitoring enabled
- [ ] Logs configured
- [ ] Performance optimized

### Post-Deployment
- [ ] Health check passing
- [ ] Monitoring alerts configured
- [ ] Backup schedule verified
- [ ] SSL certificate valid
- [ ] Performance metrics normal
- [ ] Error rates acceptable
- [ ] Security events monitored
- [ ] User testing completed

---

## Ready for Production!

Green Route is now production-ready with:
- **Enterprise-Grade Security**
- **High Performance**
- **Comprehensive Monitoring**
- **Mobile Responsive**
- **Scalable Architecture**
- **Automated Backups**
- **Error Handling**
- **Documentation**

Deploy with confidence!
