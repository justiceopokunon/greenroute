#!/bin/bash

# GreenRoute Application Startup Script
# This script starts the application with all necessary fixes

echo "🚀 Starting GreenRoute Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Kill any existing processes on ports 3000 and 3001
echo "🔄 Cleaning up existing processes..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "node debug-server.js" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create data directory if it doesn't exist
mkdir -p data

# Initialize database
echo "🗄️ Initializing database..."
node -e "
const { initDB } = require('./db');
initDB().then(() => {
    console.log('✅ Database initialized successfully');
    process.exit(0);
}).catch(err => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
});
" || {
    echo "❌ Database initialization failed"
    exit 1
}

# Start the server
echo "🌐 Starting server on port 3001..."
echo "📍 Server will be available at: http://localhost:3001"
echo "📍 API endpoints available at: http://localhost:3001/api"
echo "📍 Frontend available at: http://localhost:3001"
echo ""
echo "🔧 Test commands:"
echo "  curl http://localhost:3001/api/health"
echo "  curl http://localhost:3001/api/rides/available"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Start server with error handling
node server.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Test if server is running
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Server started successfully!"
    echo "🌍 Open your browser and navigate to: http://localhost:3001"
else
    echo "❌ Server failed to start. Checking for errors..."
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Wait for server process
wait $SERVER_PID
