"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { getProfitLossReport, getMonthlyTrend } from "@/lib/actions/reports";

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

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export default function ReportsPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<ReportData | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);

  useEffect(() => {
    if (!organization?.id || authLoading) return;

    async function load() {
      setLoading(true);
      try {
        const [reportData, monthlyData] = await Promise.all([
          getProfitLossReport(organization!.id, year),
          getMonthlyTrend(organization!.id, year),
        ]);
        setReport(reportData);
        setMonthly(monthlyData);
      } catch (err) {
        console.error("Report load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [organization?.id, authLoading, year]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const data = report || { totalIncome: 0, totalExpense: 0, netProfit: 0, incomeByCategory: [], expenseByCategory: [] };
  const maxMonthly = Math.max(...monthly.map((m) => Math.max(m.income, m.expense, 1)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Raporlar</h1>
          <p className="text-sm text-muted-foreground mt-1">Finansal analiz ve raporlar</p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Aylik Gelir/Gider Trendi — {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monthly.map((m) => (
              <div key={m.month} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground w-8">{m.month}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-success">{formatCurrency(m.income)}</span>
                    <span className="text-destructive">{formatCurrency(m.expense)}</span>
                    <span className={`font-semibold ${m.net >= 0 ? "text-success" : "text-destructive"}`}>
                      {m.net >= 0 ? "+" : ""}{formatCurrency(m.net)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 h-3">
                  <div
                    className="bg-success/60 rounded-sm transition-all duration-500"
                    style={{ width: `${(m.income / maxMonthly) * 100}%` }}
                  />
                  <div
                    className="bg-destructive/40 rounded-sm transition-all duration-500"
                    style={{ width: `${(m.expense / maxMonthly) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-success/60" />
              <span className="text-xs text-muted-foreground">Gelir</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-destructive/40" />
              <span className="text-xs text-muted-foreground">Gider</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-success" />
              Gelir Dagilimi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.incomeByCategory.length > 0 ? (
              <div className="space-y-3">
                {data.incomeByCategory.map((cat) => {
                  const pct = data.totalIncome > 0 ? (cat.total / data.totalIncome) * 100 : 0;
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </span>
                        <span className="font-medium tabular-nums">{formatCurrency(cat.total)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">Henuz gelir kaydı yok</p>
            )}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
              Gider Dagilimi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.expenseByCategory.length > 0 ? (
              <div className="space-y-3">
                {data.expenseByCategory.map((cat) => {
                  const pct = data.totalExpense > 0 ? (cat.total / data.totalExpense) * 100 : 0;
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </span>
                        <span className="font-medium tabular-nums">{formatCurrency(cat.total)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">Henuz gider kaydı yok</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
