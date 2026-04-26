#!/bin/bash

# Green Route - Development Startup Script
echo "Starting Green Route Development Server..."

# Set environment
export NODE_ENV=development
export PORT=3000

# Start development server
echo "Starting development server on http://localhost:3000"
node server.js
