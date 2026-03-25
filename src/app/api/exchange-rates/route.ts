import { NextResponse } from "next/server";
import { fetchTCMBRates } from "@/lib/exchange-rates/tcmb";

export async function GET() {
  try {
    const rates = await fetchTCMBRates();
    return NextResponse.json(rates);
  } catch (error) {
    console.error("Exchange rate error:", error);
    return NextResponse.json(
      { error: "Doviz kurlari alinamadi" },
      { status: 500 }
    );
  }
}
