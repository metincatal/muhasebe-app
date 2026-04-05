import { createClient } from "@supabase/supabase-js";

// RLS bypass gerektiren sunucu taraflı işlemler için (API key doğrulama gibi)
// Bu client sadece güvenilir server-side kodda kullanılmalı
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY tanımlanmamış");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
