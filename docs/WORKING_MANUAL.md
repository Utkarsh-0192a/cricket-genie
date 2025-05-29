# Cricket Genie - Working Manual & Technical Guide

## 📖 Table of Contents
1. [System Overview](#system-overview)
2. [Installation & Setup](#installation--setup)
3. [Configuration Management](#configuration-management)
4. [Architecture & Components](#architecture--components)
5. [API Integration Guide](#api-integration-guide)
6. [Development Workflow](#development-workflow)
7. [Deployment Procedures](#deployment-procedures)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Best Practices](#best-practices)

## 🏗️ System Overview

Cricket Genie is a production-ready AI-powered cricket chatbot that leverages Grok AI (X.AI) for intelligent conversations and advanced web scraping for real-time cricket data. The system follows a microservices-inspired architecture with clear separation of concerns.

### Core Workflow
```
User Input → Chat API → Grok AI → Search Query → Content Extraction → AI Response → User
```

### Technology Stack
- **Runtime**: Node.js 18+ with Express.js framework
- **AI Provider**: Grok API (X.AI) with Meta Llama 4 Scout 17B model
- **Web Scraping**: Puppeteer with stealth plugins and bot detection bypass
- **Content Processing**: Mozilla Readability, Cheerio, JSDOM
- **Search Engine**: DuckDuckGo HTML search integration
- **Frontend**: Vanilla JavaScript with modern CSS and streaming responses

## 🚀 Installation & Setup

### Prerequisites
```bash
# Check Node.js version (requires 16+)
node --version

# Check npm version
npm --version

# Verify system requirements
free -h  # Check available RAM (4GB+ recommended)
```

### Step 1: Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd cricket-genie

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 2: Environment Configuration
```bash
# Create environment file
cp .env.example .env

# Edit configuration (use your preferred editor)
nano .env
```

Required environment variables:
```env
# Grok AI Configuration
GROQ_API_KEY=your_grok_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=production
HOST=localhost

# Performance Tuning
MAX_CONCURRENT_EXTRACTIONS=3
EXTRACTION_TIMEOUT=45000
SEARCH_TIMEOUT=10000
SEARCH_RESULTS_COUNT=5

# Logging Configuration
LOGGING_ENABLED=false
LOG_LEVEL=error
LOG_TO_FILE=false
LOG_TO_CONSOLE=false

# Security Settings
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
CORS_ORIGIN=*
```

### Step 3: Verification
```bash
# Run health checks
npm test

# Start development server
npm run dev

# Test API endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test cricket query"}'
```

## ⚙️ Configuration Management

### Environment-Specific Configs

#### Development Configuration
```env
NODE_ENV=development
LOGGING_ENABLED=true
LOG_LEVEL=debug
LOG_TO_CONSOLE=true
LOG_TO_FILE=true
```

#### Production Configuration
```env
NODE_ENV=production
LOGGING_ENABLED=false
LOG_LEVEL=error
LOG_TO_CONSOLE=false
LOG_TO_FILE=false
```

### Configuration Files

#### 1. Production Config (`config/production.js`)
```javascript
module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development'
  },
  api: {
    grokApiKey: process.env.GROQ_API_KEY,
    grokModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
    timeout: 30000
  },
  // ... additional configurations
};
```

#### 2. PM2 Ecosystem (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [{
    name: 'cricket-genie',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      LOGGING_ENABLED: false
    }
  }]
};
```

## 🏛️ Architecture & Components

### Directory Structure
```
cricket-genie/
├── server.js                 # Main application server
├── package.json              # Dependencies and scripts
├── ecosystem.config.js       # PM2 configuration
├── docker-compose.yml        # Docker orchestration
├── Dockerfile                # Container definition
├── deploy.sh                 # Deployment automation
├── config/
│   └── production.js         # Production settings
├── src/
│   ├── routes/
│   │   ├── api.js           # Main API routes with Grok integration
│   │   └── apigemi.js       # Legacy Gemini routes (deprecated)
│   └── services/
│       ├── content-extractor.js  # Web scraping service
│       ├── search.js             # DuckDuckGo search service
│       ├── googleSearch.js       # Google search service (backup)
│       └── logger.js             # Logging service
├── public/
│   └── index.html           # Frontend interface
├── docs/                    # Documentation
├── tests/                   # Test suites
└── logs/                    # Application logs
```

### Core Components

#### 1. API Layer (`src/routes/api.js`)
**Purpose**: Main chat endpoint with Grok AI integration
**Key Functions**:
- Message processing and validation
- Chat history management
- Grok API communication
- Response streaming support

**Code Example**:
```javascript
// Main chat endpoint
router.post('/chat', async (req, res) => {
  const { message, chatHistory = [default_chat_history] } = req.body;
  
  // Generate search query using Grok
  const result = await generateCricketResponse(message, chatHistory);
  
  // Generate final response
  const finalAnswer = await generateFinalAnswer(message, result.extractedContent, chatHistory);
  
  res.json({ reply: finalAnswer, timestamp: new Date().toISOString() });
});
```

#### 2. Content Extraction Service (`src/services/content-extractor.js`)
**Purpose**: Advanced web scraping with bot detection bypass
**Key Features**:
- Puppeteer with stealth plugins
- Multiple extraction strategies
- Content cleaning and processing
- Error handling and retries

**Usage Example**:
```javascript
const ContentExtractor = require('./src/services/content-extractor');
const extractor = new ContentExtractor();

const result = await extractor.extractSingle('https://cricbuzz.com/article');
if (result.success) {
  console.log('Extracted content:', result.data.content);
}
```

#### 3. Search Service (`src/services/search.js`)
**Purpose**: DuckDuckGo search integration with result filtering
**Key Features**:
- HTML search parsing
- Cricket-specific filtering
- Bot detection bypass
- Result validation

#### 4. Logging Service (`src/services/logger.js`)
**Purpose**: Structured logging with multiple levels and components
**Features**:
- Component-specific logging (api, search, extraction, ai)
- Configurable log levels
- File and console output
- JSON structured format

## 🔌 API Integration Guide

### Grok AI Integration

#### Authentication Setup
```javascript
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
```

#### API Call Function
```javascript
async function callGroqAPI(messages) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: messages
    })
  });
  
  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

