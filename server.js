const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend

// Middleware to log incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Incoming request: ${req.method} ${req.url}`);
    if (Object.keys(req.body).length) {
        console.log("Request Body:", req.body);
    }
    next();
});

app.post("/generate", async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        console.error(`[${new Date().toISOString()}] Error: No prompt provided`);
        return res.status(400).json({ error: "Prompt is required" });
    }

    console.log(`[${new Date().toISOString()}] Received prompt:`, prompt);
    
    try {
        console.log(`[${new Date().toISOString()}] Sending request to RapidAPI...`);

        const response = await axios.post(
            "https://chatgpt-42.p.rapidapi.com/o3mini",
            {
                messages: [{ role: "user", content: prompt }],
                web_access: false
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-rapidapi-host": "chatgpt-42.p.rapidapi.com",
                    "x-rapidapi-key": process.env.RAPIDAPI_KEY
                }
            }
        );

        console.log(`[${new Date().toISOString()}] Received response from RapidAPI:`, response.data);

        // Ensure correct format
        res.json({
            status: response.data.status || false,
            result: response.data.result || "No result found."
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] API Request Failed:`, error.message);
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`);
});
