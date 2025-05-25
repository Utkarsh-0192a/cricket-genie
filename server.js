const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./src/services/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (your frontend)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', require('./src/routes/api'));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled server error', { 
        error: err.message, 
        stack: err.stack, 
        url: req.url, 
        method: req.method 
    });
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    logger.warn('Route not found', { url: req.originalUrl, method: req.method });
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    logger.info(`🏏 Fantasy Cricket Chatbot Server running on http://localhost:${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        logging: {
            enabled: process.env.LOGGING_ENABLED !== 'false',
            level: process.env.LOG_LEVEL || 'info'
        }
    });
});

module.exports = app;