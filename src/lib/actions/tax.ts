"use server";

import { createClient } from "@/lib/supabase/server";

export async function getVATSummary(orgId: string, year: number, month: number) {
  const supabase = await createClient();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // son gün

  // Satış faturaları KDV'si (tahsil edilen)
  const { data: salesInvoices } = await supabase
    .from("invoices")
    .select("tax_amount, total, subtotal, currency, exchange_rate")
    .eq("organization_id", orgId)
    .eq("type", "sales")
    .neq("status", "cancelled")
    .gte("date", startDate)
    .lte("date", endDate);

  // Alış faturaları KDV'si (ödenen / indirilecek)
  const { data: purchaseInvoices } = await supabase
    .from("invoices")
    .select("tax_amount, total, subtotal, currency, exchange_rate")
    .eq("organization_id", orgId)
    .eq("type", "purchase")
    .neq("status", "cancelled")
    .gte("date", startDate)
    .lte("date", endDate);

  // TRY bazına çevir
  function sumTRY(invoices: typeof salesInvoices) {
    return (invoices ?? []).reduce((sum, inv) => {
      const rate = Number(inv.exchange_rate) || 1;
      return sum + Number(inv.tax_amount) * rate;
    }, 0);
  }

  function sumSubtotalTRY(invoices: typeof salesInvoices) {
    return (invoices ?? []).reduce((sum, inv) => {
      const rate = Number(inv.exchange_rate) || 1;
      return sum + Number(inv.subtotal) * rate;
    }, 0);
  }

  const collectedVAT = sumTRY(salesInvoices);
  const paidVAT = sumTRY(purchaseInvoices);
  const netVAT = collectedVAT - paidVAT;

  const salesSubtotal = sumSubtotalTRY(salesInvoices);
  const purchaseSubtotal = sumSubtotalTRY(purchaseInvoices);

  // Beyan tarihi: bir sonraki ayın 28'i
  // Not: toISOString() UTC'ye çevirir, timezone farkı gün kaydırır — manuel formatlıyoruz
  const declarationDate = new Date(year, month, 28); // month 1-12, JS ay 0-indexed, bu yüzden bir ileri
  const dd = String(declarationDate.getDate()).padStart(2, "0");
  const dm = String(declarationDate.getMonth() + 1).padStart(2, "0");
  const declarationDateStr = `${declarationDate.getFullYear()}-${dm}-${dd}`;

  // Kalan gün
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilDeclaration = Math.ceil(
    (declarationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    period: { year, month },
    startDate,
    endDate,
    declarationDate: declarationDateStr,
    daysUntilDeclaration,
    salesInvoiceCount: (salesInvoices ?? []).length,
    purchaseInvoiceCount: (purchaseInvoices ?? []).length,
    salesSubtotal,
    purchaseSubtotal,
    collectedVAT,
    paidVAT,
    netVAT,
  };
}

export interface DashboardAlert {
  type: "overdue_invoices" | "vat_deadline" | "recurring_due";
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  href?: string;
}

export async function getDashboardAlerts(orgId: string): Promise<DashboardAlert[]> {
  const supabase = await createClient();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const alerts: DashboardAlert[] = [];

  // 1. Vadesi geçen faturalar
  const { data: overdueInvoices } = await supabase
    .from("invoices")
    .select("id, total, currency, exchange_rate")
    .eq("organization_id", orgId)
    .in("status", ["sent", "overdue"])
    .lt("due_date", todayStr);

  if (overdueInvoices && overdueInvoices.length > 0) {
    const total = overdueInvoices.reduce((sum, inv) => {
      const rate = Number(inv.exchange_rate) || 1;
      return sum + Number(inv.total) * rate;
    }, 0);
    alerts.push({
      type: "overdue_invoices",
      severity: "error",
      title: `${overdueInvoices.length} fatura vadesi gecti`,
      description: `Toplam ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(total)} tutarinda tahsil edilmemis fatura var.`,
      href: "/invoices",
    });
  }

  // 2. KDV beyan tarihi yaklaşıyor (7 gün veya daha az)
  const vatMonth = now.getMonth(); // şu an hangi ay
  const vatYear = now.getFullYear();
  // Bu ayın beyan tarihi = bir sonraki ayın 28'i
  const vatDeadline = new Date(vatYear, vatMonth + 1, 28);
  vatDeadline.setHours(0, 0, 0, 0);
  const todayMidnight = new Date(vatYear, vatMonth, now.getDate());
  const daysToVAT = Math.ceil((vatDeadline.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

  if (daysToVAT >= 0 && daysToVAT <= 7) {
    const monthNames = ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
      "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"];
    alerts.push({
      type: "vat_deadline",
      severity: daysToVAT <= 3 ? "error" : "warning",
      title: `KDV beyan tarihi ${daysToVAT === 0 ? "bugun" : `${daysToVAT} gun sonra`}`,
      description: `${monthNames[vatMonth]} donemi KDV beyannamesi son gun: ${vatDeadline.toLocaleDateString("tr-TR")}.`,
      href: "/tax",
    });
  }

  // 3. Bugün çalışacak tekrarlayan işlemler
  const { data: recurringDue } = await supabase
    .from("recurring_transactions")
    .select("id, description")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .lte("next_run_date", todayStr);

  if (recurringDue && recurringDue.length > 0) {
    alerts.push({
      type: "recurring_due",
      severity: "info",
      title: `${recurringDue.length} tekrarlayan islem bekliyor`,
      description: recurringDue.length === 1
        ? `"${recurringDue[0].description}" bugun otomatik kaydedilmeyi bekliyor.`
        : `${recurringDue.map((r) => `"${r.description}"`).slice(0, 2).join(", ")}${recurringDue.length > 2 ? ` ve ${recurringDue.length - 2} diger` : ""} bugun otomatik kaydedilmeyi bekliyor.`,
      href: "/transactions/recurring",
    });
  }

  return alerts;
}
