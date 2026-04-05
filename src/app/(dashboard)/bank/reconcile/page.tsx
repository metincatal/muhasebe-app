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
  Link2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import {
  getBankAccounts,
  importBankTransactions,
  getBankTransactionsForReconcile,
  findMatchingTransactions,
  confirmBankMatch,
  dismissBankTransaction,
} from "@/lib/actions/bank";
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
}

interface BankTx {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  type: "credit" | "debit" | null;
  is_matched: boolean;
  transaction_id: string | null;
  transactions: { id: string; description: string; date: string; amount: number; type: string } | null;
}

interface MatchSuggestion {
  bankTxId: string;
  candidates: { id: string; description: string; date: string; amount: number; counterparty: string | null }[];
}

type PageState = "upload" | "imported";

export default function ReconcilePage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pageState, setPageState] = useState<PageState>("upload");

  // Upload phase
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);

  // Imported phase
  const [bankTxs, setBankTxs] = useState<BankTx[]>([]);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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
    if (!authLoading) loadAccounts();
  }, [loadAccounts, authLoading]);

  async function loadBankTxs(accountId: string) {
    setLoadingTxs(true);
    const data = await getBankTransactionsForReconcile(accountId);
    setBankTxs(data as BankTx[]);
    setLoadingTxs(false);
    return data as BankTx[];
  }

  async function fetchSuggestions(txs: BankTx[]) {
    if (!organization?.id) return;
    const unmatched = txs.filter((t) => !t.is_matched);
    const results: MatchSuggestion[] = [];

    for (const tx of unmatched) {
      const candidates = await findMatchingTransactions(
        organization.id,
        tx.amount,
        tx.date,
        tx.type ?? "debit"
      );
      if (candidates.length > 0) {
        results.push({ bankTxId: tx.id, candidates });
      }
    }
    setSuggestions(results);
  }

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

      const firstLine = lines[0];
      let separator = ",";
      if (firstLine.includes(";")) separator = ";";
      else if (firstLine.includes("\t")) separator = "\t";

      const headerCols = firstLine.split(separator).map((c) => c.trim().replace(/^"|"$/g, "").toLowerCase());
      const colCount = headerCols.length;

      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator).map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 2) continue;

        let amountStr = "";
        let descriptionParts: string[] = [];
        let dateStr = cols[0] || "";

        if (colCount >= 3) {
          descriptionParts = cols.slice(1, -1);
          amountStr = cols[cols.length - 1];
        } else if (colCount === 2) {
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

        const rawAmount = parseFloat(cleanAmount);
        if (isNaN(rawAmount) || rawAmount === 0) continue;

        // Tarih normalize et (DD.MM.YYYY veya DD/MM/YYYY → YYYY-MM-DD)
        let normalizedDate = dateStr;
        const dateParts = dateStr.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
        if (dateParts) {
          normalizedDate = `${dateParts[3]}-${dateParts[2].padStart(2, "0")}-${dateParts[1].padStart(2, "0")}`;
        }

        rows.push({
          date: normalizedDate,
          description: descriptionParts.join(" ").trim() || "—",
          amount: Math.abs(rawAmount),
          type: rawAmount >= 0 ? "credit" : "debit",
        });
      }

      setCsvRows(rows);
      if (rows.length > 0) {
        toast.success(`${rows.length} satir okundu`);
      } else {
        toast.error(`Dosyadan veri okunamadi. Beklenen format: Tarih${separator}Aciklama${separator}Tutar`);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    if (!selectedAccount || csvRows.length === 0) return;
    setImporting(true);
    const result = await importBankTransactions(selectedAccount, csvRows);
    setImporting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(`${result.count} islem veritabanina aktarildi`);
    setPageState("imported");

    const txs = await loadBankTxs(selectedAccount);
    await fetchSuggestions(txs);
  }

  async function handleLoadExisting() {
    if (!selectedAccount) return;
    setPageState("imported");
    const txs = await loadBankTxs(selectedAccount);
    await fetchSuggestions(txs);
  }

  async function handleConfirm(bankTxId: string, transactionId: string) {
    setConfirmingId(bankTxId);
    const result = await confirmBankMatch(bankTxId, transactionId);
    setConfirmingId(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Esleme onaylandi");
    setBankTxs((prev) =>
      prev.map((t) =>
        t.id === bankTxId ? { ...t, is_matched: true, transaction_id: transactionId } : t
      )
    );
    setSuggestions((prev) => prev.filter((s) => s.bankTxId !== bankTxId));
  }

  async function handleDismiss(bankTxId: string) {
    setConfirmingId(bankTxId);
    const result = await dismissBankTransaction(bankTxId);
    setConfirmingId(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    setBankTxs((prev) =>
      prev.map((t) => (t.id === bankTxId ? { ...t, is_matched: true } : t))
    );
    setSuggestions((prev) => prev.filter((s) => s.bankTxId !== bankTxId));
  }

  const selectedAccountData = accounts.find((a) => a.id === selectedAccount);
  const unmatchedCount = bankTxs.filter((t) => !t.is_matched).length;
  const matchedCount = bankTxs.filter((t) => t.is_matched).length;
  const suggestionsMap = new Map(suggestions.map((s) => [s.bankTxId, s.candidates]));

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
        {pageState === "imported" && (
          <Button variant="outline" onClick={() => { setPageState("upload"); setCsvRows([]); setFileName(""); }}>
            <Upload className="h-4 w-4 mr-2" />
            Yeni Ekstre Yukle
          </Button>
        )}
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
      ) : pageState === "upload" ? (
        <>
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
                  <Label>CSV Dosyasi</Label>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
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
                  Desteklenen format: Tarih, Aciklama, Tutar
                </p>
              </div>

              {csvRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{csvRows.length} satir hazir — {fileName}</p>
                    <Button onClick={handleImport} disabled={importing}>
                      {importing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <GitCompareArrows className="h-4 w-4 mr-2" />
                      )}
                      Iceri Aktar ve Esle
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Aciklama</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                        <TableHead>Tur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvRows.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm tabular-nums">{row.date}</TableCell>
                          <TableCell className="text-sm max-w-[280px] truncate">{row.description}</TableCell>
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
                      {csvRows.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-2">
                            +{csvRows.length - 10} satir daha
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">Mevcut banka islemlerini goruntule</p>
                <p className="text-xs text-muted-foreground">Daha once aktarilan islemleri inceleyin</p>
              </div>
              <Button variant="outline" onClick={handleLoadExisting}>
                Islemleri Goster
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Islem</p>
                  <p className="text-lg font-bold">{bankTxs.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Eslesmis</p>
                  <p className="text-lg font-bold text-success">{matchedCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bekliyor</p>
                  <p className="text-lg font-bold text-amber-500">{unmatchedCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {loadingTxs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitCompareArrows className="h-4 w-4" />
                    Banka Islemleri
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {matchedCount}/{bankTxs.length} eslesti
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Durum</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Aciklama</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead>Eslesme</TableHead>
                      <TableHead className="w-32" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankTxs.map((tx) => {
                      const candidates = suggestionsMap.get(tx.id) ?? [];
                      const isConfirming = confirmingId === tx.id;

                      return (
                        <TableRow key={tx.id} className={tx.is_matched ? "" : "bg-amber-50/50 dark:bg-amber-950/10"}>
                          <TableCell>
                            {tx.is_matched ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : candidates.length > 0 ? (
                              <Link2 className="h-4 w-4 text-blue-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-amber-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">{tx.date}</TableCell>
                          <TableCell className="text-sm max-w-[220px] truncate">{tx.description ?? "—"}</TableCell>
                          <TableCell className={`text-right font-medium tabular-nums text-sm ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                            {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[160px]">
                            {tx.is_matched && tx.transactions ? (
                              <span className="text-success">{tx.transactions.description}</span>
                            ) : candidates.length > 0 ? (
                              <span className="text-blue-500">{candidates[0].description}</span>
                            ) : (
                              <span>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!tx.is_matched && (
                              <div className="flex items-center gap-1">
                                {candidates.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-success border-success/50 hover:bg-success/10"
                                    disabled={isConfirming}
                                    onClick={() => handleConfirm(tx.id, candidates[0].id)}
                                  >
                                    {isConfirming ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                    )}
                                    Onayla
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                  disabled={isConfirming}
                                  onClick={() => handleDismiss(tx.id)}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Atla
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
