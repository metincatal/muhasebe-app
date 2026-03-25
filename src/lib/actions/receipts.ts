"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
}) {
  const supabase = await createClient();

  // Once islemi olustur
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      organization_id: input.organization_id,
      type: "expense",
      amount: input.total_amount,
      currency: input.currency,
      amount_in_base: input.total_amount, // TODO: kur hesapla
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

  // Sonra fis kaydini olustur
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
    return { error: rcError.message };
  }

  revalidatePath("/receipts");
  revalidatePath("/transactions");
  revalidatePath("/");
  return { data: receipt };
}

export async function deleteReceipt(id: string) {
  const supabase = await createClient();

  // Fis kaydini ve bagli islemi sil
  const { data: receipt } = await supabase
    .from("receipts")
    .select("transaction_id")
    .eq("id", id)
    .single();

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
