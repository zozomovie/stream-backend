const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/get-stream', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).json({ error: "Please provide a 'url' query parameter." });
    }

    let browser;
    try {
        console.log("Launching browser for dynamic page...");
        
        // Render ke liye safe browser launch config
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
        });

        const page = await browser.newPage();
        
        let streamUrl = null;

        // Jaise hi page network request karega, hum m3u8 link pakad lenge
        page.on('request', (request) => {
            const reqUrl = request.url();
            if (reqUrl.includes('.m3u8') || reqUrl.includes('playlist')) {
                streamUrl = reqUrl;
            }
        });

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Thoda wait karenge taaki player load ho aur request trigger ho
        await new Promise(resolve => setTimeout(resolve, 4000));

        await browser.close();

        if (streamUrl) {
            return res.json({ success: true, stream: streamUrl });
        } else {
            return res.status(404).json({ error: "Could not find stream link (.m3u8)." });
        }

    } catch (error) {
        if (browser) {
            await browser.close();
        }
        console.error("Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});