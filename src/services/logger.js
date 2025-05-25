/**
 * Professional logging system for cricket chatbot
 * Can be easily turned on/off and supports different log levels
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.enabled = options.enabled !== false; // Default enabled
        this.level = options.level || 'info'; // debug, info, warn, error
        this.logToFile = options.logToFile !== false; // Default log to file
        this.logToConsole = options.logToConsole !== false; // Default log to console
        this.logDir = options.logDir || path.join(__dirname, 'logs');
        this.maxLogFiles = options.maxLogFiles || 5;
        this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
        
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        // Create logs directory if it doesn't exist
        if (this.logToFile && !fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    _shouldLog(level) {
        return this.enabled && this.levels[level] >= this.levels[this.level];
    }

    _formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (data) {
            return `${logMessage} ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`;
        }
        
        return logMessage;
    }

    _writeToFile(level, formattedMessage) {
        if (!this.logToFile) return;

        try {
            const logFile = path.join(this.logDir, `cricfan-${new Date().toISOString().split('T')[0]}.log`);
            
            // Check file size and rotate if necessary
            if (fs.existsSync(logFile)) {
                const stats = fs.statSync(logFile);
                if (stats.size > this.maxLogSize) {
                    this._rotateLogFiles();
                }
            }

            fs.appendFileSync(logFile, formattedMessage + '\n');
        } catch (error) {
            // Fallback to console if file writing fails
            console.error('Failed to write to log file:', error.message);
        }
    }

    _rotateLogFiles() {
        try {
            const files = fs.readdirSync(this.logDir)
                .filter(file => file.startsWith('cricfan-') && file.endsWith('.log'))
                .sort()
                .reverse();

            // Keep only the most recent files
            if (files.length >= this.maxLogFiles) {
                const filesToDelete = files.slice(this.maxLogFiles - 1);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(path.join(this.logDir, file));
                });
            }
        } catch (error) {
            console.error('Failed to rotate log files:', error.message);
        }
    }

    debug(message, data = null) {
        if (!this._shouldLog('debug')) return;
        
        const formatted = this._formatMessage('debug', message, data);
        
        if (this.logToConsole) {
            console.debug('\x1b[36m%s\x1b[0m', formatted); // Cyan
        }
        
        this._writeToFile('debug', formatted);
    }

    info(message, data = null) {
        if (!this._shouldLog('info')) return;
        
        const formatted = this._formatMessage('info', message, data);
        
        if (this.logToConsole) {
            console.info('\x1b[32m%s\x1b[0m', formatted); // Green
        }
        
        this._writeToFile('info', formatted);
    }

    warn(message, data = null) {
        if (!this._shouldLog('warn')) return;
        
        const formatted = this._formatMessage('warn', message, data);
        
        if (this.logToConsole) {
            console.warn('\x1b[33m%s\x1b[0m', formatted); // Yellow
        }
        
        this._writeToFile('warn', formatted);
    }

    error(message, data = null) {
        if (!this._shouldLog('error')) return;
        
        const formatted = this._formatMessage('error', message, data);
        
        if (this.logToConsole) {
            console.error('\x1b[31m%s\x1b[0m', formatted); // Red
        }
        
        this._writeToFile('error', formatted);
    }

    // Specific methods for cricket chatbot components
    search(message, data = null) {
        this.debug(`[SEARCH] ${message}`, data);
    }

    extraction(message, data = null) {
        this.debug(`[EXTRACTION] ${message}`, data);
    }

    ai(message, data = null) {
        this.debug(`[AI] ${message}`, data);
    }

    api(message, data = null) {
        this.info(`[API] ${message}`, data);
    }

    // Method to temporarily disable logging
    disable() {
        this.enabled = false;
    }

    // Method to enable logging
    enable() {
        this.enabled = true;
    }

    // Method to change log level at runtime
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
        }
    }
}

// Create singleton instance with environment-based configuration
const logger = new Logger({
    enabled: process.env.LOGGING_ENABLED !== 'false',
    level: process.env.LOG_LEVEL || 'info',
    logToFile: process.env.LOG_TO_FILE !== 'false',
    logToConsole: process.env.LOG_TO_CONSOLE !== 'false'
});

module.exports = logger;
