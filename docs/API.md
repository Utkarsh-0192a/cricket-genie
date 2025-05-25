# Cricket Chatbot API Documentation

## Overview
The Cricket Chatbot API provides endpoints for AI-powered cricket conversations with real-time web scraping capabilities.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, no authentication is required. In production, consider implementing API key authentication.

## Endpoints

### POST /api/chat
Send a message to the cricket chatbot and receive an AI-generated response.

#### Request
```http
POST /api/chat
Content-Type: application/json

{
  "message": "What's the latest cricket news?"
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | Yes | The user's message to the chatbot |

#### Response
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "response": "Here's the latest cricket news I found...",
  "searchResults": [
    {
      "title": "Cricket Match Result",
      "url": "https://example.com/cricket-news",
      "snippet": "Match summary..."
    }
  ],
  "extractedContent": [
    {
      "url": "https://example.com/cricket-news",
      "title": "Cricket News",
      "content": "Detailed cricket content...",
      "tables": []
    }
  ]
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Message is required"
}
```

**500 Internal Server Error**
```json
{
  "error": "Something went wrong!"
}
```

## Features

### 1. AI-Powered Responses
- Uses Google's Gemini AI model for generating cricket-related responses
- Contextual understanding of cricket terminology and concepts
- Provides detailed analysis and insights

### 2. Real-time Web Scraping
- Searches for cricket content from popular websites
- Extracts relevant information using DuckDuckGo search
- Processes content from multiple sources simultaneously

### 3. Content Extraction
- Extracts clean, readable content from cricket websites
- Handles complex page structures including tables
- Bypasses bot detection mechanisms
- Supports parallel processing for faster results

### 4. Search Integration
- Integrates search results with AI responses
- Provides source URLs for verification
- Filters results for cricket relevance

## Usage Examples

### Basic Cricket Query
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Who won the last India vs Australia match?"}'
```

### Player Statistics Query
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me Virat Kohli recent performance"}'
```

### Tournament Information
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "When is the next IPL season starting?"}'
```

## Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables
- Returns 429 status code when limit exceeded

## Error Handling
The API uses standard HTTP status codes:
- 200: Success
- 400: Bad Request (invalid input)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error

## Configuration
The API behavior can be configured via environment variables:
- `SEARCH_RESULTS_COUNT`: Number of search results to fetch (default: 5)
- `SEARCH_TIMEOUT`: Search timeout in milliseconds (default: 10000)
- `MAX_CONCURRENT_EXTRACTIONS`: Maximum parallel extractions (default: 3)
- `EXTRACTION_TIMEOUT`: Content extraction timeout (default: 45000)

## Monitoring
- All requests are logged (configurable)
- Health check endpoint available at `GET /`
- Error tracking and performance metrics

## Development
For development and testing:
1. Start the server: `npm run dev`
2. Run health checks: `node tests/health-check.js`
3. Monitor logs: `npm run logs`
