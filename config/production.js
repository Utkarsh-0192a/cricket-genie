module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development'
  },

  // API Configuration
  api: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    cricketApiKey: process.env.CRICKET_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    timeout: parseInt(process.env.API_TIMEOUT) || 30000
  },

  // Logging Configuration
  logging: {
    enabled: process.env.LOGGING_ENABLED !== 'false',
    level: process.env.LOG_LEVEL || 'info',
    toFile: process.env.LOG_TO_FILE === 'true',
    toConsole: process.env.LOG_TO_CONSOLE !== 'false',
    directory: './logs'
  },

  // Content Extraction Configuration
  extraction: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_EXTRACTIONS) || 3,
    timeout: parseInt(process.env.EXTRACTION_TIMEOUT) || 45000,
    retries: parseInt(process.env.EXTRACTION_RETRIES) || 3,
    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },

  // Search Configuration
  search: {
    resultsCount: parseInt(process.env.SEARCH_RESULTS_COUNT) || 5,
    timeout: parseInt(process.env.SEARCH_TIMEOUT) || 10000
  },

  // Security Configuration
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_CREDENTIALS === 'true'
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // limit each IP to 100 requests per windowMs
    }
  }
};
