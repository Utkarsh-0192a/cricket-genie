# Cricket Chatbot Deployment Guide

## Prerequisites

### System Requirements
- Node.js 16.x or higher
- npm or yarn package manager
- At least 512MB RAM
- 1GB free disk space

### API Keys Required
- **Grok API Key**: Get from [Grok Console](https://console.grok.ai/)
- **Cricket API Key** (optional): For enhanced cricket data

## Quick Deployment

### 1. Clone and Setup
```bash
# Clone the repository (if from git)
git clone <repository-url>
cd cricfan

# Or if you have the project files
cd /path/to/cricfan

# Run the automated deployment script
./deploy.sh
```

### 2. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment file with your API keys
nano .env
```

Required environment variables:
```env
GROQ_API_KEY=your_actual_grok_api_key
NODE_ENV=production
PORT=3000
LOGGING_ENABLED=false
```

### 3. Start the Server
```bash
# Production mode
npm start

# Or with PM2 for production
npm install -g pm2
pm2 start server.js --name cricfan-chatbot
```

## Manual Deployment

### Step 1: Install Dependencies
```bash
npm ci --only=production
```

### Step 2: Create Required Directories
```bash
mkdir -p logs config docs tests
```

### Step 3: Set Environment Variables
Create a `.env` file with the following minimum configuration:
```env
GROQ_API_KEY=your_grok_api_key_here
NODE_ENV=production
PORT=3000
LOGGING_ENABLED=false
LOG_LEVEL=error
```

### Step 4: Test the Application
```bash
# Start the server
npm start

# In another terminal, run health check
node tests/health-check.js
```

## Docker Deployment

### Build and Run with Docker
```bash
# Build the Docker image
docker build -t cricfan-chatbot .

# Run the container
docker run -p 3000:3000 \
  -e GROQ_API_KEY=your_api_key \
  -e NODE_ENV=production \
  cricfan-chatbot
```

### Using Docker Compose
```bash
# Start with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

## Production Considerations

### 1. Process Management
Use a process manager like PM2 for production:
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 2. Reverse Proxy Setup (Nginx)
Create an Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. SSL/TLS Certificate
```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 4. Firewall Configuration
```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
LOGGING_ENABLED=true
LOG_LEVEL=debug
LOG_TO_CONSOLE=true
```

### Staging
```env
NODE_ENV=staging
LOGGING_ENABLED=true
LOG_LEVEL=info
LOG_TO_FILE=true
```

### Production
```env
NODE_ENV=production
LOGGING_ENABLED=false
LOG_LEVEL=error
LOG_TO_FILE=false
LOG_TO_CONSOLE=false
```

## Monitoring and Maintenance

### 1. Log Management
```bash
# View real-time logs
npm run logs

# Rotate logs (setup logrotate)
sudo nano /etc/logrotate.d/cricfan
```

### 2. Health Monitoring
- Health check endpoint: `GET http://localhost:3000/`
- API health: `node tests/health-check.js`
- Monitor with external services like UptimeRobot

### 3. Performance Monitoring
- Use PM2 monitoring: `pm2 monit`
- Set up application performance monitoring (APM)
- Monitor server resources (CPU, Memory, Disk)

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using the port
   sudo lsof -i :3000
   
   # Kill the process or use a different port
   PORT=3001 npm start
   ```

2. **API key not working**
   - Verify the API key in Google AI Studio
   - Check if the key has proper permissions
   - Ensure the key is correctly set in `.env`

3. **Memory issues**
   - Increase server memory
   - Optimize concurrent extraction settings
   - Monitor memory usage with `htop`

4. **Slow response times**
   - Check network connectivity
   - Reduce `SEARCH_RESULTS_COUNT`
   - Decrease `MAX_CONCURRENT_EXTRACTIONS`

### Log Analysis
```bash
# Check error logs
grep -i error logs/*.log

# Monitor API requests
grep -i "POST /api/chat" logs/*.log

# Check performance metrics
grep -i "response_time" logs/*.log
```

## Scaling Considerations

### Horizontal Scaling
- Use a load balancer (nginx, HAProxy)
- Deploy multiple instances
- Share session state (if implemented)

### Vertical Scaling
- Increase server resources
- Optimize database queries (if using database)
- Enable caching mechanisms

### Performance Optimization
- Implement response caching
- Use CDN for static assets
- Optimize search and extraction timeouts
- Implement request queuing for high traffic

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use secure environment variable management
   - Rotate API keys regularly

2. **Network Security**
   - Use HTTPS in production
   - Implement rate limiting
   - Set up proper CORS policies

3. **Application Security**
   - Keep dependencies updated
   - Implement input validation
   - Use security headers

4. **Infrastructure Security**
   - Regular security updates
   - Firewall configuration
   - Monitor for suspicious activity

## Backup and Recovery

### Data Backup
- Backup configuration files
- Export environment variables
- Backup logs (if needed)

### Recovery Plan
- Document restore procedures
- Test recovery processes
- Keep multiple deployment environments

This deployment guide should help you successfully deploy the Cricket Chatbot in various environments. For specific issues or advanced configurations, refer to the troubleshooting section or create an issue in the project repository.
