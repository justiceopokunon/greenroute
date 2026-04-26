# Railway Deployment Guide

## Overview
This guide covers deploying the GreenRoute rideshare application to Railway.

## Prerequisites
- GitHub repository with GreenRoute code
- Railway account (free tier available)
- Railway CLI (optional)

## Quick Start

### 1. Connect Repository to Railway
1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your GreenRoute repository
4. Railway will automatically detect the Node.js application

### 2. Configure Environment Variables
In Railway dashboard, set these environment variables:

#### Required Variables
```bash
NODE_ENV=production
PORT=3001
```

#### Optional Variables
```bash
JWT_SECRET=your-jwt-secret-key
DATABASE_URL=postgresql://user:pass@host:port/dbname
REDIS_URL=redis://user:pass@host:port
```

### 3. Deploy
- Railway will automatically build and deploy
- The `railway.toml` file configures deployment settings
- Health checks ensure the service is running

## Configuration Files

### railway.toml
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[[services]]
name = "greenroute"

[services.variables]
NODE_ENV = "production"
PORT = "3001"
```

### Deployment Process
1. **Build**: Railway runs `npm install` using Nixpacks
2. **Start**: Uses `npm start` command
3. **Health Check**: Verifies `/api/health` endpoint
4. **Monitor**: Automatic restart on failure

## Database Options

### Option 1: SQLite (Current)
- Uses file-based SQLite database
- Good for development/small applications
- Limitations: Single instance, no scaling

### Option 2: PostgreSQL (Recommended for Production)
1. In Railway dashboard, add PostgreSQL service
2. Update `db.js` to use `DATABASE_URL`
3. Run migration scripts

#### PostgreSQL Migration
```javascript
// Update db.js for PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

## Monitoring and Logs

### View Logs
1. Go to Railway dashboard
2. Select your service
3. Click "Logs" tab

### Health Monitoring
- Automatic health checks every 100 seconds
- Service restarts on failure
- Built-in metrics dashboard

## Scaling

### Horizontal Scaling
1. Go to Railway dashboard
2. Select service settings
3. Adjust instance count

### Performance Tuning
- Add Redis for caching
- Use connection pooling for database
- Enable CDN for static assets

## Environment-Specific Configurations

### Development
```bash
NODE_ENV=development
PORT=3001
```

### Production
```bash
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secure-secret
```

## Custom Domain

### Setup
1. Go to Railway dashboard
2. Select "Settings" → "Networking"
3. Add custom domain
4. Update DNS records

### SSL
- Railway provides automatic SSL certificates
- No additional configuration needed

## Troubleshooting

### Common Issues

#### Build Failures
- Check package.json for correct scripts
- Verify all dependencies are in package.json
- Review build logs in Railway dashboard

#### Runtime Errors
- Check environment variables
- Verify database connection
- Review application logs

#### Health Check Failures
- Ensure `/api/health` endpoint works
- Check if PORT is correctly set
- Verify server starts successfully

### Debug Steps
1. Check Railway logs
2. Verify environment variables
3. Test locally with same configuration
4. Use Railway CLI for local testing

## Best Practices

### Security
- Use strong JWT secrets
- Enable HTTPS (automatic on Railway)
- Set proper CORS origins
- Use environment variables for secrets

### Performance
- Enable caching with Redis
- Use PostgreSQL for production
- Optimize database queries
- Monitor resource usage

### Backup
- Regular database backups
- Version control with Git
- Environment variable documentation
- Deployment rollback plan

## Railway CLI Commands

### Install CLI
```bash
npm install -g @railway/cli
```

### Common Commands
```bash
# Login
railway login

# Deploy
railway up

# View logs
railway logs

# Open dashboard
railway open

# Set environment variables
railway variables set NODE_ENV=production
```

## Cost Management

### Free Tier
- 500 hours/month
- 100MB storage
- Community support

### Paid Plans
- More compute hours
- Additional storage
- Priority support
- Custom domains

## Migration from Other Platforms

### From Vercel
1. Remove `vercel.json` (already done)
2. Add `railway.toml` (already done)
3. Update environment variables
4. Test deployment

### From Heroku
1. Export environment variables
2. Update database connection
3. Update build scripts
4. Deploy to Railway

## Support

### Documentation
- [Railway Docs](https://docs.railway.app)
- [Node.js Guide](https://docs.railway.app/guides/nodejs)

### Community
- [Railway Discord](https://discord.gg/railway)
- [GitHub Issues](https://github.com/railwayapp/issues)

### Troubleshooting
- Check Railway status page
- Review application logs
- Test with Railway CLI locally
