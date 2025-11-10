#!/bin/bash

# Security Monitoring Deployment Script
# This script deploys and configures the security monitoring and alerting system

set -e

echo "========================================="
echo "Security Monitoring Deployment"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    print_info "Creating .env from .env.example..."
    cp .env.example .env
    print_warning "Please configure .env file with your settings"
    exit 1
fi

print_success ".env file found"

# Check required environment variables
print_info "Checking required environment variables..."

required_vars=(
    "DATABASE_URL"
    "REDIS_URL"
    "SECURITY_ALERT_EMAILS"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

print_success "All required environment variables are set"

# Check if Node.js is installed
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
print_success "Node.js $(node --version) found"

# Check if npm is installed
print_info "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm --version) found"

# Install dependencies
print_info "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Check if Redis is running
print_info "Checking Redis connection..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        print_success "Redis is running"
    else
        print_warning "Redis is not responding. Please start Redis server."
        print_info "You can start Redis with: redis-server"
    fi
else
    print_warning "redis-cli not found. Please ensure Redis is installed and running."
fi

# Run database migrations
print_info "Running database migrations..."
npx prisma migrate deploy
print_success "Database migrations completed"

# Build the application
print_info "Building application..."
npm run build
print_success "Application built successfully"

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    mkdir -p logs
    print_success "Created logs directory"
fi

# Test security monitoring endpoints
print_info "Testing security monitoring configuration..."

# Start the server in background for testing
print_info "Starting server for configuration test..."
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test if server is running
if ps -p $SERVER_PID > /dev/null; then
    print_success "Server started successfully (PID: $SERVER_PID)"
    
    # Stop test server
    kill $SERVER_PID
    wait $SERVER_PID 2>/dev/null
    print_info "Test server stopped"
else
    print_error "Server failed to start"
    exit 1
fi

echo ""
echo "========================================="
echo "Deployment Summary"
echo "========================================="
print_success "Security monitoring system deployed successfully!"
echo ""
print_info "Next steps:"
echo "  1. Configure email/SMS providers in .env"
echo "  2. Review security thresholds in server/src/config/securityMonitoring.ts"
echo "  3. Start the server: npm start"
echo "  4. Access security dashboard: http://localhost:3000/admin/security-monitoring"
echo "  5. Test alert generation: POST /api/security-monitoring/test-alert"
echo ""
print_info "Documentation:"
echo "  - Deployment Guide: server/docs/security-monitoring-deployment.md"
echo "  - Training Guide: server/docs/security-team-training.md"
echo ""
print_warning "Important: Configure notification channels before production use!"
echo ""
