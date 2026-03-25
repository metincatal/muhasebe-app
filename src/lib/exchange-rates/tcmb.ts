import type { CurrencyRate } from "@/types";

interface TCMBCurrency {
  code: string;
  name: string;
  forexBuying: number;
  forexSelling: number;
}

export async function fetchTCMBRates(): Promise<CurrencyRate[]> {
  const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error("TCMB kur verileri alinamadi");
  }

  const xml = await response.text();
  const currencies: CurrencyRate[] = [];
  const today = new Date().toISOString().split("T")[0];

  // Parse XML manually (lightweight, no dependency needed)
  const currencyRegex = /<Currency[^>]*CurrencyCode="([^"]+)"[^>]*>[\s\S]*?<Isim>([^<]+)<\/Isim>[\s\S]*?<ForexBuying>([^<]*)<\/ForexBuying>[\s\S]*?<ForexSelling>([^<]*)<\/ForexSelling>[\s\S]*?<\/Currency>/g;

  let match;
  while ((match = currencyRegex.exec(xml)) !== null) {
    const [, code, name, buyStr, sellStr] = match;
    const buyRate = parseFloat(buyStr);
    const sellRate = parseFloat(sellStr);

    if (!isNaN(buyRate) && !isNaN(sellRate)) {
      currencies.push({
        code,
        name,
        buyRate,
        sellRate,
        date: today,
      });
    }
  }

  return currencies;
}

export async function getExchangeRate(
  currencyCode: string
): Promise<{ buy: number; sell: number } | null> {
  const rates = await fetchTCMBRates();
  const rate = rates.find((r) => r.code === currencyCode);

  if (!rate) return null;

  return {
    buy: rate.buyRate,
    sell: rate.sellRate,
  };
}
