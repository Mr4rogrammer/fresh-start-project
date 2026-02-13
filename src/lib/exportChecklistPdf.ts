import { jsPDF } from "jspdf";
import { Checklist, ChecklistItem } from "@/types/checklist";

// ── Professional Print Color Palette ──
const C = {
  white: [255, 255, 255] as const,
  bgPage: [248, 250, 252] as const,       // slate-50
  bgSection: [241, 245, 249] as const,     // slate-100
  bgCard: [255, 255, 255] as const,
  border: [226, 232, 240] as const,        // slate-200
  borderLight: [241, 245, 249] as const,
  textPrimary: [15, 23, 42] as const,      // slate-900
  textSecondary: [71, 85, 105] as const,   // slate-500
  textMuted: [148, 163, 184] as const,     // slate-400
  emerald: [16, 185, 129] as const,        // emerald-500
  emeraldLight: [209, 250, 229] as const,  // emerald-100
  emeraldDark: [6, 95, 70] as const,       // emerald-800
  red: [239, 68, 68] as const,
  redLight: [254, 226, 226] as const,
  amber: [245, 158, 11] as const,
  amberLight: [254, 243, 199] as const,
  blue: [59, 130, 246] as const,
  blueLight: [219, 234, 254] as const,
  purple: [139, 92, 246] as const,
  purpleLight: [237, 233, 254] as const,
};

const sectionColors: Record<string, { bg: readonly number[]; text: readonly number[] }> = {
  "🕐": { bg: C.amberLight, text: [146, 64, 14] },
  "🔍": { bg: C.redLight, text: [153, 27, 27] },
  "⚡": { bg: C.blueLight, text: [30, 64, 175] },
  "🏁": { bg: C.emeraldLight, text: C.emeraldDark },
  "📝": { bg: C.purpleLight, text: [91, 33, 182] },
  "📋": { bg: [255, 237, 213], text: [154, 52, 18] },
};

const parseSectionTitle = (text: string) => {
  const emoji = text.match(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)?.[0] || "";
  const withoutEmoji = text.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, "");
  const timeMatch = withoutEmoji.match(/\(([^)]+)\)/);
  const title = withoutEmoji.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return { emoji, title, time: timeMatch?.[1] || "" };
};

