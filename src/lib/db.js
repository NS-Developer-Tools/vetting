// ── Database abstraction layer ──────────────────────────────────────────────────
// • If VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set → uses Supabase (shared team DB)
// • Otherwise → falls back to localStorage (single-browser, local dev only)

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase     = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// ── Helpers: map between app camelCase ↔ Supabase snake_case ──────────────────
function toRow(card) {
  return {
    id:             card.id,
    saved_at:       card.savedAt,
    applicant:      card.applicant,
    selections:     card.selections,
    auto_sources:   card.autoSources   || {},
    ref_checks:     card.refChecks     || {},
    notes:          card.notes         || {},
    hard_stops:     card.hardStops     || [],
    research_notes: card.researchNotes || null,
    total:          card.total         || 0,
    pct:            card.pct           || 0,
    verdict_label:  card.verdictLabel  || "DECLINE",
  };
}

function fromRow(row) {
  return {
    id:            row.id,
    savedAt:       row.saved_at,
    applicant:     row.applicant,
    selections:    row.selections,
    autoSources:   row.auto_sources   || {},
    refChecks:     row.ref_checks     || {},
    notes:         row.notes          || {},
    hardStops:     row.hard_stops     || [],
    researchNotes: row.research_notes || "",
    total:         row.total          || 0,
    pct:           row.pct            || 0,
    verdictLabel:  row.verdict_label  || "DECLINE",
  };
}

// ── localStorage fallback ──────────────────────────────────────────────────────
const LS_PREFIX = "ns_card_";

function lsSave(card) {
  localStorage.setItem(LS_PREFIX + card.id, JSON.stringify(card));
  return card;
}
function lsLoadAll() {
  return Object.keys(localStorage)
    .filter(k => k.startsWith(LS_PREFIX))
    .map(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
function lsDelete(id) {
  localStorage.removeItem(LS_PREFIX + id);
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function saveCard(card) {
  if (supabase) {
    const { error } = await supabase.from("scorecards").upsert(toRow(card));
    if (error) throw new Error(error.message);
    return card;
  }
  return lsSave(card);
}

export async function loadAllCards() {
  if (supabase) {
    const { data, error } = await supabase
      .from("scorecards")
      .select("*")
      .order("saved_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(fromRow);
  }
  return lsLoadAll();
}

export async function deleteCard(id) {
  if (supabase) {
    const { error } = await supabase.from("scorecards").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  lsDelete(id);
}
