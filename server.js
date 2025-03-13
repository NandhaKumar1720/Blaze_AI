const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let conversationHistory = []; // Store a persistent conversation history

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
        console.error(`[${new Date().toISOString()}] Error: Missing prompt`);
        return res.status(400).json({ error: "Prompt is required" });
    }

    console.log(`[${new Date().toISOString()}] Received prompt:`, prompt);

    // Add user's message to conversation history
    conversationHistory.push({ role: "user", content: prompt });

    try {
        console.log(`[${new Date().toISOString()}] Sending request to ChatGPT-4 API via RapidAPI...`);

        const response = await axios.post(
            "https://chatgpt-42.p.rapidapi.com/gpt4",
            {
                messages: conversationHistory, // Send full conversation history
                web_access: false
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-RapidAPI-Host": "chatgpt-42.p.rapidapi.com",
                    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY
                }
            }
        );

        console.log(`[${new Date().toISOString()}] API Response Data:`, response.data);

        if (!response.data) {
            throw new Error("Empty response from API or invalid format.");
        }

        const result = response.data.result || response.data.choices?.[0]?.text || "No result found.";
        
        // Add assistant's response to conversation history
        conversationHistory.push({ role: "assistant", content: result });

        res.json({ status: response.data.status || false, result });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] API Request Failed:`, error.message);
        res.status(500).json({ error: "Error processing request." });
    }
});

app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`);
});
