// Vercel serverless function: proxies Google Sheet CSV to avoid CORS restrictions.
// GET /api/contractors → returns the raw CSV of the contractor monitoring sheet.

const SHEET_ID = "1sE6IGBByu8syUgxMrAUj20I_mHoRhxRyJzgdOBaWKn4";
const SHEET_GID = "1131755783";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const response = await fetch(SHEET_URL, {
      headers: { Accept: "text/csv" },
      redirect: "follow",
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Google Sheets responded with ${response.status}` });
    }

    const csvText = await response.text();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=600");
    return res.status(200).send(csvText);
  } catch (err) {
    console.error("contractors proxy error:", err);
    return res.status(500).json({ error: "Failed to fetch contractor list" });
  }
};
