"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireWriteAccess } from "@/lib/auth/role-check";
import type { ActionReturn } from "@/lib/actions/types";

export async function getCategories(orgId: string, type?: "income" | "expense") {
  const supabase = await createClient();

  let query = supabase
    .from("categories")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getCategories error:", error);
    return [];
  }

  return data;
}

export async function createCategory(input: {
  organization_id: string;
  name: string;
  type: "income" | "expense";
  color?: string;
  icon?: string;
}): Promise<ActionReturn> {
  const accessError = await requireWriteAccess(input.organization_id);
  if (accessError) return accessError;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      organization_id: input.organization_id,
      name: input.name,
      type: input.type,
      color: input.color || "#6b7280",
      icon: input.icon || "tag",
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    console.error("createCategory error:", error);
    return { error: error.message };
  }

  revalidatePath("/settings/categories");
  return { data };
}

export async function updateCategory(
  id: string,
  input: { name?: string; color?: string; icon?: string }
): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Kategori bulunamadi" };

  const accessError = await requireWriteAccess(existing.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("categories")
    .update(input)
    .eq("id", id);

  if (error) {
    console.error("updateCategory error:", error);
    return { error: error.message };
  }

  revalidatePath("/settings/categories");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: cat } = await supabase
    .from("categories")
    .select("organization_id, is_system")
    .eq("id", id)
    .single();

  if (cat?.is_system) {
    return { error: "Sistem kategorileri silinemez" };
  }

  if (!cat) return { error: "Kategori bulunamadi" };

  const accessError = await requireWriteAccess(cat.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteCategory error:", error);
    return { error: error.message };
  }

  revalidatePath("/settings/categories");
  return { success: true };
}
