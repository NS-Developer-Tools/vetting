import React, { useState } from "react";
import { SECTIONS } from "../data/sections.js";
import { calcScore, verdictFor, getHardStopMsgs } from "../lib/scoring.js";
import { runAutoResearch, findTopContractorNames, researchResultsToSelections } from "../lib/research.js";
import { saveCard, loadAllCards } from "../lib/db.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
const RATE_LIMIT_PAUSE_MS = 15000;

const VS = {
  ACCEPT:      { bg: "#dcfce7", text: "#16a34a", border: "#86efac" },
  REVIEW:      { bg: "#fef9c3", text: "#ca8a04", border: "#fde047" },
  DECLINE:     { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" },
  "HARD STOP": { bg: "#ede9fe", text: "#7c3aed", border: "#c4b5fd" },
};
const RANK_COLORS = ["#f59e0b", "#64748b", "#b45309"];
const RANK_LABELS = ["🥇", "🥈", "🥉"];

const CATEGORIES = [
  "Plumbing", "Electrical", "HVAC / Heating & Cooling", "Roofing",
  "Landscaping / Lawn Care", "Painting (Interior & Exterior)", "Flooring",
  "Carpentry / Woodwork", "House Cleaning", "Moving", "Pest Control",
  "Pool & Spa", "General Contractor", "Handyman", "Concrete & Masonry",
  "Windows & Doors", "Gutters & Drainage", "Drywall", "Tile & Stone",
  "Fence & Deck", "Garage Door", "Solar Installation", "Tree Service",
];

const labelStyle = {
  display: "block", fontSize: "11px", fontWeight: "600",
  color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em",
};
const inputStyle = {
  width: "100%", padding: "9px 11px", borderRadius: "7px",
  border: "1px solid #e2e8f0", fontSize: "13px",
  boxSizing: "border-box", outline: "none", color: "#1e293b",
};

// ── CSV utilities ─────────────────────────────────────────────────────────────

// Split a single CSV line respecting quoted fields
function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Parse raw CSV text → array of row objects keyed by header
function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");
  const headers = splitCSVLine(lines[0]).map(h =>
    h.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
  );
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = splitCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || "").trim(); });
    return row;
  });
}

// Map a raw CSV row to a contractor object (returns { valid, ...fields } or { valid: false, error })
function mapCSVRow(row, rowIndex) {
  const name    = row.name || row.business_name || row.company || row.contractor_name || row.contractor;
  const city    = row.city;
  const state   = row.state || row.st;
  const trade   = row.trade || row.category || row.service || row.specialty || row.service_category || "";
  const phone   = row.phone || row.phone_number || row.telephone || "";
  const website = row.website || row.url || row.web || row.website_url || "";
  const address = row.address || row.street_address || row.street || "";
  const license = row.license || row.license_number || row.lic || row.contractor_license || "";
  const contact = row.contact || row.contact_name || row.owner || row.owner_name || "";

  if (!name?.trim()) return { valid: false, error: `Row ${rowIndex + 2}: missing name` };
  if (!city?.trim()) return { valid: false, error: `Row ${rowIndex + 2}: missing city` };
  if (!state?.trim()) return { valid: false, error: `Row ${rowIndex + 2}: missing state` };

  const stateCode = state.trim().toUpperCase().slice(0, 2);
  return {
    valid: true,
    name: name.trim(),
    city: city.trim(),
    state: stateCode,
    location: `${city.trim()}, ${stateCode}`,
    trade: trade.trim(),
    phone: phone.trim(),
    website: website.trim(),
    address: address.trim(),
    license: license.trim(),
    contact: contact.trim(),
  };
}

