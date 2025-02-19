const express = require("express");
const { yts } = require("@hiudyy/ytdl");
const path = require("path");

const app = express();
const PORT = 3000;

app.get("/", async function (req, res) {
res.sendFile(path.join(__dirname,  "./index.html"));
});

// Step 1: Fetch video details
app.get('/video', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: 'Missing required query parameter "q"' });
    }

    try {
        const searchResult = await yts(query);
        if (!searchResult.videos.length) {
            return res.status(404).json({ error: "No videos found for the given query" });
        }

        const video = searchResult.videos[0];
        res.json({
            title: video.title.text,
            id: video.id,
            duration: video.thumbnail_overlays?.[0]?.text || "Unknown",
            url: `https://www.youtube.com/watch?v=${video.id}`
        });
    } catch (error) {
        console.error("Error in /video:", error.message);
        res.status(500).json({ error: "Failed to fetch video details" });
    }
});

// Step 2: Handle the video download process
app.get("/download", async (req, res) => {
    const searchQuery = req.query.q;

    if (!searchQuery) {
        return res.status(400).json({ error: 'Missing required query parameter "q"' });
    }

    console.log("Search Query:", searchQuery);

    try {
        // Fetch video details from the local API
        const searchResponse = await fetch(`http://localhost:${PORT}/video?q=${encodeURIComponent(searchQuery)}`, {
            headers: { "Accept": "application/json" }
        });

        if (!searchResponse.ok) {
            throw new Error(`Failed to fetch video details: ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        console.log("First API Response:", searchData);

        if (!searchData.url) {
            return res.status(404).json({ error: "No video URL found" });
        }

        const videoUrl = searchData.url;
        console.log("Fetched video URL:", videoUrl);

        // Fetch download link from new API URL
        const videoResponse = await fetch(`https://yt-video-production.up.railway.app/ytdlv3?url=${encodeURIComponent(videoUrl)}`, {
            headers: { "Accept": "application/json" }
        });

        if (!videoResponse.ok) {
            throw new Error(`Failed to fetch download URL: ${videoResponse.statusText}`);
        }

        const videoData = await videoResponse.json();
        console.log("Second API Response:", videoData);

        if (!videoData.download_url) {
            return res.status(404).json({ error: "Download URL not available" });
        }

        console.log("Download URL:", videoData.download_url);

        // Send video details and download URL in response
        res.json({
            title: searchData.title,
            duration: searchData.duration,
            url: videoUrl,
            downloadUrl: videoData.download_url
        });

    } catch (error) {
        console.error("Error in /download:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
