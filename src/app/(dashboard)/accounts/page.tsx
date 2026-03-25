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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Loader2,
  BookOpen,
  Download,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { getAccounts, createAccount, seedDefaultAccounts } from "@/lib/actions/accounts";
import { toast } from "sonner";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  is_system: boolean;
  is_active: boolean;
  currency: string;
  description: string | null;
}

const typeLabels: Record<string, string> = {
  asset: "Varlik",
  liability: "Borc",
  equity: "Ozkaynak",
  revenue: "Gelir",
  expense: "Gider",
};

const typeColors: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  liability: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  equity: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  revenue: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  expense: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const typeGroupLabels: Record<string, string> = {
  asset: "1-2xx Varliklar",
  liability: "3-4xx Borclar",
  equity: "5xx Ozkaynaklar",
  revenue: "6xx Gelirler",
  expense: "6-7xx Giderler",
};

export default function AccountsPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Yeni hesap formu
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("asset");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const data = await getAccounts(organization.id);
    setAccounts(data as Account[]);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    if (authLoading) return;
    loadAccounts();
  }, [loadAccounts, authLoading]);

  async function handleSeed() {
    if (!organization?.id) return;
    setSeeding(true);
    const result = await seedDefaultAccounts(organization.id);
    if (result.error) {
      toast.error("Hesap plani olusturulamadi", { description: result.error });
    } else {
      toast.success("Tekduzen Hesap Plani yuklendi");
      loadAccounts();
    }
    setSeeding(false);
  }

  async function handleCreate() {
    if (!organization?.id) return;
    setSaving(true);

    const result = await createAccount({
      organization_id: organization.id,
      code: newCode,
      name: newName,
      type: newType as "asset" | "liability" | "equity" | "revenue" | "expense",
      description: newDesc || undefined,
    });

    if (result.error) {
      toast.error("Hesap olusturulamadi", { description: result.error });
    } else {
      toast.success("Hesap olusturuldu");
      setShowDialog(false);
      setNewCode("");
      setNewName("");
      setNewType("asset");
      setNewDesc("");
      loadAccounts();
    }
    setSaving(false);
  }

  const filtered = accounts.filter(
    (a) =>
      !search ||
      a.code.includes(search) ||
      a.name.toLowerCase().includes(search.toLowerCase())
  );

  // Hesaplari ture gore grupla
  const grouped = ["asset", "liability", "equity", "revenue", "expense"]
    .map((type) => ({
      type,
      label: typeGroupLabels[type],
      accounts: filtered.filter((a) => a.type === type),
    }))
    .filter((g) => g.accounts.length > 0);

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
          <h1 className="text-2xl font-semibold tracking-tight">Hesap Plani</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tekduzen Hesap Plani ({accounts.length} hesap)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
              Tekduzen Yukle
            </Button>
          )}
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Yeni Hesap
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hesap kodu veya adi ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Accounts by Group */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">Hesap plani bos</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Tekduzen Hesap Plani sablonunu yukleyerek hizlica baslayabilirsiniz.
            </p>
            <Button className="mt-4" onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
              Tekduzen Hesap Planini Yukle
            </Button>
          </CardContent>
        </Card>
      ) : (
        grouped.map((group) => (
          <Card key={group.type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                {group.label}
                <Badge variant="secondary" className="text-xs font-normal ml-1">
                  {group.accounts.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Kod</TableHead>
                    <TableHead>Hesap Adi</TableHead>
                    <TableHead className="hidden sm:table-cell w-24">Tur</TableHead>
                    <TableHead className="hidden md:table-cell w-20">Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.accounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono text-sm font-semibold">
                        {acc.code}
                      </TableCell>
                      <TableCell className="text-sm">{acc.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={`text-xs font-normal ${typeColors[acc.type] || ""}`}>
                          {typeLabels[acc.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className={`text-xs ${acc.is_active ? "text-success" : "text-muted-foreground"}`}>
                          {acc.is_active ? "Aktif" : "Pasif"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* New Account Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Hesap Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="accCode">Hesap Kodu *</Label>
                <Input
                  id="accCode"
                  placeholder="100"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="accName">Hesap Adi *</Label>
                <Input
                  id="accName"
                  placeholder="Kasa"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hesap Turu *</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v ?? "asset")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Varlik</SelectItem>
                  <SelectItem value="liability">Borc</SelectItem>
                  <SelectItem value="equity">Ozkaynak</SelectItem>
                  <SelectItem value="revenue">Gelir</SelectItem>
                  <SelectItem value="expense">Gider</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accDesc">Aciklama</Label>
              <Input
                id="accDesc"
                placeholder="Hesap aciklamasi (istege bagli)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Iptal
            </Button>
            <Button onClick={handleCreate} disabled={saving || !newCode || !newName}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Olustur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
