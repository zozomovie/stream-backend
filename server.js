const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/get-stream', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).json({ error: "Please provide a 'url' query parameter." });
    }

    try {
        console.log("Fetching page content without browser...");
        
        // Target page ka HTML fetch kar rahe hain
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': targetUrl
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        let streamUrl = null;

        // HTML ya scripts ke andar .m3u8 link dhundhne ka logic
        // Yahan hum script tags ya source tags check kar rahe hain
        $('script').each((i, element) => {
            const scriptContent = $(element).html();
            if (scriptContent) {
                // Regular expression se m3u8 link extract karna
                const match = scriptContent.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
                if (match) {
                    streamUrl = match[0];
                }
            }
        });

        // Agar script mein nahi mila toh source/iframe tags check karte hain
        if (!streamUrl) {
            $('source').each((i, element) => {
                const src = $(element).attr('src');
                if (src && src.includes('.m3u8')) {
                    streamUrl = src;
                }
            });
        }

        if (streamUrl) {
            return res.json({ success: true, stream: streamUrl });
        } else {
            // Fallback: Agar page ke andar direct text mein m3u8 ho
            const rawMatch = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
            if (rawMatch) {
                return res.json({ success: true, stream: rawMatch[0] });
            }
            return res.status(404).json({ error: "Could not find stream link (.m3u8) in the page." });
        }

    } catch (error) {
        console.error("Error fetching stream:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});