#### Request Format
```javascript
const messages = [
  {
    role: "user",
    content: "Generate a cricket search query for: latest IPL scores"
  }
];

const response = await callGroqAPI(messages);
```

### API Endpoints

#### POST `/api/chat`
**Purpose**: Main chat interface
**Request**:
```json
{
  "message": "What's the latest cricket score?",
  "chatHistory": [
    {
      "user": "Previous question",
      "assistant": "Previous response"
    }
  ]
}
```

**Response**:
```json
{
  "reply": "Here are the latest cricket scores...",
  "timestamp": "2025-05-29T10:30:00.000Z"
}
```

**Error Handling**:
```json
{
  "error": "Message is required",
  "details": "Additional error information (development only)"
}
```

## 💻 Development Workflow

### Local Development Setup
```bash
# Start development server with logging
npm run dev

# Monitor logs in real-time
tail -f logs/cricfan-$(date +%Y-%m-%d).log

# Run in debug mode
DEBUG=* npm run dev
```

### Code Structure Guidelines

#### 1. Route Handlers
```javascript
// Always include error handling
router.post('/endpoint', async (req, res) => {
  try {
    // Main logic here
    const result = await processRequest(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Endpoint error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});
```

#### 2. Service Functions
```javascript
// Use proper logging
async function serviceFunction(params) {
  logger.info('Service function called', { params });
  
  try {
    const result = await processData(params);
    logger.info('Service function completed', { result: result.summary });
    return result;
  } catch (error) {
    logger.error('Service function failed', { error: error.message, params });
    throw error;
  }
}
```

#### 3. Error Handling Pattern
```javascript
// Consistent error handling
function handleError(error, context) {
  logger.error(`Error in ${context}`, {
    error: error.message,
    stack: error.stack,
    context
  });
  
  // Return user-friendly message
  return process.env.NODE_ENV === 'development' 
    ? error.message 
    : 'An error occurred while processing your request';
}
```

### Testing Procedures

#### Unit Tests
```bash
# Run health checks
npm test

# Test specific endpoint
node tests/health-check.js

# Test with specific message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'
```

#### Load Testing
```bash
# Install load testing tools
npm install -g artillery

# Run load test
artillery quick --count 10 --num 5 http://localhost:3000/api/chat
```

### Code Quality Standards

#### ESLint Configuration
```json
{
  "extends": ["eslint:recommended"],
  "env": {
    "node": true,
    "es6": true
  },
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "prefer-const": "error"
  }
}
```

#### Pre-commit Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm test"
```

## 🚀 Deployment Procedures

### Method 1: Standard Deployment
```bash
# Production deployment script
./deploy.sh

# Manual deployment steps
npm ci --only=production
npm run prod

# Verify deployment
curl -f http://localhost:3000/ || echo "Deployment failed"
```

### Method 2: Docker Deployment
```bash
# Build Docker image
docker build -t cricket-genie:latest .

# Run container
docker run -d \
  --name cricket-genie \
  -p 3000:3000 \
  --env-file .env \
  cricket-genie:latest

# Using Docker Compose
docker-compose up -d

# Check container health
docker ps
docker logs cricket-genie
```

### Method 3: PM2 Process Management
```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor processes
pm2 status
pm2 logs cricket-genie

# Restart application
pm2 restart cricket-genie

