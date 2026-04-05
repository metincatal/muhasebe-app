"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getBankAccounts(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at");

  if (error) {
    console.error("getBankAccounts error:", error);
    return [];
  }

  return data;
}

export async function createBankAccount(input: {
  organization_id: string;
  bank_name: string;
  account_name?: string;
  iban?: string;
  currency?: string;
  balance?: number;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      organization_id: input.organization_id,
      bank_name: input.bank_name,
      account_name: input.account_name || null,
      iban: input.iban || null,
      currency: input.currency || "TRY",
      balance: input.balance || 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("createBankAccount error:", error);
    return { error: error.message };
  }

  revalidatePath("/bank");
  return { data };
}

export async function updateBankAccount(
  id: string,
  input: { bank_name?: string; account_name?: string; iban?: string; balance?: number; is_active?: boolean }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bank_accounts")
    .update(input)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/bank");
  return { success: true };
}

export async function deleteBankAccount(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/bank");
  return { success: true };
}

export async function importBankTransactions(
  bankAccountId: string,
  rows: { date: string; description: string; amount: number; type: "credit" | "debit" }[]
) {
  const supabase = await createClient();

  const inserts = rows.map((row) => ({
    bank_account_id: bankAccountId,
    date: row.date || new Date().toISOString().split("T")[0],
    description: row.description,
    amount: row.amount,
    type: row.type,
    is_matched: false,
  }));

  const { data, error } = await supabase
    .from("bank_transactions")
    .insert(inserts)
    .select("id");

  if (error) {
    console.error("importBankTransactions error:", error);
    return { error: error.message };
  }

  revalidatePath("/bank/reconcile");
  return { data, count: data.length };
}

export async function getBankTransactionsForReconcile(bankAccountId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bank_transactions")
    .select("*, transactions(id, description, date, amount, type)")
    .eq("bank_account_id", bankAccountId)
    .order("date", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getBankTransactionsForReconcile error:", error);
    return [];
  }

  return data;
}

export async function findMatchingTransactions(
  orgId: string,
  amount: number,
  date: string,
  type: "credit" | "debit"
) {
  const supabase = await createClient();

  const d = new Date(date);
  const from = new Date(d);
  from.setDate(from.getDate() - 3);
  const to = new Date(d);
  to.setDate(to.getDate() + 3);

  const txType = type === "credit" ? "income" : "expense";

  const { data, error } = await supabase
    .from("transactions")
    .select("id, description, date, amount, type, counterparty")
    .eq("organization_id", orgId)
    .eq("type", txType)
    .eq("amount", amount)
    .gte("date", from.toISOString().split("T")[0])
    .lte("date", to.toISOString().split("T")[0])
    .eq("is_reconciled", false)
    .limit(5);

  if (error) return [];
  return data;
}

export async function confirmBankMatch(bankTransactionId: string, transactionId: string) {
  const supabase = await createClient();

  const { error: btErr } = await supabase
    .from("bank_transactions")
    .update({ is_matched: true, transaction_id: transactionId })
    .eq("id", bankTransactionId);

  if (btErr) return { error: btErr.message };

  const { error: txErr } = await supabase
    .from("transactions")
    .update({ is_reconciled: true, bank_transaction_id: bankTransactionId })
    .eq("id", transactionId);

  if (txErr) return { error: txErr.message };

  revalidatePath("/bank/reconcile");
  return { success: true };
}

export async function dismissBankTransaction(bankTransactionId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bank_transactions")
    .update({ is_matched: true, transaction_id: null })
    .eq("id", bankTransactionId);

  if (error) return { error: error.message };

  revalidatePath("/bank/reconcile");
  return { success: true };
}
