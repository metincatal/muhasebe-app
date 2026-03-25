"use client";

import { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Save,
  Loader2,
  Plus,
  Trash2,
  Tag,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { getCategories, createCategory, deleteCategory } from "@/lib/actions/categories";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
  is_system: boolean;
}

export default function SettingsPage() {
  const { user, organization, role } = useAuthStore();
  const supabase = createClient();

  // Org form
  const [orgName, setOrgName] = useState("");
  const [orgTaxId, setOrgTaxId] = useState("");
  const [orgTaxOffice, setOrgTaxOffice] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<string>("expense");
  const [newCatColor, setNewCatColor] = useState("#6b7280");
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;
    // Org bilgilerini yukle
    async function loadOrg() {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organization!.id)
        .single();

      if (data) {
        setOrgName(data.name || "");
        setOrgTaxId(data.tax_id || "");
        setOrgTaxOffice(data.tax_office || "");
        setOrgPhone(data.phone || "");
        setOrgEmail(data.email || "");
        setOrgAddress(data.address || "");
      }
    }
    loadOrg();
    loadCategories();
  }, [organization?.id]);

  async function loadCategories() {
    if (!organization?.id) return;
    setCatLoading(true);
    const data = await getCategories(organization.id);
    setCategories(data as Category[]);
    setCatLoading(false);
  }

  async function handleSaveOrg() {
    if (!organization?.id) return;
    setSavingOrg(true);

    const { error } = await supabase
      .from("organizations")
      .update({
        name: orgName,
        tax_id: orgTaxId || null,
        tax_office: orgTaxOffice || null,
        phone: orgPhone || null,
        email: orgEmail || null,
        address: orgAddress || null,
      })
      .eq("id", organization.id);

    if (error) {
      toast.error("Kaydedilemedi", { description: error.message });
    } else {
      toast.success("Organizasyon bilgileri guncellendi");
    }
    setSavingOrg(false);
  }

  async function handleCreateCategory() {
    if (!organization?.id) return;
    setSavingCat(true);

    const result = await createCategory({
      organization_id: organization.id,
      name: newCatName,
      type: newCatType as "income" | "expense",
      color: newCatColor,
    });

    if (result.error) {
      toast.error("Kategori eklenemedi", { description: result.error });
    } else {
      toast.success("Kategori eklendi");
      setShowCatDialog(false);
      setNewCatName("");
      setNewCatType("expense");
      setNewCatColor("#6b7280");
      loadCategories();
    }
    setSavingCat(false);
  }

  async function handleDeleteCategory(id: string) {
    const result = await deleteCategory(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Kategori silindi");
      loadCategories();
    }
  }

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organizasyon ve uygulama ayarlari
        </p>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizasyon Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="orgName">Firma / Hesap Adi *</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgTaxId">Vergi No / TC</Label>
              <Input
                id="orgTaxId"
                value={orgTaxId}
                onChange={(e) => setOrgTaxId(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="orgTaxOffice">Vergi Dairesi</Label>
              <Input
                id="orgTaxOffice"
                value={orgTaxOffice}
                onChange={(e) => setOrgTaxOffice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgPhone">Telefon</Label>
              <Input
                id="orgPhone"
                value={orgPhone}
                onChange={(e) => setOrgPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgEmail">E-posta</Label>
            <Input
              id="orgEmail"
              type="email"
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgAddress">Adres</Label>
            <Input
              id="orgAddress"
              value={orgAddress}
              onChange={(e) => setOrgAddress(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveOrg} disabled={savingOrg || !orgName}>
              {savingOrg ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kullanici Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Ad Soyad</p>
              <p className="font-medium">{user?.fullName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">E-posta</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rol</p>
              <Badge variant="secondary">
                {role === "admin" ? "Yonetici" : role === "accountant" ? "Muhasebeci" : "Izleyici"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Kategoriler
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCatDialog(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Yeni
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {catLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Gelir Kategorileri */}
              <div className="px-4 py-2 bg-muted/30 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Gelir Kategorileri ({incomeCategories.length})
                </p>
              </div>
              <Table>
                <TableBody>
                  {incomeCategories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="w-8">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color || "#6b7280" }}
                        />
                      </TableCell>
                      <TableCell className="text-sm font-medium">{cat.name}</TableCell>
                      <TableCell className="text-right">
                        {!cat.is_system && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        {cat.is_system && (
                          <Badge variant="secondary" className="text-[0.6rem]">Sistem</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Gider Kategorileri */}
              <div className="px-4 py-2 bg-muted/30 border-y">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Gider Kategorileri ({expenseCategories.length})
                </p>
              </div>
              <Table>
                <TableBody>
                  {expenseCategories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="w-8">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color || "#6b7280" }}
                        />
                      </TableCell>
                      <TableCell className="text-sm font-medium">{cat.name}</TableCell>
                      <TableCell className="text-right">
                        {!cat.is_system && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        {cat.is_system && (
                          <Badge variant="secondary" className="text-[0.6rem]">Sistem</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* New Category Dialog */}
      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kategori</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tur *</Label>
              <Select value={newCatType} onValueChange={(v) => setNewCatType(v ?? "expense")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Gelir</SelectItem>
                  <SelectItem value="expense">Gider</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catName">Kategori Adi *</Label>
              <Input
                id="catName"
                placeholder="Ornegin: Ofis Giderleri"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catColor">Renk</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="catColor"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="h-8 w-12 rounded border cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{newCatColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatDialog(false)}>
              Iptal
            </Button>
            <Button onClick={handleCreateCategory} disabled={savingCat || !newCatName}>
              {savingCat && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
