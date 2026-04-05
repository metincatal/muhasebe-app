"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Target,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Check,
  X,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import {
  getBudgetsWithActuals,
  upsertBudget,
  type BudgetWithActual,
} from "@/lib/actions/budgets";

const MONTHS = [
  "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
  "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik",
];

function getYearOptions() {
  const now = new Date().getFullYear();
  return [now - 1, now, now + 1];
}

function ProgressBar({ percentage, isOver }: { percentage: number; isOver: boolean }) {
  const clamped = Math.min(percentage, 100);
  const colorClass = isOver
    ? "bg-destructive"
    : percentage >= 80
    ? "bg-amber-500"
    : "bg-success";

  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface EditState {
  categoryId: string;
  value: string;
  saving: boolean;
}

export default function BudgetsPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [items, setItems] = useState<BudgetWithActual[]>([]);
  const [loading, setLoading] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const data = await getBudgetsWithActuals(organization.id, year, month);
    setItems(data);
    setLoading(false);
  }, [organization?.id, year, month]);

  useEffect(() => {
    if (!authLoading) load();
  }, [load, authLoading]);

  useEffect(() => {
    if (editState) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editState?.categoryId]);

  function startEdit(item: BudgetWithActual) {
    setEditState({
      categoryId: item.category_id,
      value: item.budget_amount > 0 ? String(item.budget_amount) : "",
      saving: false,
    });
  }

  function cancelEdit() {
    setEditState(null);
  }

  async function saveEdit(item: BudgetWithActual) {
    if (!organization?.id || !editState) return;
    const parsed = parseFloat(editState.value.replace(",", "."));
    const amount = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setEditState((prev) => prev ? { ...prev, saving: true } : null);
    await upsertBudget({
      organization_id: organization.id,
      category_id: item.category_id,
      year,
      month,
      amount,
    });
    await load();
    setEditState(null);
  }

  const totalBudget = items.reduce((s, i) => s + i.budget_amount, 0);
  const totalActual = items.reduce((s, i) => s + i.actual_amount, 0);
  const overBudgetCount = items.filter((i) => i.is_over).length;
  const budgetedCount = items.filter((i) => i.budget_amount > 0).length;

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
          <h1 className="text-2xl font-semibold tracking-tight">Butce Planlama</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kategori bazinda aylik harcama limitleri
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
        </div>
      </div>

      {/* Over-budget banner */}
      {overBudgetCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-destructive/5 border-destructive/30 text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            {overBudgetCount} kategori bu ay butcesini asti.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Toplam Butce</p>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 tracking-tight">
              {formatCurrency(totalBudget)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {budgetedCount} kategoride butce tanimli
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-primary/10" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Gercek Harcama</p>
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-2 tracking-tight">
              {formatCurrency(totalActual)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {MONTHS[month - 1]} {year} toplam gider
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 to-amber-500/10" />
        </Card>

        <Card className={`relative overflow-hidden ${totalActual > totalBudget && totalBudget > 0 ? "border-destructive/30" : "border-success/30"}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {totalActual <= totalBudget || totalBudget === 0 ? "Kalan Butce" : "Asim"}
              </p>
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                totalActual > totalBudget && totalBudget > 0
                  ? "bg-destructive/10"
                  : "bg-success/10"
              }`}>
                {totalActual > totalBudget && totalBudget > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </div>
            </div>
            <p className={`text-2xl font-bold mt-2 tracking-tight ${
              totalActual > totalBudget && totalBudget > 0 ? "text-destructive" : "text-success"
            }`}>
              {formatCurrency(Math.abs(totalBudget - totalActual))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalBudget > 0
                ? `Butcenin %${Math.round((totalActual / totalBudget) * 100)} kullanildi`
                : "Butce tanimlanmamis"}
            </p>
          </CardContent>
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${
            totalActual > totalBudget && totalBudget > 0
              ? "from-destructive/40 to-destructive/10"
              : "from-success/40 to-success/10"
          }`} />
        </Card>
      </div>

      {/* Category Budget List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Kategori Butceleri — {MONTHS[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Henuz gider kategorisi yok. Ayarlar &gt; Kategoriler bolumunden ekleyebilirsiniz.
            </p>
          ) : (
            <div className="divide-y">
              {items.map((item) => {
                const isEditing = editState?.categoryId === item.category_id;
                return (
                  <div key={item.category_id} className="flex items-center gap-4 px-6 py-4">
                    {/* Category dot + name */}
                    <div className="flex items-center gap-2.5 w-40 shrink-0">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.category_color }}
                      />
                      <span className="text-sm font-medium truncate">{item.category_name}</span>
                    </div>

                    {/* Progress section */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(item.actual_amount)} harcandi</span>
                        {item.budget_amount > 0 ? (
                          <span className={item.is_over ? "text-destructive font-medium" : ""}>
                            {formatCurrency(item.budget_amount)} butce
                            {item.is_over && (
                              <span className="ml-1 text-destructive font-semibold">
                                (%{Math.round(item.percentage)} asim)
                              </span>
                            )}
                            {!item.is_over && item.budget_amount > 0 && (
                              <span className="ml-1">
                                (%{Math.round(item.percentage)})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="italic">butce yok</span>
                        )}
                      </div>
                      <ProgressBar percentage={item.percentage} isOver={item.is_over} />
                    </div>

                    {/* Budget input / edit */}
                    <div className="w-40 shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            ref={inputRef}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={editState.value}
                            onChange={(e) =>
                              setEditState((prev) =>
                                prev ? { ...prev, value: e.target.value } : null
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(item);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="h-8 text-sm"
                            disabled={editState.saving}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 text-success hover:text-success"
                            onClick={() => saveEdit(item)}
                            disabled={editState.saving}
                          >
                            {editState.saving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={cancelEdit}
                            disabled={editState.saving}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-full justify-between text-sm font-normal group"
                          onClick={() => startEdit(item)}
                        >
                          <span className={item.budget_amount === 0 ? "text-muted-foreground/60 italic" : ""}>
                            {item.budget_amount > 0
                              ? formatCurrency(item.budget_amount)
                              : "Butce gir..."}
                          </span>
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Butce tutarini duzenlemek icin satira tiklayin. Enter ile kaydedin, Esc ile iptal edin.
      </p>
    </div>
  );
}
