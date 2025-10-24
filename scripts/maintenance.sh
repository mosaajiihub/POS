#!/bin/bash

# Mosaajii POS Maintenance Script
# Performs routine maintenance tasks for optimal performance

set -e

# Configuration
BACKUP_DIR="./backups"
LOG_FILE="./logs/maintenance.log"
MAX_BACKUPS=7
DATE=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE"
}

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log "Starting maintenance routine..."

# Function to check if Docker Compose is running
check_services() {
    log "Checking service status..."
    
    if ! docker-compose ps | grep -q "Up"; then
        error "Some services are not running"
        docker-compose ps
        return 1
    fi
    
    log "All services are running"
    return 0
}

# Database backup
backup_database() {
    log "Creating database backup..."
    
    local backup_file="$BACKUP_DIR/db_backup_$DATE.sql"
    
    if docker-compose exec -T postgres pg_dump -U mosaajii mosaajii_pos > "$backup_file"; then
        log "Database backup created: $backup_file"
        
        # Compress backup
        gzip "$backup_file"
        log "Database backup compressed: ${backup_file}.gz"
    else
        error "Database backup failed"
        return 1
    fi
}

# Clean old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    local deleted_count=0
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$MAX_BACKUPS -print0)
    
    if [ $deleted_count -gt 0 ]; then
        log "Deleted $deleted_count old backup files"
    else
        log "No old backups to clean up"
    fi
}

# Optimize database
optimize_database() {
    log "Optimizing database..."
    
    # Run VACUUM and ANALYZE
    docker-compose exec -T postgres psql -U mosaajii -d mosaajii_pos -c "VACUUM ANALYZE;" || {
        error "Database optimization failed"
        return 1
    }
    
    log "Database optimization completed"
}

# Clear application caches
clear_caches() {
    log "Clearing application caches..."
    
    # Clear Redis cache (keep sessions)
    docker-compose exec -T redis redis-cli --scan --pattern "cache:*" | xargs -r docker-compose exec -T redis redis-cli del || {
        warn "Failed to clear some cache entries"
    }
    
    log "Application caches cleared"
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."
    
    local usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$usage" -gt 80 ]; then
        warn "Disk usage is high: ${usage}%"
        
        # Show largest directories
        log "Largest directories:"
        du -h --max-depth=1 . | sort -hr | head -10
    else
        log "Disk usage is normal: ${usage}%"
    fi
}

# Check memory usage
check_memory() {
    log "Checking memory usage..."
    
    local mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    
    if (( $(echo "$mem_usage > 80" | bc -l) )); then
        warn "Memory usage is high: ${mem_usage}%"
    else
        log "Memory usage is normal: ${mem_usage}%"
    fi
}

# Check log file sizes
check_logs() {
    log "Checking log file sizes..."
    
    find ./logs -name "*.log" -size +100M -exec ls -lh {} \; | while read -r line; do
        warn "Large log file found: $line"
    done
    
    # Rotate logs if needed
    find ./logs -name "*.log" -size +100M -exec mv {} {}.old \; -exec touch {} \;
}

# Health check
health_check() {
    log "Performing health checks..."
    
    # Check API health
    if curl -f -s http://localhost:5000/health > /dev/null; then
        log "API health check passed"
    else
        error "API health check failed"
        return 1
    fi
    
    # Check frontend health
    if curl -f -s http://localhost:3000/health > /dev/null; then
        log "Frontend health check passed"
    else
        error "Frontend health check failed"
        return 1
    fi
    
    # Check database connectivity
    if docker-compose exec -T postgres pg_isready -U mosaajii > /dev/null; then
        log "Database connectivity check passed"
    else
        error "Database connectivity check failed"
        return 1
    fi
    
    # Check Redis connectivity
    if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
        log "Redis connectivity check passed"
    else
        error "Redis connectivity check failed"
        return 1
    fi
}

# Main execution
main() {
    log "=== Maintenance Script Started ==="
    
    # Check if services are running
    if ! check_services; then
        error "Services check failed, aborting maintenance"
        exit 1
    fi
    
    # Perform maintenance tasks
    backup_database || warn "Database backup failed"
    cleanup_backups
    optimize_database || warn "Database optimization failed"
    clear_caches
    check_disk_space
    check_memory
    check_logs
    
    # Final health check
    if health_check; then
        log "All health checks passed"
    else
        error "Some health checks failed"
    fi
    
    log "=== Maintenance Script Completed ==="
}

# Run main function
main "$@"