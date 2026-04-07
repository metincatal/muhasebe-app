"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Users,
  UserPlus,
  Truck,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Phone,
  Mail,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { getContacts, createContact, deleteContact } from "@/lib/actions/contacts";
import { toast } from "sonner";

interface Contact {
  id: string;
  type: string;
  name: string;
  tax_id: string | null;
  tax_office: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

const typeLabels: Record<string, string> = {
  customer: "Musteri",
  supplier: "Tedarikci",
  both: "Musteri/Tedarikci",
};

const typeColors: Record<string, string> = {
  customer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  supplier: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  both: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function ContactsPage() {
  const { organization, isLoading: authLoading } = useAuthStore();
  const { canWrite } = usePermissions();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);

  // Yeni kisi formu
  const [newType, setNewType] = useState<string>("customer");
  const [newName, setNewName] = useState("");
  const [newTaxId, setNewTaxId] = useState("");
  const [newTaxOffice, setNewTaxOffice] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const data = await getContacts(organization.id, {
      type: typeFilter !== "all" ? typeFilter : undefined,
      search: search || undefined,
    });
    setContacts(data as Contact[]);
    setLoading(false);
  }, [organization?.id, typeFilter, search]);

  useEffect(() => {
    if (authLoading) return;
    loadContacts();
  }, [loadContacts, authLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authLoading && organization?.id) loadContacts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function resetForm() {
    setNewType("customer");
    setNewName("");
    setNewTaxId("");
    setNewTaxOffice("");
    setNewEmail("");
    setNewPhone("");
    setNewAddress("");
    setNewNotes("");
  }

  async function handleCreate() {
    if (!organization?.id) return;
    setSaving(true);

    const result = await createContact({
      organization_id: organization.id,
      type: newType as "customer" | "supplier" | "both",
      name: newName,
      tax_id: newTaxId || undefined,
      tax_office: newTaxOffice || undefined,
      email: newEmail || undefined,
      phone: newPhone || undefined,
      address: newAddress || undefined,
      notes: newNotes || undefined,
    });

    if (result.error) {
      toast.error("Kisi eklenemedi", { description: result.error });
    } else {
      toast.success("Kisi eklendi");
      setShowDialog(false);
      resetForm();
      loadContacts();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const result = await deleteContact(id);
    if (result.error) {
      toast.error("Silinemedi");
    } else {
      toast.success("Kisi silindi");
      loadContacts();
    }
  }

  const customerCount = contacts.filter((c) => c.type === "customer" || c.type === "both").length;
  const supplierCount = contacts.filter((c) => c.type === "supplier" || c.type === "both").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rehber</h1>
          <p className="text-sm text-muted-foreground mt-1">Musteri ve tedarikci rehberi</p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Yeni Kisi
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam</p>
              <p className="text-lg font-bold">{contacts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Musteri</p>
              <p className="text-lg font-bold">{customerCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tedarikci</p>
              <p className="text-lg font-bold">{supplierCount}</p>
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
              <Input placeholder="Ad, e-posta veya vergi no ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Tur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tumu</SelectItem>
                <SelectItem value="customer">Musteri</SelectItem>
                <SelectItem value="supplier">Tedarikci</SelectItem>
                <SelectItem value="both">Her Ikisi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad / Firma</TableHead>
                  <TableHead className="hidden sm:table-cell">Tur</TableHead>
                  <TableHead className="hidden md:table-cell">Vergi No</TableHead>
                  <TableHead className="hidden lg:table-cell">Iletisim</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id} className="group">
                    <TableCell>
                      <Link href={`/contacts/${contact.id}`} className="group/link">
                        <p className="font-medium text-sm group-hover/link:text-primary transition-colors flex items-center gap-1">
                          {contact.name}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-60 transition-opacity" />
                        </p>
                      </Link>
                      {contact.tax_office && (
                        <p className="text-xs text-muted-foreground">{contact.tax_office}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge className={`text-xs font-normal ${typeColors[contact.type] || ""}`}>
                        {typeLabels[contact.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground font-mono">
                      {contact.tax_id || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {contact.phone}
                          </span>
                        )}
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {contact.email}
                          </span>
                        )}
                        {!contact.phone && !contact.email && "-"}
                      </div>
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" />
                              Duzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              className="cursor-pointer"
                              onClick={() => handleDelete(contact.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      {search || typeFilter !== "all"
                        ? "Kisi bulunamadi"
                        : "Henuz kisi yok. Ilk musterinizi veya tedarikinizi ekleyin!"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Contact Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Kisi Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tur *</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v ?? "customer")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Musteri</SelectItem>
                  <SelectItem value="supplier">Tedarikci</SelectItem>
                  <SelectItem value="both">Musteri & Tedarikci</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cName">Ad / Firma Adi *</Label>
              <Input id="cName" placeholder="Firma veya kisi adi" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cTaxId">Vergi No / TC</Label>
                <Input id="cTaxId" placeholder="1234567890" value={newTaxId} onChange={(e) => setNewTaxId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cTaxOffice">Vergi Dairesi</Label>
                <Input id="cTaxOffice" placeholder="Kadikoy VD" value={newTaxOffice} onChange={(e) => setNewTaxOffice(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cPhone">Telefon</Label>
                <Input id="cPhone" placeholder="0532 xxx xx xx" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cEmail">E-posta</Label>
                <Input id="cEmail" type="email" placeholder="info@firma.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cAddress">Adres</Label>
              <Textarea id="cAddress" placeholder="Firma adresi" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cNotes">Notlar</Label>
              <Input id="cNotes" placeholder="Ek notlar" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
              Iptal
            </Button>
            <Button onClick={handleCreate} disabled={saving || !newName}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
