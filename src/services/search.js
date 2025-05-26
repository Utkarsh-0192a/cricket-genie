const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const googleSearch = require('./googleSearch');

// Generate a random User-Agent for bot bypass (expanded pool)
function getUserAgent() {
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const chromeVer = `${rand(90,120)}.0.${rand(3000,6000)}.${rand(100,200)}`;
  const firefoxVer = `${rand(80,120)}.0`;
  const safariVer = `${rand(500,610)}.0`;
  const osxVer = `${rand(12,15)}_${rand(0,9)}`;
  const uaList = [
    `Mozilla/5.0 (Windows NT ${rand(6,11)}.0; Win64; x64) AppleWebKit/${safariVer} (KHTML, like Gecko) Chrome/${chromeVer} Safari/${safariVer}`,
    `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/${safariVer} (KHTML, like Gecko) Chrome/${chromeVer} Safari/${safariVer}`,
    `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${osxVer}) AppleWebKit/${safariVer} (KHTML, like Gecko) Chrome/${chromeVer} Safari/${safariVer}`,
    `Mozilla/5.0 (Windows NT ${rand(6,11)}.0; Win64; x64; rv:${firefoxVer}) Gecko/20100101 Firefox/${firefoxVer}`,
    `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:${firefoxVer}) Gecko/20100101 Firefox/${firefoxVer}`,
    `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${osxVer}; rv:${firefoxVer}) Gecko/20100101 Firefox/${firefoxVer}`,
    // Mobile user agents
    `Mozilla/5.0 (Linux; Android ${rand(8,13)}; SM-G${rand(950,999)}F) AppleWebKit/${safariVer} (KHTML, like Gecko) Chrome/${chromeVer} Mobile Safari/${safariVer}`,
    `Mozilla/5.0 (iPhone; CPU iPhone OS ${rand(13,17)}_${rand(0,9)} like Mac OS X) AppleWebKit/${safariVer} (KHTML, like Gecko) CriOS/${chromeVer} Mobile/15E148 Safari/${safariVer}`
  ];
  return uaList[rand(0, uaList.length-1)];
}

// Add more bot bypass headers and cookies
function getBotBypassHeaders(opts = {}) {
  return {
    'User-Agent': opts.userAgent || getUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="120", "Chromium";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    // Add more cookies for bot bypass
    'Cookie': opts.cookie || 'CONSENT=PENDING+987; _ddg1=; _ga=; _gid=; _gat=1; _gat_gtag_UA_123456_1=1; _fbp=fb.1.1234567890.1234567890; _gcl_au=1.1.1234567890.1234567890;'
  };
}

// Sleep helper for rate limiting
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Fetch a single page of DuckDuckGo HTML search
async function fetchPage(term, offset = 0, opts = {}) {
  // rate limit with jitter and random sleep to mimic human behavior
  const base = opts.sleepInterval || 1000;
  await sleep(base + Math.random() * base + Math.random() * 500);
  // Add region and recency filter to query
  let query = term;
  // Add recency filter for last 3 months (DuckDuckGo does not have a direct param, so append to query)
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const yyyy = threeMonthsAgo.getFullYear();
  const mm = String(threeMonthsAgo.getMonth() + 1).padStart(2, '0');
  const dd = String(threeMonthsAgo.getDate()).padStart(2, '0');
  // Add after:YYYY-MM-DD to query for recency (DuckDuckGo supports this as a search operator)
  query += ` after:${yyyy}-${mm}-${dd}`;
  // Add region to query (DuckDuckGo supports region:in for India)
  query += ' region:in';
  const params = { q: query, s: offset };
  const response = await axios.get('https://duckduckgo.com/html', {
    params,
    headers: getBotBypassHeaders(opts),
    timeout: opts.timeout || 5000,
    httpsAgent: new https.Agent({ rejectUnauthorized: opts.sslVerify !== false }),
    // Optionally, follow up to 5 redirects
    maxRedirects: 5,
    validateStatus: status => status >= 200 && status < 400
  });
  const $ = cheerio.load(response.data);
  const results = [];
  $('div.result').each((_, el) => {
    const a = $(el).find('a.result__a').first();
    if (!a.length) return;
    const url = a.attr('href');
    const title = a.text();
    const desc = $(el).find('.result__snippet').first().text();
    results.push(opts.advanced ? { url, title, description: desc } : url);
  });
  return results;
}

/**
 * Perform DuckDuckGo search in parallel pages, fallback to Google if needed
 * @param {string} term
 * @param {number} numResults
 * @param {object} opts - { advanced, unique, perPage, timeout, sslVerify, userAgent }
 * @returns {Promise<Array>}
 */
async function searchDuck(term, numResults = 6, opts = {}) {
  opts.sleepInterval = opts.sleepInterval || 1000;
  opts.userAgent = opts.userAgent || null;
  // Set perPage to 6 for only 6 results
  const perPage = opts.perPage || 10;
  const offsets = [];
  for (let i = 0; i < numResults; i += perPage) offsets.push(i);
  const pages = await Promise.all(offsets.map(off => fetchPage(term, off, opts)));
  let all = pages.flat();
  if (opts.unique) {
    const seen = new Set();
    all = all.filter(item => {
      const key = typeof item === 'string' ? item : item.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  // Fallback to Google search if no valid DuckDuckGo results
  const isSearchEngineRedirect = url => {
    if (!url) return false;
    // Remove escaping for correct regex
    return /(?:google\\?.com|bing\\?.com|yahoo\\?.com|search\\?.|duckduckgo\\?.com|ask\\?.com|startpage\\?.com|yandex\\?.com|baidu\\?.com)/i.test(url) ||
           /[?&]q=/.test(url) || // URLs with search queries (common in search engine redirects)
           /\/search\?/.test(url); // URLs containing /search?
  };
  const hasValidUrl = all.some(item => {
    const url = typeof item === 'string' ? item : item.url;
    return url && !isSearchEngineRedirect(url);
  });
  if (!all.length || !hasValidUrl) {
    // fallback to Google search
    if (opts.fallbackToGoogle !== false) {
      const googleOpts = { ...opts, region: 'in', timeframe: '3 months', perPage: numResults };
      const googleResults = await googleSearch.search(term, numResults, googleOpts);
      return googleResults;
    }
  }
  // Remove search engine redirect results
  all = all.filter(item => {
    const url = typeof item === 'string' ? item : item.url;
    return url && !isSearchEngineRedirect(url);
  });
  return all.slice(0, numResults);
}

// If run as a script, perform a test search and print results
if (require.main === module) {
  (async () => {
    const term = process.argv[2] || 'Orange Cap in IPL 2023';
    const num = parseInt(process.argv[3], 10) || 5;
    const opts = { advanced: true, unique: true };
    try {
      const results = await searchDuck(term, num, opts);
      console.log(results);
    } catch (err) {
      console.error('Error during DuckDuckGo search:', err);
    }
  })();
}

module.exports = { searchDuck };