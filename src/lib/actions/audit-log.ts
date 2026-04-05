"use server";

import { createClient } from "@/lib/supabase/server";

export async function logAudit({
  organization_id,
  action,
  table_name,
  record_id,
  old_data,
  new_data,
}: {
  organization_id: string;
  action: "create" | "update" | "delete";
  table_name: string;
  record_id: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("audit_logs").insert({
      organization_id,
      user_id: user?.id ?? null,
      action,
      table_name,
      record_id,
      old_data: old_data ?? null,
      new_data: new_data ?? null,
    });
  } catch {
    // Audit log hatası ana işlemi engellemesin
  }
}

export async function getAuditLogs(
  orgId: string,
  filters?: {
    table_name?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }
) {
  const supabase = await createClient();

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  let query = supabase
    .from("audit_logs")
    .select(
      `
      *,
      user_profiles(full_name)
    `
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.table_name && filters.table_name !== "all") {
    query = query.eq("table_name", filters.table_name);
  }

  if (filters?.action && filters.action !== "all") {
    query = query.eq("action", filters.action);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAuditLogs error:", error);
    return [];
  }

  return data;
}

export async function getAuditLogsCount(
  orgId: string,
  filters?: { table_name?: string; action?: string }
) {
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if (filters?.table_name && filters.table_name !== "all") {
    query = query.eq("table_name", filters.table_name);
  }

  if (filters?.action && filters.action !== "all") {
    query = query.eq("action", filters.action);
  }

  const { count } = await query;
  return count ?? 0;
}