export const exportChecklistPdf = (checklist: Checklist) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();   // 297
  const mx = 14; // margin x
  const cw = W - mx * 2; // content width
  let y = 0;

  const setColor = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: readonly number[]) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: readonly number[]) => doc.setDrawColor(c[0], c[1], c[2]);

  const ensureSpace = (needed: number) => {
    if (y + needed > H - 16) {
      doc.addPage();
      y = 16;
    }
  };

  // ══════════════════════════════════════
  //  HEADER AREA
  // ══════════════════════════════════════
  // Top accent bar
  setFill(C.emerald);
  doc.rect(0, 0, W, 3, "F");

  y = 18;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setColor(C.textPrimary);
  doc.text(checklist.title, mx, y);
  y += 8;

  // Subtitle line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(C.textMuted);
  doc.text(`Created ${new Date(checklist.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, mx, y);
  const exportDate = `Exported ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
  doc.text(exportDate, W - mx - doc.getTextWidth(exportDate), y);
  y += 8;

  // ── Progress bar ──
  const countAll = (items: ChecklistItem[]): { t: number; c: number } => {
    let t = 0, c = 0;
    items.forEach(i => { t++; if (i.completed) c++; if (i.children?.length) { const s = countAll(i.children); t += s.t; c += s.c; } });
    return { t, c };
  };
  const { t: total, c: completed } = countAll(checklist.items || []);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Progress background
  setFill(C.bgSection);
  doc.roundedRect(mx, y, cw, 6, 3, 3, "F");
  // Progress fill
  if (pct > 0) {
    setFill(C.emerald);
    const barW = Math.max(6, cw * (pct / 100));
    doc.roundedRect(mx, y, barW, 6, 3, 3, "F");
  }
  // Progress label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(pct > 50 ? C.white : C.textSecondary);
  const pctText = `${completed}/${total}  •  ${pct}%`;
  const pctX = mx + cw / 2 - doc.getTextWidth(pctText) / 2;
  doc.text(pctText, pctX, y + 4.2);
  y += 12;

  // Divider
  setDraw(C.border);
  doc.setLineWidth(0.3);
  doc.line(mx, y, W - mx, y);
  y += 8;

  // ══════════════════════════════════════
  //  RENDER ITEMS
  // ══════════════════════════════════════

  const renderItem = (item: ChecklistItem, level: number) => {
    const indent = mx + level * 6;
    const itemType = item.type || "checkbox";
    const hasChildren = item.children && item.children.length > 0;

    // ── SECTION HEADER ──
    if (hasChildren && level === 0) {
      ensureSpace(18);
      const { emoji, title, time } = parseSectionTitle(item.text);
      const colors = sectionColors[emoji] || { bg: C.bgSection, text: C.textPrimary };

      // Section background strip
      setFill(colors.bg);
      doc.roundedRect(mx, y - 1, cw, time ? 13 : 10, 2.5, 2.5, "F");

      // Left accent bar
      setFill(colors.text);
      doc.roundedRect(mx, y - 1, 1.2, time ? 13 : 10, 0.6, 0.6, "F");

      // Section title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setColor(colors.text);
      doc.text(title, indent + 4, y + 5);

      if (time) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        setColor(C.textMuted);
        doc.text(time, indent + 4, y + 10);
      }

      y += (time ? 18 : 14);

      item.children.forEach(child => renderItem(child, level + 1));
      y += 4;
      return;
    }

    // ── CHECKBOX ITEM ──
    if (itemType === "checkbox") {
      ensureSpace(9);

      // Card background
      setFill(C.bgCard);
      setDraw(C.borderLight);
      doc.setLineWidth(0.2);
      doc.roundedRect(indent, y - 4, cw - (indent - mx), 8, 1.5, 1.5, "FD");

      // Checkbox
      const bx = indent + 3;
      const by = y - 2.8;
      const bs = 3.5;

      if (item.completed) {
        setFill(C.emerald);
        doc.roundedRect(bx, by, bs, bs, 0.8, 0.8, "F");
        // Checkmark
        doc.setLineWidth(0.5);
        setDraw(C.white);
        doc.line(bx + 0.8, by + bs / 2, bx + bs / 2.5, by + bs - 0.8);
        doc.line(bx + bs / 2.5, by + bs - 0.8, bx + bs - 0.6, by + 0.8);
      } else {
        setDraw(C.border);
        doc.setLineWidth(0.3);
        doc.roundedRect(bx, by, bs, bs, 0.8, 0.8, "S");
      }

      // Label
      doc.setFont("helvetica", item.completed ? "normal" : "normal");
      doc.setFontSize(9.5);
      setColor(item.completed ? C.textMuted : C.textPrimary);
      doc.text(item.text, bx + bs + 3, y);
      y += 9;
    }

    // ── RADIO ITEM ──
    if (itemType === "radio") {
      ensureSpace(16);

      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setColor(C.textSecondary);
      doc.text(item.text, indent + 2, y);
      y += 5;

      const options = item.options || [];
      let optX = indent + 2;

      options.forEach(opt => {
        const tw = doc.getTextWidth(opt);
        const pillW = tw + 8;
        if (optX + pillW > W - mx) { optX = indent + 2; y += 8; }
        ensureSpace(8);

        const isSelected = item.value === opt;
        const isPositive = opt.includes("Yes") || opt.includes("✅");
        const isNegative = opt.includes("No") || opt.includes("❌");

        if (isSelected) {
          if (isPositive) { setFill(C.emeraldLight); setColor(C.emeraldDark); }
          else if (isNegative) { setFill(C.redLight); setColor(C.red); }
          else { setFill(C.emeraldLight); setColor(C.emeraldDark); }
          doc.roundedRect(optX, y - 4, pillW, 6.5, 3, 3, "F");
        } else {
          setDraw(C.border);
          doc.setLineWidth(0.2);
          doc.roundedRect(optX, y - 4, pillW, 6.5, 3, 3, "S");
          setColor(C.textMuted);
        }

        doc.setFont("helvetica", isSelected ? "bold" : "normal");
        doc.setFontSize(8);
        doc.text(opt, optX + 4, y);

        optX += pillW + 3;
      });
      y += 10;
    }

    // ── TEXT ITEM ──
    if (itemType === "text") {
      ensureSpace(16);

      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setColor(C.textSecondary);
      doc.text(item.text, indent + 2, y);
      y += 5;

      // Answer box
      const boxW = cw - (indent - mx) - 4;
      const val = item.value || "";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(val || " ", boxW - 6);
      const boxH = Math.max(8, lines.length * 4.5 + 4);

      setFill(C.bgSection);
      setDraw(C.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(indent + 2, y - 2, boxW, boxH, 1.5, 1.5, "FD");

      setColor(val ? C.textPrimary : C.textMuted);
      doc.text(val || "—", indent + 5, y + 2.5);
      y += boxH + 4;
    }

    // ── DROPDOWN ITEM ──
    if (itemType === "dropdown") {
      ensureSpace(14);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setColor(C.textSecondary);
      doc.text(item.text, indent + 2, y);
      y += 5;

      // Selected value pill
      const val = item.value || "";
      if (val) {
        const tw = doc.getTextWidth(val);
        setFill(C.emeraldLight);
        doc.roundedRect(indent + 2, y - 3.5, tw + 8, 6, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        setColor(C.emeraldDark);
        doc.text(val, indent + 6, y);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setColor(C.textMuted);
        doc.text("— Not selected", indent + 2, y);
      }
      y += 8;
    }

    // Nested children (non-root parents)
    if (hasChildren) {
      item.children.forEach(child => renderItem(child, level + 1));
    }
  };

  (checklist.items || []).forEach(item => renderItem(item, 0));

  // ── Footer on last page ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(C.textMuted);
  const footer = "Generated by Tradeify • Confidential";
  doc.text(footer, W / 2 - doc.getTextWidth(footer) / 2, H - 8);

  // Bottom accent
  setFill(C.emerald);
  doc.rect(0, H - 3, W, 3, "F");

  const filename = checklist.title.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "checklist";
  doc.save(`${filename}.pdf`);
};
