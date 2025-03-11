const express = require("express");
const axios = require("axios");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(compression()); // Enable response compression
app.use(express.static(__dirname)); // Serve frontend

// Rate limiting to avoid API abuse
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 requests per windowMs
    message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// Reusable Axios instance
const axiosInstance = axios.create({
    baseURL: "https://chatgpt-42.p.rapidapi.com",
    headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "chatgpt-42.p.rapidapi.com",
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
    },
});

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method !== "GET" && Object.keys(req.body).length) {
        console.log("Body:", JSON.stringify(req.body));
    }
    next();
});

// AI Response Route
app.post("/generate", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    try {
        const response = await axiosInstance.post("/o3mini", {
            messages: [{ role: "user", content: prompt }],
            web_access: false,
        });

        res.json({
            status: response.data.status || false,
            result: response.data.result || "No result found.",
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] API Error:`, error.message);
        res.status(500).json({ error: "API request failed. Try again later." });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Server running at http://localhost:${PORT}`);
});
