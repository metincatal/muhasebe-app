import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function authenticateApiKey(request: Request): Promise<{
  organization_id: string;
  permissions: string[];
} | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) return null;

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  // Admin client kullanılıyor: API key doğrulaması RLS'siz çalışmalı
  // çünkü curl/dış istemcilerden session cookie gelmiyor
  const supabase = createAdminClient();

  const { data: apiKey } = await supabase
    .from("api_keys")
    .select("id, organization_id, permissions, is_active, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (!apiKey || !apiKey.is_active) return null;

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) return null;

  // Son kullanım zamanını güncelle (fire and forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  return {
    organization_id: apiKey.organization_id,
    permissions: apiKey.permissions,
  };
}
