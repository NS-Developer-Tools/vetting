// Vercel serverless function — proxies Anthropic API calls server-side
// so the API key is never exposed in the browser bundle.
// Deployed automatically by Vercel at: POST /api/research

module.exports = async function handler(req, res) {
  // CORS headers so the Vite dev server can also hit this if needed
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, maxTokens = 1500 } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const apiKey = process.env.ANTHROPIC_API_KEY; // server-side only — no VITE_ prefix
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
};
