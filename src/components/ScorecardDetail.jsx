import React from "react";
import { SECTIONS, MAX_SCORE, REF_MAX } from "../data/sections.js";
import { verdictFor } from "../lib/scoring.js";
import { downloadScorecardPDF } from "../lib/pdf.js";

const VS = {
  ACCEPT:      { bg: "#dcfce7", text: "#16a34a", border: "#86efac" },
  REVIEW:      { bg: "#fef9c3", text: "#ca8a04", border: "#fde047" },
  DECLINE:     { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" },
  "HARD STOP": { bg: "#ede9fe", text: "#7c3aed", border: "#c4b5fd" },
};

export default function ScorecardDetail({ card, onBack, onEdit }) {
  const { applicant, selections, refChecks, notes, hardStops, researchNotes, total, pct } = card;
  const verdict = verdictFor(pct, hardStops || []);
  const vc = VS[verdict.label] || {};
  const refScore = Object.values(refChecks || {}).some(Boolean) ? REF_MAX : 0;

  return (
    <div id="scorecard-print">
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <button onClick={onBack} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#374151", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
          ← Back
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => onEdit(card)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#374151", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
            ✏️ Edit
          </button>
          <button onClick={() => downloadScorecardPDF(card)} style={{ padding: "8px 18px", borderRadius: "8px", border: "none", background: "#3b82f6", color: "white", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Verdict banner */}
      <div style={{ background: vc.bg, border: `2px solid ${vc.border}`, borderRadius: "12px", padding: "20px 24px", marginBottom: "20px" }}>
        <div style={{ fontSize: "20px", fontWeight: "800", color: vc.text }}>{verdict.full}</div>
        <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "14px", color: "#374151", fontWeight: "600" }}>
            Score: {total} / {MAX_SCORE} &nbsp;({pct}%)
          </span>
          <div style={{ flex: 1, minWidth: "100px", maxWidth: "200px" }}>
            <div style={{ height: "7px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct >= 80 ? "#16a34a" : pct >= 60 ? "#eab308" : "#ef4444", borderRadius: "4px" }} />
            </div>
          </div>
        </div>
        {hardStops?.length > 0 && (
          <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {hardStops.map((msg, i) => (
              <span key={i} style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: "600" }}>
                {msg}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Applicant info */}
      <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Applicant Information</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "14px" }}>
          {[
            ["Business Name", applicant?.name],
            ["Trade / Specialty", applicant?.trade],
            ["Location", applicant?.location],
            ["Application Date", applicant?.date],
            ["Reviewed By", applicant?.reviewer],
            ["Record Saved", new Date(card.savedAt).toLocaleDateString()],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500", marginTop: "2px" }}>{value || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section score summary */}
      <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Section Breakdown</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
          {SECTIONS.map(s => {
            const earned = s.fields.reduce((a, f) => a + (selections[`${f.id}_score`] || 0), 0);
            const max = s.fields.reduce((a, f) => a + Math.max(...f.options.map(o => o.score)), 0);
            const sp = Math.round((earned / max) * 100);
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "190px", fontSize: "12px", color: "#374151", flexShrink: 0 }}>{s.icon} {s.title}</div>
                <div style={{ flex: 1, height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${sp}%`, background: sp >= 70 ? "#16a34a" : sp >= 50 ? "#eab308" : "#ef4444", borderRadius: "3px" }} />
                </div>
                <div style={{ minWidth: "64px", textAlign: "right", fontSize: "11px", color: "#64748b", fontWeight: "600" }}>{earned} / {max}</div>
                <div style={{ fontSize: "12px", minWidth: "16px" }}>{sp >= 70 ? "✅" : sp >= 50 ? "⚠️" : "❌"}</div>
              </div>
            );
          })}
          {/* References row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "190px", fontSize: "12px", color: "#374151", flexShrink: 0 }}>📋 References</div>
            <div style={{ flex: 1, height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round((refScore / REF_MAX) * 100)}%`, background: refScore > 0 ? "#16a34a" : "#e2e8f0", borderRadius: "3px" }} />
            </div>
            <div style={{ minWidth: "64px", textAlign: "right", fontSize: "11px", color: "#64748b", fontWeight: "600" }}>{refScore} / {REF_MAX}</div>
            <div style={{ fontSize: "12px", minWidth: "16px" }}>{refScore > 0 ? "✅" : "⚠️"}</div>
          </div>
        </div>
      </div>

      {/* Detailed answers per section */}
      {SECTIONS.map(s => {
        const answered = s.fields.filter(f => selections[f.id]);
        if (answered.length === 0) return null;
        return (
          <div key={s.id} style={{ background: "white", borderRadius: "12px", padding: "18px 20px", marginBottom: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: "700", color: "#1e3a5f" }}>{s.icon} {s.title}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              {answered.map(f => {
                const score = selections[`${f.id}_score`] ?? 0;
                return (
                  <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 12px", borderRadius: "8px", background: "#f8fafc", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.03em" }}>{f.label}</div>
                      <div style={{ fontSize: "13px", fontWeight: "500", color: "#1e293b" }}>{selections[f.id]}</div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: score > 0 ? "#16a34a" : "#dc2626", whiteSpace: "nowrap", marginTop: "12px" }}>
                      {score > 0 ? `+${score}` : score} pts
                    </div>
                  </div>
                );
              })}
            </div>
            {notes?.[s.id] && (
              <div style={{ marginTop: "10px", padding: "9px 12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", fontSize: "12px", color: "#0369a1", fontStyle: "italic" }}>
                📝 {notes[s.id]}
              </div>
            )}
          </div>
        );
      })}

      {/* Research notes */}
      {researchNotes && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "12px", padding: "16px 20px", marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#0369a1", marginBottom: "6px" }}>🔍 Research Summary</div>
          <div style={{ fontSize: "12px", color: "#0c4a6e", lineHeight: "1.6" }}>{researchNotes}</div>
        </div>
      )}
    </div>
  );
}
