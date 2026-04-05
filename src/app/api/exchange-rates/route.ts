import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { fetchTCMBRates } from "@/lib/exchange-rates/tcmb";

export async function GET() {
  try {
    const rates = await fetchTCMBRates();

    // Service role ile DB'ye yaz (RLS'i atlar)
    try {
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
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
      if (error) console.error("Exchange rates upsert error:", error);
    } catch (err) {
      console.error("Exchange rates DB write error:", err);
    }

    return NextResponse.json(rates);
  } catch (error) {
    console.error("Exchange rate error:", error);
    return NextResponse.json(
      { error: "Doviz kurlari alinamadi" },
      { status: 500 }
    );
  }
}
