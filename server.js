const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/get-stream', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).json({ error: "Please provide a 'url' query parameter." });
    }

    let browser;
    try {
        console.log("Launching cloud chromium...");
        
        // Render ke liye aws-lambda chromium setup
        const executablePath = await chromium.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH;
        
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        let streamUrl = null;

        page.on('request', (request) => {
            const reqUrl = request.url();
            if (reqUrl.includes('.m3u8') || reqUrl.includes('playlist')) {
                streamUrl = reqUrl;
            }
        });

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
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