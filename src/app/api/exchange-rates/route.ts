import { NextResponse } from "next/server";
import { fetchTCMBRates } from "@/lib/exchange-rates/tcmb";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const rates = await fetchTCMBRates();

    // DB'ye upsert et (best-effort, hata olursa sessizce gec)
    try {
      const supabase = await createClient();
      const today = new Date().toISOString().split("T")[0];
      const rows = rates.map((r) => ({
        base_currency: "TRY",
        target_currency: r.code,
        rate: r.buyRate,
        date: today,
        source: "tcmb",
      }));
      await supabase.from("exchange_rates").upsert(rows, {
        onConflict: "base_currency,target_currency,date",
      });
    } catch {
      // DB yazma basarisiz olsa da API cevabi donmeye devam et
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
