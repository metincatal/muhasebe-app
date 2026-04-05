"use client";

import { useState, useEffect, useCallback } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Receipt,
  Download,
  Loader2,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { getVATSummary } from "@/lib/actions/tax";

type VATSummary = Awaited<ReturnType<typeof getVATSummary>>;

const MONTHS = [
  "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
  "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik",
];

function getYearOptions() {
  const now = new Date().getFullYear();
  return [now - 1, now, now + 1];
}

export default function TaxPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [summary, setSummary] = useState<VATSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const data = await getVATSummary(organization.id, year, month);
    setSummary(data);
    setLoading(false);
  }, [organization?.id, year, month]);

  useEffect(() => {
    if (!authLoading) load();
  }, [load, authLoading]);

  function handleExportCSV() {
    if (!summary) return;

    const rows = [
      ["KDV Ozeti", `${MONTHS[summary.period.month - 1]} ${summary.period.year}`],
      [],
      ["Kalem", "Tutar (TRY)"],
      ["Satis Matrahi (KDV Haric)", summary.salesSubtotal.toFixed(2)],
      ["Tahsil Edilen KDV (%20)", summary.collectedVAT.toFixed(2)],
      [],
      ["Alis Matrahi (KDV Haric)", summary.purchaseSubtotal.toFixed(2)],
      ["Odenen KDV (Indirilecek)", summary.paidVAT.toFixed(2)],
      [],
      ["Net KDV Borcu", summary.netVAT.toFixed(2)],
      [],
      ["Beyan Son Tarihi", summary.declarationDate],
    ];

    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kdv-${summary.period.year}-${String(summary.period.month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isUrgent = summary && summary.daysUntilDeclaration >= 0 && summary.daysUntilDeclaration <= 7;
  const isPast = summary && summary.daysUntilDeclaration < 0;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">KDV Takvimi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Donem bazinda KDV hesabi ve beyan takvimi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v ?? month))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v ?? year))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getYearOptions().map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV} disabled={!summary || loading}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Beyan Tarihi Banner */}
      {summary && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          isPast
            ? "bg-muted/50 border-border text-muted-foreground"
            : isUrgent
            ? "bg-destructive/5 border-destructive/30 text-destructive"
            : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800/30 dark:text-amber-400"
        }`}>
          {isPast ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <CalendarClock className="h-5 w-5 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-medium text-sm">
              {isPast
                ? `${MONTHS[month - 1]} ${year} donemi beyan suresi doldu`
                : `${MONTHS[month - 1]} ${year} KDV beyan son tarihi: ${new Date(summary.declarationDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}`}
            </p>
            {!isPast && (
              <p className="text-xs mt-0.5 opacity-80">
                {summary.daysUntilDeclaration === 0
                  ? "Son gun bugun!"
                  : `${summary.daysUntilDeclaration} gun kaldi`}
              </p>
            )}
          </div>
          {isUrgent && !isPast && (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : summary ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Tahsil Edilen KDV</p>
                  <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                </div>
                <p className="text-2xl font-bold mt-2 tracking-tight">
                  {formatCurrency(summary.collectedVAT)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.salesInvoiceCount} satis faturasi
                </p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-success/40 to-success/10" />
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Indirilecek KDV</p>
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <TrendingDown className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold mt-2 tracking-tight">
                  {formatCurrency(summary.paidVAT)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.purchaseInvoiceCount} alis faturasi
                </p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/40 to-blue-500/10" />
            </Card>

            <Card className={`relative overflow-hidden ${summary.netVAT > 0 ? "border-destructive/30" : "border-success/30"}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {summary.netVAT >= 0 ? "Odenecek KDV" : "KDV Alacagi"}
                  </p>
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                    summary.netVAT > 0 ? "bg-destructive/10" : "bg-success/10"
                  }`}>
                    <Receipt className={`h-4 w-4 ${summary.netVAT > 0 ? "text-destructive" : "text-success"}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold mt-2 tracking-tight ${
                  summary.netVAT > 0 ? "text-destructive" : "text-success"
                }`}>
                  {formatCurrency(Math.abs(summary.netVAT))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tahsil edilen − indirilecek
                </p>
              </CardContent>
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${
                summary.netVAT > 0 ? "from-destructive/40 to-destructive/10" : "from-success/40 to-success/10"
              }`} />
            </Card>
          </div>

          {/* Detail Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Beyanname Ozeti — {MONTHS[month - 1]} {year}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kalem</TableHead>
                    <TableHead className="text-right">Matrah (TRY)</TableHead>
                    <TableHead className="text-right">KDV Tutari (TRY)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-success" />
                        Hesaplanan KDV (Satislar)
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(summary.salesSubtotal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-success font-medium">
                      {formatCurrency(summary.collectedVAT)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Indirilecek KDV (Alislar)
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(summary.purchaseSubtotal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-blue-500 font-medium">
                      {formatCurrency(summary.paidVAT)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>
                      {summary.netVAT >= 0 ? "Odenecek KDV (Net)" : "Sonraki Doneme Devreden KDV"}
                    </TableCell>
                    <TableCell />
                    <TableCell className={`text-right tabular-nums ${
                      summary.netVAT > 0 ? "text-destructive" : "text-success"
                    }`}>
                      {formatCurrency(Math.abs(summary.netVAT))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
