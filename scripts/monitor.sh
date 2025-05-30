#!/bin/bash

# Monitoring script for DOS Project auto-scaling services
# This script provides real-time monitoring and auto-scaling recommendations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_metric() {
    echo -e "${PURPLE}[METRIC]${NC} $1"
}

# Check if Docker Swarm is active
if ! docker info | grep -q "Swarm: active"; then
    print_error "Docker Swarm is not active. Please run ./scripts/deploy.sh first."
    exit 1
fi

# Function to get service metrics
get_service_metrics() {
    local service_name=$1
    local endpoint=$2
    
    echo ""
    print_status "=== $service_name Metrics ==="
    
    # Get replica count
    local replicas=$(docker service inspect $service_name --format='{{.Spec.Mode.Replicated.Replicas}}' 2>/dev/null || echo "0")
    print_metric "Current replicas: $replicas"
    
    # Get running tasks
    local running_tasks=$(docker service ps $service_name --filter "desired-state=running" --format "table {{.ID}}\t{{.Node}}\t{{.CurrentState}}" 2>/dev/null | grep -c "Running" || echo "0")
    print_metric "Running tasks: $running_tasks"
    
    # Try to get health status
    if [ ! -z "$endpoint" ]; then
        local health_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost$endpoint" 2>/dev/null || echo "000")
        if [ "$health_status" = "200" ]; then
            print_success "Health check: HEALTHY"
            
            # Get detailed metrics if available
            local metrics=$(curl -s "http://localhost$endpoint" 2>/dev/null | jq -r '.uptime, .memory.heapUsed, .memory.heapTotal' 2>/dev/null || echo "N/A N/A N/A")
            if [ "$metrics" != "N/A N/A N/A" ]; then
                local uptime=$(echo $metrics | cut -d' ' -f1)
                local heap_used=$(echo $metrics | cut -d' ' -f2)
                local heap_total=$(echo $metrics | cut -d' ' -f3)
                print_metric "Uptime: ${uptime}s"
                print_metric "Memory usage: $heap_used / $heap_total bytes"
            fi
        else
            print_warning "Health check: UNHEALTHY (HTTP $health_status)"
        fi
    fi
    
    # Show recent logs (last 5 lines)
    print_status "Recent logs:"
    docker service logs --tail 5 $service_name 2>/dev/null | sed 's/^/  /' || echo "  No logs available"
}

# Function to provide scaling recommendations
provide_recommendations() {
    echo ""
    print_status "=== Auto-scaling Recommendations ==="
    
    # Check catalog service
    local catalog_replicas=$(docker service inspect dos-app_catalog-server --format='{{.Spec.Mode.Replicated.Replicas}}' 2>/dev/null || echo "0")
    local catalog_running=$(docker service ps dos-app_catalog-server --filter "desired-state=running" --format "table {{.CurrentState}}" 2>/dev/null | grep -c "Running" || echo "0")
    
    if [ "$catalog_running" -lt "$catalog_replicas" ]; then
        print_warning "Catalog service: Some replicas are not running ($catalog_running/$catalog_replicas)"
        echo "  Recommendation: Check service health and logs"
    elif [ "$catalog_replicas" -lt 2 ]; then
        print_warning "Catalog service: Running with minimal replicas ($catalog_replicas)"
        echo "  Recommendation: Scale up for better availability: ./scripts/scale.sh catalog 3"
    else
        print_success "Catalog service: Healthy with $catalog_replicas replicas"
    fi
    
    # Check order service
    local order_replicas=$(docker service inspect dos-app_order-server --format='{{.Spec.Mode.Replicated.Replicas}}' 2>/dev/null || echo "0")
    local order_running=$(docker service ps dos-app_order-server --filter "desired-state=running" --format "table {{.CurrentState}}" 2>/dev/null | grep -c "Running" || echo "0")
    
    if [ "$order_running" -lt "$order_replicas" ]; then
        print_warning "Order service: Some replicas are not running ($order_running/$order_replicas)"
        echo "  Recommendation: Check service health and logs"
    elif [ "$order_replicas" -lt 2 ]; then
        print_warning "Order service: Running with minimal replicas ($order_replicas)"
        echo "  Recommendation: Scale up for better availability: ./scripts/scale.sh order 3"
    else
        print_success "Order service: Healthy with $order_replicas replicas"
    fi
    
    # Check nginx service
    local nginx_replicas=$(docker service inspect dos-app_nginx --format='{{.Spec.Mode.Replicated.Replicas}}' 2>/dev/null || echo "0")
    if [ "$nginx_replicas" -lt 2 ]; then
        print_warning "Nginx service: Single point of failure ($nginx_replicas replica)"
        echo "  Recommendation: Scale up for high availability: ./scripts/scale.sh nginx 2"
    else
        print_success "Nginx service: Healthy with $nginx_replicas replicas"
    fi
}

# Main monitoring loop
main() {
    clear
    echo "======================================"
    echo "   DOS Project Auto-scaling Monitor   "
    echo "======================================"
    echo "Press Ctrl+C to exit"
    echo ""
    
    while true; do
        print_status "Monitoring timestamp: $(date)"
        
        # Overall service status
        print_status "=== Service Overview ==="
        docker service ls
        
        # Individual service metrics
        get_service_metrics "dos-app_catalog-server" "/catalog-server/metrics"
        get_service_metrics "dos-app_order-server" "/order-server/metrics"
        get_service_metrics "dos-app_nginx" "/health"
        get_service_metrics "dos-app_client" "/metrics"
        
        # Provide recommendations
        provide_recommendations
        
        echo ""
        print_status "Next update in 30 seconds... (Press Ctrl+C to exit)"
        echo "======================================"
        
        sleep 30
        clear
    done
}

# Check if running in continuous mode
if [ "$1" = "--continuous" ] || [ "$1" = "-c" ]; then
    main
else
    # Single run mode
    print_status "DOS Project Auto-scaling Monitor (Single Run)"
    print_status "For continuous monitoring, use: $0 --continuous"
    echo ""
    
    # Overall service status
    print_status "=== Service Overview ==="
    docker service ls
    
    # Individual service metrics
    get_service_metrics "dos-app_catalog-server" "/catalog-server/metrics"
    get_service_metrics "dos-app_order-server" "/order-server/metrics"
    get_service_metrics "dos-app_nginx" "/health"
    get_service_metrics "dos-app_client" "/metrics"
    
    # Provide recommendations
    provide_recommendations
fi
