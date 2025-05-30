#!/bin/bash

# Auto-scaling script for DOS Project services
# Usage: ./scale.sh <service> <replicas>

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

# Check arguments
if [ $# -ne 2 ]; then
    print_error "Usage: $0 <service> <replicas>"
    echo ""
    echo "Available services:"
    echo "  catalog     - Catalog service"
    echo "  order       - Order service"
    echo "  nginx       - Nginx load balancer"
    echo "  client      - Client service"
    echo ""
    echo "Examples:"
    echo "  $0 catalog 5    # Scale catalog service to 5 replicas"
    echo "  $0 order 3      # Scale order service to 3 replicas"
    echo "  $0 nginx 2      # Scale nginx to 2 replicas"
    exit 1
fi

SERVICE=$1
REPLICAS=$2

# Validate service name
case $SERVICE in
    catalog)
        SERVICE_NAME="dos-app_catalog-server"
        ;;
    order)
        SERVICE_NAME="dos-app_order-server"
        ;;
    nginx)
        SERVICE_NAME="dos-app_nginx"
        ;;
    client)
        SERVICE_NAME="dos-app_client"
        ;;
    *)
        print_error "Invalid service name: $SERVICE"
        print_error "Valid services: catalog, order, nginx, client"
        exit 1
        ;;
esac

# Validate replicas number
if ! [[ "$REPLICAS" =~ ^[0-9]+$ ]] || [ "$REPLICAS" -lt 0 ]; then
    print_error "Replicas must be a non-negative integer"
    exit 1
fi

# Check if Docker Swarm is active
if ! docker info | grep -q "Swarm: active"; then
    print_error "Docker Swarm is not active. Please run ./scripts/deploy.sh first."
    exit 1
fi

# Check if service exists
if ! docker service inspect $SERVICE_NAME > /dev/null 2>&1; then
    print_error "Service $SERVICE_NAME does not exist. Please deploy the stack first."
    exit 1
fi

# Get current replica count
CURRENT_REPLICAS=$(docker service inspect $SERVICE_NAME --format='{{.Spec.Mode.Replicated.Replicas}}')

print_status "Current replicas for $SERVICE: $CURRENT_REPLICAS"
print_status "Scaling $SERVICE to $REPLICAS replicas..."

# Scale the service
docker service scale $SERVICE_NAME=$REPLICAS

# Wait for scaling to complete
print_status "Waiting for scaling to complete..."
sleep 10

# Show updated status
print_status "Updated service status:"
docker service ps $SERVICE_NAME

# Show overall service list
echo ""
print_status "All services status:"
docker service ls

print_success "Successfully scaled $SERVICE to $REPLICAS replicas"

# Show monitoring commands
echo ""
print_status "Monitoring commands:"
echo "  docker service logs $SERVICE_NAME                    # View logs"
echo "  docker service ps $SERVICE_NAME                      # View tasks"
echo "  docker service inspect $SERVICE_NAME                 # View detailed info"
echo "  curl http://localhost/catalog-server/health          # Check catalog health"
echo "  curl http://localhost/order-server/health            # Check order health"
echo "  curl http://localhost/health                         # Check nginx health"
