const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = 5000;

// /get-stream route define kiya gaya hai
app.get('/get-stream', async (req, res) => {
    const moviePageUrl = req.query.url;
    
    if (!moviePageUrl) {
        return res.status(400).json({ error: 'Movie URL is required. Use ?url=YOUR_LINK' });
    }

    try {
        console.log('Launching Local Chrome to capture stream...');
        
        // Headless browser start karein
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        let extractedM3u8 = null;

        // Network requests ko intercept karke .m3u8 link pakdein
        page.on('request', (request) => {
            const url = request.url();
            if (url.includes('.m3u8')) {
                extractedM3u8 = url;
            }
        });

        // Target page par jayein
        await page.goto(moviePageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Thoda wait karein taaki video player load ho aur request trigger ho
        await new Promise(resolve => setTimeout(resolve, 4000));

        await browser.close();

        if (extractedM3u8) {
            console.log('Captured Live M3U8 Link!');
            return res.json({ 
                success: true, 
                m3u8_url: extractedM3u8 
            });
        } else {
            return res.status(404).json({ 
                success: false, 
                message: 'M3U8 link not found on this page.' 
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});