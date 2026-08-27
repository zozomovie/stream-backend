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
        console.log("Launching Local Chrome to capture stream...");
        
        // Render ke liye updated puppeteer configuration
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--disable-gpu"
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
        });

        const page = await browser.newPage();
        
        let streamUrl = null;

        // Network requests ko intercept karke m3u8 link pakadne ke liye
        page.on('request', (request) => {
            const reqUrl = request.url();
            if (reqUrl.includes('.m3u8') || reqUrl.includes('playlist')) {
                streamUrl = reqUrl;
            }
        });

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Thoda wait karein taaki stream request trigger ho jaye
        await new Promise(resolve => setTimeout(resolve, 5000));

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
        console.error("Error launching browser:", error);
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});