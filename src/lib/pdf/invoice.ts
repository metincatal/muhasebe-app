import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceItem {
  description: string;
  quantity: number | string;
  unit: string | null;
  unit_price: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total: number | string;
}

interface InvoiceData {
  id: string;
  type: string;
  invoice_number: string | null;
  date: string;
  due_date: string | null;
  status: string;
  counterparty_name: string;
  counterparty_tax_id: string | null;
  counterparty_address: string | null;
  subtotal: number | string;
  tax_amount: number | string;
  total: number | string;
  currency: string;
  notes: string | null;
  invoice_items: InvoiceItem[];
}

interface OrgData {
  name: string;
  tax_id: string | null;
  tax_office: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

const fmtMoney = (val: number | string, currency = "TRY") =>
  Number(val).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + currency;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

const statusLabel: Record<string, string> = {
  draft: "Taslak",
  sent: "Gonderildi",
  paid: "Odendi",
  overdue: "Vadesi Gecti",
  cancelled: "Iptal",
};

export function generateInvoicePdf(invoice: InvoiceData, org: OrgData | null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.width;
  const isSales = invoice.type === "sales";

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, W, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(org?.name || "Firma", 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const orgLines: string[] = [];
  if (org?.tax_id) orgLines.push(`VKN: ${org.tax_id}${org.tax_office ? " / " + org.tax_office : ""}`);
  if (org?.address) orgLines.push(org.address);
  if (org?.phone) orgLines.push(org.phone);
  if (org?.email) orgLines.push(org.email);
  orgLines.forEach((line, i) => doc.text(line, 14, 23 + i * 4.5));

  // Invoice type badge (top-right)
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(isSales ? "SATIS FATURASI" : "ALIS FATURASI", W - 14, 18, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Durum: ${statusLabel[invoice.status] || invoice.status}`, W - 14, 25, { align: "right" });

  // ── Invoice Info ─────────────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  const infoY = 48;
  // Left: Counterparty
  doc.setFont("helvetica", "bold");
  doc.text(isSales ? "ALICI" : "SATICI", 14, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.counterparty_name, 14, infoY + 6);
  if (invoice.counterparty_tax_id) doc.text(`VKN: ${invoice.counterparty_tax_id}`, 14, infoY + 11);
  if (invoice.counterparty_address) {
    const wrapped = doc.splitTextToSize(invoice.counterparty_address, 85);
    doc.text(wrapped, 14, infoY + 16);
  }

  // Right: Invoice details
  const detailX = W / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.text("FATURA BILGILERI", detailX, infoY);
  doc.setFont("helvetica", "normal");
  const details = [
    ["Fatura No:", invoice.invoice_number || "-"],
    ["Tarih:", fmtDate(invoice.date)],
    ["Vade:", invoice.due_date ? fmtDate(invoice.due_date) : "-"],
    ["Para Birimi:", invoice.currency],
  ];
  details.forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, detailX, infoY + 6 + i * 5.5);
    doc.setFont("helvetica", "normal");
    doc.text(value, detailX + 30, infoY + 6 + i * 5.5);
  });

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(14, infoY + 30, W - 14, infoY + 30);

  // ── Items Table ──────────────────────────────────────────────
  const items = invoice.invoice_items || [];
  const tableStartY = infoY + 35;

  autoTable(doc, {
    startY: tableStartY,
    head: [["Aciklama", "Miktar", "Birim", "Birim Fiyat", "KDV %", "KDV", "Toplam"]],
    body: items.map((item) => [
      item.description,
      Number(item.quantity).toLocaleString("tr-TR"),
      item.unit || "adet",
      fmtMoney(item.unit_price, invoice.currency),
      `%${Number(item.tax_rate).toFixed(0)}`,
      fmtMoney(item.tax_amount, invoice.currency),
      fmtMoney(item.total, invoice.currency),
    ]),
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 18 },
      2: { cellWidth: 16 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "center", cellWidth: 16 },
      5: { halign: "right", cellWidth: 28 },
      6: { halign: "right", cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Totals ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterTable = (doc as any).lastAutoTable.finalY + 6;
  const totalsX = W - 14;

  const totals = [
    ["Ara Toplam:", fmtMoney(invoice.subtotal, invoice.currency)],
    ["KDV:", fmtMoney(invoice.tax_amount, invoice.currency)],
  ];

  doc.setFontSize(9);
  totals.forEach(([label, value], i) => {
    doc.setFont("helvetica", "normal");
    doc.text(label, totalsX - 50, afterTable + i * 6);
    doc.text(value, totalsX, afterTable + i * 6, { align: "right" });
  });

  // Grand total box
  const gtY = afterTable + totals.length * 6 + 2;
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(totalsX - 65, gtY - 5, 65, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("GENEL TOPLAM:", totalsX - 63, gtY + 1.5);
  doc.text(fmtMoney(invoice.total, invoice.currency), totalsX - 2, gtY + 1.5, { align: "right" });

  // ── Notes ────────────────────────────────────────────────────
  if (invoice.notes) {
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Notlar:", 14, gtY + 8);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(invoice.notes, W - 80);
    doc.text(noteLines, 14, gtY + 14);
  }

  // ── Footer ───────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.height - 10;
  doc.setTextColor(150);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Siyakat — ${new Date().toLocaleDateString("tr-TR")}`, 14, footerY);
  doc.text("1 / 1", W - 14, footerY, { align: "right" });

  const fileName = `fatura-${invoice.invoice_number || invoice.id.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
