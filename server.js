const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 80;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const SECRET_TOKEN = process.env.SECRET_TOKEN;
const UNIVERSE_ID = process.env.UNIVERSE_ID || "10468245026";

app.post('/create-donation', async (req, res) => {
    const { baseRobuxAmount, coverTax, token } = req.body;

    if (token !== SECRET_TOKEN) return res.status(403).json({ error: "Unauthorized" });

    const parsedAmount = parseInt(baseRobuxAmount, 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "baseRobuxAmount must be a positive number" });
    }

    let finalPriceInRobux = parsedAmount;
    if (coverTax === true) {
        finalPriceInRobux = Math.ceil(finalPriceInRobux / 0.7);
    }

    try {
        // CORRECT ENDPOINT: /developer-products/v2/universes/{id}/developer-products
        // (NOT /cloud/v2/... — that path returns 404 with an empty body.)
        const response = await fetch(
            `https://apis.roblox.com/developer-products/v2/universes/${UNIVERSE_ID}/developer-products`,
            {
                method: 'POST',
                headers: {
                    'x-api-key': ROBLOX_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: `Buy: ${parsedAmount} Robux Base`,
                    description: `In-Game Cash Purchase. Tax covered: ${coverTax}`,
                    priceInRobux: finalPriceInRobux,
                    isForSale: true
                })
            }
        );

        const text = await response.text();

        if (!response.ok) {
            console.error("Open Cloud error:", response.status, text);
            return res.status(response.status).json({
                error: `OpenCloud ${response.status}`,
                detail: text || "Empty response from Roblox"
            });
        }

        const data = JSON.parse(text);

        // The v2 create endpoint returns the new product's id in `path` or `id`.
        const productId = data.id || (data.path && data.path.match(/(\d+)$/)?.[1]);
        if (productId) {
            res.json({ productId: Number(productId) });
        } else {
            res.status(400).json({ error: "Roblox API error", details: data });
        }
    } catch (err) {
        console.error("Server crashed:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
