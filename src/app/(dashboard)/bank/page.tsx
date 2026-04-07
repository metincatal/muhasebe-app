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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Landmark,
  MoreHorizontal,
  Trash2,
  Loader2,
  CreditCard,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, SUPPORTED_CURRENCIES } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { getBankAccounts, createBankAccount, deleteBankAccount } from "@/lib/actions/bank";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string | null;
  iban: string | null;
  currency: string;
  balance: number;
  is_active: boolean;
}

export default function BankPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const { canWrite } = usePermissions();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  const [newBankName, setNewBankName] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newIban, setNewIban] = useState("");
  const [newCurrency, setNewCurrency] = useState("TRY");
  const [newBalance, setNewBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const data = await getBankAccounts(organization.id);
    setAccounts(data as BankAccount[]);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    if (authLoading) return;
    loadAccounts();
  }, [loadAccounts, authLoading]);

  function resetForm() {
    setNewBankName("");
    setNewAccountName("");
    setNewIban("");
    setNewCurrency("TRY");
    setNewBalance("");
  }

  async function handleCreate() {
    if (!organization?.id) return;
    setSaving(true);

    const result = await createBankAccount({
      organization_id: organization.id,
      bank_name: newBankName,
      account_name: newAccountName || undefined,
      iban: newIban || undefined,
      currency: newCurrency,
      balance: parseFloat(newBalance) || 0,
    });

    if (result.error) {
      toast.error("Hesap eklenemedi", { description: result.error });
    } else {
      toast.success("Banka hesabi eklendi");
      setShowDialog(false);
      resetForm();
      loadAccounts();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const result = await deleteBankAccount(id);
    if (result.error) {
      toast.error("Silinemedi");
    } else {
      toast.success("Banka hesabi silindi");
      loadAccounts();
    }
  }

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Banka</h1>
          <p className="text-sm text-muted-foreground mt-1">Banka hesaplari ve bakiyeler</p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Hesap Ekle
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Landmark className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hesap Sayisi</p>
              <p className="text-lg font-bold">{accounts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam Bakiye</p>
              <p className="text-lg font-bold text-success">{formatCurrency(totalBalance)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-amber/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-amber" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aktif Hesap</p>
              <p className="text-lg font-bold">{accounts.filter((a) => a.is_active).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Account Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Landmark className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">Henuz banka hesabi yok</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Banka hesaplarinizi ekleyerek bakiyelerinizi takip edin.
            </p>
            {canWrite && (
              <Button className="mt-4" onClick={() => setShowDialog(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Ilk Hesabi Ekle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card key={account.id} className="group relative">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{account.bank_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.account_name || "Hesap"}
                      </p>
                    </div>
                  </div>
                  {canWrite && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 transition-opacity" />}>
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => handleDelete(account.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {account.iban && (
                  <p className="text-xs text-muted-foreground font-mono mb-3 truncate">
                    {account.iban}
                  </p>
                )}

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Bakiye</p>
                    <p className="text-xl font-bold tabular-nums">
                      {formatCurrency(Number(account.balance), account.currency)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${account.is_active ? "text-success" : "text-muted-foreground"}`}
                  >
                    {account.is_active ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Bank Account Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Banka Hesabi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bankName">Banka Adi *</Label>
              <Input id="bankName" placeholder="Ornegin: Ziraat Bankasi" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accName">Hesap Adi</Label>
              <Input id="accName" placeholder="Ornegin: Vadesiz TL Hesabi" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input id="iban" placeholder="TR00 0000 0000 0000 0000 0000 00" value={newIban} onChange={(e) => setNewIban(e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <Select value={newCurrency} onValueChange={(v) => setNewCurrency(v ?? "TRY")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Baslangic Bakiye</Label>
                <Input id="balance" type="number" step="0.01" placeholder="0.00" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
              Iptal
            </Button>
            <Button onClick={handleCreate} disabled={saving || !newBankName}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
