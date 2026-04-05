import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { fetchTCMBRates } from "@/lib/exchange-rates/tcmb";

export async function GET() {
  try {
    const rates = await fetchTCMBRates();

    // Service role ile DB'ye yaz (RLS'i atlar)
    let dbError = null;
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey) {
        dbError = "SUPABASE_SERVICE_ROLE_KEY env var bulunamadi";
      } else {
        const supabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceKey
        );
        const today = new Date().toISOString().split("T")[0];
        const rows = rates.map((r) => ({
          base_currency: "TRY",
          target_currency: r.code,
          rate: r.buyRate,
          date: today,
          source: "tcmb",
        }));
        const { error } = await supabase.from("exchange_rates").upsert(rows, {
          onConflict: "base_currency,target_currency,date",
        });
        if (error) dbError = error.message;
      }
    } catch (err) {
      dbError = String(err);
    }

    return NextResponse.json({ rates, dbError });
  } catch (error) {
    console.error("Exchange rate error:", error);
    return NextResponse.json(
      { error: "Doviz kurlari alinamadi" },
      { status: 500 }
    );
  }
}
