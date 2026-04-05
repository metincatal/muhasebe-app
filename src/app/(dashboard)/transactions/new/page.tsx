"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Save,
  ArrowLeft,
  Loader2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { getCategories } from "@/lib/actions/categories";
import { createTransaction } from "@/lib/actions/transactions";
import { transactionSchema } from "@/lib/validations";

const transactionTypes = [
  { value: "income", label: "Gelir", icon: ArrowUpRight, color: "text-success", bg: "bg-success/10", border: "border-success/30" },
  { value: "expense", label: "Gider", icon: ArrowDownRight, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
  { value: "transfer", label: "Transfer", icon: ArrowLeftRight, color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
] as const;

interface Category {
  id: string;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
}

export default function NewTransactionPage() {
  const router = useRouter();
  const { user, organization } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<"income" | "expense" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiSuggestion, setAiSuggestion] = useState<{ id: string; name: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiRequestRef = useRef(0);

  useEffect(() => {
    if (!organization?.id) return;
    async function loadCategories() {
      const cats = await getCategories(
        organization!.id,
        type !== "transfer" ? type : undefined
      );
      setCategories(cats as Category[]);
    }
    loadCategories();
  }, [organization?.id, type]);

  useEffect(() => {
    setCategoryId("");
    setAiSuggestion(null);
  }, [type]);

  useEffect(() => {
    setAiSuggestion(null);
    if (!description.trim() || description.length < 5 || type === "transfer" || !organization?.id) {
      setIsAiLoading(false);
      return;
    }
    setIsAiLoading(true);
    const requestId = ++aiRequestRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, type, org_id: organization.id }),
        });
        if (res.ok && requestId === aiRequestRef.current) {
          const data = await res.json() as { category_id: string | null; category_name: string | null };
          if (data.category_id && data.category_name) {
            setAiSuggestion({ id: data.category_id, name: data.category_name });
          }
        }
      } catch {
        // sessizce bas
      } finally {
        if (requestId === aiRequestRef.current) {
          setIsAiLoading(false);
        }
      }
    }, 700);
    return () => {
      clearTimeout(timer);
    };
  }, [description, type, organization?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organization?.id || !user?.id) return;

    setErrors({});

    const input = {
      organization_id: organization.id,
      type,
      amount: parseFloat(amount),
      currency,
      description,
      counterparty: counterparty || undefined,
      category_id: categoryId || undefined,
      date,
      created_by: user.id,
    };

    // Client-side validation
    const parsed = transactionSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const err of parsed.error.issues) {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      }
      setErrors(fieldErrors);
      toast.error("Lutfen formu kontrol edin");
      return;
    }

    setIsLoading(true);

    const result = await createTransaction({
      organization_id: organization.id,
      type,
      amount: parseFloat(amount),
      currency,
      description,
      counterparty: counterparty || undefined,
      category_id: categoryId || undefined,
      date,
      created_by: user.id,
    });

    if (result.error) {
      toast.error("Islem kaydedilemedi", { description: result.error });
      setIsLoading(false);
      return;
    }

    toast.success("Islem kaydedildi", {
      description: `${type === "income" ? "Gelir" : type === "expense" ? "Gider" : "Transfer"} islemi basariyla olusturuldu.`,
    });
    setIsLoading(false);
    router.push("/transactions");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/transactions" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Yeni Islem</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gelir, gider veya transfer ekleyin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Type Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Islem Turu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {transactionTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                    type === t.value
                      ? `${t.bg} ${t.border} ${t.color}`
                      : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <t.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Amount & Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detaylar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="amount">Tutar *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: "" })); }}
                  required
                  className={cn("text-lg font-semibold", errors.amount && "border-destructive")}
                />
                {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Para Birimi</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v ?? "TRY")}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Tarih *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Aciklama *</Label>
              <Input
                id="description"
                placeholder="Islem aciklamasi"
                value={description}
                onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: "" })); }}
                required
                className={cn(errors.description && "border-destructive")}
              />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
            </div>

            {/* Counterparty */}
            <div className="space-y-2">
              <Label htmlFor="counterparty">
                {type === "income" ? "Kimden" : type === "expense" ? "Kime" : "Hesaplar Arasi"}
              </Label>
              <Input
                id="counterparty"
                placeholder={type === "income" ? "Musteri / Firma adi" : type === "expense" ? "Tedarikci / Firma adi" : "Hesap bilgisi"}
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
              />
            </div>

            {/* Category */}
            {type !== "transfer" && (
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={categoryId} onValueChange={(v) => { setCategoryId(v ?? ""); setAiSuggestion(null); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori secin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.color || "#6b7280" }}
                          />
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAiLoading && description.length >= 5 && !categoryId && (
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">AI kategori tahmin ediyor...</span>
                  </div>
                )}
                {aiSuggestion && !categoryId && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber shrink-0" />
                    <span className="text-xs text-muted-foreground">AI onerisi:</span>
                    <button
                      type="button"
                      onClick={() => { setCategoryId(aiSuggestion.id); setAiSuggestion(null); }}
                      className="text-xs font-medium text-amber hover:underline"
                    >
                      {aiSuggestion.name}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                placeholder="Ek notlar (istege bagli)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" render={<Link href="/transactions" />}>
            Iptal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Kaydet
          </Button>
        </div>
      </form>
    </div>
  );
}
