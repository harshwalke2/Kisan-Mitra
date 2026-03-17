# AgroConnect Deployment Guide

This guide covers deployment options for the AgroConnect platform.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Deployment](#local-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment](#cloud-deployment)
   - [AWS Deployment](#aws-deployment)
   - [Google Cloud Platform](#google-cloud-platform)
   - [Azure Deployment](#azure-deployment)
5. [Database Setup](#database-setup)
6. [Environment Configuration](#environment-configuration)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Docker (optional)
- Domain name (for production)
- SSL certificate (for production)

## Local Deployment

### Frontend
```bash
cd app
npm install
npm run build
# Serve dist/ folder with any static server
npx serve -s dist -l 3000
```

### Backend
```bash
cd backend
npm install
npm run build
npm start
```

## Docker Deployment

### Using Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./app
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://backend:5000

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=agroconnect
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=agroconnect
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

### Build and Deploy
```bash
# Build all services
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Cloud Deployment

### AWS Deployment

#### Using Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize EB
eb init -p node.js agroconnect

# Create environment
eb create agroconnect-production

# Deploy
eb deploy
```

#### Using ECS (Elastic Container Service)
1. Push Docker images to ECR
2. Create ECS cluster
3. Define task definitions
4. Create services
5. Configure Application Load Balancer

#### Using EC2
```bash
# Launch EC2 instance (Ubuntu 22.04)
# SSH into instance
ssh -i key.pem ubuntu@ec2-instance-ip

# Install dependencies
sudo apt update
sudo apt install -y nodejs npm postgresql nginx

# Clone repository
git clone https://github.com/your-repo/agroconnect.git
cd agroconnect

# Setup backend
cd backend
npm install
npm run build

# Setup frontend
cd ../app
npm install
npm run build

# Configure Nginx
sudo cp deployment/nginx.conf /etc/nginx/sites-available/agroconnect
sudo ln -s /etc/nginx/sites-available/agroconnect /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Start application with PM2
sudo npm install -g pm2
cd ../backend
pm2 start dist/server.js --name agroconnect-api
pm2 startup
pm2 save
```

### Google Cloud Platform

#### Using Cloud Run
```bash
# Build and push container
gcloud builds submit --tag gcr.io/PROJECT-ID/agroconnect-backend

# Deploy to Cloud Run
gcloud run deploy agroconnect-backend \
  --image gcr.io/PROJECT-ID/agroconnect-backend \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated
```

#### Using GKE (Google Kubernetes Engine)
```bash
# Create cluster
gcloud container clusters create agroconnect-cluster \
  --zone asia-south1-a \
  --num-nodes 3

# Get credentials
gcloud container clusters get-credentials agroconnect-cluster --zone asia-south1-a

# Apply Kubernetes manifests
kubectl apply -f k8s/
```

### Azure Deployment

#### Using App Service
```bash
# Login to Azure
az login

# Create resource group
az group create --name agroconnect-rg --location centralindia

# Create App Service plan
az appservice plan create \
  --name agroconnect-plan \
  --resource-group agroconnect-rg \
  --sku P1V2 \
  --is-linux

# Create web app
az webapp create \
  --name agroconnect-api \
  --resource-group agroconnect-rg \
  --plan agroconnect-plan \
  --runtime "NODE|18-lts"

# Deploy code
az webapp deployment source config-zip \
  --resource-group agroconnect-rg \
  --name agroconnect-api \
  --src backend.zip
```

## Database Setup

### PostgreSQL on RDS (AWS)
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier agroconnect-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20
```

### PostgreSQL on Cloud SQL (GCP)
```bash
# Create Cloud SQL instance
gcloud sql instances create agroconnect-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=asia-south1

# Set password
gcloud sql users set-password postgres \
  --instance=agroconnect-db \
  --password=YOUR_PASSWORD
```

## Environment Configuration

### Production Environment Variables
```env
# Server
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://agroconnect.com

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_NAME=agroconnect
DB_SSL=true

# JWT
JWT_SECRET=your-super-secure-random-string-min-32-chars
JWT_EXPIRES_IN=7d

# Redis (for caching & sessions)
REDIS_URL=redis://localhost:6379

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=agroconnect-uploads
AWS_REGION=ap-south-1

# Email Service (SendGrid/AWS SES)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@agroconnect.com

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-twilio-number

# External APIs
WEATHER_API_KEY=your-weather-api-key
AI_API_KEY=your-ai-api-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

## SSL/TLS Setup

### Using Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d agroconnect.com -d www.agroconnect.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name agroconnect.com www.agroconnect.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name agroconnect.com www.agroconnect.com;

    ssl_certificate /etc/letsencrypt/live/agroconnect.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agroconnect.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/agroconnect/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Monitoring & Logging

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name agroconnect-api

# Monitor
pm2 monit

# View logs
pm2 logs agroconnect-api

# Setup startup script
pm2 startup
pm2 save
```

### Using New Relic
```bash
# Install agent
npm install newrelic

# Add to server.ts
import 'newrelic';
```

## Backup & Recovery

### Database Backup
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres agroconnect > /backups/agroconnect_$DATE.sql

# Upload to S3
aws s3 cp /backups/agroconnect_$DATE.sql s3://agroconnect-backups/

# Keep only last 30 days
find /backups -name "agroconnect_*.sql" -mtime +30 -delete
```

### Restore from Backup
```bash
# Restore database
psql -h localhost -U postgres -d agroconnect < backup_file.sql
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DB_HOST and credentials
   - Verify PostgreSQL is running
   - Check firewall rules

2. **Port Already in Use**
   ```bash
   # Find process using port
   sudo lsof -i :5000
   # Kill process
   sudo kill -9 <PID>
   ```

3. **Permission Denied**
   ```bash
   # Fix permissions
   sudo chown -R $USER:$USER /var/www/agroconnect
   chmod -R 755 /var/www/agroconnect
   ```

4. **Out of Memory**
   - Increase Node.js memory limit
   ```bash
   node --max-old-space-size=4096 dist/server.js
   ```

### Health Check
```bash
# Check API health
curl https://api.agroconnect.com/api/health

# Check database
psql -h localhost -U postgres -c "SELECT 1" agroconnect

# Check disk space
df -h

# Check memory
free -h
```

## Performance Optimization

### Database Optimization
```sql
-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_crop_listings_status ON crop_listings(status);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Analyze tables
ANALYZE;
```

### CDN Setup
- Use CloudFlare or AWS CloudFront
- Cache static assets
- Enable compression
- Use HTTP/2

## Scaling

### Horizontal Scaling
- Use load balancer (AWS ALB/Nginx)
- Multiple backend instances
- Database read replicas
- Redis cluster

### Vertical Scaling
- Increase server resources
- Database connection pooling
- Optimize queries

## Security Checklist

- [ ] Use HTTPS only
- [ ] Enable HSTS
- [ ] Set secure cookies
- [ ] Implement rate limiting
- [ ] Use strong JWT secrets
- [ ] Regular security updates
- [ ] Database encryption at rest
- [ ] Backup encryption
- [ ] Access logging
- [ ] DDoS protection

---

For support, contact: devops@agroconnect.com
