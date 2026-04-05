"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface BudgetWithActual {
  category_id: string;
  category_name: string;
  category_color: string;
  budget_id: string | null;
  budget_amount: number;
  actual_amount: number;
  percentage: number;
  is_over: boolean;
}

export async function getBudgetsWithActuals(
  orgId: string,
  year: number,
  month: number
): Promise<BudgetWithActual[]> {
  const supabase = await createClient();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Tüm gider kategorilerini al
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, color")
    .eq("organization_id", orgId)
    .eq("type", "expense")
    .order("name");

  if (!categories || categories.length === 0) return [];

  // Bu ay için kayıtlı bütçeleri al
  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, category_id, amount")
    .eq("organization_id", orgId)
    .eq("period", "monthly")
    .eq("year", year)
    .eq("month", month);

  // Bu ay gerçek harcamaları kategoriye göre al
  const { data: transactions } = await supabase
    .from("transactions")
    .select("category_id, amount_in_base, amount, exchange_rate")
    .eq("organization_id", orgId)
    .eq("type", "expense")
    .gte("date", startDate)
    .lte("date", endDate);

  // Kategori başına harcama topla
  const actualMap: Record<string, number> = {};
  for (const tx of transactions ?? []) {
    if (!tx.category_id) continue;
    const amount = Number(tx.amount_in_base) || Number(tx.amount) * (Number(tx.exchange_rate) || 1);
    actualMap[tx.category_id] = (actualMap[tx.category_id] ?? 0) + amount;
  }

  const budgetMap: Record<string, { id: string; amount: number }> = {};
  for (const b of budgets ?? []) {
    if (b.category_id) {
      budgetMap[b.category_id] = { id: b.id, amount: Number(b.amount) };
    }
  }

  return categories.map((cat) => {
    const budget = budgetMap[cat.id] ?? null;
    const budgetAmount = budget?.amount ?? 0;
    const actualAmount = actualMap[cat.id] ?? 0;
    const percentage = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;

    return {
      category_id: cat.id,
      category_name: cat.name,
      category_color: cat.color ?? "#6b7280",
      budget_id: budget?.id ?? null,
      budget_amount: budgetAmount,
      actual_amount: actualAmount,
      percentage,
      is_over: budgetAmount > 0 && actualAmount > budgetAmount,
    };
  });
}

export async function upsertBudget(input: {
  organization_id: string;
  category_id: string;
  year: number;
  month: number;
  amount: number;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        organization_id: input.organization_id,
        category_id: input.category_id,
        period: "monthly",
        year: input.year,
        month: input.month,
        amount: input.amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,category_id,period,year,month" }
    )
    .select()
    .single();

  if (error) {
    console.error("upsertBudget error:", error);
    return { error: error.message };
  }

  revalidatePath("/budgets");
  revalidatePath("/");
  return { data };
}

export async function deleteBudget(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/budgets");
  revalidatePath("/");
  return { success: true };
}

export async function getOverBudgetCategories(
  orgId: string,
  year: number,
  month: number
): Promise<{ name: string; percentage: number }[]> {
  const items = await getBudgetsWithActuals(orgId, year, month);
  return items
    .filter((item) => item.is_over)
    .map((item) => ({ name: item.category_name, percentage: item.percentage }));
}
