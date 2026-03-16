import { SECTIONS, MAX_SCORE } from "../data/sections.js";

export const HARD_STOP_RULES = [
  { fieldId: "has_liability",             triggerLabel: "No",                              message: "🚨 No verified liability insurance." },
  { fieldId: "has_workers_comp",          triggerLabel: "No",                              message: "🚨 No verified workers' comp insurance." },
  { fieldId: "license",                   triggerLabel: "No – not licensed",               message: "🚨 No valid trade license on file." },
  { fieldId: "bbb_rating",               triggerLabel: "C+",                               message: "🚨 BBB rating C+ or below." },
  { fieldId: "bbb_rating",               triggerLabel: "C – or below",                    message: "🚨 BBB rating C or below." },
  { fieldId: "google_rating",            triggerLabel: "Below 3.0",                        message: "🚨 Google rating below 3.0 stars." },
  { fieldId: "angi_rating",              triggerLabel: "Below 4.0 (5+ reviews)",           message: "🚨 Angi rating below 4.0 with 5+ reviews." },
  { fieldId: "facebook_rating",          triggerLabel: "Below 4.0 (5+ reviews)",           message: "🚨 Facebook rating below 4.0 with 5+ reviews." },
  { fieldId: "glassdoor_rating",         triggerLabel: "Below 3.0 (5+ reviews)",           message: "🚨 Glassdoor rating below 3.0 with 5+ reviews." },
  { fieldId: "neg_response_tone",        triggerLabel: "Dismissive or defensive",          message: "🚨 Dismissive/defensive review responses." },
  { fieldId: "neg_response_tone",        triggerLabel: "Hostile",                          message: "🚨 Hostile or threatening review responses." },
  { fieldId: "neg_response_tone",        triggerLabel: "Never responds",                   message: "🚨 Never responds to negative reviews." },
  { fieldId: "social_overall_tone",      triggerLabel: "Frequently negative",              message: "🚨 Frequently negative online behavior." },
  { fieldId: "social_overall_tone",      triggerLabel: "Highly offensive",                 message: "🚨 Offensive/discriminatory content found." },
  { fieldId: "competitor_talk",          triggerLabel: "Frequently disparages",            message: "🚨 Frequently disparages competitors." },
  { fieldId: "social_customer_disputes", triggerLabel: "Multiple unresolved",              message: "🚨 Multiple unresolved customer disputes." },
  { fieldId: "social_consistency",       triggerLabel: "Significant inconsistencies",      message: "🚨 Significant inconsistencies online." },
  { fieldId: "give_before_take",         triggerLabel: "Red flag",                         message: "🚨 Answer centers on competition, not collaboration." },
  { fieldId: "referral_willingness",     triggerLabel: "No – unwilling",                   message: "🚨 Unwilling to refer or share work." },
  { fieldId: "owner_criminal",           triggerLabel: "Relevant offense",                 message: "🚨 Owner has a relevant criminal offense." },
  { fieldId: "civil_judgments",          triggerLabel: "Multiple or recent",               message: "🚨 Multiple or recent civil judgments/liens." },
  { fieldId: "osha_violations",          triggerLabel: "Multiple or serious",              message: "🚨 Multiple or serious OSHA violations." },
  { fieldId: "incident_history",         triggerLabel: "Multiple incidents",               message: "🚨 Pattern of workplace incidents." },
  { fieldId: "payment_complaints",       triggerLabel: "Pattern of late",                  message: "🚨 Pattern of non-payment complaints." },
  { fieldId: "business_credit",          triggerLabel: "Recent bankruptcy",                message: "🚨 Recent bankruptcy or active collections." },
  { fieldId: "response_time",            triggerLabel: "Poor – slow",                      message: "🚨 Poor responsiveness during application." },
  { fieldId: "appearance_conduct",       triggerLabel: "Concerning",                       message: "🚨 Concerning professional conduct." },
];

export function isHardStop(fieldId, label) {
  return HARD_STOP_RULES.some(r => r.fieldId === fieldId && label.startsWith(r.triggerLabel));
}

export function getHardStopMsgs(fieldId, label) {
  return HARD_STOP_RULES
    .filter(r => r.fieldId === fieldId && label.startsWith(r.triggerLabel))
    .map(r => r.message);
}

export function verdictFor(pct, stops = []) {
  if (stops.length > 0)
    return { label: "HARD STOP", full: "🚫 HARD STOP – Cannot Accept", color: "#7c3aed", bg: "#ede9fe" };
  if (pct >= 80)
    return { label: "ACCEPT",    full: "✅ Recommend: ACCEPT",           color: "#16a34a", bg: "#dcfce7" };
  if (pct >= 60)
    return { label: "REVIEW",    full: "⚠️ Recommend: CONDITIONAL REVIEW", color: "#ca8a04", bg: "#fef9c3" };
  return   { label: "DECLINE",   full: "❌ Recommend: DECLINE",          color: "#dc2626", bg: "#fee2e2" };
}

export function calcScore(selections, refChecks) {
  const radio = Object.entries(selections)
    .reduce((a, [k, v]) => k.endsWith("_score") ? a + v : a, 0);
  const ref = Object.values(refChecks).some(Boolean) ? 20 : 0;
  const total = radio + ref;
  const pct = Math.round((total / MAX_SCORE) * 100);
  return { total, pct };
}
