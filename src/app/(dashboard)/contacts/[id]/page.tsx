"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  FileText,
  TrendingUp,
  TrendingDown,
  Scale,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Hash,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAuthStore } from "@/stores/auth-store";
import { getContactStatement } from "@/lib/actions/contacts";

interface StatementRow {
  id: string;
  date: string;
  docNo: string;
  description: string;
  rowType: "invoice" | "transaction";
  invoiceType?: string;
  transactionType?: string;
  status?: string;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
}

interface Contact {
  id: string;
  name: string;
  type: string;
  tax_id: string | null;
  tax_office: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
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
  cancelled: "bg-muted text-muted-foreground",
};

const typeLabels: Record<string, string> = {
  customer: "Musteri",
  supplier: "Tedarikci",
  both: "Musteri/Tedarikci",
};

export default function ContactDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { organization, isLoading: authLoading } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<Contact | null>(null);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [netBalance, setNetBalance] = useState(0);

  useEffect(() => {
    if (authLoading || !organization?.id) return;

    async function load() {
      setLoading(true);
      const result = await getContactStatement(organization!.id, id);
      if (result.data) {
        setContact(result.data.contact as Contact);
        setRows(result.data.rows as StatementRow[]);
        setTotalDebit(result.data.totalDebit);
        setTotalCredit(result.data.totalCredit);
        setNetBalance(result.data.netBalance);
      }
      setLoading(false);
    }

    load();
  }, [organization?.id, authLoading, id]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Kisi bulunamadi.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/contacts" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{contact.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {typeLabels[contact.type] || contact.type}
              </Badge>
              {contact.tax_id && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {contact.tax_id}
                  {contact.tax_office ? ` — ${contact.tax_office}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info + Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contact details */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Iletisim Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="break-all">{contact.email}</span>
              </div>
            )}
            {contact.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{contact.address}</span>
              </div>
            )}
            {!contact.phone && !contact.email && !contact.address && (
              <span className="text-xs">Iletisim bilgisi yok</span>
            )}
          </CardContent>
        </Card>

        {/* Debit — Borç (satış faturaları + yapılan ödemeler) */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Toplam Borc</p>
              <TrendingUp className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-2xl font-bold mt-2 text-destructive">
              {formatCurrency(totalDebit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Satis faturalari + yapilan odeme</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/40 to-destructive/10" />
        </Card>

        {/* Credit — Alacak (tahsilatlar + alış faturaları) */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Toplam Alacak</p>
              <TrendingDown className="h-5 w-5 text-success" />
            </div>
            <p className="text-2xl font-bold mt-2 text-success">
              {formatCurrency(totalCredit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Tahsilat + alis faturalari</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-success/40 to-success/10" />
        </Card>

        {/* Net Balance */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Net Bakiye</p>
              <Scale className="h-5 w-5 text-amber-500" />
            </div>
            <p className={`text-2xl font-bold mt-2 ${netBalance >= 0 ? "text-destructive" : "text-success"}`}>
              {formatCurrency(Math.abs(netBalance))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {netBalance > 0 ? "Bize borclu" : netBalance < 0 ? "Bizden alacakli" : "Acik hesap yok"}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400/40 to-amber-400/10" />
        </Card>
      </div>

      {/* Statement Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Hesap Ekstresi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Belge No</TableHead>
                <TableHead>Aciklama</TableHead>
                <TableHead className="hidden sm:table-cell">Durum</TableHead>
                <TableHead className="text-right">Borc</TableHead>
                <TableHead className="text-right">Alacak</TableHead>
                <TableHead className="text-right">Bakiye</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Bu kisiye ait hareket bulunamadi
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.id} className={row.rowType === "invoice" ? "" : "bg-muted/20"}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(row.date).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {row.docNo}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.description}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {row.status ? (
                      <Badge className={`text-xs font-normal ${statusColors[row.status] || ""}`}>
                        {statusLabels[row.status] || row.status}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {row.transactionType === "income" ? "Tahsilat" : "Odeme"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-destructive">
                    {row.debit > 0 ? formatCurrency(row.debit, row.currency) : ""}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-success">
                    {row.credit > 0 ? formatCurrency(row.credit, row.currency) : ""}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums font-semibold text-sm ${row.balance >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(Math.abs(row.balance))}
                    <span className="text-xs font-normal ml-1 text-muted-foreground">
                      {row.balance > 0 ? "A" : row.balance < 0 ? "B" : ""}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length > 0 && (
                <TableRow className="border-t-2 bg-muted/30 font-bold">
                  <TableCell colSpan={4} className="text-sm">TOPLAM</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-destructive">
                    {formatCurrency(totalDebit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-success">
                    {formatCurrency(totalCredit)}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums text-sm ${netBalance >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(Math.abs(netBalance))}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