# Stop application
pm2 stop cricket-genie
```

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Grok API key valid and tested
- [ ] Dependencies installed (`npm ci`)
- [ ] Health checks passing
- [ ] Logs configured appropriately
- [ ] Security settings reviewed
- [ ] Performance parameters tuned
- [ ] Backup procedures in place

## 📊 Monitoring & Maintenance

### Health Monitoring

#### Application Health Check
```bash
# Built-in health check
curl -f http://localhost:3000/ 

# Detailed API test
node tests/health-check.js

# Monitor with watch
watch -n 30 'curl -s http://localhost:3000/api/health'
```

#### System Resource Monitoring
```bash
# Monitor memory usage
ps aux | grep node

# Monitor CPU usage
top -p $(pgrep node)

# Monitor disk space
df -h

# Monitor network connections
netstat -tulpn | grep :3000
```

### Log Management

#### Log Rotation
```bash
# Manual log rotation
find logs/ -name "*.log" -mtime +7 -delete

# Setup logrotate (Linux)
sudo vi /etc/logrotate.d/cricket-genie
```

#### Log Analysis
```bash
# Error analysis
grep -i "error" logs/*.log | tail -20

# Performance analysis
grep -i "response_time" logs/*.log

# API usage analysis
grep "POST /api/chat" logs/*.log | wc -l
```

### Performance Optimization

#### Memory Management
```bash
# Monitor memory usage
node --inspect server.js

# Enable garbage collection logging
node --trace_gc server.js
```

#### Database Optimization (Future)
```javascript
// Connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000
});
```

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### 1. Grok API Connection Issues
**Symptoms**: API timeout errors, authentication failures
**Solutions**:
```bash
# Verify API key
echo $GROQ_API_KEY

# Test API directly
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"meta-llama/llama-4-scout-17b-16e-instruct","messages":[{"role":"user","content":"test"}]}'

# Check network connectivity
ping api.groq.com
```

#### 2. Content Extraction Failures
**Symptoms**: Empty responses, extraction timeouts
**Solutions**:
```bash
# Check Puppeteer installation
node -e "const puppeteer = require('puppeteer'); console.log('Puppeteer OK');"

# Install missing dependencies (Linux)
sudo apt-get install -y chromium-browser

# Increase timeout values
export EXTRACTION_TIMEOUT=60000
```

#### 3. High Memory Usage
**Symptoms**: Out of memory errors, slow responses
**Solutions**:
```bash
# Reduce concurrent extractions
export MAX_CONCURRENT_EXTRACTIONS=2

# Enable swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 4. Port Already in Use
**Symptoms**: EADDRINUSE error on startup
**Solutions**:
```bash
# Find process using port
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Use different port
PORT=3001 npm start
```

### Debugging Techniques

#### Enable Debug Logging
```bash
# Development mode with full logging
NODE_ENV=development LOGGING_ENABLED=true LOG_LEVEL=debug npm start

# Component-specific debugging
DEBUG=search,extraction npm start
```

#### API Testing
```bash
# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "debug test"}' \
  -v

# Test with invalid data
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{}' \
  -v
```

#### Performance Profiling
```bash
# Start with profiling
node --prof server.js

# Generate profile report
node --prof-process isolate-*.log > profile.txt
```

## 🏆 Best Practices

### Code Quality
1. **Error Handling**: Always wrap async operations in try-catch blocks
2. **Logging**: Use structured logging with appropriate levels
3. **Validation**: Validate all inputs before processing
4. **Security**: Never expose sensitive data in logs or responses

### Performance
1. **Caching**: Implement response caching for repeated queries
2. **Connection Pooling**: Use connection pools for external APIs
3. **Resource Management**: Properly close browser instances and connections
4. **Rate Limiting**: Implement appropriate rate limiting for API protection

### Security
1. **Environment Variables**: Store all secrets in environment variables
2. **Input Sanitization**: Sanitize all user inputs
3. **CORS Configuration**: Configure CORS appropriately for your domain
4. **API Key Rotation**: Regularly rotate API keys

### Deployment
1. **Health Checks**: Implement comprehensive health check endpoints
2. **Graceful Shutdown**: Handle SIGTERM and SIGINT signals properly
3. **Process Management**: Use PM2 or similar for process management
4. **Monitoring**: Implement application and infrastructure monitoring

### Maintenance
1. **Regular Updates**: Keep dependencies updated
2. **Log Rotation**: Implement log rotation to prevent disk space issues
3. **Backup Procedures**: Backup configuration and data regularly
4. **Documentation**: Keep documentation updated with changes

---

## 📞 Support & Resources

### Documentation Links
- [Grok API Documentation](https://docs.grok.ai/)
- [Puppeteer Documentation](https://pptr.dev/)
- [Express.js Guide](https://expressjs.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)

### Community Resources
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

### Emergency Contacts
- **Development Team**: utkarsh.gautam@example.com
- **System Administrator**: admin@example.com
- **Emergency Hotline**: +1-xxx-xxx-xxxx

---

**Document Version**: 2.0.0  
**Last Updated**: May 29, 2025  
**Next Review**: June 29, 2025
