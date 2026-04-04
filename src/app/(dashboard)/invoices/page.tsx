"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Send,
  CheckCircle,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { getInvoices, updateInvoiceStatus, deleteInvoice } from "@/lib/actions/invoices";
import { toast } from "sonner";

interface Invoice {
  id: string;
  type: string;
  invoice_number: string | null;
  date: string;
  due_date: string | null;
  status: string;
  counterparty_name: string;
  total: number;
  currency: string;
}

const statusLabels: Record<string, string> = {
  draft: "Taslak",
  sent: "Gonderildi",
  paid: "Odendi",
  overdue: "Vadesi Gecti",
  cancelled: "Iptal",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const PAGE_SIZE = 50;

export default function InvoicesPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadInvoices = useCallback(async (reset = true) => {
    if (!organization?.id) return;
    const currentOffset = reset ? 0 : offset;
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const data = await getInvoices(organization.id, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search || undefined,
        offset: currentOffset,
      });
      const rows = data as Invoice[];
      setInvoices((prev) => reset ? rows : [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
      if (reset) setOffset(PAGE_SIZE);
      else setOffset(currentOffset + PAGE_SIZE);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [organization?.id, statusFilter, search, offset]);

  useEffect(() => {
    if (authLoading) return;
    loadInvoices(true);
  }, [organization?.id, statusFilter, authLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authLoading && organization?.id) loadInvoices(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleStatusChange(id: string, status: string) {
    const result = await updateInvoiceStatus(id, status);
    if (result.error) {
      toast.error("Durum guncellenemedi");
    } else {
      toast.success(`Fatura durumu: ${statusLabels[status]}`);
      loadInvoices(true);
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteInvoice(id);
    if (result.error) {
      toast.error("Silinemedi");
    } else {
      toast.success("Fatura silindi");
      loadInvoices(true);
    }
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const paidCount = invoices.filter((inv) => inv.status === "paid").length;
  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Faturalar</h1>
          <p className="text-sm text-muted-foreground mt-1">Satis ve alis faturalarinizi yonetin</p>
        </div>
        <Button size="sm" render={<Link href="/invoices/new" />}>
          <Plus className="mr-1.5 h-4 w-4" />
          Yeni Fatura
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam Tutar</p>
              <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Odenen</p>
              <p className="text-lg font-bold text-success">{paidCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vadesi Gecen</p>
              <p className="text-lg font-bold text-destructive">{overdueCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Fatura veya firma ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tumu</SelectItem>
                <SelectItem value="draft">Taslak</SelectItem>
                <SelectItem value="sent">Gonderildi</SelectItem>
                <SelectItem value="paid">Odendi</SelectItem>
                <SelectItem value="overdue">Vadesi Gecti</SelectItem>
                <SelectItem value="cancelled">Iptal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden sm:table-cell">Fatura No</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead className="hidden sm:table-cell">Tur</TableHead>
                  <TableHead className="hidden md:table-cell">Tarih</TableHead>
                  <TableHead className="hidden lg:table-cell">Vade</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="group">
                    <TableCell className="hidden sm:table-cell font-medium text-sm">
                      {inv.invoice_number || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {inv.counterparty_name}
                      <span className="sm:hidden text-xs text-muted-foreground block">
                        {inv.invoice_number ? `#${inv.invoice_number}` : ""} · {new Date(inv.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {inv.type === "sales" ? "Satis" : "Alis"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {new Date(inv.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {inv.due_date
                        ? new Date(inv.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs font-normal ${statusColors[inv.status] || ""}`}>
                        {statusLabels[inv.status] || inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-sm tabular-nums">
                        {formatCurrency(Number(inv.total), inv.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" />
                            Goruntule
                          </DropdownMenuItem>
                          {inv.status === "draft" && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleStatusChange(inv.id, "sent")}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Gonder
                            </DropdownMenuItem>
                          )}
                          {(inv.status === "sent" || inv.status === "overdue") && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleStatusChange(inv.id, "paid")}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Odendi Isaretle
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={() => handleDelete(inv.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {search || statusFilter !== "all"
                        ? "Fatura bulunamadi"
                        : "Henuz fatura yok. Ilk faturanizi olusturun!"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {hasMore && (
            <div className="flex justify-center p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadInvoices(false)}
                disabled={loadingMore}
              >
                {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Daha Fazla Yukle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
