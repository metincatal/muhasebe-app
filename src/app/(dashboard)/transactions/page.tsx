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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Receipt,
  ArrowLeftRight,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { getTransactions, deleteTransaction } from "@/lib/actions/transactions";
import { toast } from "sonner";

interface Transaction {
  id: string;
  type: string;
  description: string;
  counterparty: string | null;
  amount: number;
  currency: string;
  date: string;
  categories: { name: string; color: string; icon: string } | null;
}

export default function TransactionsPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const loadTransactions = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const data = await getTransactions(organization.id, {
        type: typeFilter !== "all" ? typeFilter : undefined,
        search: search || undefined,
      });
      setTransactions(data as Transaction[]);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, typeFilter, search]);

  useEffect(() => {
    if (authLoading) return;
    loadTransactions();
  }, [loadTransactions, authLoading]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authLoading && organization?.id) loadTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleDelete(id: string) {
    const result = await deleteTransaction(id);
    if (result.error) {
      toast.error("Silinemedi", { description: result.error });
    } else {
      toast.success("Islem silindi");
      loadTransactions();
    }
  }

  const filtered = transactions;
  const totalIncome = filtered.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalExpense = filtered.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + Number(tx.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Islemler</h1>
          <p className="text-sm text-muted-foreground mt-1">Gelir, gider ve transfer islemlerinizi yonetin</p>
        </div>
        <Button size="sm" render={<Link href="/transactions/new" />}>
          <Plus className="mr-1.5 h-4 w-4" />
          Yeni Islem
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam Gelir</p>
              <p className="text-lg font-bold text-success">{formatCurrency(totalIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam Gider</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(totalExpense)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-amber/10 flex items-center justify-center">
              <ArrowLeftRight className="h-4 w-4 text-amber" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net</p>
              <p className="text-lg font-bold">{formatCurrency(totalIncome - totalExpense)}</p>
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
              <Input placeholder="Islem veya firma ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Tur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tumu</SelectItem>
                <SelectItem value="income">Gelir</SelectItem>
                <SelectItem value="expense">Gider</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
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
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Aciklama</TableHead>
                  <TableHead className="hidden md:table-cell">Karsi Taraf</TableHead>
                  <TableHead className="hidden sm:table-cell">Kategori</TableHead>
                  <TableHead className="hidden lg:table-cell">Tarih</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => {
                  const catColor = tx.categories?.color || "#6b7280";
                  return (
                    <TableRow key={tx.id} className="group">
                      <TableCell>
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${catColor}15` }}>
                          {tx.type === "income" ? (
                            <ArrowUpRight className="h-4 w-4" style={{ color: catColor }} />
                          ) : tx.type === "expense" ? (
                            <ArrowDownRight className="h-4 w-4" style={{ color: catColor }} />
                          ) : (
                            <ArrowLeftRight className="h-4 w-4" style={{ color: catColor }} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{tx.counterparty}</p>
                        <p className="text-xs text-muted-foreground lg:hidden">
                          {new Date(tx.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{tx.counterparty || "-"}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs font-normal">{tx.categories?.name || "-"}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold text-sm tabular-nums ${tx.type === "income" ? "text-success" : tx.type === "expense" ? "text-foreground" : "text-muted-foreground"}`}>
                          {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                          {formatCurrency(Number(tx.amount), tx.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" />
                              Duzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Receipt className="mr-2 h-4 w-4" />
                              Fis Ekle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              className="cursor-pointer"
                              onClick={() => handleDelete(tx.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {search || typeFilter !== "all" ? "Islem bulunamadi" : "Henuz islem yok. Ilk isleminizi ekleyin!"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
