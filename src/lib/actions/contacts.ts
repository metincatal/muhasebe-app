"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
}) {
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
) {
  const supabase = await createClient();

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

export async function deleteContact(id: string) {
  const supabase = await createClient();

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
