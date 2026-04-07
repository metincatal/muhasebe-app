"use server";

import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requireWriteAccess(orgId: string): Promise<{ error: any } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Oturum açmanız gerekiyor" };

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!member || !["admin", "accountant"].includes(member.role)) {
    return { error: "Bu işlemi yapmaya yetkiniz yok" };
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requireAdminAccess(orgId: string): Promise<{ error: any } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Oturum açmanız gerekiyor" };

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!member || member.role !== "admin") {
    return { error: "Bu işlemi yapmaya yetkiniz yok" };
  }

  return null;
}
