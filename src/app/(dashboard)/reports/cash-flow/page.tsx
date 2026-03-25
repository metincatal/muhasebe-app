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
  Wallet,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Activity,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { getCashFlowReport } from "@/lib/actions/reports";
import { exportToExcel, exportToPDF, fmtNum } from "@/lib/utils/export";

interface CashFlowMonth {
  month: string;
  monthShort: string;
  inflows: number;
  outflows: number;
  netFlow: number;
  runningBalance: number;
  transactionCount: number;
}

export default function CashFlowPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<CashFlowMonth[]>([]);

  useEffect(() => {
    if (!organization?.id || authLoading) return;

    async function load() {
      setLoading(true);
      try {
        const result = await getCashFlowReport(organization!.id, year);
        setData(result);
      } catch (err) {
        console.error("Cash flow error:", err);
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

  const totalInflows = data.reduce((sum, m) => sum + m.inflows, 0);
  const totalOutflows = data.reduce((sum, m) => sum + m.outflows, 0);
  const totalNetFlow = totalInflows - totalOutflows;
  const totalTransactions = data.reduce((sum, m) => sum + m.transactionCount, 0);
  const maxValue = Math.max(...data.map((m) => Math.max(m.inflows, m.outflows, 1)));

  function handleExport(type: "excel" | "pdf") {
    const headers = ["Ay", "Nakit Giris", "Nakit Cikis", "Net Akis", "Kumulatif", "Islem"];
    const rows: (string | number)[][] = [
      ...data.map((m) => [
        m.month,
        fmtNum(m.inflows),
        fmtNum(m.outflows),
        fmtNum(m.netFlow),
        fmtNum(m.runningBalance),
        m.transactionCount,
      ]),
      ["TOPLAM", fmtNum(totalInflows), fmtNum(totalOutflows), fmtNum(totalNetFlow), "", totalTransactions],
    ];
    const opts = {
      fileName: `nakit-akis-${year}`,
      title: "Nakit Akis Raporu",
      subtitle: `Yil: ${year}`,
    };
    type === "excel" ? exportToExcel(headers, rows, opts) : exportToPDF(headers, rows, opts);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nakit Akis Raporu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aylik nakit giris-cikis hareketleri
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExport("excel")} title="Excel">
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("pdf")} title="PDF">
            <FileText className="h-4 w-4" />
          </Button>
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
              <p className="text-sm font-medium text-muted-foreground">Nakit Giris</p>
              <ArrowUpRight className="h-5 w-5 text-success" />
            </div>
            <p className="text-2xl font-bold mt-2 text-success">{formatCurrency(totalInflows)}</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-success/40 to-success/10" />
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Nakit Cikis</p>
              <ArrowDownRight className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-2xl font-bold mt-2 text-destructive">{formatCurrency(totalOutflows)}</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/40 to-destructive/10" />
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Net Nakit Akis</p>
              <Wallet className="h-5 w-5 text-amber" />
            </div>
            <p className={`text-2xl font-bold mt-2 ${totalNetFlow >= 0 ? "text-success" : "text-destructive"}`}>
              {totalNetFlow >= 0 ? "+" : ""}{formatCurrency(totalNetFlow)}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber/40 to-amber/10" />
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Islem Sayisi</p>
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-2">{totalTransactions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Visual */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Aylik Nakit Akisi — {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.map((m) => (
              <div key={m.month} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground w-16">{m.monthShort}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-success tabular-nums">+{formatCurrency(m.inflows)}</span>
                    <span className="text-destructive tabular-nums">-{formatCurrency(m.outflows)}</span>
                    <span className={`font-semibold tabular-nums ${m.netFlow >= 0 ? "text-success" : "text-destructive"}`}>
                      {m.netFlow >= 0 ? "+" : ""}{formatCurrency(m.netFlow)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 h-3">
                  <div
                    className="bg-success/60 rounded-sm transition-all duration-500"
                    style={{ width: `${(m.inflows / maxValue) * 100}%` }}
                  />
                  <div
                    className="bg-destructive/40 rounded-sm transition-all duration-500"
                    style={{ width: `${(m.outflows / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-success/60" />
              <span className="text-xs text-muted-foreground">Nakit Giris</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-destructive/40" />
              <span className="text-xs text-muted-foreground">Nakit Cikis</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aylik Detay Tablosu</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ay</TableHead>
                <TableHead className="text-right">Nakit Giris</TableHead>
                <TableHead className="text-right">Nakit Cikis</TableHead>
                <TableHead className="text-right">Net Akis</TableHead>
                <TableHead className="text-right">Kumulatif</TableHead>
                <TableHead className="text-right">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-medium text-sm">{m.month}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-success">
                    {m.inflows > 0 ? formatCurrency(m.inflows) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-destructive">
                    {m.outflows > 0 ? formatCurrency(m.outflows) : "—"}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums text-sm font-medium ${m.netFlow >= 0 ? "text-success" : "text-destructive"}`}>
                    {m.netFlow !== 0 ? (
                      <>
                        {m.netFlow >= 0 ? "+" : ""}{formatCurrency(m.netFlow)}
                      </>
                    ) : "—"}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums text-sm ${m.runningBalance >= 0 ? "" : "text-destructive"}`}>
                    {formatCurrency(m.runningBalance)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {m.transactionCount > 0 ? m.transactionCount : "—"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell>TOPLAM</TableCell>
                <TableCell className="text-right tabular-nums text-success">
                  {formatCurrency(totalInflows)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {formatCurrency(totalOutflows)}
                </TableCell>
                <TableCell className={`text-right tabular-nums ${totalNetFlow >= 0 ? "text-success" : "text-destructive"}`}>
                  {totalNetFlow >= 0 ? "+" : ""}{formatCurrency(totalNetFlow)}
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right text-muted-foreground">{totalTransactions}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
