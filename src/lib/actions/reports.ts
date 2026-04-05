"use server";

import { createClient } from "@/lib/supabase/server";

export async function getProfitLossReport(orgId: string, year: number, month?: number) {
  const supabase = await createClient();

  let startDate: string;
  let endDate: string;

  if (month !== undefined) {
    startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    endDate = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;
  } else {
    startDate = `${year}-01-01`;
    endDate = `${year}-12-31`;
  }

  const { data: transactions } = await supabase
    .from("transactions")
    .select("type, amount, amount_in_base, category_id, categories(name, color)")
    .eq("organization_id", orgId)
    .gte("date", startDate)
    .lte("date", endDate);

  // Kategoriye gore grupla
  const incomeByCategory: Record<string, { name: string; color: string; total: number }> = {};
  const expenseByCategory: Record<string, { name: string; color: string; total: number }> = {};
  let totalIncome = 0;
  let totalExpense = 0;

  (transactions || []).forEach((tx) => {
    const amt = Number(tx.amount_in_base || tx.amount);
    const cat = tx.categories as unknown as { name: string; color: string } | null;
    const catName = cat?.name || "Kategorisiz";
    const catColor = cat?.color || "#6b7280";
    const catId = tx.category_id || "uncategorized";

    if (tx.type === "income") {
      totalIncome += amt;
      if (!incomeByCategory[catId]) {
        incomeByCategory[catId] = { name: catName, color: catColor, total: 0 };
      }
      incomeByCategory[catId].total += amt;
    } else if (tx.type === "expense") {
      totalExpense += amt;
      if (!expenseByCategory[catId]) {
        expenseByCategory[catId] = { name: catName, color: catColor, total: 0 };
      }
      expenseByCategory[catId].total += amt;
    }
  });

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    incomeByCategory: Object.values(incomeByCategory).sort((a, b) => b.total - a.total),
    expenseByCategory: Object.values(expenseByCategory).sort((a, b) => b.total - a.total),
  };
}

