"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Loader2, Building2, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { getInvoiceWithItems } from "@/lib/actions/invoices";
import { generateInvoicePdf } from "@/lib/pdf/invoice";
import { toast } from "sonner";

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

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number | string;
  unit: string | null;
  unit_price: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total: number | string;
  sort_order: number;
}

interface InvoiceData {
  id: string;
  type: string;
  invoice_number: string | null;
  date: string;
  due_date: string | null;
  status: string;
  counterparty_name: string;
  counterparty_tax_id: string | null;
  counterparty_address: string | null;
  subtotal: number | string;
  tax_amount: number | string;
  total: number | string;
  currency: string;
  notes: string | null;
  invoice_items: InvoiceItem[];
}

interface OrgData {
  name: string;
  tax_id: string | null;
  tax_office: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getInvoiceWithItems(id);
      if (result.error || !result.data) {
        toast.error("Fatura bulunamadi");
        router.push("/invoices");
        return;
      }
      setInvoice(result.data.invoice as InvoiceData);
      setOrg(result.data.org as OrgData);
      setLoading(false);
    }
    load();
  }, [id, router]);

  function handleDownloadPdf() {
    if (!invoice || !org) return;
    generateInvoicePdf(invoice, org);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) return null;

  const items = (invoice.invoice_items || []).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/invoices" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {invoice.invoice_number ? `Fatura #${invoice.invoice_number}` : "Fatura"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {invoice.type === "sales" ? "Satis Faturasi" : "Alis Faturasi"} ·{" "}
              {new Date(invoice.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs font-normal ${statusColors[invoice.status] || ""}`}>
            {statusLabels[invoice.status] || invoice.status}
          </Badge>
          <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
            <Download className="mr-1.5 h-4 w-4" />
            PDF Indir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {org && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Satici
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold">{org.name}</p>
              {org.tax_id && <p className="text-muted-foreground">VKN: {org.tax_id}</p>}
              {org.tax_office && <p className="text-muted-foreground">{org.tax_office} V.D.</p>}
              {org.address && <p className="text-muted-foreground">{org.address}</p>}
              {org.phone && <p className="text-muted-foreground">{org.phone}</p>}
              {org.email && <p className="text-muted-foreground">{org.email}</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Alici
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{invoice.counterparty_name}</p>
            {invoice.counterparty_tax_id && (
              <p className="text-muted-foreground">VKN: {invoice.counterparty_tax_id}</p>
            )}
            {invoice.counterparty_address && (
              <p className="text-muted-foreground">{invoice.counterparty_address}</p>
            )}
            {invoice.due_date && (
              <p className="text-muted-foreground">
                Vade: {new Date(invoice.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aciklama</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead className="hidden sm:table-cell">Birim</TableHead>
                <TableHead className="text-right">Birim Fiyat</TableHead>
                <TableHead className="text-right hidden sm:table-cell">KDV %</TableHead>
                <TableHead className="text-right hidden sm:table-cell">KDV</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{item.unit || "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(Number(item.unit_price), invoice.currency)}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                    %{item.tax_rate}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell text-muted-foreground tabular-nums">
                    {formatCurrency(Number(item.tax_amount), invoice.currency)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(Number(item.total), invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Card className="w-full sm:w-72">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ara Toplam</span>
              <span className="tabular-nums">{formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">KDV</span>
              <span className="tabular-nums">{formatCurrency(Number(invoice.tax_amount), invoice.currency)}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-lg pt-2 border-t">
              <span>Genel Toplam</span>
              <span className="tabular-nums">{formatCurrency(Number(invoice.total), invoice.currency)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {invoice.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Notlar</p>
            <p className="text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
