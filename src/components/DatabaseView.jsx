import React, { useState, useEffect, useCallback } from "react";
import { loadAllCards, deleteCard } from "../lib/db.js";

const VS = {
  ACCEPT:      { bg: "#dcfce7", text: "#16a34a", border: "#86efac" },
  REVIEW:      { bg: "#fef9c3", text: "#ca8a04", border: "#fde047" },
  DECLINE:     { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" },
  "HARD STOP": { bg: "#ede9fe", text: "#7c3aed", border: "#c4b5fd" },
  CANDIDATE:   { bg: "#f0f7f0", text: "#5b8c5a", border: "#c8dfc7" },
};

export default function DatabaseView({ onView, onEdit }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterVerdict, setFilterVerdict] = useState("ALL");
  const [sortBy, setSortBy] = useState("savedAt");
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCards(await loadAllCards()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(card) {
    if (!window.confirm(`Delete scorecard for "${card.applicant?.name}"? This cannot be undone.`)) return;
    setDeletingId(card.id);
    await deleteCard(card.id);
    setCards(prev => prev.filter(c => c.id !== card.id));
    setDeletingId(null);
  }

  const counts = cards.reduce((acc, c) => { acc[c.verdictLabel] = (acc[c.verdictLabel] || 0) + 1; return acc; }, {});

  const filtered = cards
    .filter(c => {
      const q = search.toLowerCase();
      return !q ||
        (c.applicant?.name || "").toLowerCase().includes(q) ||
        (c.applicant?.trade || "").toLowerCase().includes(q) ||
        (c.applicant?.location || "").toLowerCase().includes(q);
    })
    .filter(c => filterVerdict === "ALL" || c.verdictLabel === filterVerdict)
    .sort((a, b) => {
      if (sortBy === "savedAt") return b.savedAt.localeCompare(a.savedAt);
      if (sortBy === "name") return (a.applicant?.name || "").localeCompare(b.applicant?.name || "");
      if (sortBy === "score") return (b.pct || 0) - (a.pct || 0);
      return 0;
    });

  const filterChips = [
    ["ALL", cards.length, "#64748b"],
    ["ACCEPT", counts.ACCEPT || 0, "#16a34a"],
    ["REVIEW", counts.REVIEW || 0, "#ca8a04"],
    ["DECLINE", counts.DECLINE || 0, "#dc2626"],
    ["HARD STOP", counts["HARD STOP"] || 0, "#7c3aed"],
    ["CANDIDATE", counts.CANDIDATE || 0, "#5b8c5a"],
  ];

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {filterChips.map(([label, count, color]) => (
          <button
            key={label}
            onClick={() => setFilterVerdict(label)}
            style={{
              padding: "8px 16px", borderRadius: "20px",
              border: `2px solid ${filterVerdict === label ? color : "#e2e8f0"}`,
              background: filterVerdict === label ? color : "white",
              color: filterVerdict === label ? "white" : "#374151",
              cursor: "pointer", fontWeight: "700", fontSize: "12px",
            }}
          >
            {label} · {count}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Search name, trade, location…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: "1 1 220px", padding: "9px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none" }}
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", background: "white", cursor: "pointer" }}
        >
          <option value="savedAt">Newest First</option>
          <option value="name">Name A–Z</option>
          <option value="score">Highest Score</option>
        </select>
        <button onClick={load} style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: "13px" }}>↺</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8", fontSize: "14px" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <div style={{ fontSize: "16px", fontWeight: "600" }}>
            {cards.length === 0 ? "No scorecards yet" : "No matches"}
          </div>
          <div style={{ fontSize: "13px", marginTop: "6px" }}>
            {cards.length === 0 ? "Create your first vetting scorecard to get started." : "Try adjusting your search or filter."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(card => {
            const vs = VS[card.verdictLabel] || {};
            const date = card.savedAt ? new Date(card.savedAt).toLocaleDateString() : "—";
            return (
              <div
                key={card.id}
                style={{
                  background: "white", borderRadius: "12px", padding: "14px 18px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.07)", border: "1px solid #f1f5f9",
                  display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap",
                }}
              >
                {/* Verdict */}
                <div style={{ minWidth: "82px", textAlign: "center" }}>
                  <div style={{
                    background: vs.bg, color: vs.text, border: `1px solid ${vs.border}`,
                    borderRadius: "8px", padding: "3px 6px", fontSize: "10px", fontWeight: "700",
                  }}>
                    {card.verdictLabel}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: "#1e293b", marginTop: "3px" }}>{card.pct}%</div>
                </div>

                {/* Mini bar */}
                <div style={{ width: "52px", flexShrink: 0 }}>
                  <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${card.pct}%`, background: card.pct >= 80 ? "#16a34a" : card.pct >= 60 ? "#eab308" : "#ef4444", borderRadius: "3px" }} />
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: "140px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{card.applicant?.name || "Unnamed"}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                    {[card.applicant?.trade, card.applicant?.location].filter(Boolean).join(" · ")}
                  </div>
                </div>

                {/* Hard stops badge */}
                {card.hardStops?.length > 0 && (
                  <div style={{ fontSize: "10px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", padding: "3px 8px", fontWeight: "700" }}>
                    {card.hardStops.length} stop{card.hardStops.length > 1 ? "s" : ""}
                  </div>
                )}

                {/* Date + reviewer */}
                <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "right", minWidth: "72px" }}>
                  <div>{date}</div>
                  {card.applicant?.reviewer && <div style={{ marginTop: "1px" }}>by {card.applicant.reviewer}</div>}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => onView(card)} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: "#5b8c5a", color: "white", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>View</button>
                  <button onClick={() => onEdit(card)} style={{ padding: "6px 12px", borderRadius: "7px", border: "1px solid #e2e8f0", background: "white", color: "#374151", fontSize: "12px", cursor: "pointer" }}>Edit</button>
                  <button
                    onClick={() => handleDelete(card)}
                    disabled={deletingId === card.id}
                    style={{ padding: "6px 10px", borderRadius: "7px", border: "1px solid #fca5a5", background: "white", color: "#dc2626", fontSize: "12px", cursor: "pointer", opacity: deletingId === card.id ? 0.5 : 1 }}
                  >
                    {deletingId === card.id ? "…" : "🗑"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
