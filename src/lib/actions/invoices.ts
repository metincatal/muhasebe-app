"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { invoiceSchema } from "@/lib/validations";

const PAGE_SIZE = 50;

export async function getInvoices(orgId: string, filters?: {
  type?: string;
  status?: string;
  search?: string;
  offset?: number;
}) {
  const supabase = await createClient();

  const offset = filters?.offset ?? 0;

  let query = supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", orgId)
    .order("date", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filters?.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    query = query.or(
      `counterparty_name.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getInvoices error:", error);
    return [];
  }

  return data;
}

export async function createInvoice(input: {
  organization_id: string;
  type: "sales" | "purchase";
  invoice_number?: string;
  date: string;
  due_date?: string;
  counterparty_name: string;
  counterparty_tax_id?: string;
  counterparty_address?: string;
  currency: string;
  notes?: string;
  items: {
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
  }[];
  created_by: string;
}) {
  // Validate input
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const supabase = await createClient();

  const subtotal = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const taxAmount = input.items.reduce((sum, item) => sum + item.tax_amount, 0);
  const total = subtotal + taxAmount;

  // Fatura olustur
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      organization_id: input.organization_id,
      type: input.type,
      invoice_number: input.invoice_number || null,
      date: input.date,
      due_date: input.due_date || null,
      counterparty_name: input.counterparty_name,
      counterparty_tax_id: input.counterparty_tax_id || null,
      counterparty_address: input.counterparty_address || null,
      subtotal,
      tax_amount: taxAmount,
      total,
      currency: input.currency,
      notes: input.notes || null,
      status: "draft",
      created_by: input.created_by,
    })
    .select()
    .single();

  if (invoiceError) {
    console.error("createInvoice error:", invoiceError);
    return { error: invoiceError.message };
  }

  // Fatura kalemlerini ekle
  const itemRows = input.items.map((item, i) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    tax_rate: item.tax_rate,
    tax_amount: item.tax_amount,
    total: item.total,
    sort_order: i,
  }));

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(itemRows);

  if (itemsError) {
    console.error("createInvoice items error:", itemsError);
    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id);
    if (deleteError) {
      console.error("createInvoice rollback error:", deleteError);
    }
    return { error: itemsError.message };
  }

  revalidatePath("/invoices");
  revalidatePath("/");
  return { data: invoice };
}

export async function updateInvoiceStatus(id: string, status: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/invoices");
  return { success: true };
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/invoices");
  revalidatePath("/");
  return { success: true };
}

export async function getInvoiceWithItems(id: string) {
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .single();

  if (error || !invoice) {
    return { error: error?.message || "Fatura bulunamadi" };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name, tax_id, tax_office, address, phone, email")
    .eq("id", invoice.organization_id)
    .single();

  return { data: { invoice, org } };
}
