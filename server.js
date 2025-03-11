const cluster = require("cluster");
const os = require("os");
const express = require("express");
const axios = require("axios");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const numCPUs = os.cpus().length; // Get total CPU cores

if (cluster.isMaster) {
    console.log(`[Master] Forking ${numCPUs} workers...`);
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork(); // Create worker process for each CPU core
    }

    cluster.on("exit", (worker) => {
        console.log(`[Worker ${worker.process.pid}] Died. Restarting...`);
        cluster.fork();
    });

} else {
    const app = express();

    // Middleware
    app.use(compression()); // Enable compression
    app.use(express.json({ limit: "50kb" })); // Reduce parsing time
    app.use(express.static(__dirname)); // Serve frontend

    // Rate limiting to prevent excessive API calls
    app.use(rateLimit({
        windowMs: 60 * 1000, // 1 min
        max: 20,
        message: { error: "Too many requests. Slow down!" },
    }));

    // Reusable Axios instance with Keep-Alive
    const axiosInstance = axios.create({
        baseURL: "https://chatgpt-42.p.rapidapi.com",
        headers: {
            "Content-Type": "application/json",
            "x-rapidapi-host": "chatgpt-42.p.rapidapi.com",
            "x-rapidapi-key": process.env.RAPIDAPI_KEY,
            Connection: "keep-alive",
        },
        timeout: 5000, // Set a timeout for fast failures
    });

    // AI Chat API
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

    // Start Server
    app.listen(PORT, () => {
        console.log(`[Worker ${process.pid}] Server running at http://localhost:${PORT}`);
    });
}
