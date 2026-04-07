"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RepeatIcon,
  Plus,
  MoreHorizontal,
  Trash2,
  Loader2,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import {
  getRecurringTransactions,
  createRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringTransaction,
  processRecurringTransactions,
} from "@/lib/actions/recurring";
import { getCategories } from "@/lib/actions/categories";
import { toast } from "sonner";

interface RecurringTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  description: string;
  counterparty: string | null;
  category_id: string | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  last_run_date: string | null;
  is_active: boolean;
  categories: { name: string; color: string | null; icon: string | null } | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string | null;
}

const frequencyLabels: Record<string, string> = {
  daily: "Gunluk",
  weekly: "Haftalik",
  monthly: "Aylik",
  yearly: "Yillik",
};

const frequencyColors: Record<string, string> = {
  daily: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  weekly: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  monthly: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  yearly: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function RecurringPage() {
  const { organization, user, isLoading: authLoading } = useAuthStore();
  const { canWrite } = usePermissions();
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    currency: "TRY",
    description: "",
    counterparty: "",
    category_id: "",
    frequency: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });

  const load = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const [data, cats] = await Promise.all([
      getRecurringTransactions(organization.id),
      getCategories(organization.id),
    ]);
    setItems(data as RecurringTransaction[]);
    setCategories(cats as Category[]);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    if (!authLoading) load();
  }, [load, authLoading]);

  async function handleProcess() {
    if (!organization?.id || !user?.id) return;
    setProcessing(true);
    const result = await processRecurringTransactions(organization.id, user.id);
    setProcessing(false);
    if ("created" in result && result.created > 0) {
      toast.success(`${result.created} tekrarlayan islem olusturuldu`);
    } else {
      toast.info("Simdilik olusturulacak islem yok");
    }
    load();
  }

  async function handleSave() {
    if (!organization?.id || !user?.id) return;
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      toast.error("Gecerli bir tutar giriniz");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Aciklama zorunludur");
      return;
    }

    setSaving(true);
    const result = await createRecurringTransaction({
      organization_id: organization.id,
      type: form.type,
      amount: Number(form.amount),
      currency: form.currency,
      description: form.description.trim(),
      counterparty: form.counterparty.trim() || undefined,
      category_id: form.category_id || undefined,
      frequency: form.frequency,
      start_date: form.start_date,
      end_date: form.end_date || undefined,
      created_by: user.id,
    });
    setSaving(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Tekrarlayan islem olusturuldu");
    setShowDialog(false);
    setForm({
      type: "expense",
      amount: "",
      currency: "TRY",
      description: "",
      counterparty: "",
      category_id: "",
      frequency: "monthly",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
    });
    load();
  }

  async function handleToggle(id: string, current: boolean) {
    const result = await toggleRecurringTransaction(id, !current);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_active: !current } : i))
    );
  }

  async function handleDelete(id: string) {
    const result = await deleteRecurringTransaction(id);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Silindi");
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const filteredCats = categories.filter(
    (c) => c.type === form.type
  );

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
          <h1 className="text-2xl font-semibold tracking-tight">Tekrarlayan Islemler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Periyodik gelir ve giderlerinizi otomatik olarak kaydedin
          </p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleProcess} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CalendarClock className="h-4 w-4 mr-2" />
              )}
              Simdi Islet
            </Button>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Ekle
            </Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <RepeatIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">Henuz tekrarlayan islem yok</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Kira, maas, abonelik gibi duzeni islemlerinizi buraya ekleyin.
            </p>
            {canWrite && (
              <Button className="mt-4" onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ilk islemi ekle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <RepeatIcon className="h-4 w-4" />
              {items.length} tekrarlayan islem
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Aktif</TableHead>
                  <TableHead>Aciklama</TableHead>
                  <TableHead>Periyot</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead>Sonraki</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={!item.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => canWrite && handleToggle(item.id, item.is_active)}
                        disabled={!canWrite}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.type === "income" ? (
                          <ArrowUpRight className="h-4 w-4 text-success shrink-0" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-destructive shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{item.description}</p>
                          {item.counterparty && (
                            <p className="text-xs text-muted-foreground">{item.counterparty}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          frequencyColors[item.frequency]
                        }`}
                      >
                        {frequencyLabels[item.frequency]}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums text-sm ${
                        item.type === "income" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {item.type === "income" ? "+" : "-"}
                      {formatCurrency(Number(item.amount), item.currency)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {item.is_active ? item.next_run_date : "—"}
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Tekrarlayan Islem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tur</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, type: v as "income" | "expense", category_id: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Gelir</SelectItem>
                    <SelectItem value="expense">Gider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Periyot</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, frequency: v as typeof form.frequency }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Gunluk</SelectItem>
                    <SelectItem value="weekly">Haftalik</SelectItem>
                    <SelectItem value="monthly">Aylik</SelectItem>
                    <SelectItem value="yearly">Yillik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Aciklama *</Label>
              <Input
                placeholder="orn. Ofis Kirasi"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tutar *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Para Birimi</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v ?? f.currency }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["TRY", "USD", "EUR", "GBP"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Karsi Taraf</Label>
              <Input
                placeholder="orn. ABC Ofis Yonetimi"
                value={form.counterparty}
                onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))}
              />
            </div>

            {filteredCats.length > 0 && (
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, category_id: v ?? "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori sec" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Baslangic Tarihi *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bitis Tarihi</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Iptal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
