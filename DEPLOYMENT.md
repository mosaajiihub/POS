# Mosaajii POS Deployment Guide

This guide covers deployment options for the Mosaajii POS system, from development to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Development Deployment](#development-deployment)
4. [Production Deployment](#production-deployment)
5. [Database Setup](#database-setup)
6. [Security Configuration](#security-configuration)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended for production)
- **Storage**: 20GB minimum (SSD recommended)
- **Network**: Stable internet connection for API integrations

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)

## Environment Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Database Configuration
POSTGRES_PASSWORD=your-secure-postgres-password
DATABASE_URL=postgresql://mosaajii:your-secure-postgres-password@postgres:5432/mosaajii_pos

# Redis Configuration
REDIS_PASSWORD=your-secure-redis-password
REDIS_URL=redis://:your-secure-redis-password@redis:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=24h

# API Configuration
CLIENT_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS Configuration (Optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Payment Gateway (Optional)
PAYMENT_GATEWAY_PROVIDER=stripe
PAYMENT_GATEWAY_API_KEY=your-payment-gateway-key
PAYMENT_GATEWAY_WEBHOOK_SECRET=your-webhook-secret

# File Upload Configuration
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Production Environment Variables

For production, ensure you use strong, unique values:

```bash
# Generate secure passwords
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 16  # For database passwords
```

## Development Deployment

### Quick Start with Docker Compose

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd mosaajii-pos
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development environment**:
   ```bash
   docker-compose up -d
   ```

4. **Initialize the database**:
   ```bash
   docker-compose exec api npm run db:migrate
   docker-compose exec api npm run db:seed
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - API: http://localhost:5000
   - API Documentation: http://localhost:5000/docs

### Local Development (Without Docker)

1. **Install dependencies**:
   ```bash
   # Backend
   cd server
   npm install
   
   # Frontend
   cd ../client
   npm install
   ```

2. **Set up databases**:
   ```bash
   # PostgreSQL
   createdb mosaajii_pos
   
   # Redis (start service)
   redis-server
   ```

3. **Run database migrations**:
   ```bash
   cd server
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development servers**:
   ```bash
   # Backend (terminal 1)
   cd server
   npm run dev
   
   # Frontend (terminal 2)
   cd client
   npm run dev
   ```

## Production Deployment

### Docker Compose Production

1. **Prepare production environment**:
   ```bash
   # Create production directory
   mkdir /opt/mosaajii-pos
   cd /opt/mosaajii-pos
   
   # Copy application files
   git clone <repository-url> .
   ```

2. **Configure production environment**:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Set up SSL certificates**:
   ```bash
   mkdir -p nginx/ssl
   # Copy your SSL certificates to nginx/ssl/
   # cert.pem and key.pem
   ```

4. **Deploy with production profile**:
   ```bash
   docker-compose --profile production up -d
   ```

5. **Initialize production database**:
   ```bash
   docker-compose exec api npm run db:migrate
   # Don't run seed in production unless needed
   ```

### Manual Production Deployment

#### Backend Deployment

1. **Prepare server**:
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Deploy backend**:
   ```bash
   cd /opt/mosaajii-pos/server
   npm ci --production
   npm run build
   
   # Start with PM2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

#### Frontend Deployment

1. **Build frontend**:
   ```bash
   cd /opt/mosaajii-pos/client
   npm ci
   npm run build
   ```

2. **Configure Nginx**:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/mosaajii-pos
   sudo ln -s /etc/nginx/sites-available/mosaajii-pos /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Database Setup

### PostgreSQL Configuration

1. **Create database and user**:
   ```sql
   CREATE DATABASE mosaajii_pos;
   CREATE USER mosaajii WITH ENCRYPTED PASSWORD 'your-password';
   GRANT ALL PRIVILEGES ON DATABASE mosaajii_pos TO mosaajii;
   ```

2. **Optimize PostgreSQL for production**:
   ```bash
   # Edit postgresql.conf
   shared_buffers = 256MB
   effective_cache_size = 1GB
   maintenance_work_mem = 64MB
   checkpoint_completion_target = 0.9
   wal_buffers = 16MB
   default_statistics_target = 100
   random_page_cost = 1.1
   effective_io_concurrency = 200
   ```

3. **Create recommended indexes**:
   ```bash
   docker-compose exec api npm run db:optimize
   ```

### Redis Configuration

1. **Configure Redis for production**:
   ```bash
   # redis.conf
   maxmemory 256mb
   maxmemory-policy allkeys-lru
   save 900 1
   save 300 10
   save 60 10000
   ```

## Security Configuration

### SSL/TLS Setup

1. **Obtain SSL certificates**:
   ```bash
   # Using Let's Encrypt
   sudo certbot certonly --nginx -d yourdomain.com
   ```

2. **Configure SSL in Nginx**:
   ```nginx
   ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
   ```

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Block direct access to backend port
sudo ufw deny 5000/tcp
```

### Security Headers

The Nginx configuration includes security headers:
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security
- Content-Security-Policy

## Monitoring and Maintenance

### Health Checks

The application includes health check endpoints:
- Frontend: `GET /health`
- Backend: `GET /health`
- Database: Automatic connection testing

### Logging

Logs are stored in:
- Application logs: `./logs/`
- Nginx logs: `/var/log/nginx/`
- Docker logs: `docker-compose logs`

### Backup Strategy

1. **Database backups**:
   ```bash
   # Daily backup script
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   docker-compose exec -T postgres pg_dump -U mosaajii mosaajii_pos > backup_$DATE.sql
   
   # Keep only last 7 days
   find . -name "backup_*.sql" -mtime +7 -delete
   ```

2. **File backups**:
   ```bash
   # Backup uploads and logs
   tar -czf backup_files_$DATE.tar.gz uploads/ logs/
   ```

### Performance Monitoring

1. **Monitor application metrics**:
   ```bash
   # Check API performance
   curl http://localhost:5000/health
   
   # Monitor Docker containers
   docker stats
   ```

2. **Database performance**:
   ```bash
   # Check slow queries
   docker-compose exec api npm run db:analyze
   ```

### Updates and Maintenance

1. **Update application**:
   ```bash
   git pull origin main
   docker-compose build
   docker-compose up -d
   ```

2. **Database migrations**:
   ```bash
   docker-compose exec api npm run db:migrate
   ```

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   ```bash
   # Check database status
   docker-compose exec postgres pg_isready -U mosaajii
   
   # Check connection string
   echo $DATABASE_URL
   ```

2. **Redis connection errors**:
   ```bash
   # Test Redis connection
   docker-compose exec redis redis-cli ping
   ```

3. **Frontend build errors**:
   ```bash
   # Clear cache and rebuild
   cd client
   rm -rf node_modules dist
   npm install
   npm run build
   ```

4. **SSL certificate issues**:
   ```bash
   # Check certificate validity
   openssl x509 -in cert.pem -text -noout
   
   # Test SSL configuration
   nginx -t
   ```

### Performance Issues

1. **Slow API responses**:
   - Check database query performance
   - Review API endpoint caching
   - Monitor server resources

2. **High memory usage**:
   - Check for memory leaks in logs
   - Restart services if needed
   - Review cache configurations

3. **Database performance**:
   - Run `ANALYZE` on tables
   - Check for missing indexes
   - Monitor connection pool usage

### Log Analysis

```bash
# View application logs
docker-compose logs -f api

# View Nginx access logs
tail -f nginx/logs/access.log

# View error logs
tail -f nginx/logs/error.log
```

## Support

For additional support:
1. Check the application logs
2. Review this deployment guide
3. Contact the development team
4. Submit issues to the project repository

---

**Note**: Always test deployments in a staging environment before deploying to production.