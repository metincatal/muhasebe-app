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
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { getComparisonReport } from "@/lib/actions/reports";

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  year1Income: number;
  year1Expense: number;
  year2Income: number;
  year2Expense: number;
}

interface ComparisonData {
  year1: { year: number; totalIncome: number; totalExpense: number; netProfit: number };
  year2: { year: number; totalIncome: number; totalExpense: number; netProfit: number };
  categories: CategoryRow[];
  incomeDiff: number;
  expenseDiff: number;
  netDiff: number;
}

function pct(a: number, b: number): number | null {
  if (b === 0) return a === 0 ? 0 : null;
  return ((a - b) / b) * 100;
}

function DiffBadge({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  const positive = inverse ? value < 0 : value >= 0;
  const label = value === 0 ? "Degisim yok" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  return (
    <Badge
      variant="secondary"
      className={`text-xs tabular-nums ${positive ? "text-success" : "text-destructive"}`}
    >
      {value > 0 ? (
        <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
      ) : value < 0 ? (
        <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />
      ) : (
        <Minus className="h-2.5 w-2.5 mr-0.5" />
      )}
      {label}
    </Badge>
  );
}

const AVAILABLE_YEARS = [2022, 2023, 2024, 2025, 2026];

export default function ComparisonReportPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [year1, setYear1] = useState(currentYear - 1);
  const [year2, setYear2] = useState(currentYear);
  const [data, setData] = useState<ComparisonData | null>(null);

  useEffect(() => {
    if (!organization?.id || authLoading) return;

    async function load() {
      setLoading(true);
      try {
        const result = await getComparisonReport(organization!.id, year1, year2);
        setData(result);
      } catch (err) {
        console.error("Comparison report error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [organization?.id, authLoading, year1, year2]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const incomeChangePct = pct(data.year2.totalIncome, data.year1.totalIncome);
  const expenseChangePct = pct(data.year2.totalExpense, data.year1.totalExpense);
  const netChangePct = pct(data.year2.netProfit, data.year1.netProfit);

  const maxBar = Math.max(
    data.year1.totalIncome,
    data.year1.totalExpense,
    data.year2.totalIncome,
    data.year2.totalExpense,
    1
  );

  const incomeCategories = data.categories.filter(
    (c) => c.year1Income > 0 || c.year2Income > 0
  );
  const expenseCategories = data.categories.filter(
    (c) => c.year1Expense > 0 || c.year2Expense > 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cok Yilli Karsilastirma</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Iki yil arasi gelir, gider ve kar karsilastirmasi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={year1.toString()}
            onValueChange={(v) => setYear1(parseInt(v ?? year1.toString()))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_YEARS.filter((y) => y !== year2).map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground font-medium">vs</span>
          <Select
            value={year2.toString()}
            onValueChange={(v) => setYear2(parseInt(v ?? year2.toString()))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_YEARS.filter((y) => y !== year1).map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Income */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Toplam Gelir</p>
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{data.year1.year}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(data.year1.totalIncome)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{data.year2.year}</span>
                <span className="text-base font-bold text-success tabular-nums">
                  {formatCurrency(data.year2.totalIncome)}
                </span>
              </div>
            </div>
            <DiffBadge value={incomeChangePct} />
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-success/40 to-success/10" />
        </Card>

        {/* Expense */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Toplam Gider</p>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{data.year1.year}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(data.year1.totalExpense)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{data.year2.year}</span>
                <span className="text-base font-bold text-destructive tabular-nums">
                  {formatCurrency(data.year2.totalExpense)}
                </span>
              </div>
            </div>
            <DiffBadge value={expenseChangePct} inverse />
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/40 to-destructive/10" />
        </Card>

        {/* Net */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Net Kar/Zarar</p>
              <Wallet className="h-5 w-5 text-amber" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{data.year1.year}</span>
                <span
                  className={`text-sm font-semibold tabular-nums ${data.year1.netProfit >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {data.year1.netProfit >= 0 ? "+" : ""}
                  {formatCurrency(data.year1.netProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{data.year2.year}</span>
                <span
                  className={`text-base font-bold tabular-nums ${data.year2.netProfit >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {data.year2.netProfit >= 0 ? "+" : ""}
                  {formatCurrency(data.year2.netProfit)}
                </span>
              </div>
            </div>
            <DiffBadge value={netChangePct} />
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber/40 to-amber/10" />
        </Card>
      </div>

      {/* Visual Bar Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Görsel Karsilastirma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {(
            [
              { label: "Gelir", y1: data.year1.totalIncome, y2: data.year2.totalIncome, color1: "bg-success/40", color2: "bg-success" },
              { label: "Gider", y1: data.year1.totalExpense, y2: data.year2.totalExpense, color1: "bg-destructive/40", color2: "bg-destructive" },
            ] as const
          ).map((row) => (
            <div key={row.label} className="space-y-2">
              <p className="text-sm font-medium">{row.label}</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-10 shrink-0">{data.year1.year}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${row.color1}`}
                      style={{ width: `${(row.y1 / maxBar) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums w-28 text-right shrink-0">
                    {formatCurrency(row.y1)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-10 shrink-0">{data.year2.year}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${row.color2}`}
                      style={{ width: `${(row.y2 / maxBar) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums w-28 text-right shrink-0">
                    {formatCurrency(row.y2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Category Breakdown — Expenses */}
      {expenseCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
              Gider Kategorileri — {data.year1.year} vs {data.year2.year}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">{data.year1.year}</TableHead>
                  <TableHead className="text-right">{data.year2.year}</TableHead>
                  <TableHead className="text-right">Fark</TableHead>
                  <TableHead className="text-right w-24">Degisim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseCategories.map((cat) => {
                  const diff = cat.year2Expense - cat.year1Expense;
                  const changePct = pct(cat.year2Expense, cat.year1Expense);
                  return (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-sm font-medium">{cat.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(cat.year1Expense)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium">
                        {formatCurrency(cat.year2Expense)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm tabular-nums font-medium ${diff >= 0 ? "text-destructive" : "text-success"}`}
                      >
                        {diff >= 0 ? "+" : ""}
                        {formatCurrency(diff)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DiffBadge value={changePct} inverse />
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 bg-muted/30">
                  <TableCell className="font-semibold text-sm">Toplam</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(data.year1.totalExpense)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(data.year2.totalExpense)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${data.expenseDiff >= 0 ? "text-destructive" : "text-success"}`}
                  >
                    {data.expenseDiff >= 0 ? "+" : ""}
                    {formatCurrency(data.expenseDiff)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DiffBadge value={expenseChangePct} inverse />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown — Income */}
      {incomeCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-success" />
              Gelir Kategorileri — {data.year1.year} vs {data.year2.year}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">{data.year1.year}</TableHead>
                  <TableHead className="text-right">{data.year2.year}</TableHead>
                  <TableHead className="text-right">Fark</TableHead>
                  <TableHead className="text-right w-24">Degisim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeCategories.map((cat) => {
                  const diff = cat.year2Income - cat.year1Income;
                  const changePct = pct(cat.year2Income, cat.year1Income);
                  return (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-sm font-medium">{cat.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(cat.year1Income)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium">
                        {formatCurrency(cat.year2Income)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm tabular-nums font-medium ${diff >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {diff >= 0 ? "+" : ""}
                        {formatCurrency(diff)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DiffBadge value={changePct} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 bg-muted/30">
                  <TableCell className="font-semibold text-sm">Toplam</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(data.year1.totalIncome)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(data.year2.totalIncome)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${data.incomeDiff >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {data.incomeDiff >= 0 ? "+" : ""}
                    {formatCurrency(data.incomeDiff)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DiffBadge value={incomeChangePct} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {incomeCategories.length === 0 && expenseCategories.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              {data.year1.year} ve {data.year2.year} yillari icin islem bulunamadi.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
