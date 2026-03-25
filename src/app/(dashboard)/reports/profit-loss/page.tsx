"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { getProfitLossReport } from "@/lib/actions/reports";
import { exportToExcel, exportToPDF, fmtNum } from "@/lib/utils/export";

interface CategoryBreakdown {
  name: string;
  color: string;
  total: number;
}

interface ReportData {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeByCategory: CategoryBreakdown[];
  expenseByCategory: CategoryBreakdown[];
}

const monthNames = [
  "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
  "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik",
];

export default function ProfitLossPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [report, setReport] = useState<ReportData | null>(null);

  useEffect(() => {
    if (!organization?.id || authLoading) return;

    async function load() {
      setLoading(true);
      try {
        const data = await getProfitLossReport(organization!.id, year, month);
        setReport(data);
      } catch (err) {
        console.error("P&L load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [organization?.id, authLoading, year, month]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const data = report || {
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    incomeByCategory: [],
    expenseByCategory: [],
  };

  const profitMargin = data.totalIncome > 0 ? (data.netProfit / data.totalIncome) * 100 : 0;

  const periodLabel = month !== undefined ? `${monthNames[month]} ${year}` : `${year}`;

  function handleExport(type: "excel" | "pdf") {
    const headers = ["Kalem", "Tutar (TRY)"];
    const rows: (string | number)[][] = [
      ["A. GELIRLER", fmtNum(data.totalIncome)],
      ...data.incomeByCategory.map((c) => [`  ${c.name}`, fmtNum(c.total)]),
      ["B. GIDERLER", fmtNum(data.totalExpense)],
      ...data.expenseByCategory.map((c) => [`  ${c.name}`, fmtNum(c.total)]),
      ["", ""],
      ["NET KAR / ZARAR", fmtNum(data.netProfit)],
    ];
    const opts = {
      fileName: `kar-zarar-${year}${month !== undefined ? `-${month + 1}` : ""}`,
      title: "Kar-Zarar Raporu",
      subtitle: `Donem: ${periodLabel}`,
    };
    type === "excel" ? exportToExcel(headers, rows, opts) : exportToPDF(headers, rows, opts);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kar-Zarar Raporu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detayli gelir ve gider analizi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExport("excel")} title="Excel">
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("pdf")} title="PDF">
            <FileText className="h-4 w-4" />
          </Button>
          <Select
            value={month !== undefined ? month.toString() : "all"}
            onValueChange={(v) => setMonth(v === "all" ? undefined : parseInt(v ?? "0"))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tum Yil</SelectItem>
              {monthNames.map((name, i) => (
                <SelectItem key={i} value={i.toString()}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v ?? year.toString()))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Toplam Gelir</p>
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <p className="text-2xl font-bold mt-2 text-success">{formatCurrency(data.totalIncome)}</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-success/40 to-success/10" />
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Toplam Gider</p>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-2xl font-bold mt-2 text-destructive">{formatCurrency(data.totalExpense)}</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/40 to-destructive/10" />
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Net Kar/Zarar</p>
              <Wallet className="h-5 w-5 text-amber" />
            </div>
            <p className={`text-2xl font-bold mt-2 ${data.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
              {data.netProfit >= 0 ? "+" : ""}{formatCurrency(data.netProfit)}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber/40 to-amber/10" />
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Kar Marji</p>
              <Badge variant="secondary" className={`text-xs ${profitMargin >= 0 ? "text-success" : "text-destructive"}`}>
                %{profitMargin.toFixed(1)}
              </Badge>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${profitMargin >= 0 ? "bg-success" : "bg-destructive"}`}
                style={{ width: `${Math.min(Math.abs(profitMargin), 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-success" />
              Gelirler — {formatCurrency(data.totalIncome)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {data.incomeByCategory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead className="text-right w-20">Oran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.incomeByCategory.map((cat) => {
                    const pct = data.totalIncome > 0 ? (cat.total / data.totalIncome) * 100 : 0;
                    return (
                      <TableRow key={cat.name}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm font-medium">{cat.name}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-sm">
                          {formatCurrency(cat.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-xs tabular-nums">
                            %{pct.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Bu donemde gelir kaydı yok
              </p>
            )}
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
              Giderler — {formatCurrency(data.totalExpense)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.expenseByCategory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead className="text-right w-20">Oran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.expenseByCategory.map((cat) => {
                    const pct = data.totalExpense > 0 ? (cat.total / data.totalExpense) * 100 : 0;
                    return (
                      <TableRow key={cat.name}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm font-medium">{cat.name}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-sm">
                          {formatCurrency(cat.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-xs tabular-nums">
                            %{pct.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Bu donemde gider kaydı yok
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* P&L Statement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Kar-Zarar Tablosu — {month !== undefined ? `${monthNames[month]} ${year}` : year}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              <TableRow className="bg-success/5">
                <TableCell className="font-semibold text-sm">A. GELIRLER</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-success">
                  {formatCurrency(data.totalIncome)}
                </TableCell>
              </TableRow>
              {data.incomeByCategory.map((cat) => (
                <TableRow key={`inc-${cat.name}`}>
                  <TableCell className="text-sm pl-8 text-muted-foreground">{cat.name}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatCurrency(cat.total)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-destructive/5">
                <TableCell className="font-semibold text-sm">B. GIDERLER</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-destructive">
                  ({formatCurrency(data.totalExpense)})
                </TableCell>
              </TableRow>
              {data.expenseByCategory.map((cat) => (
                <TableRow key={`exp-${cat.name}`}>
                  <TableCell className="text-sm pl-8 text-muted-foreground">{cat.name}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">({formatCurrency(cat.total)})</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2">
                <TableCell className="font-bold">NET KAR / ZARAR (A - B)</TableCell>
                <TableCell className={`text-right font-bold text-lg tabular-nums ${data.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {data.netProfit >= 0 ? "" : "("}{formatCurrency(Math.abs(data.netProfit))}{data.netProfit < 0 ? ")" : ""}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
