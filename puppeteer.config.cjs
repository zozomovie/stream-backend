const { join } = require('path');

/**
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  // Changes the cache directory where Puppeteer downloads Chrome
  cacheDir: join(__dirname, '.cache', 'puppeteer'),
};