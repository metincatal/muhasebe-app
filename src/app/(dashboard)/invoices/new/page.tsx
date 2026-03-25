"use client";

import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency, SUPPORTED_CURRENCIES } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { createInvoice } from "@/lib/actions/invoices";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  Calculator,
} from "lucide-react";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

function createEmptyItem(): InvoiceItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "adet",
    unitPrice: 0,
    taxRate: 20,
    taxAmount: 0,
    total: 0,
  };
}

function calculateItem(item: InvoiceItem): InvoiceItem {
  const subtotal = item.quantity * item.unitPrice;
  const taxAmount = subtotal * (item.taxRate / 100);
  return { ...item, taxAmount, total: subtotal + taxAmount };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { user, organization } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"sales" | "purchase">("sales");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyTaxId, setCounterpartyTaxId] = useState("");
  const [counterpartyAddress, setCounterpartyAddress] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([createEmptyItem()]);

  function updateItem(id: string, field: keyof InvoiceItem, value: string | number) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        return calculateItem(updated);
      })
    );
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyItem()]);
  }

  function removeItem(id: string) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + totalTax;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organization?.id || !user?.id) return;

    setIsLoading(true);

    const result = await createInvoice({
      organization_id: organization.id,
      type: invoiceType,
      invoice_number: invoiceNumber || undefined,
      date,
      due_date: dueDate || undefined,
      counterparty_name: counterpartyName,
      counterparty_tax_id: counterpartyTaxId || undefined,
      counterparty_address: counterpartyAddress || undefined,
      currency,
      notes: notes || undefined,
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate,
        tax_amount: item.taxAmount,
        total: item.total,
      })),
      created_by: user.id,
    });

    if (result.error) {
      toast.error("Fatura olusturulamadi", { description: result.error });
      setIsLoading(false);
      return;
    }

    toast.success("Fatura olusturuldu", {
      description: `${counterpartyName} - ${formatCurrency(grandTotal, currency)}`,
    });
    setIsLoading(false);
    router.push("/invoices");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/invoices" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Yeni Fatura</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {invoiceType === "sales" ? "Satis" : "Alis"} faturasi olusturun
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type + Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fatura Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInvoiceType("sales")}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  invoiceType === "sales"
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                Satis Faturasi
              </button>
              <button
                type="button"
                onClick={() => setInvoiceType("purchase")}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  invoiceType === "purchase"
                    ? "border-amber/30 bg-amber/10 text-amber-foreground"
                    : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                Alis Faturasi
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="invoiceNo">Fatura No</Label>
                <Input id="invoiceNo" placeholder="FTR-001" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invDate">Tarih *</Label>
                <Input id="invDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Vade Tarihi</Label>
                <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Counterparty */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {invoiceType === "sales" ? "Musteri Bilgileri" : "Tedarikci Bilgileri"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cpName">Firma / Kisi Adi *</Label>
                <Input id="cpName" placeholder="Firma adi" value={counterpartyName} onChange={(e) => setCounterpartyName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpTax">Vergi No / TC Kimlik</Label>
                <Input id="cpTax" placeholder="1234567890" value={counterpartyTaxId} onChange={(e) => setCounterpartyTaxId(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpAddress">Adres</Label>
              <Textarea id="cpAddress" placeholder="Firma adresi" value={counterpartyAddress} onChange={(e) => setCounterpartyAddress(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Fatura Kalemleri</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={currency} onValueChange={(v) => setCurrency(v ?? "TRY")}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Aciklama</TableHead>
                    <TableHead className="w-20 text-center">Miktar</TableHead>
                    <TableHead className="w-20 text-center">Birim</TableHead>
                    <TableHead className="w-28 text-right">Birim Fiyat</TableHead>
                    <TableHead className="w-20 text-center">KDV %</TableHead>
                    <TableHead className="w-28 text-right">Toplam</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          placeholder="Urun/hizmet aciklamasi"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          className="border-0 shadow-none px-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={item.quantity || ""}
                          onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          className="border-0 shadow-none text-center px-0 focus-visible:ring-0 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={item.unit} onValueChange={(v) => updateItem(item.id, "unit", v ?? "adet")}>
                          <SelectTrigger className="border-0 shadow-none h-8 text-xs px-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="adet">Adet</SelectItem>
                            <SelectItem value="saat">Saat</SelectItem>
                            <SelectItem value="gun">Gun</SelectItem>
                            <SelectItem value="kg">Kg</SelectItem>
                            <SelectItem value="lt">Lt</SelectItem>
                            <SelectItem value="m2">m2</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="border-0 shadow-none text-right px-0 focus-visible:ring-0 w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={item.taxRate.toString()} onValueChange={(v) => updateItem(item.id, "taxRate", parseFloat(v ?? "20"))}>
                          <SelectTrigger className="border-0 shadow-none h-8 text-xs px-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">%0</SelectItem>
                            <SelectItem value="1">%1</SelectItem>
                            <SelectItem value="10">%10</SelectItem>
                            <SelectItem value="20">%20</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm tabular-nums">
                        {formatCurrency(item.total, currency)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-3 border-t">
              <Button type="button" variant="ghost" size="sm" onClick={addItem} className="text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Kalem Ekle
              </Button>
            </div>

            {/* Totals */}
            <div className="border-t p-4">
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-8 text-sm">
                  <span className="text-muted-foreground">Ara Toplam</span>
                  <span className="font-medium tabular-nums w-28 text-right">{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex items-center gap-8 text-sm">
                  <span className="text-muted-foreground">KDV</span>
                  <span className="font-medium tabular-nums w-28 text-right">{formatCurrency(totalTax, currency)}</span>
                </div>
                <div className="flex items-center gap-8 text-base pt-1.5 border-t mt-1.5">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Calculator className="h-4 w-4 text-amber" />
                    Genel Toplam
                  </span>
                  <span className="font-bold tabular-nums w-28 text-right">{formatCurrency(grandTotal, currency)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea id="notes" placeholder="Fatura notlari (istege bagli)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" render={<Link href="/invoices" />}>
            Iptal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Fatura Olustur
          </Button>
        </div>
      </form>
    </div>
  );
}
