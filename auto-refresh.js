const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');


// Supabase Credentials
const SUPABASE_URL = 'https://bbqaagbypawcpszjwzii.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJicWFhZ2J5cGF3Y3Bzemp3emlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzYwMTI4MiwiZXhwIjoyMTAzMTc3MjgyfQ.e4muSS7BBXW53YPxaYSXIC1_UglrOHkZdjplE86omGw'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Proxy link banane ka function
function buildHlsProxyLink(hlsUrl, videoUrl) {
  if (!hlsUrl) return '';

  const u = new URL(videoUrl);
  const m = u.pathname.match(/\/(?:e|embed)\/([^/?#]+)/i);
  const ref = m ? `${u.origin}/e/${m[1]}` : videoUrl;

  const params = new URLSearchParams();
  params.set('serve_m3u8', '1');
  params.set('ref', ref);
  params.set('url', hlsUrl);
  params.set('ebd', u.origin);

  return `https://rozgarlelo.modiplay.xyz/proxy.php?${params.toString()}`;
}

async function refreshAllMovieLinks() {
  console.log('Automated HLS link refresh shuru ho raha hai...');

  const { data: rows, error } = await supabase.from('generated_hls_links').select('*');
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

  for (const row of rows) {
    try {
      const input = row.hls_input;
      if (!input || !input.video_url) continue;

      console.log(`Refreshing stream for: ${row.movie_title}`);

      const page = await browser.newPage();
      let capturedM3u8 = '';

      // Network request intercept karenge taaki m3u8 link seedha network se mil jaye
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('.m3u8')) {
          capturedM3u8 = url;
        }
      });

      await page.goto(input.video_url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Thoda wait karenge taaki player initialize ho aur m3u8 request trigger ho
      await new Promise(r => setTimeout(r, 4000));
      await page.close();

      if (!capturedM3u8) {
        console.log(`Skipped (m3u8 not found via network): ${row.movie_title}`);
        continue;
      }

      const newProxyLink = buildHlsProxyLink(capturedM3u8, input.video_url);

      // Supabase movies table update karega
      await supabase.from('movies').update({
        video_1080: newProxyLink,
        video_720: newProxyLink,
        video_480: newProxyLink
      }).eq('tmdb_id', row.tmdb_id);

      // History update karega
      const existingLinks = Array.isArray(row.links) ? row.links : [];
      const updatedLinks = [...existingLinks, { url: newProxyLink, updated_at: new Date().toISOString(), created_at: new Date().toISOString() }];

      await supabase.from('generated_hls_links').update({
        links: updatedLinks,
        updated_at: new Date().toISOString()
      }).eq('tmdb_id', row.tmdb_id);

      console.log(`Successfully updated: ${row.movie_title}`);
    } catch (err) {
      console.error(`Failed to refresh ${row.movie_title}:`, err.message);
    }
  }

  await browser.close();
  console.log('Sabhi links refresh ho chuke hain!');
}

refreshAllMovieLinks();