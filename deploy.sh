#!/bin/bash

# CricFan Chatbot Deployment Script
# This script sets up and deploys the cricket chatbot for production

echo "🏏 Starting CricFan Chatbot deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_status "Node.js version check passed: $(node -v)"

# Install dependencies
print_status "Installing dependencies..."
npm ci --only=production

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p config
mkdir -p docs
mkdir -p tests

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.example .env 2>/dev/null || echo "# Please configure your environment variables" > .env
    print_warning "Please configure your .env file with proper API keys and settings"
fi

# Set production environment
export NODE_ENV=production

# Run a quick health check
print_status "Running health check..."
timeout 10 node -e "
const app = require('./server.js');
const http = require('http');
const server = http.createServer(app);
server.listen(0, () => {
    console.log('Health check passed');
    server.close();
    process.exit(0);
});
server.on('error', (err) => {
    console.error('Health check failed:', err.message);
    process.exit(1);
});
"

if [ $? -eq 0 ]; then
    print_status "Health check passed"
else
    print_error "Health check failed"
    exit 1
fi

print_status "✅ CricFan Chatbot deployment completed successfully!"
print_status "To start the server, run: npm start"
print_status "Server will be available at: http://localhost:${PORT:-3000}"

echo ""
echo "🏏 Cricket Chatbot is ready for action!"
echo "   Features:"
echo "   - AI-powered cricket conversations"
echo "   - Real-time web scraping"
echo "   - Content extraction from cricket websites"
echo "   - Production-ready logging and monitoring"
echo ""
echo "📚 Check the README.md for detailed usage instructions"
echo "🔧 Configure your .env file with proper API keys"
echo "📊 Monitor logs in the ./logs directory"
