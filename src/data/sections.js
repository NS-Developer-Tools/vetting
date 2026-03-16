export const REFERENCE_OPTIONS = [
  { id: "ref_neighborserve",    label: "One vetted pro on NeighborServe" },
  { id: "ref_online_rep",       label: "Three pros with a strong online reputation" },
  { id: "ref_realtors",         label: "Two realtors" },
  { id: "ref_recent_customers", label: "Three customers from the past 90 days" },
];

export const SECTIONS = [
  { id: "insurance", title: "Insurance & Licensing", icon: "🛡️", auto: true, fields: [
    { id: "has_liability", label: "General Liability Insurance – Verified Certificate on File", options: [
      { label: "Yes – verified certificate on file", score: 12 },
      { label: "No", score: 0 },
    ]},
    { id: "has_workers_comp", label: "Workers' Comp Insurance – Verified", options: [
      { label: "Yes – verified", score: 8 },
      { label: "No", score: 0 },
    ]},
    { id: "license", label: "State / Local Contractor License", options: [
      { label: "Yes – active & verified", score: 6 },
      { label: "Not required for my field", score: 4 },
      { label: "No – not licensed", score: 0 },
    ]},
  ]},
  { id: "bbb", title: "BBB Rating", icon: "⭐", auto: true, fields: [
    { id: "bbb_rating", label: "BBB Letter Rating", options: [
      { label: "A+ or A", score: 15 },
      { label: "B+ or B", score: 10 },
      { label: "C+ – disqualifying", score: 0 },
      { label: "C – or below – disqualifying", score: 0 },
    ]},
  ]},
  { id: "online_ratings", title: "Online Ratings & Reviews", icon: "🌐", auto: true, fields: [
    { id: "google_rating", label: "Google Reviews – Average Star Rating", options: [
      { label: "4.5 – 5.0 ⭐", score: 10 },
      { label: "4.0 – 4.4 ⭐", score: 7 },
      { label: "3.0 – 3.9 ⭐", score: 4 },
      { label: "Below 3.0 ⭐ – disqualifying", score: 0 },
      { label: "No Google listing", score: 0 },
    ]},
    { id: "google_count", label: "Google Reviews – Total Count", options: [
      { label: "50+ reviews", score: 4 },
      { label: "20–49 reviews", score: 3 },
      { label: "5–19 reviews", score: 2 },
      { label: "Fewer than 5", score: 1 },
    ]},
    { id: "angi_rating", label: "Angi Rating", options: [
      { label: "4.5+ / Super Service Award", score: 8 },
      { label: "4.0 – 4.4", score: 5 },
      { label: "Below 4.0 (5+ reviews) – disqualifying", score: 0 },
      { label: "Below 4.0 (fewer than 5 reviews) – monitor", score: 2 },
      { label: "Not on Angi", score: 0 },
    ]},
    { id: "facebook_rating", label: "Facebook Reviews – Average", options: [
      { label: "4.5 – 5.0", score: 5 },
      { label: "4.0 – 4.4", score: 3 },
      { label: "Below 4.0 (5+ reviews) – disqualifying", score: 0 },
      { label: "Below 4.0 (fewer than 5 reviews) – monitor", score: 1 },
      { label: "No Facebook page / reviews", score: 0 },
    ]},
    { id: "glassdoor_rating", label: "Glassdoor Rating (employer reputation)", options: [
      { label: "4.0+", score: 6 },
      { label: "3.0 – 3.9", score: 3 },
      { label: "Below 3.0 (5+ reviews) – disqualifying", score: 0 },
      { label: "Below 3.0 (fewer than 5 reviews) – monitor", score: 0 },
    ]},
  ]},
  { id: "response_behavior", title: "Response to Negative Reviews", icon: "💬", auto: true, fields: [
    { id: "neg_response_tone", label: "Tone when responding to negative reviews", options: [
      { label: "Professional, empathetic, solution-oriented", score: 10 },
      { label: "Neutral – acknowledges feedback, little resolution", score: 6 },
      { label: "Dismissive or defensive – disqualifying", score: 0 },
      { label: "Hostile or threatening language – disqualifying", score: 0 },
      { label: "Never responds – disqualifying", score: 0 },
    ]},
    { id: "neg_response_freq", label: "Frequency of responding to negative reviews", options: [
      { label: "Responds to most / all negative reviews", score: 5 },
      { label: "Responds occasionally", score: 3 },
    ]},
  ]},
  { id: "social_media", title: "Online Behavior & Social Media Audit", icon: "📱", auto: true,
    hint: "Review public posts across Facebook, Instagram, LinkedIn, X/Twitter, Nextdoor, and trade forums.",
    fields: [
    { id: "social_overall_tone", label: "Overall tone of public posts & comments", options: [
      { label: "Consistently professional and positive", score: 10 },
      { label: "Mostly professional, occasional venting", score: 6 },
      { label: "Frequently negative or argumentative – disqualifying", score: 0 },
      { label: "Highly offensive or threatening – disqualifying", score: 0 },
    ]},
    { id: "competitor_talk", label: "Speaks negatively about competitors?", options: [
      { label: "No – focuses on own strengths only", score: 10 },
      { label: "Rare isolated instance", score: 5 },
      { label: "Occasionally badmouths competitors", score: 0 },
      { label: "Frequently disparages by name – disqualifying", score: 0 },
    ]},
    { id: "social_customer_disputes", label: "Public disputes with past customers online", options: [
      { label: "None found", score: 5 },
      { label: "1 instance – handled and resolved", score: 3 },
      { label: "Multiple unresolved disputes – disqualifying", score: 0 },
    ]},
    { id: "social_consistency", label: "Online persona consistency across platforms", options: [
      { label: "Consistent, professional brand", score: 5 },
      { label: "Somewhat inconsistent but no red flags", score: 3 },
      { label: "Significant inconsistencies – disqualifying", score: 0 },
    ]},
  ]},
  { id: "character", title: "Character & Co-op Values", icon: "🤝", auto: false,
    hint: "Assesses whether the applicant will be a collaborative, trustworthy co-op member.",
    fields: [
    { id: "give_before_take", label: `Interview Q: "Tell me about a time you helped another contractor succeed."`, options: [
      { label: "Strong – specific story, genuine collaboration", score: 15 },
      { label: "Good – solid example, some self-interest but helpful", score: 10 },
      { label: "Weak – vague or struggles to give an example", score: 0 },
      { label: "Red flag – centers on competition, not collaboration – disqualifying", score: 0 },
    ]},
    { id: "referral_willingness", label: "Would they refer work to a co-op peer?", options: [
      { label: "Yes – enthusiastic, has done this before", score: 8 },
      { label: "Probably – open but no prior experience", score: 5 },
      { label: "Hesitant – concerned about losing the customer", score: 0 },
      { label: "No – unwilling to refer – disqualifying", score: 0 },
    ]},
    { id: "co_op_understanding", label: "Understands what a co-op model means", options: [
      { label: "Strong – articulates mutual benefit & community", score: 7 },
      { label: "Basic – understands concept but shallow", score: 4 },
      { label: "Minimal – views it as a lead source only", score: 1 },
    ]},
  ]},
  { id: "criminal", title: "Background & Criminal Record", icon: "🔍", auto: true, fields: [
    { id: "owner_criminal", label: "Owner Criminal Background Check", options: [
      { label: "Clean – verified check on file", score: 15 },
      { label: "Minor / non-relevant offense (> 7 years ago)", score: 8 },
      { label: "Relevant offense (fraud, theft, assault) – disqualifying", score: 0 },
      { label: "Not yet completed", score: 0 },
    ]},
    { id: "civil_judgments", label: "Civil Judgments / Liens Against Business", options: [
      { label: "None found", score: 5 },
      { label: "1 resolved judgment (> 3 years ago)", score: 2 },
      { label: "Multiple or recent judgments – disqualifying", score: 0 },
    ]},
  ]},
  { id: "safety", title: "Safety Record & OSHA Compliance", icon: "⛑️", auto: true, fields: [
    { id: "osha_violations", label: "OSHA Violations on Record", options: [
      { label: "None on record", score: 8 },
      { label: "1 minor violation – corrected", score: 4 },
      { label: "Multiple or serious violations – disqualifying", score: 0 },
    ]},
    { id: "safety_training", label: "Safety Training / Certifications", options: [
      { label: "OSHA 30 or equivalent – current", score: 6 },
      { label: "OSHA 10 or basic safety cert", score: 3 },
      { label: "No formal safety training", score: 0 },
    ]},
    { id: "incident_history", label: "Workplace Incident / Injury History (last 3 years)", options: [
      { label: "Zero reportable incidents", score: 6 },
      { label: "1 incident – fully documented and resolved", score: 3 },
      { label: "Multiple incidents – disqualifying", score: 0 },
    ]},
  ]},
  { id: "financial", title: "Financial & Payment History", icon: "💰", auto: true, fields: [
    { id: "payment_complaints", label: "Non-payment complaints (suppliers / subcontractors)", options: [
      { label: "None found", score: 8 },
      { label: "1 isolated complaint – resolved", score: 4 },
      { label: "Pattern of late or non-payment – disqualifying", score: 0 },
    ]},
    { id: "business_credit", label: "Business Financial Stability", options: [
      { label: "Stable – 3+ years, no bankruptcies", score: 6 },
      { label: "Newer business or minor financial issues", score: 3 },
      { label: "Recent bankruptcy or active collections – disqualifying", score: 0 },
    ]},
  ]},
  { id: "professionalism", title: "Communication & Professionalism", icon: "📞", auto: false, fields: [
    { id: "response_time", label: "Responsiveness during application process", options: [
      { label: "Prompt – replies within 24 hrs, organized", score: 6 },
      { label: "Adequate – some delays but communicative", score: 3 },
      { label: "Poor – slow, unresponsive – disqualifying", score: 0 },
    ]},
    { id: "docs_complete", label: "Application documents submitted completely & accurately", options: [
      { label: "All documents complete, accurate, and on time", score: 6 },
      { label: "Minor omissions – corrected when flagged", score: 3 },
      { label: "Significant gaps or inaccuracies", score: 0 },
    ]},
    { id: "appearance_conduct", label: "Professional appearance and conduct (interview / site visit)", options: [
      { label: "Highly professional", score: 4 },
      { label: "Acceptable", score: 2 },
      { label: "Concerning – disqualifying", score: 0 },
    ]},
  ]},
  { id: "experience", title: "Experience & Qualifications", icon: "🏗️", auto: true, fields: [
    { id: "years_in_business", label: "Years in Business", options: [
      { label: "10+ years", score: 6 },
      { label: "5–9 years", score: 4 },
      { label: "2–4 years", score: 2 },
      { label: "Under 2 years", score: 1 },
    ]},
    { id: "certifications", label: "Trade Certifications / Specializations", options: [
      { label: "Multiple relevant certifications", score: 4 },
      { label: "One certification", score: 2 },
      { label: "None", score: 0 },
    ]},
  ]},
];

export const REF_MAX = 20;
export const RADIO_MAX = SECTIONS.reduce(
  (a, s) => a + s.fields.reduce((b, f) => b + Math.max(...f.options.map(o => o.score)), 0), 0
);
export const MAX_SCORE = RADIO_MAX + REF_MAX;
