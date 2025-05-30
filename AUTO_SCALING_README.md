# Auto-scaling Setup for DOS Project

This document explains how to use the auto-scaling capabilities implemented for the catalog and order services.

## Overview

The auto-scaling solution uses Docker Swarm to provide:
- **Horizontal scaling** of catalog and order services
- **Load balancing** through nginx with automatic service discovery
- **Health monitoring** with automatic restart of failed containers
- **Resource management** with CPU and memory limits
- **Rolling updates** with zero downtime

## Quick Start

### 1. Deploy with Auto-scaling (Production)

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy the application with auto-scaling
./scripts/deploy.sh
```

This will:
- Initialize Docker Swarm (if not already done)
- Build the application images
- Deploy with 3 catalog replicas and 3 order replicas
- Set up nginx load balancer with 2 replicas

### 2. Development Mode

For local development with single replicas:

```bash
# Use regular docker-compose (uses override file automatically)
docker-compose up --build
```

## Scaling Operations

### Manual Scaling

Scale services up or down as needed:

```bash
# Scale catalog service to 5 replicas
./scripts/scale.sh catalog 5

# Scale order service to 3 replicas
./scripts/scale.sh order 3

# Scale nginx to 2 replicas for high availability
./scripts/scale.sh nginx 2

# Scale down to 1 replica (minimum)
./scripts/scale.sh catalog 1
```

### Monitoring

Monitor your services in real-time:

```bash
# Single monitoring snapshot
./scripts/monitor.sh

# Continuous monitoring (updates every 30 seconds)
./scripts/monitor.sh --continuous
```

The monitor provides:
- Service replica counts and health status
- Memory and CPU usage metrics
- Recent logs from each service
- Auto-scaling recommendations

## Service Endpoints

### Health Checks
- Catalog: `http://localhost/catalog-server/health`
- Order: `http://localhost/order-server/health`
- Client: `http://localhost/health` (via nginx)
- Nginx: `http://localhost/health`

### Metrics
- Catalog: `http://localhost/catalog-server/metrics`
- Order: `http://localhost/order-server/metrics`
- Client: `http://localhost/metrics` (via nginx)

### Application Endpoints
- Main application: `http://localhost/`
- Catalog search: `http://localhost/catalog-server/search/{topic}`
- Catalog info: `http://localhost/catalog-server/info/{id}`
- Order purchase: `http://localhost/order-server/purchase`

## Configuration

### Resource Limits

Each service has configured resource limits:

**Catalog & Order Services:**
- CPU Limit: 1.0 cores
- Memory Limit: 1GB
- CPU Reservation: 0.5 cores
- Memory Reservation: 512MB

**Nginx & Client:**
- CPU Limit: 0.5 cores
- Memory Limit: 256-512MB
- CPU Reservation: 0.25 cores
- Memory Reservation: 128-256MB

### Default Replica Counts

**Production (docker-swarm.yml):**
- Catalog: 3 replicas
- Order: 3 replicas
- Nginx: 2 replicas
- Client: 1 replica
- Redis: 1 replica

**Development (docker-compose.yml):**
- All services: 1 replica each

## Advanced Operations

### View Service Status

```bash
# List all services
docker service ls

# View service details
docker service ps dos-app_catalog-server
docker service ps dos-app_order-server

# View service logs
docker service logs dos-app_catalog-server
docker service logs dos-app_order-server
```

### Update Services

```bash
# Update a service (rolling update)
docker service update dos-app_catalog-server

# Update with new image
docker service update --image dos-project:latest dos-app_catalog-server
```

### Remove Stack

```bash
# Remove the entire application stack
docker stack rm dos-app

# Leave swarm mode (optional)
docker swarm leave --force
```

## Load Balancing

Nginx automatically load balances requests across all available replicas:

- **Round-robin** distribution by default
- **Health checks** ensure traffic only goes to healthy instances
- **Automatic failover** if a replica becomes unhealthy
- **Connection pooling** with keepalive for better performance

## Troubleshooting

### Service Won't Start

1. Check service logs:
   ```bash
   docker service logs dos-app_catalog-server
   ```

2. Check resource constraints:
   ```bash
   docker node ls
   docker node inspect <node-id>
   ```

3. Verify health checks:
   ```bash
   curl http://localhost/catalog-server/health
   ```

### Scaling Issues

1. Check available resources:
   ```bash
   docker system df
   docker system prune  # Clean up if needed
   ```

2. Verify swarm status:
   ```bash
   docker info | grep Swarm
   docker node ls
   ```

### Performance Issues

1. Monitor resource usage:
   ```bash
   ./scripts/monitor.sh --continuous
   ```

2. Check nginx status:
   ```bash
   curl http://localhost/nginx-status
   ```

3. Scale up if needed:
   ```bash
   ./scripts/scale.sh catalog 5
   ./scripts/scale.sh order 5
   ```

## Files Structure

```
├── docker-compose.yml          # Base configuration with scaling support
├── docker-compose.override.yml # Development overrides
├── docker-swarm.yml           # Production swarm configuration
├── nginx/default.conf         # Nginx configuration with load balancing
└── scripts/
    ├── deploy.sh             # Deployment script
    ├── scale.sh              # Scaling script
    └── monitor.sh            # Monitoring script
```

## Best Practices

1. **Start with minimal replicas** and scale up based on load
2. **Monitor regularly** using the monitoring script
3. **Use health checks** to ensure service reliability
4. **Set appropriate resource limits** to prevent resource exhaustion
5. **Test scaling operations** in development before production
6. **Keep nginx replicas** at least 2 for high availability
7. **Monitor logs** for any scaling-related issues

## Next Steps

Consider implementing:
- **Prometheus + Grafana** for advanced monitoring
- **Automatic scaling** based on CPU/memory metrics
- **Service mesh** (like Istio) for advanced traffic management
- **Kubernetes** for production-grade orchestration
