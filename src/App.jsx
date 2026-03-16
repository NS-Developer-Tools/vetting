import React, { useState } from "react";
import ScorecardForm from "./components/ScorecardForm.jsx";
import DatabaseView from "./components/DatabaseView.jsx";
import ScorecardDetail from "./components/ScorecardDetail.jsx";
import ContractorSearch from "./components/ContractorSearch.jsx";
import MonitoringDashboard from "./components/MonitoringDashboard.jsx";

const NAV = [
  { id: "search",   label: "🔍 Find Contractors" },
  { id: "form",     label: "＋ New Vetting" },
  { id: "database", label: "📋 Database" },
  { id: "monitor",  label: "📈 Monitor" },
];

export default function App() {
  const [view, setView] = useState("search");
  const [selectedCard, setSelectedCard] = useState(null);
  const [editCard, setEditCard] = useState(null);

  function goSearch()   { setView("search"); }
  function goNew()      { setView("form"); setEditCard(null); }
  function goDatabase() { setView("database"); }
  function goMonitor()  { setView("monitor"); }

  const activeTab = view === "detail" ? "database" : view;

  const navBtn = (active) => ({
    padding: "6px 15px",
    borderRadius: "6px",
    border: active ? "none" : "1px solid rgba(255,255,255,0.3)",
    cursor: "pointer",
    background: active ? "white" : "transparent",
    color: active ? "#0f172a" : "white",
    fontWeight: "600",
    fontSize: "12px",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  });

  const navActions = { search: goSearch, form: goNew, database: goDatabase, monitor: goMonitor };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      <header style={{
        background: "linear-gradient(135deg, #0f172a 0%, #3b82f6 100%)",
        color: "white",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "58px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>🏘️</span>
          <div>
            <div style={{ fontWeight: "800", fontSize: "16px", letterSpacing: "-0.3px" }}>NeighborServe</div>
            <div style={{ fontSize: "10px", opacity: 0.7, marginTop: "-2px" }}>Contractor Vetting System</div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "4px" }}>
          {NAV.map(({ id, label }) => (
            <button key={id} style={navBtn(activeTab === id)} onClick={navActions[id]}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "24px 16px" }}>
        {view === "search" && (
          <ContractorSearch
            onView={(card) => { setSelectedCard(card); setView("detail"); }}
            onEdit={(card) => { setEditCard(card); setView("form"); }}
          />
        )}
        {view === "form" && (
          <ScorecardForm
            key={editCard?.id || "new"}
            initialData={editCard}
            onSaved={() => { setEditCard(null); goDatabase(); }}
          />
        )}
        {view === "database" && (
          <DatabaseView
            onView={(card) => { setSelectedCard(card); setView("detail"); }}
            onEdit={(card) => { setEditCard(card); setView("form"); }}
          />
        )}
        {view === "detail" && selectedCard && (
          <ScorecardDetail
            card={selectedCard}
            onBack={goDatabase}
            onEdit={(card) => { setEditCard(card); setView("form"); }}
          />
        )}
        {view === "monitor" && (
          <MonitoringDashboard />
        )}
      </main>
    </div>
  );
}
