"use server";

import { createClient } from "@/lib/supabase/server";
import { createHash, randomBytes } from "crypto";
import { requireAdminAccess } from "@/lib/auth/role-check";
import type { ActionReturn } from "@/lib/actions/types";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function generateApiKey(input: {
  organization_id: string;
  name: string;
  permissions: string[];
  created_by: string;
  expires_at?: string;
}): Promise<ActionReturn> {
  const accessError = await requireAdminAccess(input.organization_id);
  if (accessError) return accessError;

  const supabase = await createClient();

  const rawKey = "mpro_" + randomBytes(32).toString("hex");
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      organization_id: input.organization_id,
      name: input.name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      permissions: input.permissions,
      expires_at: input.expires_at ?? null,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // rawKey sadece bir kez gösterilir, DB'de saklanmaz
  return { data: { ...data, raw_key: rawKey } };
}

export async function getApiKeys(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, permissions, is_active, last_used_at, expires_at, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return data;
}

export async function revokeApiKey(id: string): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("api_keys")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "API anahtari bulunamadi" };

  const accessError = await requireAdminAccess(existing.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteApiKey(id: string): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("api_keys")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "API anahtari bulunamadi" };

  const accessError = await requireAdminAccess(existing.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getWebhooks(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("webhooks")
    .select("id, name, url, events, is_active, last_triggered_at, failure_count, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return data;
}

export async function createWebhook(input: {
  organization_id: string;
  name: string;
  url: string;
  events: string[];
  created_by: string;
}): Promise<ActionReturn> {
  const accessError = await requireAdminAccess(input.organization_id);
  if (accessError) return accessError;

  const supabase = await createClient();

  const secret = "whsec_" + randomBytes(24).toString("hex");

  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      organization_id: input.organization_id,
      name: input.name,
      url: input.url,
      events: input.events,
      secret,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function deleteWebhook(id: string): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("webhooks")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Webhook bulunamadi" };

  const accessError = await requireAdminAccess(existing.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function toggleWebhook(id: string, isActive: boolean): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("webhooks")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Webhook bulunamadi" };

  const accessError = await requireAdminAccess(existing.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("webhooks")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
