const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

// Generate a random User-Agent for bot bypass
function getUserAgent() {
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const versions = [
    `Mozilla/5.0 (Windows NT ${rand(6,10)}.0; Win64; x64) AppleWebKit/${rand(500,600)}.0 (KHTML, like Gecko) Chrome/${rand(70,90)}.0.${rand(3000,4000)}.100 Safari/${rand(500,600)}.0`,
    `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/${rand(500,600)}.0 (KHTML, like Gecko) Firefox/${rand(60,90)}.0`,
    `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${rand(12,15)}_${rand(0,5)}) AppleWebKit/${rand(500,600)}.0 (KHTML, like Gecko) Safari/${rand(500,600)}.0`
  ];
  return versions[rand(0, versions.length-1)];
}

// Sleep helper for rate limiting
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Fetch a single page of DuckDuckGo HTML search
async function fetchPage(term, offset = 0, opts = {}) {
  // rate limit with jitter
  const base = opts.sleepInterval || 1000;
  await sleep(base + Math.random() * base);
  const params = { q: term, s: offset };
  const response = await axios.get('https://duckduckgo.com/html', {
    params,
    headers: {
      'User-Agent': opts.userAgent || getUserAgent(),
      'Accept': 'text/html',
      'Accept-Language': 'en-IN,en;q=0.9',
      'Referer': 'https://duckduckgo.com/',
    },
    timeout: opts.timeout || 5000,
    httpsAgent: new https.Agent({ rejectUnauthorized: opts.sslVerify !== false }),
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
 * Perform DuckDuckGo search in parallel pages
 * @param {string} term
 * @param {number} numResults
 * @param {object} opts - { advanced, unique, perPage, timeout, sslVerify, userAgent }
 * @returns {Promise<Array>}
 */
async function searchDuck(term, numResults = 10, opts = {}) {
  // default options
  opts.sleepInterval = opts.sleepInterval || 1000;
  opts.userAgent = opts.userAgent || null;
  // apply timeframe via query (DuckDuckGo has no direct param, skip)
  const perPage = opts.perPage || 20;
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
  return all.slice(0, numResults);
}

// If run as a script, perform a test search and print results
if (require.main === module) {
  (async () => {
    const term = process.argv[2] || "What is the latest score in the IPL match?";
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