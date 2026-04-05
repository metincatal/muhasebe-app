"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Scale,
  Loader2,
  Landmark,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { getBalanceSheet } from "@/lib/actions/reports";
import { exportToExcel, exportToPDF, fmtNum } from "@/lib/utils/export";

interface BalanceSheetData {
  assets: {
    bankAccounts: { name: string; balance: number; currency: string; isActive: boolean }[];
    totalBankBalance: number;
    totalReceivables: number;
    totalAssets: number;
  };
  liabilities: {
    totalPayables: number;
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    totalEquity: number;
  };
  totalIncome: number;
  totalExpense: number;
  asOfDate: string;
}

export default function BalanceSheetPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<BalanceSheetData | null>(null);

  async function load() {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const result = await getBalanceSheet(organization.id, asOfDate);
      setData(result);
    } catch (err) {
      console.error("Balance sheet error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!organization?.id || authLoading) return;
    load();
  }, [organization?.id, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  function handleExport(type: "excel" | "pdf") {
    const headers = ["Kalem", "Tutar (TRY)"];
    const rows: (string | number)[][] = [
      ["I. VARLIKLAR (AKTIF)", ""],
      ["  A. Donen Varliklar", fmtNum(data!.assets.totalAssets)],
      ["    Banka Hesaplari", fmtNum(data!.assets.totalBankBalance)],
      ...data!.assets.bankAccounts.map((a) => [`      ${a.name}`, fmtNum(a.balance)]),
      ["    Ticari Alacaklar", fmtNum(data!.assets.totalReceivables)],
      ["TOPLAM VARLIKLAR", fmtNum(data!.assets.totalAssets)],
      ["", ""],
      ["II. KAYNAKLAR (PASIF)", ""],
      ["  A. Yabanci Kaynaklar", fmtNum(data!.liabilities.totalLiabilities)],
      ["    Ticari Borclar", fmtNum(data!.liabilities.totalPayables)],
      ["  B. Ozkaynaklar", fmtNum(data!.equity.totalEquity)],
      ["    Gecmis Yillar Kar/Zarar", fmtNum(data!.equity.retainedEarnings)],
      ["TOPLAM KAYNAKLAR", fmtNum(data!.liabilities.totalLiabilities + data!.equity.totalEquity)],
    ];
    const dateStr = new Date(data!.asOfDate).toLocaleDateString("tr-TR");
    const opts = {
      fileName: `bilanco-${asOfDate}`,
      title: "Bilanco",
      subtitle: `Tarih: ${dateStr}`,
    };
    type === "excel" ? exportToExcel(headers, rows, opts) : exportToPDF(headers, rows, opts);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bilanco</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Varlik ve yukumluluk durumu
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExport("excel")} title="Excel">
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("pdf")} title="PDF">
            <FileText className="h-4 w-4" />
          </Button>
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Tarih:</Label>
          <Input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-40"
          />
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Guncelle
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Toplam Varliklar</p>
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <p className="text-2xl font-bold mt-2 text-success">
              {formatCurrency(data.assets.totalAssets)}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-success/40 to-success/10" />
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Toplam Yukumlulukler</p>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-2xl font-bold mt-2 text-destructive">
              {formatCurrency(data.liabilities.totalLiabilities)}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/40 to-destructive/10" />
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Ozkaynaklar</p>
              <Scale className="h-5 w-5 text-amber" />
            </div>
            <p className={`text-2xl font-bold mt-2 ${data.equity.totalEquity >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(data.equity.totalEquity)}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber/40 to-amber/10" />
        </Card>
      </div>

      {/* Balance Sheet Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Bilanco Tablosu — {new Date(data.asOfDate).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {/* VARLIKLAR */}
              <TableRow className="bg-success/5">
                <TableCell className="font-bold text-sm" colSpan={2}>
                  I. VARLIKLAR (AKTIF)
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/30">
                <TableCell className="font-semibold text-sm pl-6">A. Donen Varliklar</TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-sm">
                  {formatCurrency(data.assets.totalAssets)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="text-sm pl-10 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Landmark className="h-3.5 w-3.5" />
                    Banka Hesaplari
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {formatCurrency(data.assets.totalBankBalance)}
                </TableCell>
              </TableRow>

              {data.assets.bankAccounts.map((account, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm pl-14 text-muted-foreground">
                    {account.name}
                    {!account.isActive && (
                      <Badge variant="secondary" className="text-[0.6rem] ml-2">Pasif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                    {formatCurrency(account.balance, account.currency)}
                  </TableCell>
                </TableRow>
              ))}

              {data.assets.totalReceivables > 0 && (
                <TableRow>
                  <TableCell className="text-sm pl-10 text-muted-foreground">
                    Ticari Alacaklar (Odenmemis Satis Faturalari)
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(data.assets.totalReceivables)}
                  </TableCell>
                </TableRow>
              )}

              <TableRow className="border-t-2 bg-success/10">
                <TableCell className="font-bold text-sm pl-6">TOPLAM VARLIKLAR</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-success">
                  {formatCurrency(data.assets.totalAssets)}
                </TableCell>
              </TableRow>

              {/* PASIF */}
              <TableRow className="bg-destructive/5">
                <TableCell className="font-bold text-sm" colSpan={2}>
                  II. KAYNAKLAR (PASIF)
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/30">
                <TableCell className="font-semibold text-sm pl-6">A. Yabanci Kaynaklar</TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-sm">
                  {formatCurrency(data.liabilities.totalLiabilities)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="text-sm pl-10 text-muted-foreground">
                  Ticari Borclar (Odenmemis Alis Faturalari)
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {formatCurrency(data.liabilities.totalPayables)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/30">
                <TableCell className="font-semibold text-sm pl-6">B. Ozkaynaklar</TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-sm">
                  {formatCurrency(data.equity.totalEquity)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="text-sm pl-10 text-muted-foreground">
                  Gecmis Yillar Kar/Zarar
                </TableCell>
                <TableCell className={`text-right tabular-nums text-sm ${data.equity.retainedEarnings >= 0 ? "" : "text-destructive"}`}>
                  {formatCurrency(data.equity.retainedEarnings)}
                </TableCell>
              </TableRow>

              <TableRow className="border-t-2 bg-amber/10">
                <TableCell className="font-bold text-sm pl-6">TOPLAM KAYNAKLAR</TableCell>
                <TableCell className="text-right font-bold tabular-nums">
                  {formatCurrency(data.liabilities.totalLiabilities + data.equity.totalEquity)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Accounting Equation */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
            <div className="flex flex-col items-center">
              <p className="text-xs text-muted-foreground mb-1">Varliklar</p>
              <p className="text-lg font-bold text-success">{formatCurrency(data.assets.totalAssets)}</p>
            </div>
            <span className="text-xl font-bold text-muted-foreground">=</span>
            <div className="flex flex-col items-center">
              <p className="text-xs text-muted-foreground mb-1">Yukumlulukler</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(data.liabilities.totalLiabilities)}</p>
            </div>
            <span className="text-xl font-bold text-muted-foreground">+</span>
            <div className="flex flex-col items-center">
              <p className="text-xs text-muted-foreground mb-1">Ozkaynaklar</p>
              <p className="text-lg font-bold text-amber">{formatCurrency(data.equity.totalEquity)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
