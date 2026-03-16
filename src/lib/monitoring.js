// ── Contractor Performance Monitoring ──────────────────────────────────────
// Fetches active contractors from Google Sheet, runs daily review searches,
// and stores results in localStorage (Supabase extension-ready).

const SHEET_ID = "1sE6IGBByu8syUgxMrAUj20I_mHoRhxRyJzgdOBaWKn4";
const SHEET_GID = "1131755783";
const STORAGE_KEY = "ns_monitoring";
const STALE_HOURS = 24;

// ── Hardcoded active contractor list (synced from Google Sheet) ────────────
// Contractors with a churn date are excluded.
// Re-run sync or update this list when the sheet changes.
export const ACTIVE_CONTRACTORS = [
  { name: "Heldman Exteriors",                       startDate: "11/2023" },
  { name: "Homesense HVAC",                          startDate: "11/2023" },
  { name: "Hope Plumbing",                           startDate: "11/2023" },
  { name: "Michaelis",                               startDate: "11/2023" },
  { name: "ALL IN Painting",                         startDate: "12/2023" },
  { name: "LaGrange Home Inspections",               startDate: "2/2024"  },
  { name: "Brick and Ember",                         startDate: "2/2024"  },
  { name: "Prime Plumbing",                          startDate: "2/2024"  },
  { name: "Sync Technology Integrations",            startDate: "3/2024"  },
  { name: "Bin Scrub",                               startDate: "4/2024"  },
  { name: "Greenscapes",                             startDate: "4/2024"  },
  { name: "Love Heating & Air",                      startDate: "5/2024"  },
  { name: "Stephen Moffett",                         startDate: "5/2024"  },
  { name: "Logs to Lumber",                          startDate: "5/2024"  },
  { name: "Treeo",                                   startDate: "5/2024"  },
  { name: "Guardian Angel",                          startDate: "6/2024"  },
  { name: "On The Spot",                             startDate: "7/2024"  },
  { name: "May Sealing",                             startDate: "7/2024"  },
  { name: "Christina's Complete Clean",              startDate: "8/2024"  },
  { name: "Silvers Concrete",                        startDate: "8/2024"  },
  { name: "Blue Duck Lawn Care",                     startDate: "8/2024"  },
  { name: "Priority Painting",                       startDate: "9/2024"  },
  { name: "Redefined Flooring",                      startDate: "9/2024"  },
  { name: "Window Consultants",                      startDate: "10/2024" },
  { name: "Brian Woodward",                          startDate: "10/2024" },
  { name: "Red Diamond",                             startDate: "10/2024" },
  { name: "Modern Day Window and Door",              startDate: "10/2024" },
  { name: "Lift It Level",                           startDate: "10/2024" },
  { name: "Indy Cleans",                             startDate: "11/2024" },
  { name: "Colt Moving",                             startDate: "11/2024" },
  { name: "Draper Fencing",                          startDate: "11/2024" },
  { name: "True North Home Solutions",               startDate: "1/2025"  },
  { name: "Realty Group Insurance",                  startDate: "1/2025"  },
  { name: "Hatoway Insurance Partners",              startDate: "1/2025"  },
  { name: "Indiana Blinds",                          startDate: "1/2025"  },
  { name: "Rooted",                                  startDate: "1/2025"  },
  { name: "Hitman Solutions",                        startDate: "1/2025"  },
  { name: "Patch Master",                            startDate: "2/2025"  },
  { name: "Decks on Point",                          startDate: "3/2025"  },
  { name: "Downey Home Services",                    startDate: "3/2025"  },
  { name: "Gold Standard Inspections",               startDate: "3/2025"  },
  { name: "Quality Control",                         startDate: "3/2025"  },
  { name: "Hoosier Water Away",                      startDate: "3/2025"  },
  { name: "Chimney Solutions",                       startDate: "4/2025"  },
  { name: "Garage Door Doctor",                      startDate: "4/2025"  },
  { name: "Watergate Roofing",                       startDate: "5/2025"  },
  { name: "California Closets",                      startDate: "5/2025"  },
  { name: "Home Experts",                            startDate: "5/2025"  },
  { name: "Off Leash",                               startDate: "6/2025"  },
  { name: "Indianapolis General Contractors",        startDate: "6/2025"  },
  { name: "Blingle! Premier Lighting of Indianapolis", startDate: "7/2025" },
  { name: "Follett Outdoors",                        startDate: "7/2025"  },
  { name: "Art of Drawers",                          startDate: "8/2025"  },
  { name: "Independent Living",                      startDate: "8/2025"  },
  { name: "Hope Plumbing - Electrical",              startDate: "8/2025"  },
  { name: "Blue Duck Lawn Care (Pest)",              startDate: "8/2025"  },
  { name: "Serendipity Designs",                     startDate: "9/2025"  },
  { name: "Indy Trash Guy",                          startDate: "9/2025"  },
  { name: "Armored Lock & Security",                 startDate: "9/2025"  },
  { name: "Guardian Relocation",                     startDate: "11/2025" },
  { name: "Five Star Bath Solutions",                startDate: "11/2025" },
  { name: "Haulstr Dumpsters",                       startDate: "11/2025" },
  { name: "SmartCrawl",                              startDate: "12/2025" },
  { name: "BearCo Tree Service",                     startDate: "12/2025" },
  { name: "Haulstr Irrigation",                      startDate: "12/2025" },
  { name: "AK Exteriors",                            startDate: "1/2026"  },
  { name: "TT Renovations",                          startDate: "1/2026"  },
  { name: "Harmony Homes Co",                        startDate: "1/2026"  },
  { name: "Archadeck of Indianapolis",               startDate: "1/2026"  },
  { name: "Custom Living",                           startDate: "1/2026"  },
  { name: "Simply Water",                            startDate: "1/2026"  },
  { name: "Indianapolis Dumpster Service",           startDate: "1/2026"  },
  { name: "Scott's Pools",                           startDate: "1/2026"  },
  { name: "RC Electric",                             startDate: "2/2026"  },
  { name: "FirstMile Security",                      startDate: "2/2026"  },
  { name: "C&J Well",                                startDate: "2/2026"  },
  { name: "JD Hostetter",                            startDate: "2/2026"  },
  { name: "Mowery Heating, Cooling & Plumbing",      startDate: "2/2026"  },
  { name: "Speciality Garage Doors",                 startDate: "2/2026"  },
  { name: "Moli Painting",                           startDate: "2/2026"  },
  { name: "Closets by Design",                       startDate: "2/2026"  },
];

