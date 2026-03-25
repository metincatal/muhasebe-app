"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Coins, RefreshCw, Loader2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import type { CurrencyRate } from "@/types";

const flagMap: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CHF: "🇨🇭",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
  SEK: "🇸🇪",
  NOK: "🇳🇴",
  DKK: "🇩🇰",
  SAR: "🇸🇦",
  KWD: "🇰🇼",
  CNY: "🇨🇳",
  RUB: "🇷🇺",
  BGN: "🇧🇬",
  RON: "🇷🇴",
  IRR: "🇮🇷",
  QAR: "🇶🇦",
  KRW: "🇰🇷",
  AZN: "🇦🇿",
  AED: "🇦🇪",
};

const majorCurrencies = ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"];

export default function CurrenciesSettingsPage() {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  async function loadRates() {
    setLoading(true);
    try {
      const res = await fetch("/api/exchange-rates");
      if (res.ok) {
        const data = await res.json();
        setRates(data);
        if (data.length > 0) {
          setLastUpdate(data[0].date);
        }
      }
    } catch {
      console.error("Kurlar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRates();
  }, []);

  const majors = rates.filter((r) => majorCurrencies.includes(r.code));
  const others = rates.filter((r) => !majorCurrencies.includes(r.code));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Doviz Kurlari</h1>
          <p className="text-sm text-muted-foreground mt-1">
            TCMB gunluk doviz kurlari (TRY bazli)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <Badge variant="secondary" className="text-xs">
              Son guncelleme: {lastUpdate}
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={loadRates} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Coins className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">Kur verisi alinamadi</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              TCMB sunucusuna ulasilamiyor. Lutfen daha sonra tekrar deneyin.
            </p>
            <Button className="mt-4" variant="outline" onClick={loadRates}>
              Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Major Currencies Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {majors.map((rate) => (
              <Card key={rate.code} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{flagMap[rate.code] || "💱"}</span>
                      <div>
                        <p className="font-semibold text-sm">{rate.code}/TRY</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{rate.name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <p className="text-[0.65rem] text-muted-foreground uppercase">Alis</p>
                      <p className="text-sm font-bold tabular-nums text-success">
                        {rate.buyRate.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-muted-foreground uppercase">Satis</p>
                      <p className="text-sm font-bold tabular-nums text-destructive">
                        {rate.sellRate.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-[0.65rem] text-muted-foreground">
                      Fark: <span className="font-medium tabular-nums">{(rate.sellRate - rate.buyRate).toFixed(4)}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* All Currencies Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Tum Doviz Kurlari ({rates.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Para Birimi</TableHead>
                    <TableHead>Isim</TableHead>
                    <TableHead className="text-right">Alis (TRY)</TableHead>
                    <TableHead className="text-right">Satis (TRY)</TableHead>
                    <TableHead className="text-right">Fark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...majors, ...others].map((rate) => (
                    <TableRow key={rate.code}>
                      <TableCell>
                        <span className="text-lg">{flagMap[rate.code] || "💱"}</span>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">{rate.code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rate.name}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-sm">
                        {rate.buyRate.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-sm">
                        {rate.sellRate.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                        {(rate.sellRate - rate.buyRate).toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
