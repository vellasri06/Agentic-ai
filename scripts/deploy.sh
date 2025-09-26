#!/bin/bash

# Production deployment script for Agentic Compliance Officer

set -e

echo "🚀 Starting deployment of Agentic Compliance Officer..."

# Configuration
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/compliance-officer-deploy.log"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Function to backup database
backup_database() {
    log "Creating database backup..."
    docker-compose exec -T db pg_dump -U compliance_user compliance_db > "$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    log "Database backup completed"
}

# Function to health check
health_check() {
    log "Performing health checks..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check backend health
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log "✅ Backend health check passed"
    else
        log "❌ Backend health check failed"
        return 1
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log "✅ Frontend health check passed"
    else
        log "❌ Frontend health check failed"
        return 1
    fi
    
    # Check database
    if docker-compose exec -T db pg_isready -U compliance_user > /dev/null 2>&1; then
        log "✅ Database health check passed"
    else
        log "❌ Database health check failed"
        return 1
    fi
    
    log "All health checks passed!"
}

# Function to rollback
rollback() {
    log "🔄 Rolling back deployment..."
    docker-compose down
    # Restore from backup if needed
    log "Rollback completed"
}

# Main deployment process
main() {
    log "Starting deployment process..."
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose pull
    
    # Backup database before deployment
    if docker-compose ps | grep -q "db.*Up"; then
        backup_database
    fi
    
    # Stop services gracefully
    log "Stopping services..."
    docker-compose down
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    # Run database migrations if needed
    log "Running database initialization..."
    docker-compose exec backend python scripts/init_database.py
    
    # Perform health checks
    if health_check; then
        log "✅ Deployment completed successfully!"
        
        # Clean up old images
        log "Cleaning up old Docker images..."
        docker image prune -f
        
        log "🎉 Deployment finished!"
    else
        log "❌ Health checks failed, initiating rollback..."
        rollback
        exit 1
    fi
}

# Trap errors and rollback
trap 'log "❌ Deployment failed, initiating rollback..."; rollback; exit 1' ERR

# Run main deployment
main

log "Deployment script completed"
