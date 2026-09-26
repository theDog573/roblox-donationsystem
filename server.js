const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 80;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const SECRET_TOKEN = process.env.SECRET_TOKEN;

app.post('/create-donation', async (req, res) => {
    const { baseRobuxAmount, coverTax, token } = req.body;

    if (token !== SECRET_TOKEN) return res.status(403).json({ error: "Unauthorized" });

    let finalPriceInRobux = parseInt(baseRobuxAmount);

    // tax calculation (+30%)
    if (coverTax === true) {
        finalPriceInRobux = Math.ceil(finalPriceInRobux / 0.7); 
    }

    try {
        // Back to v1 because v2 probably 404'd us 💀
        const response = await fetch(`https://apis.roblox.com/developer-products/v1/universes/${UNIVERSE_ID}/developer-products`, {
            method: 'POST',
            headers: {
                'x-api-key': ROBLOX_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `Buy: ${baseRobuxAmount} Robux Base`,
                description: `In-Game Cash Purchase. Tax covered: ${coverTax}`,
                priceInRobux: finalPriceInRobux
            })
        });

        // 🛑 SAFE PARSE: get raw text first so we don't crash on empty responses
        const text = await response.text();
        
        if (!response.ok) {
            console.error("Open Cloud error:", response.status, text);
            return res.status(response.status).json({ 
                error: `OpenCloud ${response.status}`, 
                detail: text || "Empty response from Roblox" 
            });
        }

        // If we get here, response.ok is true, so it's safe to parse
        const data = JSON.parse(text);

        if (data.id) {
            res.json({ productId: data.id });
        } else {
            res.status(400).json({ error: "Roblox API Fehler", details: data });
        }
    } catch (err) {
        console.error("Server crashed:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
