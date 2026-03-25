"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ScanLine,
  Plus,
  Receipt,
  MoreHorizontal,
  Trash2,
  Eye,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
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
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);

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

  const totalAmount = receipts.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fisler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fis galerisi ve OCR taranan belgeler
          </p>
        </div>
        <Button size="sm" render={<Link href="/receipts/scan" />}>
          <ScanLine className="mr-1.5 h-4 w-4" />
          Fis Tara
        </Button>
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
              <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
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
            <Button className="mt-4" render={<Link href="/receipts/scan" />}>
              <ScanLine className="mr-1.5 h-4 w-4" />
              Ilk Fisinizi Tarayin
            </Button>
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
                      <DropdownMenuItem className="cursor-pointer">
                        <Eye className="mr-2 h-4 w-4" />
                        Goruntule
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => handleDelete(receipt.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Sil
                      </DropdownMenuItem>
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
    </div>
  );
}
