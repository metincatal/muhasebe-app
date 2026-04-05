"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getRecurringTransactions(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*, categories(name, color, icon)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getRecurringTransactions error:", error);
    return [];
  }

  return data;
}

export async function createRecurringTransaction(input: {
  organization_id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  description: string;
  counterparty?: string;
  category_id?: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date?: string;
  created_by: string;
}) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const endDate = input.end_date || null;
  const isActive = endDate ? endDate >= today : true;

  const { data, error } = await supabase
    .from("recurring_transactions")
    .insert({
      organization_id: input.organization_id,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      counterparty: input.counterparty || null,
      category_id: input.category_id || null,
      frequency: input.frequency,
      start_date: input.start_date,
      end_date: endDate,
      next_run_date: input.start_date,
      is_active: isActive,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    console.error("createRecurringTransaction error:", error);
    return { error: error.message };
  }

  revalidatePath("/transactions/recurring");
  return { data };
}

export async function toggleRecurringTransaction(id: string, isActive: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("recurring_transactions")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/transactions/recurring");
  return { success: true };
}

export async function deleteRecurringTransaction(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("recurring_transactions")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/transactions/recurring");
  return { success: true };
}

function calcNextRunDate(current: string, frequency: string): string {
  const d = new Date(current);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}

export async function processRecurringTransactions(orgId: string, userId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: due, error } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .lte("next_run_date", today);

  if (error || !due || due.length === 0) return { created: 0 };

  let created = 0;

  for (const rec of due) {
    // end_date geçmişse işlem oluşturma, direkt pasife al
    if (rec.end_date && today > rec.end_date) {
      await supabase
        .from("recurring_transactions")
        .update({ is_active: false })
        .eq("id", rec.id);
      continue;
    }

    // Kur hesapla
    let exchangeRate = 1;
    let amountInBase = rec.amount;

    if (rec.currency !== "TRY") {
      const { data: rateData } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("base_currency", "TRY")
        .eq("target_currency", rec.currency)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      if (rateData) {
        exchangeRate = rateData.rate;
        amountInBase = rec.amount * exchangeRate;
      }
    }

    // İşlem oluştur
    const { error: txErr } = await supabase
      .from("transactions")
      .insert({
        organization_id: rec.organization_id,
        type: rec.type,
        amount: rec.amount,
        currency: rec.currency,
        exchange_rate: exchangeRate,
        amount_in_base: amountInBase,
        description: rec.description,
        counterparty: rec.counterparty,
        category_id: rec.category_id,
        date: rec.next_run_date,
        created_by: userId,
      });

    if (txErr) {
      console.error("processRecurring tx insert error:", txErr);
      continue;
    }

    // next_run_date güncelle
    const nextDate = calcNextRunDate(rec.next_run_date, rec.frequency);
    const shouldDeactivate = rec.end_date && nextDate > rec.end_date;

    await supabase
      .from("recurring_transactions")
      .update({
        last_run_date: rec.next_run_date,
        next_run_date: nextDate,
        is_active: !shouldDeactivate,
      })
      .eq("id", rec.id);

    created++;
  }

  if (created > 0) {
    revalidatePath("/transactions");
    revalidatePath("/");
  }

  return { created };
}