// Download a blank CSV template
function downloadCSVTemplate() {
  const rows = [
    "name,city,state,trade,phone,website,address,license_number,contact_name",
    "Smith Plumbing LLC,Austin,TX,Plumbing,(512) 555-1234,www.smithplumbing.com,123 Main St,LIC-12345,John Smith",
    "Jones Electric,Dallas,TX,Electrical,(214) 555-5678,www.joneselectric.com,456 Oak Ave,LIC-67890,Mary Jones",
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "neighborserve-contractor-template.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Build full scored card from candidate + research result ───────────────────
function buildScoredCard(candidate, result) {
  const selections = researchResultsToSelections(result);
  const hardStops = [];
  SECTIONS.forEach(s => s.fields.forEach(f => {
    const label = selections[f.id];
    if (label) hardStops.push(...getHardStopMsgs(f.id, label));
  }));
  const { total, pct } = calcScore(selections, {});
  const verdict = verdictFor(pct, hardStops);
  return {
    ...candidate,            // preserves id — upsert overwrites the CANDIDATE record in DB
    selections,
    hardStops,
    researchNotes: result.researchNotes || "",
    total,
    pct,
    verdictLabel: verdict.label,
  };
}

// ── Stat chip ──────────────────────────────────────────────────────────────────
function Chip({ icon, label, value, ok }) {
  if (!value) return null;
  const color = ok === true ? "#16a34a" : ok === false ? "#dc2626" : "#64748b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", background: "#f8fafc", borderRadius: "5px", padding: "4px 7px", border: "1px solid #f1f5f9" }}>
      <span>{icon}</span>
      <span style={{ color: "#94a3b8", fontWeight: "600" }}>{label}</span>
      <span style={{ color, fontWeight: "700" }}>{value}</span>
    </div>
  );
}

