"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ScanLine,
  Receipt,
  MoreHorizontal,
  Trash2,
  Eye,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { getReceipts, deleteReceipt } from "@/lib/actions/receipts";
import { toast } from "sonner";

interface ReceiptData {
  id: string;
  vendor_name: string | null;
  date: string | null;
  total_amount: number | null;
  tax_amount: number | null;
  currency: string;
  status: string;
  created_at: string;
  image_url: string;
  categories: { name: string; color: string } | null;
  transactions: { description: string; amount: number; currency: string } | null;
}

const statusLabels: Record<string, string> = {
  pending: "Bekliyor",
  processed: "Islendi",
  confirmed: "Onaylandi",
  rejected: "Reddedildi",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  processed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export default function ReceiptsPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const { canWrite } = usePermissions();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptData | null>(null);

  const loadReceipts = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const data = await getReceipts(organization.id);
    setReceipts(data as ReceiptData[]);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    if (authLoading) return;
    loadReceipts();
  }, [loadReceipts, authLoading]);

  async function handleDelete(id: string) {
    const result = await deleteReceipt(id);
    if (result.error) {
      toast.error("Silinemedi");
    } else {
      toast.success("Fis ve bagli islem silindi");
      loadReceipts();
    }
  }

  // Para birimine göre toplamları grupla
  const totalsByCurrency = receipts.reduce<Record<string, number>>((acc, r) => {
    const cur = r.currency || "TRY";
    acc[cur] = (acc[cur] || 0) + Number(r.total_amount || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fisler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fis galerisi ve OCR taranan belgeler
          </p>
        </div>
        {canWrite && (
          <Button size="sm" render={<Link href="/receipts/scan" />}>
            <ScanLine className="mr-1.5 h-4 w-4" />
            Fis Tara
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam Fis</p>
              <p className="text-lg font-bold">{receipts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-amber/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-amber" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam Tutar</p>
              {Object.entries(totalsByCurrency).length === 0 ? (
                <p className="text-lg font-bold">{formatCurrency(0)}</p>
              ) : (
                <div className="space-y-0.5">
                  {Object.entries(totalsByCurrency).map(([cur, amt]) => (
                    <p key={cur} className="text-lg font-bold leading-tight">
                      {formatCurrency(amt, cur)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receipt Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : receipts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">Henuz fis yok</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Fisinizi fotograflayarak veya yukleyerek otomatik okutabilirsiniz.
            </p>
            {canWrite && (
              <Button className="mt-4" render={<Link href="/receipts/scan" />}>
                <ScanLine className="mr-1.5 h-4 w-4" />
                Ilk Fisinizi Tarayin
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {receipts.map((receipt) => (
            <Card key={receipt.id} className="group relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[160px]">
                        {receipt.vendor_name || "Bilinmeyen"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {receipt.date
                          ? new Date(receipt.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })
                          : "Tarih yok"}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 transition-opacity" />}>
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setViewingReceipt(receipt)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Goruntule
                      </DropdownMenuItem>
                      {canWrite && (
                        <DropdownMenuItem
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => handleDelete(receipt.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sil
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    {receipt.categories && (
                      <Badge variant="secondary" className="text-xs font-normal mb-1">
                        {receipt.categories.name}
                      </Badge>
                    )}
                    <Badge className={`text-[0.6rem] ml-1 ${statusColors[receipt.status] || ""}`}>
                      {statusLabels[receipt.status] || receipt.status}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold tabular-nums">
                    {formatCurrency(Number(receipt.total_amount || 0), receipt.currency)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Fiş görüntüleme dialog */}
      <Dialog open={!!viewingReceipt} onOpenChange={(open) => { if (!open) setViewingReceipt(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewingReceipt?.vendor_name || "Fis"} — {viewingReceipt?.date
                ? new Date(viewingReceipt.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
                : ""}
            </DialogTitle>
          </DialogHeader>
          {viewingReceipt && (
            <div className="space-y-3">
              {/* Tutar + Durum */}
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/40">
                <Badge className={`text-xs font-medium ${statusColors[viewingReceipt.status] || ""}`}>
                  {statusLabels[viewingReceipt.status] || viewingReceipt.status}
                </Badge>
                <span className="text-2xl font-bold tabular-nums">
                  {formatCurrency(Number(viewingReceipt.total_amount || 0), viewingReceipt.currency)}
                </span>
              </div>

              {/* Detaylar */}
              <div className="rounded-xl border border-border/40 divide-y divide-border/40">
                {viewingReceipt.tax_amount ? (
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">KDV</span>
                    <span className="font-medium">
                      {formatCurrency(Number(viewingReceipt.tax_amount), viewingReceipt.currency)}
                    </span>
                  </div>
                ) : null}
                {viewingReceipt.categories && (
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">Kategori</span>
                    <span className="font-medium">{viewingReceipt.categories.name}</span>
                  </div>
                )}
                {viewingReceipt.transactions && (
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">Islem</span>
                    <span className="font-medium truncate max-w-[200px]">
                      {viewingReceipt.transactions.description}
                    </span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">Tarih</span>
                  <span className="font-medium">
                    {viewingReceipt.date
                      ? new Date(viewingReceipt.date).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
