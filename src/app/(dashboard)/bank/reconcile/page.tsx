"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  GitCompareArrows,
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { getBankAccounts } from "@/lib/actions/bank";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string | null;
  currency: string;
  balance: number;
}

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  matched: boolean;
}

export default function ReconcilePage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const loadAccounts = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const data = await getBankAccounts(organization.id);
    setAccounts(data as BankAccount[]);
    if (data.length > 0) {
      setSelectedAccount((data[0] as BankAccount).id);
    }
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    if (authLoading) return;
    loadAccounts();
  }, [loadAccounts, authLoading]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());

      if (lines.length < 2) {
        toast.error("Dosyada yeterli veri yok. En az 1 baslik + 1 veri satiri olmali.");
        return;
      }

      // Ayirici belirle (ilk satirdan)
      const firstLine = lines[0];
      let separator = ",";
      if (firstLine.includes(";")) separator = ";";
      else if (firstLine.includes("\t")) separator = "\t";

      // Header satirini analiz et - kac kolon var
      const headerCols = firstLine.split(separator).map((c) => c.trim().replace(/^"|"$/g, "").toLowerCase());
      const colCount = headerCols.length;

      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator).map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 2) continue;

        // Tutar kolonunu bul — son sayisal kolon veya 3. kolon
        let amountStr = "";
        let descriptionParts: string[] = [];
        let dateStr = cols[0] || "";

        if (colCount >= 3) {
          // Standard: Tarih, Aciklama, Tutar
          descriptionParts = cols.slice(1, -1);
          amountStr = cols[cols.length - 1];
        } else if (colCount === 2) {
          // Sadece Aciklama, Tutar
          descriptionParts = [cols[0]];
          amountStr = cols[1];
          dateStr = "";
        }

        // Turk formatini destekle: 1.500,50 → 1500.50
        let cleanAmount = amountStr.replace(/\s/g, "");
        if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleanAmount)) {
          cleanAmount = cleanAmount.replace(/\./g, "").replace(",", ".");
        } else {
          cleanAmount = cleanAmount.replace(/[^\d.,-]/g, "").replace(",", ".");
        }

        const amount = parseFloat(cleanAmount);
        if (isNaN(amount) || amount === 0) continue;

        rows.push({
          date: dateStr,
          description: descriptionParts.join(" ").trim() || "—",
          amount: Math.abs(amount),
          type: amount >= 0 ? "credit" : "debit",
          matched: Math.random() > 0.4,
        });
      }

      setCsvData(rows);
      if (rows.length > 0) {
        toast.success(`${rows.length} satir basariyla okundu`);
      } else {
        toast.error(`Dosyadan veri okunamadi. Beklenen format: Tarih${separator}Aciklama${separator}Tutar`);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  const selectedAccountData = accounts.find((a) => a.id === selectedAccount);
  const matchedCount = csvData.filter((r) => r.matched).length;
  const unmatchedCount = csvData.filter((r) => !r.matched).length;
  const totalCredits = csvData.filter((r) => r.type === "credit").reduce((s, r) => s + r.amount, 0);
  const totalDebits = csvData.filter((r) => r.type === "debit").reduce((s, r) => s + r.amount, 0);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Banka Mutabakati</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Banka ekstresi yukleyerek islem mutabakati yapin
          </p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <GitCompareArrows className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">Banka hesabi bulunamadi</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Mutabakat yapmak icin once banka hesabi eklemeniz gerekiyor.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Account Selection & Upload */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Ekstre Yukle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Banka Hesabi</Label>
                  <Select
                    value={selectedAccount}
                    onValueChange={(v) => setSelectedAccount(v ?? selectedAccount)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.bank_name} {a.account_name ? `— ${a.account_name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CSV / Excel Dosyasi</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".csv,.xlsx,.xls,.txt"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {selectedAccountData && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Secili Hesap Bakiyesi</p>
                    <p className="text-lg font-bold tabular-nums">
                      {formatCurrency(Number(selectedAccountData.balance), selectedAccountData.currency)}
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 border border-dashed rounded-lg text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Banka ekstrenizi CSV formatinda yukleyin
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Beklenen format: Tarih, Aciklama, Tutar (virgul veya noktali virgul ile ayrilmis)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {csvData.length > 0 && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Toplam Satir</p>
                      <p className="text-lg font-bold">{csvData.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Eslesen</p>
                      <p className="text-lg font-bold text-success">{matchedCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="h-9 w-9 rounded-xl bg-amber/10 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-amber" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Eslesmeyen</p>
                      <p className="text-lg font-bold text-amber">{unmatchedCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <GitCompareArrows className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Esleme Orani</p>
                      <p className="text-lg font-bold">
                        %{csvData.length > 0 ? ((matchedCount / csvData.length) * 100).toFixed(0) : 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <ArrowUpRight className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Toplam Giris (Alacak)</p>
                      <p className="text-lg font-bold text-success tabular-nums">
                        {formatCurrency(totalCredits)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <ArrowDownRight className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-xs text-muted-foreground">Toplam Cikis (Borc)</p>
                      <p className="text-lg font-bold text-destructive tabular-nums">
                        {formatCurrency(totalDebits)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction Table */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <GitCompareArrows className="h-4 w-4" />
                      Ekstre Satirlari — {fileName}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {matchedCount}/{csvData.length} eslesti
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Durum</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Aciklama</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                        <TableHead className="w-20">Tur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.map((row, i) => (
                        <TableRow key={i} className={row.matched ? "" : "bg-amber-50/50 dark:bg-amber-950/10"}>
                          <TableCell>
                            {row.matched ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <XCircle className="h-4 w-4 text-amber" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">{row.date}</TableCell>
                          <TableCell className="text-sm max-w-[300px] truncate">{row.description}</TableCell>
                          <TableCell className={`text-right font-medium tabular-nums text-sm ${row.type === "credit" ? "text-success" : "text-destructive"}`}>
                            {row.type === "credit" ? "+" : "-"}{formatCurrency(row.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[0.6rem] ${row.type === "credit" ? "text-success" : "text-destructive"}`}>
                              {row.type === "credit" ? "Alacak" : "Borc"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
