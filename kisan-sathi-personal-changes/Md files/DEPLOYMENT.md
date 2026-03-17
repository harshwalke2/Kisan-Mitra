# KAISAN Deployment Guide

This guide will help you deploy KAISAN in different environments.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Docker Setup](#docker-setup)
3. [Production Deployment](#production-deployment)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Windows Users

**Step 1: Download and Install**

1. Install Python 3.9+ from [python.org](https://www.python.org/downloads/)
2. Install Node.js 14+ from [nodejs.org](https://nodejs.org/)

**Step 2: Run Setup Script**

```bash
# Open Command Prompt and navigate to project folder
cd d:\Code\temp\kaisan
setup.bat
```

**Step 3: Start Services**

Terminal 1 - Backend:
```bash
venv\Scripts\activate
python app.py
```

Terminal 2 - Frontend:
```bash
cd frontend
npm start
```

Open http://localhost:3000 in your browser.

### macOS/Linux Users

**Step 1: Install Dependencies**

```bash
# Install Python via Homebrew
brew install python@3.9

# Install Node.js via Homebrew
brew install node
```

**Step 2: Run Setup Script**

```bash
chmod +x setup.sh
./setup.sh
```

**Step 3: Start Services**

Terminal 1 - Backend:
```bash
source venv/bin/activate
python app.py
```

Terminal 2 - Frontend:
```bash
cd frontend
npm start
```

---

## Docker Setup

### Prerequisites

- Docker ([Download](https://www.docker.com/products/docker-desktop))
- Docker Compose

### Build and Run

```bash
# Build and start all services
docker-compose up --build

# For background execution
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## Production Deployment

### Option 1: AWS Elastic Beanstalk

#### Backend Deployment

```bash
# Install EB CLI
pip install awsebcli

# Initialize EB application
eb init -p python-3.9 kaisan-backend

# Create environment
eb create kaisan-prod

# Deploy
eb deploy

# Open in browser
eb open
```

#### Frontend Deployment

```bash
# Build React app
cd frontend
npm run build

# Deploy to S3 + CloudFront using AWS CLI
aws s3 sync build/ s3://kaisan-frontend-bucket
```

### Option 2: Heroku

#### Backend

```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create kaisan-backend

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

**Procfile** (already configured):
```
web: gunicorn app:app
```

#### Frontend

```bash
# Build
cd frontend
npm run build

# Deploy to Vercel
npx vercel
```

### Option 3: DigitalOcean App Platform

```bash
# Install doctl
doctl auth init

# Create app from app.yaml
doctl apps create --spec app.yaml

# Monitor deployment
doctl apps describe <app-id>
```

**app.yaml** (place in root directory):
```yaml
name: kaisan-app
services:
  - name: backend
    github:
      repo: your-username/kaisan
      branch: main
    build_command: pip install -r requirements.txt
    run_command: gunicorn app:app
    http_port: 5000
  
  - name: frontend
    github:
      repo: your-username/kaisan
      branch: main
      source_dir: frontend
    build_command: npm install && npm run build
    http_port: 3000
    source_type: GITHUB
```

### Option 4: Self-Hosted VPS (DigitalOcean/Linode/AWS EC2)

1. **Setup Server**
```bash
# SSH into your server
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y

# Install Python and Node
apt install python3.9 python3.9-venv nodejs npm -y

# Install Nginx
apt install nginx -y

# Install Certbot for SSL
apt install certbot python3-certbot-nginx -y
```

2. **Deploy Application**
```bash
# Clone repository
git clone your-repo-url /var/www/kaisan
cd /var/www/kaisan

# Setup Python virtual env
python3.9 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd frontend
npm install
npm run build
cd ..
```

3. **Configure Nginx**

Create `/etc/nginx/sites-available/kaisan`:
```nginx
upstream flask_backend {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name your_domain.com www.your_domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your_domain.com www.your_domain.com;

    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;

    # Frontend
    location / {
        alias /var/www/kaisan/frontend/build/;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://flask_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static {
        alias /var/www/kaisan/frontend/build/static;
        expires 30d;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/kaisan /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

4. **Setup SSL Certificate**
```bash
certbot certonly --nginx -d your_domain.com
```

5. **Run Backend with PM2**
```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'kaisan-backend',
    script: './venv/bin/python app.py',
    env: {
      FLASK_ENV: 'production'
    }
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

---

## Testing

### Backend Testing

```bash
# Test API endpoints
curl http://localhost:5000/api/health

# Test crop recommendation
curl -X POST http://localhost:5000/api/recommend-crop \
  -H "Content-Type: application/json" \
  -d '{
    "nitrogen": 50,
    "phosphorus": 40,
    "potassium": 60,
    "temperature": 25,
    "humidity": 75,
    "ph": 6.5,
    "rainfall": 150
  }'
```

### Frontend Testing

```bash
cd frontend

# Run unit tests
npm test

# Build for production
npm run build

# Analyze bundle size
npm install -g webpack-bundle-analyzer
npx webpack-bundle-analyzer frontend/build/static/js/main.*.js
```

### Load Testing

```bash
# Install Apache Bench
apt install apache2-utils

# Test API endpoint
ab -n 1000 -c 10 http://localhost:5000/api/health

# For more comprehensive testing
apt install jmeter
```

---

## Performance Optimization

### Backend Optimization

1. **Enable Caching**
```python
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@app.route('/api/market-insights/<crop>')
@cache.cached(timeout=3600)  # Cache for 1 hour
def market_insights(crop):
    # ...
```

2. **Database Connection Pooling**
```python
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 10,
    'pool_recycle': 3600,
    'pool_pre_ping': True,
}
```

3. **Compression**
```python
from flask_compress import Compress
Compress(app)
```

### Frontend Optimization

1. **Code Splitting**
```javascript
// Already configured in React Router
const Home = lazy(() => import('./pages/Home'));
const Recommendations = lazy(() => import('./pages/RecommendationPage'));
```

2. **Image Optimization**
- Use WebP format
- Lazy load images
- Use CDN for static assets

---

## Security Measures

### Backend

1. **Environment Variables**
```python
from dotenv import load_dotenv
import os

load_dotenv()
SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
```

2. **Rate Limiting**
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(app, key_func=get_remote_address)

@app.route('/api/recommend-crop', methods=['POST'])
@limiter.limit("10 per minute")
def recommend_crop():
    # ...
```

3. **Input Validation**
- Already implemented in RecommendationPage.jsx
- Validate on backend too

### Frontend

1. **HTTPS Only** - Use SSL/TLS certificates
2. **CORS** - Already configured in Flask
3. **Content Security Policy** - Add CSP headers

---

## Monitoring & Logging

### Setup Monitoring

```bash
# Install PM2 Plus for monitoring
pm2 plus

# Access dashboard at app.pm2.io
```

### Enable Logging

```python
# In app.py
import logging
from logging.handlers import RotatingFileHandler

if not app.debug:
    file_handler = RotatingFileHandler('kaisan.log', 
                                      maxBytes=10240000, 
                                      backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s'
    ))
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
```

---

## Troubleshooting

### Models Not Loading
```bash
# Check if model files exist
ls -la data/models/

# Verify file permissions
chmod 644 data/models/*.pkl
```

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

### CORS Issues
- Ensure backend is running on port 5000
- Check CORS configuration in app.py
- Clear browser cache

### Out of Memory
- Reduce model batch size
- Implement pagination
- Use data streaming for large datasets

---

## Backup & Recovery

```bash
# Backup data
tar -czf kaisan-backup.tar.gz data/

# Backup database (if using)
pg_dump kaisan_db > backup.sql

# Restore
pg_restore -d kaisan_db backup.sql
```

---

## Support & Resources

- GitHub Issues: Report bugs and features
- Documentation: See README.md
- API Docs: Available at /api endpoint
- ML Model Info: /api/model-info endpoint

---

**Happy Deploying! 🚀**
