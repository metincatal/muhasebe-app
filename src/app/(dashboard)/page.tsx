"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ScanLine,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Info,
  XCircle,
  Receipt,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { getDashboardSummary, getTransactions } from "@/lib/actions/transactions";
import { getDashboardAlerts, type DashboardAlert } from "@/lib/actions/tax";

interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  pendingInvoices: number;
  monthlyData: { month: string; income: number; expense: number }[];
}

interface Transaction {
  id: string;
  type: string;
  description: string;
  counterparty: string | null;
  amount: number;
  date: string;
  categories: { name: string; color: string; icon: string } | null;
}

export default function DashboardPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const { canWrite } = usePermissions();
  const [summary, setSummary] = useState<DashboardData | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id || authLoading) return;

    async function load() {
      setLoading(true);
      try {
        // Doviz kurlarini arka planda DB'ye upsert et
        fetch("/api/exchange-rates").catch(() => {});

        const [summaryData, txData, alertData] = await Promise.all([
          getDashboardSummary(organization!.id),
          getTransactions(organization!.id, { limit: 5 }),
          getDashboardAlerts(organization!.id),
        ]);
        setSummary(summaryData);
        setRecentTx(txData as Transaction[]);
        setAlerts(alertData);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [organization?.id, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const data = summary || {
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    pendingInvoices: 0,
    monthlyData: [],
  };

  return (
    <div className="space-y-6">
      {/* Page Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Genel Bakis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" })} finansal ozeti
          </p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" render={<Link href="/receipts/scan" />}>
              <ScanLine className="mr-1.5 h-4 w-4" />
              Fis Tara
            </Button>
            <Button size="sm" render={<Link href="/transactions/new" />}>
              <Plus className="mr-1.5 h-4 w-4" />
              Yeni Islem
            </Button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const bgClass =
              alert.severity === "error"
                ? "bg-destructive/5 border-destructive/30 text-destructive"
                : alert.severity === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800/30 dark:text-amber-400"
                : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800/30 dark:text-blue-400";
            const Icon =
              alert.severity === "error"
                ? XCircle
                : alert.severity === "warning"
                ? AlertTriangle
                : Info;
            return (
              <div key={alert.type} className={`flex items-start gap-3 p-3 rounded-xl border ${bgClass}`}>
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs opacity-80 mt-0.5">{alert.description}</p>
                </div>
                {alert.href && (
                  <Link href={alert.href} className="text-xs font-medium underline underline-offset-2 shrink-0 opacity-80 hover:opacity-100">
                    Incele
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Toplam Gelir
              </p>
              <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-4.5 w-4.5 text-success" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 tracking-tight">
              {formatCurrency(data.totalIncome)}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-success/40 to-success/10" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Toplam Gider
              </p>
              <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-4.5 w-4.5 text-destructive" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 tracking-tight">
              {formatCurrency(data.totalExpense)}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/40 to-destructive/10" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Net Kar
              </p>
              <div className="h-9 w-9 rounded-xl bg-amber/10 flex items-center justify-center">
                <Wallet className="h-4.5 w-4.5 text-amber" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 tracking-tight">
              {formatCurrency(data.netProfit)}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber/40 to-amber/10" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Bekleyen Faturalar
              </p>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-4.5 w-4.5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 tracking-tight">
              {data.pendingInvoices}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-primary/10" />
        </Card>
      </div>

      {/* Charts + Recent Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Monthly Overview Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Aylik Gelir/Gider
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {data.monthlyData.length > 0 ? (
              <div className="space-y-4">
                {data.monthlyData.map((m) => {
                  const maxVal = Math.max(
                    ...data.monthlyData.map((d) =>
                      Math.max(d.income, d.expense, 1)
                    )
                  );
                  return (
                    <div key={m.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-muted-foreground w-8">
                          {m.month}
                        </span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-success">
                            {formatCurrency(m.income)}
                          </span>
                          <span className="text-destructive">
                            {formatCurrency(m.expense)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 h-3">
                        <div
                          className="bg-success/70 rounded-sm transition-all duration-500"
                          style={{
                            width: `${(m.income / maxVal) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-destructive/50 rounded-sm transition-all duration-500"
                          style={{
                            width: `${(m.expense / maxVal) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Henuz islem yok
              </p>
            )}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-success/70" />
                <span className="text-xs text-muted-foreground">Gelir</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-destructive/50" />
                <span className="text-xs text-muted-foreground">Gider</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Son Islemler
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" render={<Link href="/transactions" />}>
                Tumu
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentTx.length > 0 ? (
              <div className="space-y-1">
                {recentTx.map((tx) => {
                  const catColor = tx.categories?.color || "#6b7280";
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${catColor}15` }}
                      >
                        {tx.type === "income" ? (
                          <ArrowUpRight className="h-4 w-4" style={{ color: catColor }} />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" style={{ color: catColor }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tx.description}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.counterparty || tx.categories?.name || ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-semibold tabular-nums ${
                            tx.type === "income" ? "text-success" : "text-foreground"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </p>
                        <p className="text-[0.65rem] text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Henuz islem yok. Ilk isleminizi ekleyin!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      {canWrite ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Fis Tara", icon: ScanLine, href: "/receipts/scan", desc: "Fisinizi fotograflayin" },
            { label: "Yeni Islem", icon: Plus, href: "/transactions/new", desc: "Gelir veya gider ekleyin" },
            { label: "Fatura Olustur", icon: FileText, href: "/invoices/new", desc: "Satis faturasi kesin" },
            { label: "Raporlar", icon: TrendingUp, href: "/reports", desc: "Finansal analizler" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/50 hover:border-border transition-all duration-200 text-center"
            >
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-amber/10 transition-colors">
                <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-amber transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[0.65rem] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Islemler", icon: ArrowUpRight, href: "/transactions", desc: "Gelir ve giderleri goruntule" },
            { label: "Faturalar", icon: FileText, href: "/invoices", desc: "Faturalari incele" },
            { label: "Fisler", icon: Receipt, href: "/receipts", desc: "Taranmis fisleri goruntule" },
            { label: "Raporlar", icon: TrendingUp, href: "/reports", desc: "Finansal analizler" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/50 hover:border-border transition-all duration-200 text-center"
            >
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-amber/10 transition-colors">
                <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-amber transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[0.65rem] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
