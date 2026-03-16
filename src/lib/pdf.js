import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SECTIONS, MAX_SCORE, REF_MAX } from "../data/sections.js";
import { verdictFor } from "./scoring.js";

export function downloadScorecardPDF(card) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const { applicant, selections, refChecks, notes, hardStops, researchNotes, total, pct } = card;
  const verdict = verdictFor(pct, hardStops || []);
  const refScore = Object.values(refChecks || {}).some(Boolean) ? REF_MAX : 0;

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 18;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("NeighborServe Contractor Vetting Scorecard", margin, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("neighborserve.com", margin, 20);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, pageW - margin, 20, { align: "right" });
  y = 36;

  // ── Verdict banner ───────────────────────────────────────────────────────────
  const verdictColors = {
    ACCEPT:      [220, 252, 231],
    REVIEW:      [254, 249, 195],
    DECLINE:     [254, 226, 226],
    "HARD STOP": [237, 233, 254],
  };
  const verdictTextColors = {
    ACCEPT:      [22, 163, 74],
    REVIEW:      [202, 138, 4],
    DECLINE:     [220, 38, 38],
    "HARD STOP": [124, 58, 237],
  };
  const [br, bg, bb] = verdictColors[verdict.label] || [240, 240, 240];
  const [tr, tg, tb] = verdictTextColors[verdict.label] || [0, 0, 0];

  doc.setFillColor(br, bg, bb);
  doc.roundedRect(margin, y, contentW, 18, 3, 3, "F");
  doc.setTextColor(tr, tg, tb);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(verdict.full, margin + 5, y + 7);
  doc.setFontSize(11);
  doc.text(`Score: ${total} / ${MAX_SCORE}  (${pct}%)`, margin + 5, y + 14);
  y += 24;

  // ── Score bar ────────────────────────────────────────────────────────────────
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(margin, y, contentW, 5, 2, 2, "F");
  const barColor = pct >= 80 ? [22, 163, 74] : pct >= 60 ? [251, 191, 36] : [239, 68, 68];
  doc.setFillColor(...barColor);
  doc.roundedRect(margin, y, (contentW * pct) / 100, 5, 2, 2, "F");
  y += 11;

  // ── Applicant info ───────────────────────────────────────────────────────────
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("APPLICANT INFORMATION", margin, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
    body: [
      ["Business Name", applicant.name || "—", "Trade / Specialty", applicant.trade || "—"],
      ["Location", applicant.location || "—", "Application Date", applicant.date || "—"],
      ["Reviewed By", applicant.reviewer || "—", "Saved", new Date(card.savedAt).toLocaleDateString()],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 38 }, 2: { fontStyle: "bold", cellWidth: 38 } },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Hard stops ───────────────────────────────────────────────────────────────
  if (hardStops?.length > 0) {
    doc.setFillColor(255, 240, 240);
    doc.roundedRect(margin, y, contentW, 7 + hardStops.length * 6, 2, 2, "F");
    doc.setTextColor(185, 28, 28);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("HARD STOP FLAGS", margin + 3, y + 5);
    doc.setFont("helvetica", "normal");
    hardStops.forEach((msg, i) => {
      doc.text(`• ${msg}`, margin + 3, y + 11 + i * 6);
    });
    y += 10 + hardStops.length * 6 + 4;
  }

  // ── Section breakdown table ───────────────────────────────────────────────────
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("SECTION SCORES", margin, y);
  y += 4;

  const sectionRows = SECTIONS.map(s => {
    const earned = s.fields.reduce((a, f) => a + (selections[`${f.id}_score`] || 0), 0);
    const max    = s.fields.reduce((a, f) => a + Math.max(...f.options.map(o => o.score)), 0);
    const sp     = Math.round((earned / max) * 100);
    return [`${s.icon} ${s.title}`, `${earned} / ${max}`, `${sp}%`, sp >= 70 ? "✅" : sp >= 50 ? "⚠️" : "❌"];
  });
  sectionRows.push(["📋 Professional References", `${refScore} / ${REF_MAX}`, `${Math.round((refScore/REF_MAX)*100)}%`, refScore > 0 ? "✅" : "⚠️"]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
    head: [["Section", "Score", "Pct", "Status"]],
    body: sectionRows,
    columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center", cellWidth: 18 } },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Detailed answers ─────────────────────────────────────────────────────────
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DETAILED ANSWERS", margin, y);
  y += 4;

  SECTIONS.forEach(s => {
    const rows = s.fields
      .filter(f => selections[f.id])
      .map(f => {
        const score = selections[`${f.id}_score`] ?? 0;
        return [
          f.label.length > 55 ? f.label.slice(0, 55) + "…" : f.label,
          selections[f.id],
          `${score} pt${score !== 1 ? "s" : ""}`,
        ];
      });

    if (rows.length === 0) return;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8.5 },
      head: [[{ content: `${s.icon} ${s.title}`, colSpan: 3 }]],
      body: rows,
      columnStyles: { 0: { cellWidth: 70 }, 2: { halign: "center", cellWidth: 18 } },
    });
    y = doc.lastAutoTable.finalY + 3;

    if (notes?.[s.id]) {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.setFont("helvetica", "italic");
      const noteLines = doc.splitTextToSize(`Note: ${notes[s.id]}`, contentW);
      doc.text(noteLines, margin, y + 4);
      y += noteLines.length * 4 + 5;
    }
  });

  // ── Research notes ───────────────────────────────────────────────────────────
  if (researchNotes) {
    y += 4;
    doc.setFillColor(240, 249, 255);
    const noteLines = doc.splitTextToSize(researchNotes, contentW - 10);
    doc.roundedRect(margin, y, contentW, 10 + noteLines.length * 4.5, 2, 2, "F");
    doc.setTextColor(3, 105, 161);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("🔍 Research Summary:", margin + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(noteLines, margin + 3, y + 10);
    y += 14 + noteLines.length * 4.5;
  }

  // ── Footer on every page ─────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.setFont("helvetica", "normal");
    doc.text(
      `NeighborServe Contractor Vetting  •  Confidential  •  Page ${i} of ${pageCount}`,
      pageW / 2, doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  const safeName = (applicant.name || "contractor").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`neighborserve_vetting_${safeName}_${applicant.date || "undated"}.pdf`);
}
