#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const { executablePath } = require('puppeteer');

// Add plugins for better bot bypass
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const logger = require('./logger');

/**
 * Fast, parallel content extraction system for multiple URLs
 * Handles JavaScript-rendered websites with bot detection bypass
 * Optimized for AI consumption with structured content formatting
 */

class ContentExtractor {
    constructor(options = {}) {
        this.options = {
            maxConcurrent: options.maxConcurrent || 3, // Reduced for better stability
            timeout: options.timeout || 45000, // Increased timeout
            retries: options.retries || 2, // Reduced retries as requested
            headless: options.headless !== false,
            extractImages: options.extractImages !== false,
            botBypass: true, // Always enable bot bypass
            userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: options.viewport || { width: 1920, height: 1080 },
            slowMo: options.slowMo || 100, // Add slight delay between actions
            ...options
        };

        this.browser = null;
    }

    /**
     * Initialize browser instance with advanced bot bypass settings
     */
    async initialize() {
        if (this.browser) return;

        logger.debug('Initializing browser with stealth mode');

        try {
            const browserOptions = {
                headless: this.options.headless ? 'new' : false, // Use new headless mode
                slowMo: this.options.slowMo,
                executablePath: executablePath(), // Use bundled chromium
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--enable-features=NetworkService,NetworkServiceLogging',
                    '--force-color-profile=srgb',
                    '--metrics-recording-only',
                    '--disable-default-apps',
                    '--mute-audio',
                    '--no-default-browser-check',
                    '--autoplay-policy=user-gesture-required',
                    '--disable-background-networking',
                    '--disable-client-side-phishing-detection',
                    '--disable-sync',
                    '--hide-scrollbars',
                    '--disable-extensions'
                ]
            };

            this.browser = await puppeteer.launch(browserOptions);
            
            if (!this.browser) {
                throw new Error('Failed to initialize browser - browser instance is null');
            }
            
            logger.debug('Browser initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize browser', { error: error.message });
            this.browser = null;
            throw new Error(`Browser initialization failed: ${error.message}`);
        }
    }

    /**
     * Add random delay to mimic human behavior with jitter
     */
    async randomDelay(min = 1000, max = 3000) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        const jitter = Math.random() * 500; // Add jitter
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }

    /**
     * Extract content from a single URL using Puppeteer with advanced bot bypass
     */
    async extractWithPuppeteer(url, retryCount = 0) {
        let page = null;
        
        try {
            // Ensure browser is initialized
            await this.initialize();
            
            if (!this.browser) {
                throw new Error('Browser instance is null after initialization');
            }
            
            page = await this.browser.newPage();
            
            // Advanced bot bypass configurations
            await page.setUserAgent(this.options.userAgent);
            
            // Set additional headers for better stealth
            await page.setExtraHTTPHeaders({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'max-age=0',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="120", "Chromium";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            });

            // Set viewport with realistic dimensions
            await page.setViewport(this.options.viewport);

            // Override navigator properties to avoid detection
            await page.evaluateOnNewDocument(() => {
                // Remove webdriver property
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });

                // Override the plugins property to use a custom getter
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });

                // Override the languages property to use a custom getter
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });

                // Override the permissions property
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Cypress.env('NOTIFICATION_STATE') || 'granted' }) :
                        originalQuery(parameters)
                );
            });

            logger.extraction(`Navigating to: ${url}`);

            // Navigate with realistic options
            const response = await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: this.options.timeout
            });

            if (!response.ok()) {
                throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
            }

            // Wait for content to load with random delay
            await this.randomDelay(2000, 4000);

            // Scroll page to trigger lazy loading
            await page.evaluate(() => {
                return new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;

                        if(totalHeight >= scrollHeight){
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });

            // Extract HTML content
            const html = await page.content();
            
            logger.extraction(`Successfully extracted content from: ${url}`, { 
                contentLength: html.length 
            });

            return html;

        } catch (error) {
            logger.error(`Puppeteer extraction failed for ${url}`, { 
                error: error.message, 
                retry: retryCount 
            });

            if (retryCount < this.options.retries) {
                await this.randomDelay(3000, 6000);
                return this.extractWithPuppeteer(url, retryCount + 1);
            }
            throw new Error(`Puppeteer extraction failed for ${url}: ${error.message}`);
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    /**
     * Extract content using Axios (fallback for simple pages)
     */
    async extractWithAxios(url, retryCount = 0) {
        try {
            logger.extraction(`Attempting Axios extraction for: ${url}`);

            const config = {
                timeout: this.options.timeout,
                headers: {
                    'User-Agent': this.options.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'max-age=0',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none'
                }
            };

            const response = await axios.get(url, config);
            
            logger.extraction(`Axios extraction successful for: ${url}`, { 
                contentLength: response.data.length 
            });

            return response.data;

        } catch (error) {
            logger.error(`Axios extraction failed for ${url}`, { 
                error: error.message, 
                retry: retryCount 
            });

            if (retryCount < this.options.retries) {
                await this.randomDelay(1000, 3000);
                return this.extractWithAxios(url, retryCount + 1);
            }
            throw new Error(`Axios extraction failed for ${url}: ${error.message}`);
        }
    }

    /**
     * Process HTML with Mozilla Readability for clean content extraction
     */
    processWithReadability(html, url) {
        try {
            const dom = new JSDOM(html, { url });
            const reader = new Readability(dom.window.document);
            const article = reader.parse();

            if (!article) {
                throw new Error('Readability could not parse the content');
            }

            return {
                title: article.title || '',
                content: article.textContent || '',
                html: article.content || '',
                excerpt: article.excerpt || '',
                byline: article.byline || '',
                siteName: article.siteName || '',
                length: article.length || 0
            };

        } catch (error) {
            logger.error('Readability processing failed', { error: error.message });
            throw new Error(`Readability processing failed: ${error.message}`);
        }
    }

    /**
     * Extract and structure content for AI consumption
     */
    structureContent(readabilityResult, url) {
        const structured = {
            metadata: {
                url: url,
                title: readabilityResult.title,
                siteName: readabilityResult.siteName,
                byline: readabilityResult.byline,
                length: readabilityResult.length,
                extractedAt: new Date().toISOString()
            },
            content: {
                text: this.cleanText(readabilityResult.content),
                excerpt: readabilityResult.excerpt
            }
        };

        // Extract sections and headings
        const sections = this.extractSections(readabilityResult.html);
        if (sections.length > 0) {
            structured.content.sections = sections;
        }

        // Extract tables
        const tables = this.extractTables(readabilityResult.html);
        if (tables.length > 0) {
            structured.content.tables = tables;
        }

        return structured;
    }

    /**
     * Clean and normalize text content
     */
    cleanText(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .replace(/\n\s*\n/g, '\n\n')    // Normalize line breaks
            .replace(/^\s+|\s+$/g, '')      // Trim
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars but keep printable and newlines
            .trim();
    }

    /**
     * Extract tables from HTML with structured data
     */
    extractTables(html) {
        if (!html) return [];

        try {
            const dom = new JSDOM(html);
            const document = dom.window.document;
            const tables = [];

            const tableElements = document.querySelectorAll('table');
            
            tableElements.forEach((table, tableIndex) => {
                try {
                    // Get table caption if available
                    const caption = table.querySelector('caption');
                    const tableCaption = caption ? caption.textContent.trim() : '';

                    // Extract headers
                    const headers = [];
                    const headerRows = table.querySelectorAll('thead tr, tr:first-child');
                    
                    if (headerRows.length > 0) {
                        const headerRow = headerRows[0];
                        const headerCells = headerRow.querySelectorAll('th, td');
                        headerCells.forEach(cell => {
                            headers.push(this.cleanText(cell.textContent));
                        });
                    }

                    // Extract data rows
                    const rows = [];
                    const dataRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
                    
                    // If no tbody, get all rows except potential header
                    const actualDataRows = dataRows.length > 0 ? 
                        dataRows : 
                        Array.from(table.querySelectorAll('tr')).slice(headers.length > 0 ? 1 : 0);

                    actualDataRows.forEach(row => {
                        const cells = row.querySelectorAll('td, th');
                        const rowData = [];
                        
                        cells.forEach(cell => {
                            rowData.push(this.cleanText(cell.textContent));
                        });
                        
                        if (rowData.some(cell => cell.trim() !== '')) {
                            rows.push(rowData);
                        }
                    });

                    // Only add table if it has meaningful content
                    if (rows.length > 0 || headers.length > 0) {
                        const tableData = {
                            index: tableIndex,
                            caption: tableCaption,
                            headers: headers,
                            rows: rows,
                            rowCount: rows.length,
                            columnCount: Math.max(headers.length, ...rows.map(row => row.length))
                        };

                        // Convert to structured format for better AI consumption
                        if (headers.length > 0 && rows.length > 0) {
                            tableData.structured = rows.map(row => {
                                const obj = {};
                                headers.forEach((header, index) => {
                                    obj[header] = row[index] || '';
                                });
                                return obj;
                            });
                        }

                        // Add text representation for fallback
                        tableData.textRepresentation = this.tableToText(tableData);

                        tables.push(tableData);
                    }

                } catch (error) {
                    logger.warn(`Error extracting table ${tableIndex}`, { error: error.message });
                }
            });

            return tables;

        } catch (error) {
            logger.warn('Table extraction failed', { error: error.message });
            return [];
        }
    }

    /**
     * Convert table data to readable text format
     */
    tableToText(tableData) {
        let text = '';
        
        if (tableData.caption) {
            text += `Table: ${tableData.caption}\n\n`;
        }

        if (tableData.headers.length > 0) {
            text += tableData.headers.join(' | ') + '\n';
            text += tableData.headers.map(() => '---').join(' | ') + '\n';
        }

        tableData.rows.forEach(row => {
            text += row.join(' | ') + '\n';
        });

        return text.trim();
    }

    /**
     * Extract sections and headings from HTML
     */
    extractSections(html) {
        if (!html) return [];

        try {
            const dom = new JSDOM(html);
            const document = dom.window.document;
            const sections = [];

            // Extract headings and their content
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            
            headings.forEach((heading, index) => {
                const level = parseInt(heading.tagName.substring(1));
                const title = heading.textContent.trim();
                
                if (title) {
                    // Get content until next heading of same or higher level
                    let content = '';
                    let nextElement = heading.nextElementSibling;
                    
                    while (nextElement) {
                        const nextTag = nextElement.tagName.toLowerCase();
                        if (nextTag.match(/^h[1-6]$/)) {
                            const nextLevel = parseInt(nextTag.substring(1));
                            if (nextLevel <= level) break;
                        }
                        
                        content += nextElement.textContent + ' ';
                        nextElement = nextElement.nextElementSibling;
                    }

                    sections.push({
                        level: level,
                        title: title,
                        content: this.cleanText(content)
                    });
                }
            });

            return sections;

        } catch (error) {
            logger.warn('Section extraction failed', { error: error.message });
            return [];
        }
    }

    /**
     * Extract content from a single URL
     */
    async extractSingle(url) {
        try {
            logger.extraction(`Starting extraction for: ${url}`);

            // Ensure browser is initialized
            await this.initialize();

            // Try Puppeteer first for JS-rendered content
            let html;
            try {
                html = await this.extractWithPuppeteer(url);
            } catch (puppeteerError) {
                logger.warn(`Puppeteer failed for ${url}, trying Axios`, { error: puppeteerError.message });
                html = await this.extractWithAxios(url);
            }

            // Process with Readability
            const readabilityResult = this.processWithReadability(html, url);

            // Structure content for AI consumption
            const structuredContent = this.structureContent(readabilityResult, url);

            // If no tables were found in readability result, try extracting from raw HTML
            if (!structuredContent.content.tables || structuredContent.content.tables.length === 0) {
                const rawTables = this.extractTables(html);
                if (rawTables.length > 0) {
                    structuredContent.content.tables = rawTables;
                    logger.debug(`Found ${rawTables.length} tables in raw HTML for ${url}`);
                }
            }

            logger.info(`Successfully extracted content from: ${url}`, {
                title: structuredContent.metadata.title,
                contentLength: structuredContent.content.text.length,
                tablesFound: structuredContent.content.tables?.length || 0
            });

            return {
                success: true,
                url: url,
                data: structuredContent
            };

        } catch (error) {
            logger.error(`Failed to extract content from ${url}`, { error: error.message });
            return {
                success: false,
                url: url,
                error: error.message
            };
        }
    }

    /**
     * Extract content from multiple URLs in parallel
     */
    async extractMultiple(urls) {
        if (!Array.isArray(urls)) {
            throw new Error('URLs must be an array');
        }

        try {
            await this.initialize();
        } catch (error) {
            logger.error('Failed to initialize browser for multiple extractions', { error: error.message });
            throw error;
        }

        const results = [];
        const chunks = [];

        // Split URLs into chunks for concurrent processing
        for (let i = 0; i < urls.length; i += this.options.maxConcurrent) {
            chunks.push(urls.slice(i, i + this.options.maxConcurrent));
        }

        for (const chunk of chunks) {
            const chunkPromises = chunk.map(url => this.extractSingle(url));
            const chunkResults = await Promise.allSettled(chunkPromises);
            
            chunkResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    results.push({
                        success: false,
                        url: chunk[index],
                        error: result.reason?.message || 'Unknown error'
                    });
                }
            });

            // Add delay between chunks to avoid overwhelming servers
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await this.randomDelay(2000, 5000);
            }
        }

        return results;
    }

    /**
     * Clean up resources
     */
    async close() {
        if (this.browser) {
            logger.debug('Closing browser instance');
            await this.browser.close();
            this.browser = null;
        }
    }
}

// Export for use as module
module.exports = ContentExtractor;