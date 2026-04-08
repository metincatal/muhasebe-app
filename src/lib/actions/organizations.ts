"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionReturn } from "@/lib/actions/types";

export async function createOrganization(
  name: string,
  type: "individual" | "corporate"
): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadi" };

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: name.trim(), type })
    .select("id")
    .single();

  if (orgError || !org) {
    return { error: orgError?.message || "Organizasyon olusturulamadi" };
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "admin",
      status: "active",
      accepted_at: new Date().toISOString(),
    });

  if (memberError) {
    return { error: memberError.message };
  }

  return { success: true };
}