// ── Fetch fresh contractor list from Google Sheet (production via proxy) ───
export async function fetchContractorsFromSheet() {
  try {
    let csvText;

    if (import.meta.env.DEV) {
      // Dev: try gviz endpoint (CORS-friendly alternative)
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("CORS blocked in dev");
      csvText = await res.text();
    } else {
      // Production: route through Vercel proxy
      const res = await fetch("/api/contractors");
      if (!res.ok) throw new Error(`Proxy error ${res.status}`);
      csvText = await res.text();
    }

    return parseContractorCSV(csvText);
  } catch {
    // Fall back to hardcoded list
    return ACTIVE_CONTRACTORS;
  }
}

function parseContractorCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const contractors = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = splitCSVLine(line);
    const name = (fields[0] ?? "").replace(/^"|"$/g, "").trim();
    const startDate = (fields[1] ?? "").trim();
    const churnDate = (fields[2] ?? "").trim();
    if (!name || churnDate) continue;
    contractors.push({ name, startDate });
  }

  return contractors;
}

function splitCSVLine(line) {
  const fields = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { fields.push(field); field = ""; }
    else { field += ch; }
  }
  fields.push(field);
  return fields;
}

// ── Storage ────────────────────────────────────────────────────────────────
export function loadMonitoringData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMonitoringData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function isDataStale(contractorName) {
  const data = loadMonitoringData();
  const record = data[contractorName];
  if (!record?.lastChecked) return true;
  const ageMs = Date.now() - new Date(record.lastChecked).getTime();
  return ageMs > STALE_HOURS * 60 * 60 * 1000;
}

export function clearMonitoringRecord(contractorName) {
  const data = loadMonitoringData();
  delete data[contractorName];
  saveMonitoringData(data);
}

// ── Date helper ────────────────────────────────────────────────────────────
function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

// ── Build review search prompt ─────────────────────────────────────────────
function buildReviewPrompt(name) {
  const since = getDateDaysAgo(30);
  return `Search the web for recent customer reviews of "${name}" (a home services contractor in the Indianapolis, Indiana area) posted in the last 30 days (since ${since}).

Check Google Reviews, BBB, Yelp, Facebook, Angi, HomeAdvisor, Nextdoor, and any local news or social media.

Return ONLY valid JSON (no markdown, no explanation):
{
  "recentReviews": [
    { "source": "Google", "date": "YYYY-MM-DD or null", "sentiment": "positive|negative|neutral", "summary": "brief 1-sentence summary of what was said", "rating": 5 }
  ],
  "overallTrend": "improving|declining|stable|insufficient_data",
  "trendSummary": "1-2 sentence summary of the trend based on recent reviews",
  "totalRecentPositive": 0,
  "totalRecentNegative": 0
}

If no reviews found in the last 30 days, return an empty recentReviews array with overallTrend "insufficient_data".`;
}

// ── Claude caller (mirrors research.js) ───────────────────────────────────
async function callClaude(prompt, maxTokens = 900) {
  if (import.meta.env.DEV) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("VITE_ANTHROPIC_API_KEY is not set.");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }
    const data = await res.json();
    return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  } else {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, maxTokens }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }
    const data = await res.json();
    return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  }
}

// ── Run review search for a single contractor ──────────────────────────────
export async function runReviewSearch(name) {
  const prompt = buildReviewPrompt(name);
  const text = await callClaude(prompt, 900);
  const jsonStr = text.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/)?.[0];
  if (!jsonStr) throw new Error("No JSON found in review response.");
  const result = JSON.parse(jsonStr);

  return {
    recentReviews: result.recentReviews || [],
    overallTrend: result.overallTrend || "insufficient_data",
    trendSummary: result.trendSummary || "No recent review data found.",
    totalRecentPositive: result.totalRecentPositive || 0,
    totalRecentNegative: result.totalRecentNegative || 0,
    lastChecked: new Date().toISOString(),
  };
}
