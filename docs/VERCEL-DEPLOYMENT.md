# Vercel Deployment Guide

## Overview
GreenRoute can be deployed on Vercel using serverless functions. This setup provides a mock API for demonstration purposes since the full SQLite database requires a persistent server.

## Deployment Steps

### 1. Connect Repository to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Connect your GitHub repository
3. Select the GreenRoute repository

### 2. Configure Environment Variables
No additional environment variables required for the mock deployment.

### 3. Deploy
Vercel will automatically detect the `vercel.json` configuration and deploy:
- Frontend from `/frontend` directory
- API from `/api` directory as serverless functions

## Limitations

### Mock API Only
- No persistent database (uses in-memory mock data)
- No real GPS tracking
- No real-time updates
- Demo data resets on each deployment

### Full Features Require
For complete functionality with SQLite database and real-time features, deploy to:
- **VPS/DigitalOcean**: Full Node.js server
- **Heroku**: With PostgreSQL database
- **AWS EC2**: With RDS database
- **Docker**: Containerized deployment

## API Endpoints (Mock)

### Authentication
- `POST /api/auth/signup` - Create user account
- `POST /api/auth/signin` - User login
- `POST /api/auth/driver-signin` - Driver login

### Rides
- `GET /api/rides/available` - Get available rides
- `POST /api/rides/create` - Create new ride
- `PUT /api/rides/driver/:driverId` - Update driver location

### Bookings
- `POST /api/bookings/create` - Create booking
- `GET /api/bookings/passenger/:passengerId` - Get passenger bookings

## Testing the Deployment

1. Visit your Vercel URL
2. Navigate to passenger or driver apps
3. Test signup/signin functionality
4. Create mock rides and bookings

## Production Deployment

For production with full features:

```bash
# Deploy to VPS
git clone https://github.com/your-username/greenroute.git
cd greenroute
npm install
npm run production
```

Or use Docker:
```bash
docker build -t greenroute .
docker run -p 3001:3001 greenroute
```

## Support

For issues with Vercel deployment:
- Check Vercel logs for function errors
- Verify `vercel.json` configuration
- Ensure all dependencies are in `api/package.json`
