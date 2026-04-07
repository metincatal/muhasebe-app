"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireWriteAccess } from "@/lib/auth/role-check";
import type { ActionReturn } from "@/lib/actions/types";

export async function getContacts(orgId: string, filters?: {
  type?: string;
  search?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");

  if (filters?.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,tax_id.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getContacts error:", error);
    return [];
  }

  return data;
}

export async function createContact(input: {
  organization_id: string;
  type: "customer" | "supplier" | "both";
  name: string;
  tax_id?: string;
  tax_office?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}): Promise<ActionReturn> {
  const accessError = await requireWriteAccess(input.organization_id);
  if (accessError) return accessError;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      organization_id: input.organization_id,
      type: input.type,
      name: input.name,
      tax_id: input.tax_id || null,
      tax_office: input.tax_office || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("createContact error:", error);
    return { error: error.message };
  }

  revalidatePath("/contacts");
  return { data };
}

export async function updateContact(
  id: string,
  input: {
    name?: string;
    type?: string;
    tax_id?: string;
    tax_office?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }
): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("contacts")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Kisi bulunamadi" };

  const accessError = await requireWriteAccess(existing.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("contacts")
    .update(input)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contacts");
  return { success: true };
}

export async function getContactById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function getContactStatement(orgId: string, contactId: string) {
  const supabase = await createClient();

  // Kontagi al
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .eq("organization_id", orgId)
    .single();

  if (contactError || !contact) {
    return { error: "Kisi bulunamadi" };
  }

  // Bu kontaga ait faturalari getir (isim veya VKN eslesmesi)
  let invoiceQuery = supabase
    .from("invoices")
    .select("id, type, invoice_number, date, due_date, status, total, currency, counterparty_name")
    .eq("organization_id", orgId);

  if (contact.tax_id) {
    invoiceQuery = invoiceQuery.or(
      `counterparty_name.eq.${contact.name},counterparty_tax_id.eq.${contact.tax_id}`
    );
  } else {
    invoiceQuery = invoiceQuery.eq("counterparty_name", contact.name);
  }

  const { data: invoices } = await invoiceQuery.order("date", { ascending: true });

  // Bu kontaga ait islemleri getir
  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, type, description, date, amount, amount_in_base, currency")
    .eq("organization_id", orgId)
    .eq("counterparty", contact.name)
    .order("date", { ascending: true });

  // Tum satirlari birlestir
  type StatementRow = {
    id: string;
    date: string;
    docNo: string;
    description: string;
    rowType: "invoice" | "transaction";
    invoiceType?: string;
    transactionType?: string;
    status?: string;
    debit: number;   // Org alacagi (sales invoice veya income tx)
    credit: number;  // Org borcu (purchase invoice veya expense tx)
    currency: string;
  };

  const rows: StatementRow[] = [];

  for (const inv of invoices || []) {
    const amount = Number(inv.total);
    rows.push({
      id: inv.id,
      date: inv.date,
      docNo: inv.invoice_number || "-",
      description: inv.type === "sales" ? "Satis Faturasi" : "Alis Faturasi",
      rowType: "invoice",
      invoiceType: inv.type,
      status: inv.status,
      debit: inv.type === "sales" ? amount : 0,
      credit: inv.type === "purchase" ? amount : 0,
      currency: inv.currency,
    });
  }

  for (const tx of transactions || []) {
    const amount = Number(tx.amount_in_base || tx.amount);
    rows.push({
      id: tx.id,
      date: tx.date,
      docNo: "-",
      description: tx.description || (tx.type === "income" ? "Tahsilat" : "Odeme"),
      rowType: "transaction",
      transactionType: tx.type,
      debit: tx.type === "expense" ? amount : 0,
      credit: tx.type === "income" ? amount : 0,
      currency: tx.currency,
    });
  }

  // Tarihe gore sirala
  rows.sort((a, b) => a.date.localeCompare(b.date));

  // Kumulatif bakiye hesapla
  let balance = 0;
  const rowsWithBalance = rows.map((row) => {
    balance += row.debit - row.credit;
    return { ...row, balance };
  });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return {
    data: {
      contact,
      rows: rowsWithBalance,
      totalDebit,
      totalCredit,
      netBalance: totalDebit - totalCredit,
    },
  };
}

export async function deleteContact(id: string): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("contacts")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Kisi bulunamadi" };

  const accessError = await requireWriteAccess(existing.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contacts");
  return { success: true };
}
