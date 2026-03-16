import React, { useState, useEffect } from "react";
import { SECTIONS, REFERENCE_OPTIONS, MAX_SCORE, REF_MAX } from "../data/sections.js";
import { calcScore, verdictFor, getHardStopMsgs, isHardStop } from "../lib/scoring.js";
import { runAutoResearch } from "../lib/research.js";
import { saveCard } from "../lib/db.js";

const VS = {
  ACCEPT:      { bg: "#dcfce7", text: "#16a34a", border: "#86efac" },
  REVIEW:      { bg: "#fef9c3", text: "#ca8a04", border: "#fde047" },
  DECLINE:     { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" },
  "HARD STOP": { bg: "#ede9fe", text: "#7c3aed", border: "#c4b5fd" },
};

function VerdictBanner({ verdict, total, pct, hardStops }) {
  const vc = VS[verdict.label] || {};
  return (
    <div style={{
      background: vc.bg, border: `2px solid ${vc.border}`, borderRadius: "12px",
      padding: "14px 18px", marginBottom: "18px",
      position: "sticky", top: "62px", zIndex: 50,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: vc.text }}>{verdict.full}</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "1px" }}>
            Score: <strong>{total}</strong> / {MAX_SCORE} &nbsp;({pct}%)
          </div>
        </div>
        <div style={{ minWidth: "140px" }}>
          <div style={{ height: "7px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 80 ? "#16a34a" : pct >= 60 ? "#eab308" : "#ef4444", borderRadius: "4px", transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px", textAlign: "right" }}>{pct}% of max</div>
        </div>
      </div>
      {hardStops.length > 0 && (
        <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {hardStops.map((msg, i) => (
            <span key={i} style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: "600" }}>
              {msg}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ flex: "1 1 185px" }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
      {value}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: "7px",
  border: "1px solid #e2e8f0", fontSize: "13px", boxSizing: "border-box", outline: "none", color: "#1e293b",
};

function ApplicantForm({ applicant, onChange }) {
  const inp = (label, key, type = "text") => (
    <Field key={key} label={label} value={
      <input type={type} value={applicant[key] || ""} onChange={e => onChange({ ...applicant, [key]: e.target.value })} style={inputStyle} />
    } />
  );
  return (
    <div style={{ background: "white", borderRadius: "12px", padding: "18px 20px", marginBottom: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
      <h2 style={{ margin: "0 0 14px", fontSize: "13px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>📄 Applicant Information</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {inp("Business Name *", "name")}
        {inp("Location (City, State)", "location")}
        {inp("Trade / Specialty", "trade")}
        <Field label="Website URL" value={
          <input
            type="url"
            value={applicant.website || ""}
            onChange={e => onChange({ ...applicant, website: e.target.value })}
            placeholder="https://www.example.com"
            style={inputStyle}
          />
        } />
        {inp("Application Date", "date", "date")}
        {inp("Reviewed By", "reviewer")}
      </div>
    </div>
  );
}

function ReferenceSection({ refChecks, onChange }) {
  const refScore = Object.values(refChecks).some(Boolean) ? REF_MAX : 0;
  return (
    <div style={{ background: "white", borderRadius: "12px", padding: "18px 20px", marginBottom: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h2 style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>📋 Professional References</h2>
        <span style={{ fontSize: "12px", fontWeight: "700", color: refScore > 0 ? "#16a34a" : "#94a3b8" }}>{refScore} / {REF_MAX} pts</span>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: "11px", color: "#94a3b8" }}>Check all that apply — any single verified reference earns full {REF_MAX} points.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {REFERENCE_OPTIONS.map(opt => (
          <label key={opt.id} style={{
            display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
            padding: "8px 12px", borderRadius: "8px",
            border: `1px solid ${refChecks[opt.id] ? "#5b8c5a" : "#e2e8f0"}`,
            background: refChecks[opt.id] ? "#f0f7f0" : "white",
          }}>
            <input
              type="checkbox"
              checked={!!refChecks[opt.id]}
              onChange={e => onChange({ ...refChecks, [opt.id]: e.target.checked })}
              style={{ width: "15px", height: "15px", flexShrink: 0 }}
            />
            <span style={{ fontSize: "13px", color: "#374151" }}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ section, selections, onSelect, note, onNoteChange }) {
  const earned = section.fields.reduce((a, f) => a + (selections[`${f.id}_score`] || 0), 0);
  const max = section.fields.reduce((a, f) => a + Math.max(...f.options.map(o => o.score)), 0);
  const sp = max > 0 ? Math.round((earned / max) * 100) : 0;
  const answered = section.fields.filter(f => selections[f.id]).length;

  return (
    <div style={{ background: "white", borderRadius: "12px", padding: "18px 20px", marginBottom: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", border: "1px solid #f8fafc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{section.icon} {section.title}</h2>
            {section.auto && <span style={{ fontSize: "9px", background: "#ddf0dd", color: "#5b8c5a", borderRadius: "4px", padding: "2px 6px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.04em" }}>Auto</span>}
          </div>
          {section.hint && <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>{section.hint}</p>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: sp >= 70 ? "#16a34a" : sp >= 50 ? "#ca8a04" : "#dc2626" }}>{earned} / {max}</div>
          <div style={{ fontSize: "10px", color: "#94a3b8" }}>{answered}/{section.fields.length}</div>
        </div>
      </div>

      {section.fields.map(field => {
        const selected = selections[field.id];
        const fieldHardStop = selected && isHardStop(field.id, selected);
        return (
          <div key={field.id} style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>{field.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {field.options.map(opt => {
                const isSelected = selected === opt.label;
                const optIsStop = isHardStop(field.id, opt.label);
                return (
                  <label key={opt.label} style={{
                    display: "flex", alignItems: "center", gap: "9px", cursor: "pointer",
                    padding: "7px 11px", borderRadius: "8px",
                    border: `1px solid ${isSelected ? (optIsStop ? "#a855f7" : "#5b8c5a") : "#e8edf2"}`,
                    background: isSelected ? (optIsStop ? "#f5f3ff" : "#f0f7f0") : "#fafbfc",
                    transition: "border-color 0.12s, background 0.12s",
                  }}>
                    <input
                      type="radio"
                      name={field.id}
                      value={opt.label}
                      checked={isSelected}
                      onChange={() => onSelect(field.id, opt)}
                      style={{ width: "15px", height: "15px", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#374151" }}>{opt.label}</span>
                      <span style={{
                        fontSize: "11px", fontWeight: "700", flexShrink: 0,
                        color: opt.score > 0 ? "#16a34a" : optIsStop ? "#7c3aed" : "#94a3b8",
                      }}>
                        {opt.score > 0 ? `+${opt.score}` : optIsStop ? "⛔" : "0"} pts
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
            {fieldHardStop && (
              <div style={{ marginTop: "5px", padding: "5px 10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "6px", fontSize: "11px", color: "#c2410c", fontWeight: "600" }}>
                ⚠️ Hard stop triggered for this selection
              </div>
            )}
          </div>
        );
      })}

      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px", marginTop: "4px" }}>
        <label style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Section Notes</label>
        <textarea
          value={note || ""}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="Optional notes for this section…"
          rows={2}
          style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", border: "1px solid #e2e8f0", fontSize: "12px", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", color: "#374151", outline: "none" }}
        />
      </div>
    </div>
  );
}

export default function ScorecardForm({ initialData, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [applicant, setApplicant] = useState({ name: "", location: "", trade: "", date: today, reviewer: "" });
  const [selections, setSelections] = useState({});
  const [refChecks, setRefChecks] = useState({});
  const [notes, setNotes] = useState({});
  const [researchNotes, setResearchNotes] = useState("");
  const [hardStops, setHardStops] = useState([]);
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    if (initialData) {
      setApplicant(initialData.applicant || { name: "", location: "", trade: "", date: today, reviewer: "" });
      setSelections(initialData.selections || {});
      setRefChecks(initialData.refChecks || {});
      setNotes(initialData.notes || {});
      setResearchNotes(initialData.researchNotes || "");
      setHardStops(initialData.hardStops || []);
    }
  }, [initialData]);

  function computeStops(sels) {
    const stops = [];
    SECTIONS.forEach(s => s.fields.forEach(f => {
      const label = sels[f.id];
      if (label) stops.push(...getHardStopMsgs(f.id, label));
    }));
    return stops;
  }

  function handleSelect(fieldId, option) {
    const next = { ...selections, [fieldId]: option.label, [`${fieldId}_score`]: option.score };
    setSelections(next);
    setHardStops(computeStops(next));
  }

  const { total, pct } = calcScore(selections, refChecks);
  const verdict = verdictFor(pct, hardStops);

  async function handleResearch() {
    if (!applicant.name || !applicant.location || !applicant.trade) {
      alert("Please fill in Business Name, Location, and Trade / Specialty first.");
      return;
    }
    setResearching(true);
    setResearchError(null);
    try {
      const result = await runAutoResearch(
        applicant.name, applicant.location, applicant.trade,
        { website: applicant.website }   // improves research accuracy when URL is provided
      );
      const { researchNotes: rn, ...fieldAnswers } = result;
      const next = { ...selections };
      SECTIONS.filter(s => s.auto).forEach(s => {
        s.fields.forEach(f => {
          const answer = fieldAnswers[f.id];
          if (answer) {
            const opt = f.options.find(o => o.label === answer);
            if (opt) { next[f.id] = opt.label; next[`${f.id}_score`] = opt.score; }
          }
        });
      });
      setSelections(next);
      setHardStops(computeStops(next));
      if (rn) setResearchNotes(rn);
    } catch (err) {
      setResearchError(err.message || "Research failed.");
    } finally {
      setResearching(false);
    }
  }

  async function handleSave() {
    if (!applicant.name) { alert("Business Name is required."); return; }
    setSaving(true);
    try {
      await saveCard({
        id: initialData?.id || `card_${Date.now()}`,
        savedAt: new Date().toISOString(),
        applicant, selections, refChecks, notes,
        hardStops, researchNotes, autoSources: {},
        total, pct, verdictLabel: verdict.label,
      });
      setSaveFlash(true);
      setTimeout(() => { setSaveFlash(false); onSaved?.(); }, 800);
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const autoSections = SECTIONS.filter(s => s.auto);
  const manualSections = SECTIONS.filter(s => !s.auto);

  return (
    <div>
      <VerdictBanner verdict={verdict} total={total} pct={pct} hardStops={hardStops} />

      <ApplicantForm applicant={applicant} onChange={setApplicant} />

      {/* Auto-research bar */}
      <div style={{
        background: "linear-gradient(135deg, #497048 0%, #5b8c5a 100%)",
        borderRadius: "12px", padding: "14px 18px", marginBottom: "14px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px",
      }}>
        <div>
          <div style={{ color: "white", fontWeight: "700", fontSize: "13px" }}>🤖 AI Auto-Research</div>
          <div style={{ color: "#c8e6c8", fontSize: "11px" }}>
            Fills {autoSections.length} sections automatically via web search
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {researchError && (
            <span style={{ color: "#fca5a5", fontSize: "11px", maxWidth: "240px" }}>⚠️ {researchError}</span>
          )}
          <button
            onClick={handleResearch}
            disabled={researching}
            style={{
              padding: "8px 18px", borderRadius: "8px", border: "none",
              cursor: researching ? "wait" : "pointer",
              background: researching ? "#93c5fd" : "white",
              color: "#497048", fontWeight: "700", fontSize: "12px",
              opacity: researching ? 0.8 : 1,
            }}
          >
            {researching ? "🔍 Researching…" : "🔍 Run Auto-Research"}
          </button>
        </div>
      </div>

      {researchNotes && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#0369a1", marginBottom: "3px" }}>🔍 Research Summary</div>
          <div style={{ fontSize: "12px", color: "#0c4a6e" }}>{researchNotes}</div>
        </div>
      )}

      {/* Section label */}
      <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
        Auto-Research Sections
      </div>

      {autoSections.map(s => (
        <SectionCard
          key={s.id}
          section={s}
          selections={selections}
          onSelect={handleSelect}
          note={notes[s.id]}
          onNoteChange={v => setNotes(n => ({ ...n, [s.id]: v }))}
        />
      ))}

      <ReferenceSection refChecks={refChecks} onChange={setRefChecks} />

      <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px", marginTop: "6px" }}>
        Manual Review Sections
      </div>

      {manualSections.map(s => (
        <SectionCard
          key={s.id}
          section={s}
          selections={selections}
          onSelect={handleSelect}
          note={notes[s.id]}
          onNoteChange={v => setNotes(n => ({ ...n, [s.id]: v }))}
        />
      ))}

      {/* Save button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", paddingBottom: "32px" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 36px", borderRadius: "10px", border: "none",
            cursor: saving ? "wait" : "pointer",
            background: saveFlash ? "#16a34a" : "#e8912e",
            color: "white", fontWeight: "700", fontSize: "14px",
            boxShadow: "0 4px 14px rgba(30,64,175,0.35)",
            transition: "background 0.2s",
          }}
        >
          {saveFlash ? "✅ Saved!" : saving ? "Saving…" : initialData ? "💾 Update Scorecard" : "💾 Save Scorecard"}
        </button>
      </div>
    </div>
  );
}
