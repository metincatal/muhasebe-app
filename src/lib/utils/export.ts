import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportOptions {
  fileName: string;
  title: string;
  subtitle?: string;
}

// Excel export
export function exportToExcel(
  headers: string[],
  rows: (string | number)[][],
  options: ExportOptions
) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto-fit column widths
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[i] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, options.title.slice(0, 31));
  XLSX.writeFile(wb, `${options.fileName}.xlsx`);
}

// PDF export
export function exportToPDF(
  headers: string[],
  rows: (string | number)[][],
  options: ExportOptions
) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.text(options.title, 14, 20);

  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(options.subtitle, 14, 28);
    doc.setTextColor(0);
  }

  const startY = options.subtitle ? 34 : 28;

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Muhasebe Pro - ${new Date().toLocaleDateString("tr-TR")}`,
      14,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      `Sayfa ${i} / ${pageCount}`,
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 10,
      { align: "right" }
    );
  }

  doc.save(`${options.fileName}.pdf`);
}

// Format number for export (Turkish locale)
export function fmtNum(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
