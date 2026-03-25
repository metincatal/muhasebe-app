"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAccounts(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("organization_id", orgId)
    .order("code");

  if (error) {
    console.error("getAccounts error:", error);
    return [];
  }

  return data;
}

export async function createAccount(input: {
  organization_id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parent_id?: string;
  currency?: string;
  description?: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      organization_id: input.organization_id,
      code: input.code,
      name: input.name,
      type: input.type,
      parent_id: input.parent_id || null,
      currency: input.currency || "TRY",
      description: input.description || null,
      is_system: false,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("createAccount error:", error);
    return { error: error.message };
  }

  revalidatePath("/accounts");
  return { data };
}

export async function updateAccount(
  id: string,
  input: { name?: string; is_active?: boolean; description?: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("accounts")
    .update(input)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/accounts");
  return { success: true };
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("is_system")
    .eq("id", id)
    .single();

  if (account?.is_system) {
    return { error: "Sistem hesaplari silinemez" };
  }

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/accounts");
  return { success: true };
}

export async function seedDefaultAccounts(orgId: string) {
  const supabase = await createClient();

  const defaultAccounts = [
    // 1xx - Donen Varliklar
    { code: "100", name: "Kasa", type: "asset" },
    { code: "101", name: "Alinan Cekler", type: "asset" },
    { code: "102", name: "Bankalar", type: "asset" },
    { code: "108", name: "Diger Hazir Degerler", type: "asset" },
    { code: "120", name: "Alicilar", type: "asset" },
    { code: "121", name: "Alacak Senetleri", type: "asset" },
    { code: "126", name: "Verilen Depozito ve Teminatlar", type: "asset" },
    { code: "150", name: "Ilk Madde ve Malzeme", type: "asset" },
    { code: "153", name: "Ticari Mallar", type: "asset" },
    { code: "180", name: "Gelecek Aylara Ait Giderler", type: "asset" },
    { code: "190", name: "Devreden KDV", type: "asset" },
    { code: "191", name: "Indirilecek KDV", type: "asset" },

    // 2xx - Duran Varliklar
    { code: "252", name: "Binalar", type: "asset" },
    { code: "253", name: "Tesis, Makine ve Cihazlar", type: "asset" },
    { code: "254", name: "Tasitlar", type: "asset" },
    { code: "255", name: "Demirbaslar", type: "asset" },
    { code: "257", name: "Birikmis Amortismanlar (-)", type: "asset" },
    { code: "260", name: "Haklar", type: "asset" },
    { code: "264", name: "Ozel Maliyetler", type: "asset" },
    { code: "268", name: "Birikmis Amortismanlar (-)", type: "asset" },

    // 3xx - Kisa Vadeli Borclar
    { code: "300", name: "Banka Kredileri", type: "liability" },
    { code: "320", name: "Saticilar", type: "liability" },
    { code: "321", name: "Borc Senetleri", type: "liability" },
    { code: "335", name: "Personele Borclar", type: "liability" },
    { code: "340", name: "Alinan Siparis Avanslari", type: "liability" },
    { code: "360", name: "Odenecek Vergi ve Fonlar", type: "liability" },
    { code: "361", name: "Odenecek Sosyal Guvenlik Kesintileri", type: "liability" },
    { code: "380", name: "Gelecek Aylara Ait Gelirler", type: "liability" },
    { code: "391", name: "Hesaplanan KDV", type: "liability" },

    // 4xx - Uzun Vadeli Borclar
    { code: "400", name: "Banka Kredileri", type: "liability" },
    { code: "420", name: "Saticilar", type: "liability" },

    // 5xx - Ozkaynaklar
    { code: "500", name: "Sermaye", type: "equity" },
    { code: "540", name: "Yasal Yedekler", type: "equity" },
    { code: "570", name: "Gecmis Yillar Karlari", type: "equity" },
    { code: "580", name: "Gecmis Yillar Zararlari (-)", type: "equity" },
    { code: "590", name: "Donem Net Kari", type: "equity" },
    { code: "591", name: "Donem Net Zarari (-)", type: "equity" },

    // 6xx - Gelir Tablosu
    { code: "600", name: "Yurtici Satislar", type: "revenue" },
    { code: "601", name: "Yurtdisi Satislar", type: "revenue" },
    { code: "602", name: "Diger Gelirler", type: "revenue" },
    { code: "610", name: "Satis Iadeleri (-)", type: "revenue" },
    { code: "611", name: "Satis Iskontalari (-)", type: "revenue" },
    { code: "620", name: "Satilan Mamuller Maliyeti (-)", type: "expense" },
    { code: "621", name: "Satilan Ticari Mallar Maliyeti (-)", type: "expense" },
    { code: "622", name: "Satilan Hizmet Maliyeti (-)", type: "expense" },
    { code: "630", name: "Arastirma Gelistirme Giderleri (-)", type: "expense" },
    { code: "631", name: "Pazarlama Satis Dagitim Giderleri (-)", type: "expense" },
    { code: "632", name: "Genel Yonetim Giderleri (-)", type: "expense" },

    // 7xx - Maliyet Hesaplari
    { code: "700", name: "Maliyet Muhasebesi Yansitma", type: "expense" },
    { code: "710", name: "Direkt Ilk Madde ve Malzeme Giderleri", type: "expense" },
    { code: "720", name: "Direkt Iscilik Giderleri", type: "expense" },
    { code: "730", name: "Genel Uretim Giderleri", type: "expense" },
    { code: "740", name: "Hizmet Uretim Maliyeti", type: "expense" },
    { code: "750", name: "Arastirma ve Gelistirme Giderleri", type: "expense" },
    { code: "760", name: "Pazarlama Satis ve Dagitim Giderleri", type: "expense" },
    { code: "770", name: "Genel Yonetim Giderleri", type: "expense" },
    { code: "780", name: "Finansman Giderleri", type: "expense" },
  ];

  const rows = defaultAccounts.map((a) => ({
    organization_id: orgId,
    code: a.code,
    name: a.name,
    type: a.type,
    is_system: true,
    is_active: true,
    currency: "TRY",
  }));

  const { error } = await supabase.from("accounts").insert(rows);

  if (error) {
    console.error("seedDefaultAccounts error:", error);
    return { error: error.message };
  }

  return { success: true };
}
