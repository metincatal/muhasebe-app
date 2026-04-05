"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { transactionSchema } from "@/lib/validations";
import { logAudit } from "@/lib/actions/audit-log";

const PAGE_SIZE = 50;

export async function getTransactions(orgId: string, filters?: {
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();

  const limit = filters?.limit ?? PAGE_SIZE;
  const offset = filters?.offset ?? 0;

  let query = supabase
    .from("transactions")
    .select("*, categories(name, color, icon)")
    .eq("organization_id", orgId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  if (filters?.search) {
    query = query.or(
      `description.ilike.%${filters.search}%,counterparty.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getTransactions error:", error);
    return [];
  }

  return data;
}

export async function createTransaction(input: {
  organization_id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  description: string;
  counterparty?: string;
  category_id?: string;
  date: string;
  tags?: string[];
  created_by: string;
}) {
  // Validate input
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const supabase = await createClient();

  // Kur hesapla
  let exchangeRate = 1;
  let amountInBase = input.amount;

  if (input.currency !== "TRY") {
    const { data: rateData } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("base_currency", "TRY")
      .eq("target_currency", input.currency)
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (rateData) {
      exchangeRate = rateData.rate;
      amountInBase = input.amount * exchangeRate;
    }
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      organization_id: input.organization_id,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      exchange_rate: exchangeRate,
      amount_in_base: amountInBase,
      description: input.description,
      counterparty: input.counterparty || null,
      category_id: input.category_id || null,
      date: input.date,
      tags: input.tags || [],
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    console.error("createTransaction error:", error);
    return { error: error.message };
  }

  await logAudit({
    organization_id: input.organization_id,
    action: "create",
    table_name: "transactions",
    record_id: data.id,
    new_data: data as Record<string, unknown>,
  });

  revalidatePath("/transactions");
  revalidatePath("/");
  return { data };
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteTransaction error:", error);
    return { error: error.message };
  }

  if (existing) {
    await logAudit({
      organization_id: existing.organization_id,
      action: "delete",
      table_name: "transactions",
      record_id: id,
      old_data: existing as Record<string, unknown>,
    });
  }

  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}

export async function getDashboardSummary(orgId: string) {
  const supabase = await createClient();

  // Bu ayin baslangici
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Bu ayin islemleri
  const { data: monthTransactions } = await supabase
    .from("transactions")
    .select("type, amount, amount_in_base, currency")
    .eq("organization_id", orgId)
    .gte("date", monthStart)
    .lte("date", monthEnd);

  let totalIncome = 0;
  let totalExpense = 0;

  (monthTransactions || []).forEach((tx) => {
    const amt = tx.amount_in_base || tx.amount;
    if (tx.type === "income") totalIncome += Number(amt);
    if (tx.type === "expense") totalExpense += Number(amt);
  });

  // Bekleyen faturalar
  const { count: pendingInvoices } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .in("status", ["sent", "overdue"]);

  // Son 3 ayin verileri
  const monthlyData = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString().split("T")[0];
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const { data: mTx } = await supabase
      .from("transactions")
      .select("type, amount, amount_in_base")
      .eq("organization_id", orgId)
      .gte("date", start)
      .lte("date", end);

    let mIncome = 0;
    let mExpense = 0;
    (mTx || []).forEach((tx) => {
      const amt = tx.amount_in_base || tx.amount;
      if (tx.type === "income") mIncome += Number(amt);
      if (tx.type === "expense") mExpense += Number(amt);
    });

    const monthNames = ["Oca", "Sub", "Mar", "Nis", "May", "Haz", "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"];
    monthlyData.push({
      month: monthNames[d.getMonth()],
      income: mIncome,
      expense: mExpense,
    });
  }

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    pendingInvoices: pendingInvoices || 0,
    monthlyData,
  };
}
