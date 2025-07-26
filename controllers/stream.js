import getStreamData from "../lib/stream.js";

// Handles /api/rio/stream/:id
export const handleStream = async (req, res) => {
  try {
    const { id, season, episode } = req.params;
    const fullPath = [id, season, episode].filter(Boolean).join('/');

    const streams = await getStreamData(fullPath);

    res.json({ success: true, data: streams });
  } catch (err) {
    console.error("Stream error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};