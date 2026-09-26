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
        // FIX: the old URL (create.roblox.com/dashboard/...) is the browser
        // page for the Creator Dashboard, not an API route — it will always
        // 404 no matter what ID is in the path.
        //
        // TODO — VERIFY BEFORE DEPLOYING:
        // As far as I'm aware, Developer Product *creation* is not exposed
        // through the public Open Cloud API (apis.roblox.com, x-api-key auth).
        // It has historically only been reachable through the internal API
        // the dashboard itself calls (develop.roblox.com), which authenticates
        // with a .ROBLOSECURITY session cookie, not an API key.
        //
        // This may have changed — please check Roblox's current Open Cloud
        // docs (https://create.roblox.com/docs/cloud) for a supported
        // developer-products endpoint before relying on this. If one exists,
        // swap the URL below for it. If not, you'll need a cookie-based auth
        // flow instead of ROBLOX_API_KEY for this specific call.
        const response = await fetch(`https://apis.roblox.com/cloud/v2/universes/${UNIVERSE_ID}/developer-products`, {
            method: 'POST',
            headers: {
                'x-api-key': ROBLOX_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `Buy: ${parsedAmount} Robux Base`,
                description: `In-Game Cash Purchase. Tax covered: ${coverTax}`,
                priceInRobux: finalPriceInRobux
            })
        });

        const text = await response.text();

        if (!response.ok) {
            console.error("Open Cloud error:", response.status, text);
            return res.status(response.status).json({
                error: `OpenCloud ${response.status}`,
                detail: text || "Empty response from Roblox"
            });
        }

        const data = JSON.parse(text);

        if (data.id) {
            res.json({ productId: data.id });
        } else {
            res.status(400).json({ error: "Roblox API error", details: data });
        }
    } catch (err) {
        console.error("Server crashed:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
