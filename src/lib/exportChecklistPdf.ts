import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Checklist } from "@/types/checklist";

export const exportChecklistPdf = async (checklist: Checklist) => {
  // Find the checklist content area in the DOM
  const element = document.getElementById("checklist-export-area");
  if (!element) {
    // Fallback: try to find the scrollable items container
    console.error("Export area not found");
    return;
  }

  // Temporarily expand the element to capture full content (remove scroll constraints)
  const originalMaxHeight = element.style.maxHeight;
  const originalOverflow = element.style.overflow;
  const originalHeight = element.style.height;
  element.style.maxHeight = "none";
  element.style.overflow = "visible";
  element.style.height = "auto";

  try {
    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 10;
    const marginY = 10;
    const usableWidth = pageWidth - marginX * 2;
    const usableHeight = pageHeight - marginY * 2;

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = usableWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

    if (scaledHeight <= usableHeight) {
      // Fits on one page
      pdf.addImage(imgData, "PNG", marginX, marginY, usableWidth, scaledHeight);
    } else {
      // Multi-page: slice the canvas
      const pageCanvasHeight = usableHeight / ratio;
      let srcY = 0;
      let page = 0;

      while (srcY < imgHeight) {
        if (page > 0) pdf.addPage();

        const sliceHeight = Math.min(pageCanvasHeight, imgHeight - srcY);

        // Create a slice canvas
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, srcY, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);
          const sliceData = sliceCanvas.toDataURL("image/png");
          const sliceScaledHeight = sliceHeight * ratio;
          pdf.addImage(sliceData, "PNG", marginX, marginY, usableWidth, sliceScaledHeight);
        }

        srcY += pageCanvasHeight;
        page++;
      }
    }

    const filename = checklist.title.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "checklist";
    pdf.save(`${filename}.pdf`);
  } finally {
    // Restore original styles
    element.style.maxHeight = originalMaxHeight;
    element.style.overflow = originalOverflow;
    element.style.height = originalHeight;
  }
};
