import jsPDF from "jspdf";
import { Checklist, ChecklistItem } from "@/types/checklist";

const parseSectionTitle = (text: string) => {
  const emoji = text.match(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)?.[0] || "";
  const withoutEmoji = text.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, "");
  const timeMatch = withoutEmoji.match(/\(([^)]+)\)/);
  const title = withoutEmoji.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const time = timeMatch?.[1] || "";
  return { emoji, title, time };
};

export const exportChecklistPdf = (checklist: Checklist) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
    }
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(checklist.title, margin, y);
  y += 8;

  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Created: ${new Date(checklist.createdAt).toLocaleDateString()}`, margin, y);
  y += 4;
  doc.text(`Exported: ${new Date().toLocaleDateString()}`, margin, y);
  y += 8;

  // Progress
  const countItems = (items: ChecklistItem[]): { total: number; completed: number } => {
    let total = 0, completed = 0;
    items.forEach((item) => {
      total++;
      if (item.completed) completed++;
      if (item.children?.length) {
        const sub = countItems(item.children);
        total += sub.total;
        completed += sub.completed;
      }
    });
    return { total, completed };
  };

  const stats = countItems(checklist.items || []);
  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Progress: ${stats.completed}/${stats.total} (${pct}%)`, margin, y);
  y += 4;

  // Progress bar
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(margin, y, contentWidth, 3, 1.5, 1.5, "F");
  if (pct > 0) {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(margin, y, contentWidth * (pct / 100), 3, 1.5, 1.5, "F");
  }
  y += 10;

  // Separator
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const renderItem = (item: ChecklistItem, level: number) => {
    const indent = margin + level * 8;
    const itemType = item.type || "checkbox";
    const hasChildren = item.children && item.children.length > 0;

    // Section header
    if (hasChildren && level === 0) {
      checkPage(14);
      const { title, time } = parseSectionTitle(item.text);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text(title, indent, y);
      if (time) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.text(time, indent, y + 5);
        y += 5;
      }
      y += 8;

      item.children.forEach((child) => renderItem(child, level + 1));
      y += 4;
      return;
    }

    // Checkbox item
    if (itemType === "checkbox") {
      checkPage(8);
      const boxSize = 3.5;
      const boxY = y - boxSize + 0.5;

      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.rect(indent, boxY, boxSize, boxSize);

      if (item.completed) {
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(0.5);
        doc.line(indent + 0.7, boxY + boxSize / 2, indent + boxSize / 2.5, boxY + boxSize - 0.7);
        doc.line(indent + boxSize / 2.5, boxY + boxSize - 0.7, indent + boxSize - 0.5, boxY + 0.7);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(item.completed ? 160 : 40, item.completed ? 160 : 40, item.completed ? 160 : 40);
      doc.text(item.text, indent + boxSize + 3, y);
      y += 7;
    }

    // Radio item
    if (itemType === "radio") {
      checkPage(12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(item.text, indent, y);
      y += 5;

      const options = item.options || [];
      let optX = indent;
      options.forEach((opt) => {
        const optWidth = doc.getTextWidth(opt) + 10;
        if (optX + optWidth > pageWidth - margin) {
          optX = indent;
          y += 7;
        }
        checkPage(8);
        const isSelected = item.value === opt;
        if (isSelected) {
          doc.setFillColor(34, 197, 94);
          doc.setTextColor(255, 255, 255);
          doc.roundedRect(optX, y - 4, optWidth, 6, 2, 2, "F");
        } else {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.roundedRect(optX, y - 4, optWidth, 6, 2, 2, "S");
          doc.setTextColor(80, 80, 80);
        }
        doc.setFontSize(8);
        doc.text(opt, optX + 5, y);
        optX += optWidth + 3;
      });
      y += 8;
    }

    // Text item
    if (itemType === "text") {
      checkPage(14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(item.text, indent, y);
      y += 5;
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const val = item.value || "(empty)";
      const lines = doc.splitTextToSize(val, contentWidth - (indent - margin) - 4);
      doc.text(lines, indent + 2, y);
      y += lines.length * 5 + 4;
    }

    // Dropdown item
    if (itemType === "dropdown") {
      checkPage(12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(item.text, indent, y);
      y += 5;
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text(item.value || "(not selected)", indent + 2, y);
      y += 7;
    }

    // Render children for non-root parents
    if (hasChildren) {
      item.children.forEach((child) => renderItem(child, level + 1));
    }
  };

  (checklist.items || []).forEach((item) => renderItem(item, 0));

  doc.save(`${checklist.title.replace(/[^a-zA-Z0-9 ]/g, "").trim()}.pdf`);
};
