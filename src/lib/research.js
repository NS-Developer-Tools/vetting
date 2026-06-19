import { SECTIONS } from "../data/sections.js";

// ── Shared fetch helper ────────────────────────────────────────────────────────
// • Development  → calls Anthropic directly (requires VITE_ANTHROPIC_API_KEY in .env)
// • Production   → routes through /api/research serverless function (API key stays server-side)
async function callClaude(prompt, maxTokens = 1500) {
  if (import.meta.env.DEV) {
    // ── Local dev: direct browser call ───────────────────────────────────────
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("VITE_ANTHROPIC_API_KEY is not set. Add it to your .env file.");

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
    // ── Production: serverless proxy (API key never leaves the server) ───────
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

// ── Build vetting research prompt ─────────────────────────────────────────────
// context = { phone, website, address, license, contact } — all optional
// These extra identifiers help Claude confirm the exact right business,
// especially important for CSV-imported contractors with common names.
export function buildResearchPrompt(name, location, trade, context = {}) {
  const autoFields = SECTIONS.filter(s => s.auto).flatMap(s => s.fields);
  // Omit verbose "question" labels — fieldId is self-explanatory and saves ~300 tokens per call
  const fieldDescriptions = autoFields.map(f => ({
    fieldId: f.id,
    options: f.options.map(o => o.label),
  }));

  const identifiers = [
    context.phone   && `Phone: ${context.phone}`,
    context.website && `Website: ${context.website}`,
    context.address && `Address: ${context.address}`,
    context.license && `License #: ${context.license}`,
    context.contact && `Contact: ${context.contact}`,
  ].filter(Boolean);

  const identifierNote = identifiers.length > 0
    ? `\nUse these to confirm the correct business: ${identifiers.join(" | ")}`
    : "";

  return `Vet this contractor using web research. For each fieldId select EXACTLY one option from its list.

Business: "${name}" | Location: "${location}" | Trade: "${trade}"${identifierNote}

Search: BBB, Google, Angi, Facebook, Glassdoor, court records, OSHA, news, social media.
If data unavailable, pick the most conservative option.

Return ONLY valid JSON (no markdown):
{ "fieldId": "exact option label", ..., "researchNotes": "one sentence source summary" }

Fields:
${JSON.stringify(fieldDescriptions)}`;
}

// ── Vet a single known contractor ──────────────────────────────────────────────
// context = { phone, website, address, license, contact } — optional, improves accuracy
export async function runAutoResearch(name, location, trade, context = {}) {
  const prompt = buildResearchPrompt(name, location, trade, context);
  const text = await callClaude(prompt, 1500);
  const jsonStr = text.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/)?.[0];
  if (!jsonStr) throw new Error("No JSON found in research response.");
  return JSON.parse(jsonStr);
}

// ── Find top 3 contractors in a city/category ──────────────────────────────────
export async function findTopContractorNames(city, state, category, excluded = []) {
  const exclusionNote = excluded.length > 0
    ? `\nDo NOT include any of these contractors — they have already been vetted and received failing scores: ${excluded.join(", ")}`
    : "";

  const prompt = `Search the web to find the 5 best-rated, most reputable ${category} contractors currently operating in ${city}, ${state}.${exclusionNote}

Prioritize businesses with:
- High Google star ratings (4.0+ stars)
- BBB accreditation or A/B rating
- Multiple verified customer reviews
- Established local presence (2+ years in business)
- Active website or business listing

Return ONLY a valid JSON array — no markdown, no explanation, no extra text:
[
  {"name": "Exact Business Name 1", "location": "${city}, ${state}"},
  {"name": "Exact Business Name 2", "location": "${city}, ${state}"},
  {"name": "Exact Business Name 3", "location": "${city}, ${state}"},
  {"name": "Exact Business Name 4", "location": "${city}, ${state}"},
  {"name": "Exact Business Name 5", "location": "${city}, ${state}"}
]`;

  const text = await callClaude(prompt, 300);
  const jsonStr = text.replace(/```json|```/g, "").trim().match(/\[[\s\S]*\]/)?.[0];
  if (!jsonStr) throw new Error(`No ${category} contractors found in ${city}, ${state}. Try a different city or category.`);

  const contractors = JSON.parse(jsonStr);
  if (!Array.isArray(contractors) || contractors.length === 0) {
    throw new Error(`No contractors found. Try a different city or category.`);
  }
  return contractors.slice(0, 5);
}

// ── Convert raw research result → selections object ────────────────────────────
export function researchResultsToSelections(result) {
  const { researchNotes, ...fieldAnswers } = result;
  const selections = {};

  SECTIONS.filter(s => s.auto).forEach(s => {
    s.fields.forEach(f => {
      const answer = fieldAnswers[f.id];
      if (answer) {
        const opt = f.options.find(o => o.label === answer);
        if (opt) {
          selections[f.id] = opt.label;
          selections[`${f.id}_score`] = opt.score;
        }
      }
    });
  });

  return selections;
}