// ── Scored result card ─────────────────────────────────────────────────────────
function ScoredCard({ card, rank, onView, onEdit }) {
  const vc = VS[card.verdictLabel] || {};
  const s = card.selections;
  const bbbVal    = s.bbb_rating?.split(" –")[0]?.split(" —")[0];
  const googleVal = s.google_rating?.split(" ⭐")[0]?.split(" –")[0];
  const yrsVal    = s.years_in_business?.split(" year")[0];
  const insOk  = s.has_liability === "Yes – verified certificate on file";
  const bgOk   = s.owner_criminal?.startsWith("Clean");
  const oshaOk = s.osha_violations?.startsWith("None");

  return (
    <div style={{
      background: "white", borderRadius: "14px", padding: "18px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
      border: `2px solid ${rank === 1 ? "#fde68a" : "#f1f5f9"}`,
      position: "relative",
    }}>
      <div style={{
        position: "absolute", top: "-10px", left: "16px",
        background: RANK_COLORS[rank - 1], color: "white",
        borderRadius: "20px", padding: "2px 10px",
        fontSize: "11px", fontWeight: "800", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      }}>
        {RANK_LABELS[rank - 1]} Rank #{rank}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginTop: "6px", marginBottom: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>{card.applicant.name}</div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{card.applicant.trade} · {card.applicant.location}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ background: vc.bg, color: vc.text, border: `1px solid ${vc.border}`, borderRadius: "7px", padding: "3px 9px", fontSize: "11px", fontWeight: "700" }}>
            {card.verdictLabel}
          </div>
          <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
            {card.pct}<span style={{ fontSize: "11px", fontWeight: "500", color: "#94a3b8" }}>%</span>
          </div>
        </div>
      </div>

      <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden", marginBottom: "12px" }}>
        <div style={{ height: "100%", width: `${card.pct}%`, background: card.pct >= 80 ? "#10b981" : card.pct >= 60 ? "#eab308" : "#ef4444", borderRadius: "3px" }} />
      </div>

      {card.hardStops.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px" }}>
          {card.hardStops.slice(0, 3).map((msg, i) => (
            <span key={i} style={{ fontSize: "10px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "4px", padding: "2px 6px", fontWeight: "600" }}>{msg}</span>
          ))}
          {card.hardStops.length > 3 && <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: "600" }}>+{card.hardStops.length - 3} more</span>}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "14px" }}>
        <Chip icon="🛡️" label="Ins"    value={insOk ? "✓ Verified" : s.has_liability ? "✗ No" : null} ok={insOk} />
        <Chip icon="⭐" label="BBB"    value={bbbVal} ok={bbbVal?.startsWith("A")} />
        <Chip icon="🌐" label="Google" value={googleVal ? `${googleVal}⭐` : null} ok={parseFloat(googleVal) >= 4.0} />
        <Chip icon="🏗️" label="Yrs"   value={yrsVal} ok={parseInt(yrsVal) >= 5} />
        <Chip icon="🔍" label="BG"    value={bgOk ? "Clean" : s.owner_criminal ? "Issues" : null} ok={bgOk} />
        <Chip icon="⛑️" label="OSHA"  value={oshaOk ? "Clean" : s.osha_violations ? "Violations" : null} ok={oshaOk} />
      </div>

      {card.researchNotes && (
        <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", lineHeight: "1.5", borderTop: "1px solid #f1f5f9", paddingTop: "10px", marginBottom: "12px" }}>
          🔍 {card.researchNotes.length > 140 ? card.researchNotes.slice(0, 140) + "…" : card.researchNotes}
        </div>
      )}

      <div style={{ display: "flex", gap: "6px" }}>
        <button onClick={() => onView(card)} style={{ flex: 1, padding: "8px 10px", borderRadius: "7px", border: "1px solid #e2e8f0", background: "white", color: "#374151", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>📋 Full View</button>
        <button onClick={() => onEdit(card)} style={{ flex: 1, padding: "8px 10px", borderRadius: "7px", border: "1px solid #e2e8f0", background: "white", color: "#374151", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>✏️ Edit</button>
        <div style={{ flex: 1, padding: "8px 10px", borderRadius: "7px", background: "#f0fdf4", border: "1px solid #86efac", color: "#16a34a", fontSize: "12px", fontWeight: "700", textAlign: "center" }}>✅ Saved</div>
      </div>
    </div>
  );
}

// ── Candidate row (Step 2 — not yet scored) ────────────────────────────────────
function CandidateRow({ rank, name, location, progress, onScore, onRetry }) {
  return (
    <div style={{
      background: "white", borderRadius: "12px", padding: "14px 18px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9",
      display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap",
    }}>
      <div style={{
        width: "30px", height: "30px", borderRadius: "50%",
        background: RANK_COLORS[rank - 1], color: "white",
        fontWeight: "800", fontSize: "13px",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {rank}
      </div>

      <div style={{ flex: 1, minWidth: "120px" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{name}</div>
        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>{location}</div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {progress === "idle" && (
          <button onClick={onScore} style={{ padding: "7px 16px", borderRadius: "7px", border: "none", background: "#e8912e", color: "white", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
            Run Scorecard →
          </button>
        )}
        {progress === "pausing" && <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>⏸ Rate limit pause…</span>}
        {progress === "vetting" && <span style={{ fontSize: "12px", color: "#5b8c5a", fontWeight: "600" }}>⏳ Researching…</span>}
        {progress === "error" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#dc2626" }}>❌ Failed</span>
            <button onClick={onRetry} style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #fca5a5", background: "white", color: "#dc2626", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>Retry</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ContractorSearch({ onView, onEdit }) {
  const [city, setCity]         = useState("");
  const [stateVal, setStateVal] = useState("");
  const [category, setCategory] = useState("");
  const [phase, setPhase]       = useState("form"); // form | finding | candidates | done | error
  const [excludedCount, setExcludedCount]     = useState(0);
  const [candidates, setCandidates]           = useState([]);   // full candidate card objects
  const [vetProgress, setVetProgress]         = useState({});   // { i: idle|pausing|vetting|done|error }
  const [scoredCards, setScoredCards]         = useState({});   // { i: card }
  const [isScoreAllRunning, setIsScoreAllRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [source, setSource]     = useState("web"); // "web" | "csv"
  const [csvPreview, setCsvPreview] = useState(null); // parsed rows | null
  const [csvError, setCsvError]     = useState(null);

  // ── Step 1: find candidates ────────────────────────────────────────────────
  async function handleFind() {
    if (!city.trim() || !stateVal.trim() || !category.trim()) {
      alert("Please fill in City, State, and Service Category.");
      return;
    }
    setPhase("finding");
    setErrorMsg(null);
    setCandidates([]);
    setVetProgress({});
    setScoredCards({});
    setExcludedCount(0);
    setSource("web");
    setCsvPreview(null);
    setCsvError(null);

    // Collect failing contractors in this city/category for exclusion
    let excluded = [];
    try {
      const allCards = await loadAllCards();
      const cityL = city.trim().toLowerCase();
      const stL   = stateVal.trim().toLowerCase();
      const catL  = category.trim().toLowerCase();
      excluded = allCards
        .filter(c => {
          if (c.verdictLabel !== "DECLINE" && c.verdictLabel !== "HARD STOP") return false;
          const loc   = (c.applicant?.location || "").toLowerCase();
          const trade = (c.applicant?.trade    || "").toLowerCase();
          return loc.includes(cityL) && loc.includes(stL) &&
            (trade.includes(catL) || catL.includes(trade));
        })
        .map(c => c.applicant.name);
      setExcludedCount(excluded.length);
    } catch { /* exclusion errors are non-fatal */ }

    try {
      const contractors = await findTopContractorNames(
        city.trim(), stateVal.trim(), category.trim(), excluded
      );
      const today    = new Date().toISOString().slice(0, 10);
      const location = `${city.trim()}, ${stateVal.trim()}`;
      const base     = Date.now();

      // Build candidate records and save to DB immediately
      const cards = contractors.map((c, i) => ({
        id:        `cand_${base}_${i}`,
        savedAt:   new Date().toISOString(),
        applicant: { name: c.name, location: c.location || location, trade: category.trim(), date: today, reviewer: "Auto-Research" },
        selections: {}, refChecks: {}, notes: {}, hardStops: [],
        researchNotes: "", autoSources: {}, total: 0, pct: 0,
        verdictLabel: "CANDIDATE",
      }));

      for (const card of cards) await saveCard(card);

      const initProg = {};
      cards.forEach((_, i) => { initProg[i] = "idle"; });
      setCandidates(cards);
      setVetProgress(initProg);
      setPhase("candidates");
    } catch (err) {
      setErrorMsg(err.message);
      setPhase("error");
    }
  }

  // ── Step 2: score one candidate ────────────────────────────────────────────
  async function scoreOne(i) {
    const candidate = candidates[i];
    if (!candidate || vetProgress[i] === "vetting" || vetProgress[i] === "done") return;
    setVetProgress(prev => ({ ...prev, [i]: "vetting" }));
    try {
      // Pass any stored context (phone/website/license from CSV) to the vetting prompt
      const ctx = candidate.autoSources || {};
      const result = await runAutoResearch(
        candidate.applicant.name,
        candidate.applicant.location,
        candidate.applicant.trade || category.trim(),
        ctx
      );
      const scored = buildScoredCard(candidate, result);
      await saveCard(scored); // upserts same ID — overwrites CANDIDATE record
      setScoredCards(prev => ({ ...prev, [i]: scored }));
      setVetProgress(prev => ({ ...prev, [i]: "done" }));
    } catch {
      setVetProgress(prev => ({ ...prev, [i]: "error" }));
    }
  }

  async function handleScoreAll() {
    setIsScoreAllRunning(true);
    const toScore = candidates
      .map((_, i) => i)
      .filter(i => vetProgress[i] === "idle" || vetProgress[i] === "error");

    for (let j = 0; j < toScore.length; j++) {
      if (j > 0) {
        setVetProgress(prev => ({ ...prev, [toScore[j]]: "pausing" }));
        await sleep(RATE_LIMIT_PAUSE_MS);
      }
      await scoreOne(toScore[j]);
    }
    setIsScoreAllRunning(false);
    setPhase("done");
  }

  // ── CSV handlers ───────────────────────────────────────────────────────────
  function handleCSVFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCsvError(null);
    setCsvPreview(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows   = parseCSVText(ev.target.result);
        const mapped = rows.map((row, i) => mapCSVRow(row, i));
        if (mapped.length === 0) throw new Error("No data rows found in CSV.");
        setCsvPreview(mapped);
      } catch (err) {
        setCsvError(err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset so same file can be re-uploaded
  }

  async function handleCSVImport() {
    const valid = (csvPreview || []).filter(r => r.valid);
    if (valid.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const base  = Date.now();

    const cards = valid.map((c, i) => ({
      id:        `cand_${base}_${i}`,
      savedAt:   new Date().toISOString(),
      applicant: { name: c.name, location: c.location, trade: c.trade || "General Contractor", date: today, reviewer: "CSV Import" },
      selections: {}, refChecks: {}, notes: {}, hardStops: [],
      researchNotes: "",
      // Store extra identifiers in autoSources so scoreOne can pass them to the research prompt
      autoSources: { phone: c.phone, website: c.website, address: c.address, license: c.license, contact: c.contact },
      total: 0, pct: 0,
      verdictLabel: "CANDIDATE",
    }));

    for (const card of cards) await saveCard(card);

    const initProg = {};
    cards.forEach((_, i) => { initProg[i] = "idle"; });
    setCandidates(cards);
    setVetProgress(initProg);
    setScoredCards({});
    setCsvPreview(null);
    setExcludedCount(0);
    setSource("csv");
    setPhase("candidates");
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const sortedScored   = Object.entries(scoredCards).map(([i, card]) => ({ i: Number(i), card })).sort((a, b) => b.card.pct - a.card.pct);
  const anyScored      = sortedScored.length > 0;
  const pendingCount   = candidates.filter((_, i) => vetProgress[i] === "idle" || vetProgress[i] === "error").length;

  return (
    <div>
      {/* ── Step 1: Search form ───────────────────────────────────────────── */}
      <div style={{ background: "white", borderRadius: "14px", padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", background: "#5b8c5a", color: "white", borderRadius: "4px", padding: "2px 7px" }}>STEP 1</span>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>Find Top Contractors</h2>
        </div>
        <p style={{ margin: "0 0 18px", fontSize: "12px", color: "#94a3b8" }}>
          Search the web for the top 3 local contractors — they'll be saved to your database as candidates, then you choose when to run the full vetting scorecard
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
          <div style={{ flex: "2 1 150px" }}>
            <label style={labelStyle}>City</label>
            <input value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === "Enter" && handleFind()} placeholder="Austin" style={inputStyle} />
          </div>
          <div style={{ flex: "1 1 70px" }}>
            <label style={labelStyle}>State</label>
            <input value={stateVal} onChange={e => setStateVal(e.target.value.toUpperCase().slice(0, 2))} onKeyDown={e => e.key === "Enter" && handleFind()} placeholder="TX" maxLength={2} style={inputStyle} />
          </div>
          <div style={{ flex: "3 1 200px" }}>
            <label style={labelStyle}>Service Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} onKeyDown={e => e.key === "Enter" && handleFind()} placeholder="Plumbing" list="contractor-categories" style={inputStyle} />
            <datalist id="contractor-categories">
              {CATEGORIES.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <button
              onClick={handleFind}
              disabled={phase === "finding"}
              style={{ padding: "9px 24px", borderRadius: "8px", border: "none", background: phase === "finding" ? "#a8c5a7" : "#e8912e", color: "white", fontWeight: "700", fontSize: "13px", cursor: phase === "finding" ? "wait" : "pointer", height: "38px", whiteSpace: "nowrap" }}
            >
              {phase === "finding" ? "Searching…" : "Find Top 3 →"}
            </button>
          </div>
        </div>

        {/* ── CSV upload divider ─────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "20px 0 14px" }}>
          <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>or import your own list</span>
          <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <label style={{
            cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
            padding: "9px 16px", borderRadius: "8px", border: "2px dashed #e2e8f0",
            background: "#fafbfc", fontSize: "13px", color: "#64748b", fontWeight: "600",
            flex: "1 1 180px",
          }}>
            📂 Upload CSV
            <input type="file" accept=".csv,text/csv" onChange={handleCSVFile} style={{ display: "none" }} />
          </label>
          <button onClick={downloadCSVTemplate} style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontSize: "12px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}>
            ↓ Download Template
          </button>
          <div style={{ flex: "2 1 200px", fontSize: "11px", color: "#94a3b8", lineHeight: "1.5" }}>
            Required columns: <strong>name, city, state</strong><br />
            Recommended: trade, phone, website, license_number
          </div>
        </div>

        {csvError && (
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#dc2626" }}>⚠️ {csvError}</div>
        )}

        {/* CSV preview table */}
        {csvPreview && (() => {
          const valid   = csvPreview.filter(r => r.valid);
          const invalid = csvPreview.filter(r => !r.valid);
          return (
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                  {valid.length} contractor{valid.length !== 1 ? "s" : ""} ready to import
                  {invalid.length > 0 && <span style={{ color: "#dc2626", fontWeight: "400", fontSize: "11px", marginLeft: "8px" }}>({invalid.length} invalid rows skipped)</span>}
                </div>
                <button onClick={() => setCsvPreview(null)} style={{ fontSize: "11px", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>✕ Clear</button>
              </div>

              <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #f1f5f9", marginBottom: "12px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Name", "Location", "Trade", "Phone", "Website", "License #"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: "700", color: "#64748b", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.04em", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {valid.slice(0, 10).map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "8px 12px", fontWeight: "600", color: "#0f172a" }}>{r.name}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{r.location}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{r.trade || "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{r.phone || "—"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          {r.website
                            ? <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer" style={{ color: "#5b8c5a", fontWeight: "600" }}>↗ Visit</a>
                            : <span style={{ color: "#64748b" }}>—</span>}
                        </td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{r.license || "—"}</td>
                      </tr>
                    ))}
                    {valid.length > 10 && (
                      <tr><td colSpan={6} style={{ padding: "8px 12px", color: "#94a3b8", fontStyle: "italic", fontSize: "11px" }}>…and {valid.length - 10} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleCSVImport}
                disabled={valid.length === 0}
                style={{ padding: "9px 20px", borderRadius: "8px", border: "none", background: "#e8912e", color: "white", fontWeight: "700", fontSize: "13px", cursor: valid.length > 0 ? "pointer" : "not-allowed" }}
              >
                Import {valid.length} Contractors as Candidates →
              </button>
            </div>
          );
        })()}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {phase === "error" && errorMsg && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "14px 18px", marginBottom: "18px", color: "#dc2626", fontSize: "13px" }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* ── Finding spinner ───────────────────────────────────────────────── */}
      {phase === "finding" && (
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "20px" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔍</div>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>Searching the web…</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
            Finding the top {category} contractors in {city}, {stateVal}
          </div>
        </div>
      )}

      {/* ── Step 2: Candidates + Scoring ──────────────────────────────────── */}
      {(phase === "candidates" || phase === "done") && candidates.length > 0 && (
        <div>
          {/* Step 2 header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", background: "#e8912e", color: "white", borderRadius: "4px", padding: "2px 7px" }}>STEP 2</span>
                <span style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                  {source === "csv"
                    ? `Run Scorecards — ${candidates.length} contractors from CSV`
                    : `Run Scorecards — ${category} in ${city}, ${stateVal}`}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: excludedCount > 0 ? "#ca8a04" : "#94a3b8" }}>
                {source === "csv"
                  ? `${candidates.length} contractors imported from CSV and saved as candidates`
                  : excludedCount > 0
                    ? `⚠️ ${excludedCount} contractor${excludedCount > 1 ? "s" : ""} with failing scores excluded from these results`
                    : "3 candidates found and saved to your database — select any to run the full scorecard"}
              </div>
            </div>
            {pendingCount > 0 && !isScoreAllRunning && (
              <button
                onClick={handleScoreAll}
                style={{ padding: "9px 20px", borderRadius: "8px", border: "none", background: "#e8912e", color: "white", fontWeight: "700", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Score All {pendingCount} →
              </button>
            )}
            {isScoreAllRunning && (
              <span style={{ fontSize: "12px", color: "#5b8c5a", fontWeight: "600", alignSelf: "center" }}>⏳ Running scorecards…</span>
            )}
          </div>

          {/* Unscored candidate rows */}
          {pendingCount > 0 || Object.values(vetProgress).some(p => p === "vetting" || p === "pausing") ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: anyScored ? "24px" : "8px" }}>
              {candidates.map((c, i) => {
                if (vetProgress[i] === "done") return null;
                return (
                  <CandidateRow
                    key={c.id}
                    rank={i + 1}
                    name={c.applicant.name}
                    location={c.applicant.location}
                    progress={vetProgress[i]}
                    onScore={() => scoreOne(i)}
                    onRetry={() => scoreOne(i)}
                  />
                );
              })}
            </div>
          ) : null}

          {/* Scored result cards ranked */}
          {anyScored && (
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>
                📊 Scorecard Results — ranked by NeighborServe score
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "18px", paddingBottom: "32px" }}>
                {sortedScored.map(({ card }, rankIdx) => (
                  <ScoredCard key={card.id} card={card} rank={rankIdx + 1} onView={onView} onEdit={onEdit} />
                ))}
              </div>
            </div>
          )}

          {/* Back to search */}
          <div style={{ textAlign: "center", paddingBottom: "24px" }}>
            <button
              onClick={() => { setPhase("form"); setCandidates([]); setScoredCards({}); setVetProgress({}); }}
              style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
            >
              ← New Search
            </button>
          </div>
        </div>
      )}

      {/* ── Empty / idle state ────────────────────────────────────────────── */}
      {phase === "form" && (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: "52px", marginBottom: "12px" }}>🏘️</div>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#94a3b8" }}>Your Home, Managed</div>
          <div style={{ fontSize: "13px", color: "#cbd5e1", maxWidth: "420px", margin: "8px auto 0", lineHeight: "1.6" }}>
            Enter a city, state, and service category above.<br />
            We'll identify the top 3 contractors and save them as candidates.<br />
            You run the full 11-section vetting scorecard on your schedule.
          </div>
        </div>
      )}
    </div>
  );
}
