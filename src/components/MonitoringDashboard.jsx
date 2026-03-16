import React, { useState, useEffect, useCallback } from "react";
import {
  ACTIVE_CONTRACTORS,
  fetchContractorsFromSheet,
  loadMonitoringData,
  saveMonitoringData,
  isDataStale,
  clearMonitoringRecord,
  runReviewSearch,
} from "../lib/monitoring.js";

// ── Helpers ────────────────────────────────────────────────────────────────
const TREND_CONFIG = {
  improving:        { icon: "📈", label: "Improving",        bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  declining:        { icon: "📉", label: "Declining",        bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
  stable:           { icon: "➡️",  label: "Stable",           bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  insufficient_data:{ icon: "⚪",  label: "No Recent Data",   bg: "#f8fafc", border: "#e2e8f0", text: "#64748b" },
};

function trendCfg(trend) {
  return TREND_CONFIG[trend] || TREND_CONFIG.insufficient_data;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelative(iso) {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Main Component ─────────────────────────────────────────────────────────
export default function MonitoringDashboard() {
  const [contractors, setContractors]       = useState(ACTIVE_CONTRACTORS);
  const [monData, setMonData]               = useState({});
  const [filter, setFilter]                 = useState("all");
  const [scanning, setScanning]             = useState(false);
  const [scanTarget, setScanTarget]         = useState(null);   // name being scanned
  const [scanProgress, setScanProgress]     = useState(null);   // { current, total }
  const [scanError, setScanError]           = useState(null);
  const [selected, setSelected]             = useState(null);   // contractor for detail view
  const [loadingSheet, setLoadingSheet]     = useState(false);
  const [lastSheetSync, setLastSheetSync]   = useState(null);

  // ── Load stored data on mount ──────────────────────────────────────────
  useEffect(() => {
    setMonData(loadMonitoringData());
  }, []);

  // ── Fetch fresh contractor list from sheet ─────────────────────────────
  const syncSheet = useCallback(async () => {
    setLoadingSheet(true);
    try {
      const fresh = await fetchContractorsFromSheet();
      setContractors(fresh);
      setLastSheetSync(new Date().toISOString());
    } finally {
      setLoadingSheet(false);
    }
  }, []);

  // ── Scan a single contractor ───────────────────────────────────────────
  async function scanOne(name) {
    setScanTarget(name);
    setScanError(null);
    try {
      const result = await runReviewSearch(name);
      const updated = { ...loadMonitoringData(), [name]: result };
      saveMonitoringData(updated);
      setMonData({ ...updated });
    } catch (err) {
      setScanError(`${name}: ${err.message}`);
    } finally {
      setScanTarget(null);
    }
  }

  // ── Run daily check: scan all stale contractors sequentially ──────────
  async function runDailyCheck() {
    const stale = contractors.filter(c => isDataStale(c.name));
    if (stale.length === 0) {
      alert("All contractors have been checked within the last 24 hours. ✅");
      return;
    }

    setScanning(true);
    setScanError(null);
    setScanProgress({ current: 0, total: stale.length });

    for (let i = 0; i < stale.length; i++) {
      const { name } = stale[i];
      setScanTarget(name);
      setScanProgress({ current: i + 1, total: stale.length });

      try {
        const result = await runReviewSearch(name);
        const updated = { ...loadMonitoringData(), [name]: result };
        saveMonitoringData(updated);
        setMonData({ ...updated });
      } catch (err) {
        setScanError(`Failed on ${name}: ${err.message}`);
        setScanning(false);
        setScanTarget(null);
        setScanProgress(null);
        return;
      }

      // 15-second pause between calls to respect rate limits
      if (i < stale.length - 1) await sleep(15000);
    }

    setScanning(false);
    setScanTarget(null);
    setScanProgress(null);
  }

  function stopScan() {
    setScanning(false);
    setScanTarget(null);
    setScanProgress(null);
  }

  // ── Compute summary stats ──────────────────────────────────────────────
  const checkedToday = contractors.filter(c => {
    const rec = monData[c.name];
    if (!rec?.lastChecked) return false;
    const ms = Date.now() - new Date(rec.lastChecked).getTime();
    return ms < 24 * 60 * 60 * 1000;
  }).length;

  const withActivity = contractors.filter(c => {
    const rec = monData[c.name];
    return rec && (rec.totalRecentPositive > 0 || rec.totalRecentNegative > 0);
  }).length;

  const declining = contractors.filter(c => monData[c.name]?.overallTrend === "declining").length;

  // ── Filter contractors ─────────────────────────────────────────────────
  const filtered = contractors.filter(c => {
    const rec = monData[c.name];
    if (filter === "all")              return true;
    if (filter === "improving")        return rec?.overallTrend === "improving";
    if (filter === "declining")        return rec?.overallTrend === "declining";
    if (filter === "stable")           return rec?.overallTrend === "stable";
    if (filter === "not_checked")      return !rec?.lastChecked;
    return true;
  });

  // ── If detail view ─────────────────────────────────────────────────────
  if (selected) {
    return (
      <ContractorDetail
        contractor={selected}
        record={monData[selected.name]}
        onBack={() => setSelected(null)}
        onScan={() => scanOne(selected.name)}
        scanning={scanTarget === selected.name}
      />
    );
  }

  // ── Dashboard view ─────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>
              📈 Contractor Monitoring
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
              Daily review tracking for {contractors.length} active contractors
              {lastSheetSync && ` · Sheet synced ${formatRelative(lastSheetSync)}`}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={syncSheet}
              disabled={loadingSheet}
              style={{
                padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0",
                background: "white", cursor: loadingSheet ? "not-allowed" : "pointer",
                fontSize: "13px", fontWeight: "600", color: "#475569",
              }}
            >
              {loadingSheet ? "⟳ Syncing…" : "↻ Sync Sheet"}
            </button>

            {scanning ? (
              <button
                onClick={stopScan}
                style={{
                  padding: "8px 16px", borderRadius: "8px", border: "none",
                  background: "#ef4444", color: "white", cursor: "pointer",
                  fontSize: "13px", fontWeight: "700",
                }}
              >
                ⏹ Stop Scan
              </button>
            ) : (
              <button
                onClick={runDailyCheck}
                style={{
                  padding: "8px 16px", borderRadius: "8px", border: "none",
                  background: "linear-gradient(135deg, #0f172a 0%, #3b82f6 100%)",
                  color: "white", cursor: "pointer", fontSize: "13px", fontWeight: "700",
                }}
              >
                ▶ Run Daily Check
              </button>
            )}
          </div>
        </div>

        {/* ── Scan progress bar ──────────────────────────────────────── */}
        {scanning && scanProgress && (
          <div style={{
            marginTop: "16px", background: "white", border: "1px solid #bfdbfe",
            borderRadius: "10px", padding: "14px 16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#1d4ed8" }}>
                Scanning: {scanTarget}
              </span>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                {scanProgress.current} / {scanProgress.total}
              </span>
            </div>
            <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(scanProgress.current / scanProgress.total) * 100}%`,
                background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
                borderRadius: "99px",
                transition: "width 0.4s ease",
              }} />
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#94a3b8" }}>
              ⏳ 15-second pause between checks to respect rate limits
            </p>
          </div>
        )}

        {/* ── Scan error ────────────────────────────────────────────── */}
        {scanError && (
          <div style={{
            marginTop: "12px", background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#dc2626",
          }}>
            ⚠️ {scanError}
          </div>
        )}
      </div>

      {/* ── Stats cards ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Active Contractors", value: contractors.length, color: "#0f172a", icon: "🏢" },
          { label: "Checked Today",      value: checkedToday,       color: "#1d4ed8", icon: "✅" },
          { label: "Recent Activity",    value: withActivity,       color: "#0284c7", icon: "💬" },
          { label: "Flagged Declining",  value: declining,          color: declining > 0 ? "#dc2626" : "#64748b", icon: "📉" },
        ].map(s => (
          <div key={s.label} style={{
            background: "white", border: "1px solid #e2e8f0", borderRadius: "10px",
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: "20px", marginBottom: "6px" }}>{s.icon}</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter pills ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { id: "all",        label: `All (${contractors.length})`,                              color: "#0f172a" },
          { id: "improving",  label: `📈 Improving`,                                             color: "#15803d" },
          { id: "stable",     label: `➡️ Stable`,                                                color: "#1d4ed8" },
          { id: "declining",  label: `📉 Declining (${declining})`,                              color: "#dc2626" },
          { id: "not_checked",label: `⚪ Not Checked (${contractors.length - checkedToday})`,    color: "#64748b" },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "5px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: "600",
              cursor: "pointer", transition: "all 0.15s",
              border: filter === f.id ? "none" : `1px solid #e2e8f0`,
              background: filter === f.id ? f.color : "white",
              color: filter === f.id ? "white" : "#475569",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Contractor grid ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
        {filtered.map(c => (
          <ContractorCard
            key={c.name}
            contractor={c}
            record={monData[c.name]}
            scanning={scanTarget === c.name}
            onView={() => setSelected(c)}
            onScan={() => scanOne(c.name)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "14px" }}>
          No contractors match this filter.
        </div>
      )}
    </div>
  );
}

// ── Contractor Card ────────────────────────────────────────────────────────
function ContractorCard({ contractor, record, scanning, onView, onScan }) {
  const { name, startDate } = contractor;
  const trend   = record?.overallTrend || "insufficient_data";
  const cfg     = trendCfg(trend);
  const pos     = record?.totalRecentPositive  || 0;
  const neg     = record?.totalRecentNegative  || 0;
  const reviews = record?.recentReviews?.length || 0;

  return (
    <div
      style={{
        background: "white", border: `1px solid ${cfg.border}`,
        borderRadius: "10px", padding: "14px 16px",
        cursor: "pointer", transition: "box-shadow 0.15s",
        position: "relative",
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
      onClick={onView}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
          <div style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a", lineHeight: "1.3" }}>
            {name}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
            Partner since {startDate}
          </div>
        </div>
        <span style={{
          padding: "3px 8px", borderRadius: "99px", fontSize: "11px", fontWeight: "600",
          background: cfg.bg, color: cfg.text, whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Review counts */}
      {record ? (
        <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
          <div style={{ fontSize: "12px", color: "#15803d", fontWeight: "600" }}>
            ✅ {pos} positive
          </div>
          <div style={{ fontSize: "12px", color: neg > 0 ? "#dc2626" : "#94a3b8", fontWeight: "600" }}>
            ❌ {neg} negative
          </div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {reviews} total
          </div>
        </div>
      ) : (
        <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px" }}>
          No data yet — run a check to get started
        </div>
      )}

      {/* Trend summary preview */}
      {record?.trendSummary && record.trendSummary !== "No recent review data found." && (
        <p style={{
          margin: "0 0 10px", fontSize: "12px", color: "#475569",
          lineHeight: "1.5", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {record.trendSummary}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
          {record?.lastChecked ? `Checked ${formatRelative(record.lastChecked)}` : "Never checked"}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onScan(); }}
          disabled={scanning}
          style={{
            padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600",
            border: "1px solid #e2e8f0", background: scanning ? "#f8fafc" : "white",
            color: scanning ? "#94a3b8" : "#3b82f6", cursor: scanning ? "not-allowed" : "pointer",
          }}
        >
          {scanning ? "⟳ Scanning…" : "⟳ Check Now"}
        </button>
      </div>
    </div>
  );
}

// ── Contractor Detail View ─────────────────────────────────────────────────
function ContractorDetail({ contractor, record, onBack, onScan, scanning }) {
  const { name, startDate } = contractor;
  const trend  = record?.overallTrend || "insufficient_data";
  const cfg    = trendCfg(trend);
  const pos    = record?.totalRecentPositive  || 0;
  const neg    = record?.totalRecentNegative  || 0;
  const reviews = record?.recentReviews || [];

  const sentimentColors = {
    positive: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", icon: "✅" },
    negative: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626", icon: "❌" },
    neutral:  { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b", icon: "➖" },
  };

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          padding: "7px 14px", borderRadius: "8px", border: "1px solid #e2e8f0",
          background: "white", cursor: "pointer", fontSize: "13px", fontWeight: "600",
          color: "#475569", marginBottom: "20px",
        }}
      >
        ← Back to Dashboard
      </button>

      {/* Header card */}
      <div style={{
        background: "white", border: "1px solid #e2e8f0", borderRadius: "12px",
        padding: "20px 24px", marginBottom: "16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>{name}</h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
              Active partner since {startDate} · Last checked {record?.lastChecked ? formatDate(record.lastChecked) : "Never"}
            </p>
          </div>

          <button
            onClick={onScan}
            disabled={scanning}
            style={{
              padding: "9px 18px", borderRadius: "8px", border: "none", fontWeight: "700",
              fontSize: "13px", cursor: scanning ? "not-allowed" : "pointer",
              background: scanning ? "#e2e8f0" : "linear-gradient(135deg, #0f172a 0%, #3b82f6 100%)",
              color: scanning ? "#94a3b8" : "white",
            }}
          >
            {scanning ? "⟳ Scanning…" : "⟳ Run Check Now"}
          </button>
        </div>

        {/* Trend badge + summary */}
        <div style={{
          marginTop: "16px", padding: "14px 16px",
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          borderRadius: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "18px" }}>{cfg.icon}</span>
            <span style={{ fontWeight: "700", fontSize: "15px", color: cfg.text }}>
              {cfg.label}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
            {record?.trendSummary || "No review data found yet. Run a check to get started."}
          </p>
        </div>

        {/* Sentiment stats */}
        {record && (
          <div style={{ display: "flex", gap: "16px", marginTop: "14px" }}>
            <div style={{ textAlign: "center", padding: "10px 20px", background: "#f0fdf4", borderRadius: "8px", flex: 1 }}>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#15803d" }}>{pos}</div>
              <div style={{ fontSize: "12px", color: "#15803d", fontWeight: "600" }}>Positive</div>
            </div>
            <div style={{ textAlign: "center", padding: "10px 20px", background: neg > 0 ? "#fef2f2" : "#f8fafc", borderRadius: "8px", flex: 1 }}>
              <div style={{ fontSize: "24px", fontWeight: "800", color: neg > 0 ? "#dc2626" : "#94a3b8" }}>{neg}</div>
              <div style={{ fontSize: "12px", color: neg > 0 ? "#dc2626" : "#94a3b8", fontWeight: "600" }}>Negative</div>
            </div>
            <div style={{ textAlign: "center", padding: "10px 20px", background: "#f8fafc", borderRadius: "8px", flex: 1 }}>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#64748b" }}>{reviews.length}</div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Total Reviews</div>
            </div>
          </div>
        )}
      </div>

      {/* Reviews list */}
      <div style={{
        background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px 24px",
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
          Recent Reviews (Last 30 Days)
        </h3>

        {reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</div>
            <div style={{ fontSize: "14px" }}>
              {record ? "No reviews found in the last 30 days." : "Run a check to search for recent reviews."}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {reviews.map((rev, i) => {
              const sc = sentimentColors[rev.sentiment] || sentimentColors.neutral;
              return (
                <div
                  key={i}
                  style={{
                    padding: "12px 14px", borderRadius: "8px",
                    border: `1px solid ${sc.border}`, background: sc.bg,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px" }}>{sc.icon}</span>
                      <span style={{ fontWeight: "700", fontSize: "13px", color: sc.text }}>
                        {rev.source}
                      </span>
                      {rev.rating && (
                        <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "600" }}>
                          {"★".repeat(Math.round(rev.rating))} {rev.rating}/5
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {rev.date ? formatDate(rev.date) : "Date unknown"}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
                    {rev.summary}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
