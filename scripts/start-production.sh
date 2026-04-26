#!/bin/bash

# Green Route - Production Startup Script
echo "Starting Green Route Production Server..."

# Check if production directory exists
if [ ! -d "production" ]; then
  echo "Production directory not found. Please run cleanup first."
  exit 1
fi

# Check if config directory exists
if [ ! -d "config" ]; then
  echo "Config directory not found. Please run cleanup first."
  exit 1
fi

# Set environment
export NODE_ENV=production
export PORT=3000
export HOST=0.0.0.0

# Create logs directory if it doesn't exist
mkdir -p logs

# Create backups directory if it doesn't exist
mkdir -p backups

# Start the production server
echo "Starting server on http://localhost:3000"
node server-production.js
