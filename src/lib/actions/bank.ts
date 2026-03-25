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
