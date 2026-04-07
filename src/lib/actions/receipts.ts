"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireWriteAccess } from "@/lib/auth/role-check";
import type { ActionReturn } from "@/lib/actions/types";

export async function getReceipts(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("receipts")
    .select("*, categories(name, color), transactions(description, amount, currency)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getReceipts error:", error);
    return [];
  }

  return data;
}

export async function createReceiptWithTransaction(input: {
  organization_id: string;
  vendor_name: string;
  date: string;
  total_amount: number;
  tax_amount?: number;
  currency: string;
  category_id?: string;
  ocr_raw_text?: string;
  ocr_parsed_data?: Record<string, unknown>;
  image_url?: string;
  created_by: string;
}): Promise<ActionReturn> {
  const accessError = await requireWriteAccess(input.organization_id);
  if (accessError) return accessError;

  const supabase = await createClient();

  // Doviz kuru hesapla
  let exchangeRate = 1;
  let amountInBase = input.total_amount;

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
      amountInBase = input.total_amount * exchangeRate;
    }
  }

  // Once islemi olustur
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      organization_id: input.organization_id,
      type: "expense",
      amount: input.total_amount,
      currency: input.currency,
      exchange_rate: exchangeRate,
      amount_in_base: amountInBase,
      description: `${input.vendor_name} - Fis`,
      counterparty: input.vendor_name,
      category_id: input.category_id || null,
      date: input.date,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (txError) {
    console.error("createReceiptTransaction error:", txError);
    return { error: txError.message };
  }

  // Sonra fis kaydini olustur — basarisiz olursa islemi de geri al
  const { data: receipt, error: rcError } = await supabase
    .from("receipts")
    .insert({
      organization_id: input.organization_id,
      image_url: input.image_url || "pending",
      vendor_name: input.vendor_name,
      date: input.date,
      total_amount: input.total_amount,
      tax_amount: input.tax_amount || null,
      currency: input.currency,
      category_id: input.category_id || null,
      transaction_id: transaction.id,
      ocr_raw_text: input.ocr_raw_text || null,
      ocr_parsed_data: input.ocr_parsed_data || null,
      status: "confirmed",
      created_by: input.created_by,
    })
    .select()
    .single();

  if (rcError) {
    console.error("createReceipt error:", rcError);
    // Transaction orphan birakmamak icin geri al
    await supabase.from("transactions").delete().eq("id", transaction.id);
    return { error: rcError.message };
  }

  revalidatePath("/receipts");
  revalidatePath("/transactions");
  revalidatePath("/");
  return { data: receipt };
}

export async function deleteReceipt(id: string): Promise<ActionReturn> {
  const supabase = await createClient();

  // Fis kaydini ve bagli islemi sil
  const { data: receipt } = await supabase
    .from("receipts")
    .select("organization_id, transaction_id")
    .eq("id", id)
    .single();

  if (!receipt) return { error: "Fis bulunamadi" };

  const accessError = await requireWriteAccess(receipt.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  // Bagli islemi de sil
  if (receipt?.transaction_id) {
    await supabase
      .from("transactions")
      .delete()
      .eq("id", receipt.transaction_id);
  }

  revalidatePath("/receipts");
  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}
