const cluster = require("cluster");
const os = require("os");
const express = require("express");
const axios = require("axios");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const numCPUs = os.cpus().length; // Get CPU core count

if (cluster.isMaster) {
    console.log(`[Master] Forking ${numCPUs} workers...`);
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker) => {
        console.log(`[Worker ${worker.process.pid}] Died. Restarting...`);
        cluster.fork();
    });

} else {
    const app = express();

    // ✅ Fix: Trust reverse proxies (Heroku, Vercel, Nginx, etc.)
    app.set("trust proxy", 1);

    // ✅ Middleware for Performance
    app.use(compression()); // Gzip compression for smaller responses
    app.use(express.json({ limit: "50kb" })); // Limit body size to prevent slow parsing
    app.use(express.static(__dirname)); // Serve frontend files

    // ✅ Rate Limiting (Prevents Abuse)
    app.use(rateLimit({
        windowMs: 60 * 1000, // 1 min
        max: 20, // Max 20 requests per minute
        message: { error: "Too many requests. Slow down!" },
    }));

    // ✅ Axios with Keep-Alive for Faster API Calls
    const axiosInstance = axios.create({
        baseURL: "https://chatgpt-42.p.rapidapi.com",
        headers: {
            "Content-Type": "application/json",
            "x-rapidapi-host": "chatgpt-42.p.rapidapi.com",
            "x-rapidapi-key": process.env.RAPIDAPI_KEY,
            Connection: "keep-alive",
        },
        timeout: 5000, // Fail fast if request takes too long
    });

    // ✅ API Route: AI Chatbot Request
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
                result: response.data.result || "No response received.",
            });

        } catch (error) {
            console.error(`[${new Date().toISOString()}] API Error:`, error.message);
            res.status(500).json({ error: "Failed to fetch AI response." });
        }
    });

    // ✅ Graceful Shutdown Handling
    process.on("SIGINT", () => {
        console.log(`[Worker ${process.pid}] Shutting down...`);
        process.exit();
    });

    // ✅ Start Server
    app.listen(PORT, () => {
        console.log(`[Worker ${process.pid}] Server running at http://localhost:${PORT}`);
    });
}