export async function getMonthlyTrend(orgId: string, year: number) {
  const supabase = await createClient();

  const monthNames = ["Oca", "Sub", "Mar", "Nis", "May", "Haz", "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"];
  const data = [];

  for (let m = 0; m < 12; m++) {
    const startDate = `${year}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, m + 1, 0).getDate();
    const endDate = `${year}-${String(m + 1).padStart(2, "0")}-${lastDay}`;

    const { data: txs } = await supabase
      .from("transactions")
      .select("type, amount, amount_in_base")
      .eq("organization_id", orgId)
      .gte("date", startDate)
      .lte("date", endDate);

    let income = 0;
    let expense = 0;
    (txs || []).forEach((tx) => {
      const amt = Number(tx.amount_in_base || tx.amount);
      if (tx.type === "income") income += amt;
      if (tx.type === "expense") expense += amt;
    });

    data.push({ month: monthNames[m], income, expense, net: income - expense });
  }

  return data;
}

export async function getBalanceSheet(orgId: string, asOfDate?: string) {
  const supabase = await createClient();

  const dateFilter = asOfDate || new Date().toISOString().split("T")[0];

  // Tum islemleri getir
  const { data: transactions } = await supabase
    .from("transactions")
    .select("type, amount, amount_in_base")
    .eq("organization_id", orgId)
    .lte("date", dateFilter);

  // Banka hesaplarini getir
  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("bank_name, balance, currency, is_active")
    .eq("organization_id", orgId);

  // Odenmemis satis faturalari = alacak (aktif)
  const { data: salesInvoices } = await supabase
    .from("invoices")
    .select("total, currency, exchange_rate")
    .eq("organization_id", orgId)
    .eq("type", "sales")
    .in("status", ["sent", "overdue"])
    .lte("date", dateFilter);

  // Odenmemis alis faturalari = borc (pasif)
  const { data: purchaseInvoices } = await supabase
    .from("invoices")
    .select("total, currency, exchange_rate")
    .eq("organization_id", orgId)
    .eq("type", "purchase")
    .in("status", ["sent", "overdue", "draft"])
    .lte("date", dateFilter);

  let totalIncome = 0;
  let totalExpense = 0;

  (transactions || []).forEach((tx) => {
    const amt = Number(tx.amount_in_base || tx.amount);
    if (tx.type === "income") totalIncome += amt;
    if (tx.type === "expense") totalExpense += amt;
  });

  const totalBankBalance = (bankAccounts || []).reduce((sum, a) => sum + Number(a.balance), 0);

  // Alacaklar: odenmemis satis faturalarinin TRY karsılığı
  const totalReceivables = (salesInvoices || []).reduce((sum, inv) => {
    const rate = Number(inv.exchange_rate || 1);
    return sum + Number(inv.total) * rate;
  }, 0);

  // Borclar: odenmemis alis faturalarinin TRY karsılığı
  const totalPayables = (purchaseInvoices || []).reduce((sum, inv) => {
    const rate = Number(inv.exchange_rate || 1);
    return sum + Number(inv.total) * rate;
  }, 0);

  const totalAssets = totalBankBalance + totalReceivables;
  const retainedEarnings = totalIncome - totalExpense;
  const totalEquity = totalAssets - totalPayables;

  return {
    assets: {
      bankAccounts: (bankAccounts || []).map((a) => ({
        name: a.bank_name,
        balance: Number(a.balance),
        currency: a.currency,
        isActive: a.is_active,
      })),
      totalBankBalance,
      totalReceivables,
      totalAssets,
    },
    liabilities: {
      totalPayables,
      totalLiabilities: totalPayables,
    },
    equity: {
      retainedEarnings,
      totalEquity,
    },
    totalIncome,
    totalExpense,
    asOfDate: dateFilter,
  };
}

export async function getComparisonReport(orgId: string, year1: number, year2: number) {
  const supabase = await createClient();

  async function getYearData(year: number) {
    const { data: transactions } = await supabase
      .from("transactions")
      .select("type, amount, amount_in_base, category_id, categories(name, color)")
      .eq("organization_id", orgId)
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`);

    const byCategory: Record<string, { name: string; color: string; income: number; expense: number }> = {};
    let totalIncome = 0;
    let totalExpense = 0;

    (transactions || []).forEach((tx) => {
      const amt = Number(tx.amount_in_base || tx.amount);
      const cat = tx.categories as unknown as { name: string; color: string } | null;
      const catName = cat?.name || "Kategorisiz";
      const catColor = cat?.color || "#6b7280";
      const catId = tx.category_id || "uncategorized";

      if (!byCategory[catId]) {
        byCategory[catId] = { name: catName, color: catColor, income: 0, expense: 0 };
      }

      if (tx.type === "income") {
        totalIncome += amt;
        byCategory[catId].income += amt;
      } else if (tx.type === "expense") {
        totalExpense += amt;
        byCategory[catId].expense += amt;
      }
    });

    return { totalIncome, totalExpense, netProfit: totalIncome - totalExpense, byCategory };
  }

  const [data1, data2] = await Promise.all([getYearData(year1), getYearData(year2)]);

  const allCatIds = new Set([...Object.keys(data1.byCategory), ...Object.keys(data2.byCategory)]);
  const categories = Array.from(allCatIds).map((catId) => {
    const cat1 = data1.byCategory[catId];
    const cat2 = data2.byCategory[catId];
    return {
      id: catId,
      name: cat1?.name || cat2?.name || "Kategorisiz",
      color: cat1?.color || cat2?.color || "#6b7280",
      year1Income: cat1?.income ?? 0,
      year1Expense: cat1?.expense ?? 0,
      year2Income: cat2?.income ?? 0,
      year2Expense: cat2?.expense ?? 0,
    };
  }).sort((a, b) => (b.year1Expense + b.year2Expense) - (a.year1Expense + a.year2Expense));

  return {
    year1: { year: year1, ...data1 },
    year2: { year: year2, ...data2 },
    categories,
    incomeDiff: data2.totalIncome - data1.totalIncome,
    expenseDiff: data2.totalExpense - data1.totalExpense,
    netDiff: data2.netProfit - data1.netProfit,
  };
}

export async function getCashFlowReport(orgId: string, year: number) {
  const supabase = await createClient();

  const monthNames = ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"];
  const data = [];

  let runningBalance = 0;

  for (let m = 0; m < 12; m++) {
    const startDate = `${year}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, m + 1, 0).getDate();
    const endDate = `${year}-${String(m + 1).padStart(2, "0")}-${lastDay}`;

    const { data: txs } = await supabase
      .from("transactions")
      .select("type, amount, amount_in_base, description, category_id, categories(name)")
      .eq("organization_id", orgId)
      .gte("date", startDate)
      .lte("date", endDate);

    let inflows = 0;
    let outflows = 0;

    (txs || []).forEach((tx) => {
      const amt = Number(tx.amount_in_base || tx.amount);
      if (tx.type === "income") inflows += amt;
      if (tx.type === "expense") outflows += amt;
    });

    const netFlow = inflows - outflows;
    runningBalance += netFlow;

    data.push({
      month: monthNames[m],
      monthShort: monthNames[m].slice(0, 3),
      inflows,
      outflows,
      netFlow,
      runningBalance,
      transactionCount: (txs || []).length,
    });
  }

  return data;
}
