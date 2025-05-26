const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

// Generate a random User-Agent similar to Lynx
function getUserAgent() {
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const lynx = `Lynx/${rand(2,3)}.${rand(8,9)}.${rand(0,2)}`;
  const libwww = `libwww-FM/${rand(2,3)}.${rand(13,15)}`;
  const sslmm = `SSL-MM/${rand(1,2)}.${rand(3,5)}`;
  const openssl = `OpenSSL/${rand(1,3)}.${rand(0,4)}.${rand(0,9)}`;
  return `${lynx} ${libwww} ${sslmm} ${openssl}`;
}

// Map timeframe strings to Google tbs param
function buildTbs(timeframe) {
  if (!timeframe) return null;
  const map = { h: 'h', d: 'd', w: 'w', m: 'm', y: 'y' };
  const cleaned = timeframe.trim().toLowerCase();
  // formats: 'h','3h','2 days', etc.
  const simple = /^(\d+)?([hdwmy])$/.exec(cleaned);
  if (simple) {
    const amount = simple[1] || '';
    return `qdr:${simple[2]}${amount}`;
  }
  const match = /^(\d+)\s+(hour|hours|day|days|week|weeks|month|months|year|years)$/.exec(cleaned);
  if (match) {
    const amt = match[1];
    const unitText = match[2];
    const unit = unitText.startsWith('hour') ? 'h'
               : unitText.startsWith('day') ? 'd'
               : unitText.startsWith('week') ? 'w'
               : unitText.startsWith('month') ? 'm'
               : 'y';
    return `qdr:${unit}${amt}`;
  }
  return null;
}

// Helper for delay
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPage(term, start, num, opts) {
  // Rate limiting with jitter
  const baseDelay = opts.sleepInterval || 1000;
  const jitter = Math.random() * baseDelay;
  await sleep(baseDelay + jitter);
  const params = {
    q: term,
    num: num + 2,
    hl: opts.lang || 'en',
    start,
    safe: opts.safe || 'active',
    gl: opts.region || 'in', // Default region India
  };
  const tbs = buildTbs(opts.timeframe);
  if (tbs) params.tbs = tbs;

  const response = await axios.get('https://www.google.com/search', {
    params,
    headers: {
      'User-Agent': getUserAgent(),
      'Accept': '*/*',
      'Accept-Language': 'en-IN,en;q=0.9',
      'Referer': 'https://www.google.com/',
      'Cookie': 'CONSENT=PENDING+987; SOCS=CAESHAgBEhIaAB'
    },
    timeout: opts.timeout || 5000,
    proxy: opts.proxy ? {
      protocol: opts.proxy.startsWith('https') ? 'https' : 'http',
      host: opts.proxy.replace(/^https?:\/\//, '')
    } : false,
    httpsAgent: new https.Agent({ rejectUnauthorized: opts.sslVerify !== false }),
  });

  const $ = cheerio.load(response.data);
  const results = [];

  $('div.ezO2md').each((_, el) => {
    const a = $(el).find('a[href]').first();
    const spanTitle = a.find('span.CVA68e').first();
    const spanDesc = $(el).find('span.FrIlee').first();
    if (!a.length || !spanTitle.length || !spanDesc.length) return;
    let url = a.attr('href').replace('/url?q=', '').split('&')[0];
    url = decodeURIComponent(url);
    const title = spanTitle.text();
    const desc = spanDesc.text();
    results.push(opts.advanced ? { url, title, description: desc } : url);
  });

  return results;
}

/**
 * Search Google in parallel and return results.
 * @param {string} term - Query term
 * @param {number} numResults - Number of results to fetch
 * @param {object} opts - Optional settings
 * @returns {Promise<Array>} - Array of URLs or objects
 */
async function search(term, numResults = 10, opts = {}) {
  // Set defaults for region, timeframe, and rate limiting
  opts.region = opts.region || 'in';
  opts.timeframe = opts.timeframe || '1 month';
  opts.sleepInterval = opts.sleepInterval || 1000;
  const perPage = 10;
  const starts = [];
  for (let i = 0; i < numResults; i += perPage) {
    starts.push(i);
  }
  const pages = await Promise.all(
    starts.map(start => fetchPage(term, start, perPage, opts))
  );
  const flat = pages.flat();
  const unique = opts.unique ? Array.from(new Set(flat.map(r => typeof r === 'string' ? r : r.url))) : null;
  if (opts.unique) {
    // rebuild structured objects if advanced
    return unique.slice(0, numResults).map(u => {
      if (opts.advanced) return flat.find(r => r.url === u);
      return u;
    });
  }
  return flat.slice(0, numResults);
}

// If run as a script, perform a test search and print results
if (require.main === module) {
  (async () => {
    const term = process.argv[2] || 'best camping site in free fire bermuda map';
    const num = parseInt(process.argv[3], 10) || 5;
    const opts = { advanced: true, timeframe: '1 month' };
    try {
      const results = await search(term, num, opts);
      console.log(results);
    } catch (err) {
      console.error('Error during search:', err);
    }
  })();
}

module.exports = { search };
