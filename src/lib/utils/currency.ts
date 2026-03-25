const currencyFormatters: Record<string, Intl.NumberFormat> = {};

export function formatCurrency(amount: number | string, currency: string = "TRY"): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (!currencyFormatters[currency]) {
    currencyFormatters[currency] = new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return currencyFormatters[currency].format(numAmount);
}

export function parseCurrencyInput(value: string): number {
  // Handle Turkish number format (1.234,56 → 1234.56)
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
}

export const SUPPORTED_CURRENCIES = [
  { code: "TRY", name: "Türk Lirası", symbol: "₺" },
  { code: "USD", name: "ABD Doları", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "İngiliz Sterlini", symbol: "£" },
  { code: "CHF", name: "İsviçre Frangı", symbol: "CHF" },
  { code: "JPY", name: "Japon Yeni", symbol: "¥" },
  { code: "SAR", name: "Suudi Riyali", symbol: "﷼" },
  { code: "AED", name: "BAE Dirhemi", symbol: "د.إ" },
] as const;
