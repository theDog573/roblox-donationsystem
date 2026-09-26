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

    // Wenn der 30%-Steuer-Button im UI aktiv ist
    if (coverTax === true) {
        finalPriceInRobux = Math.ceil(finalPriceInRobux / 0.7); 
    }

    try {
        const response = await fetch(`https://roblox.com{UNIVERSE_ID}/developer-products`, {
            method: 'POST',
            headers: {
                'x-api-key': ROBLOX_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `Donation: ${baseRobuxAmount} Robux Base`,
                description: `Custom Donation. Tax covered: ${coverTax}`,
                priceInRobux: finalPriceInRobux
            })
        });

        const data = await response.json();
        if (data.id) {
            res.json({ productId: data.id });
        } else {
            res.status(400).json({ error: "Roblox API Fehler", details: data });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
