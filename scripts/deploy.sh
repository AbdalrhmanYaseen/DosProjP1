#!/bin/bash

# Auto-scaling deployment script for DOS Project
# This script deploys the application using Docker Swarm for auto-scaling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if we're in a swarm
if ! docker info | grep -q "Swarm: active"; then
    print_warning "Docker Swarm is not initialized. Initializing now..."
    docker swarm init
    print_success "Docker Swarm initialized"
else
    print_status "Docker Swarm is already active"
fi

# Build images
print_status "Building Docker images..."
docker build --target catalog-service -t dos-project:catalog .
docker build --target order-service -t dos-project:order .
docker build --target client-service -t dos-project:client .
print_success "Images built successfully"

# Deploy the stack
print_status "Deploying the application stack..."
docker stack deploy -c docker-swarm.yml dos-app

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check service status
print_status "Checking service status..."
docker service ls

# Show service details
print_status "Service details:"
echo ""
docker service ps dos-app_catalog-server
echo ""
docker service ps dos-app_order-server
echo ""
docker service ps dos-app_nginx

print_success "Deployment completed!"
print_status "You can access the application at: http://localhost"
print_status "To scale services, use: ./scripts/scale.sh <service> <replicas>"
print_status "To monitor services, use: docker service ls"
print_status "To view logs, use: docker service logs dos-app_<service-name>"

echo ""
print_status "Available scaling commands:"
echo "  ./scripts/scale.sh catalog 5    # Scale catalog service to 5 replicas"
echo "  ./scripts/scale.sh order 3      # Scale order service to 3 replicas"
echo "  ./scripts/scale.sh nginx 2      # Scale nginx to 2 replicas"
