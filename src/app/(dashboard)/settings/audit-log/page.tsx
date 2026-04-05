"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import {
  ClipboardList,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { getAuditLogs, getAuditLogsCount } from "@/lib/actions/audit-log";

const PAGE_SIZE = 25;

interface AuditLog {
  id: string;
  action: "create" | "update" | "delete";
  table_name: string;
  record_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  user_profiles: { full_name: string } | null;
}

const tableLabels: Record<string, string> = {
  transactions: "İşlemler",
  invoices: "Faturalar",
  contacts: "Rehber",
  receipts: "Fişler",
  categories: "Kategoriler",
  bank_accounts: "Banka Hesapları",
};

const actionConfig = {
  create: { label: "Oluşturuldu", variant: "default" as const, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  update: { label: "Güncellendi", variant: "secondary" as const, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  delete: { label: "Silindi", variant: "destructive" as const, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AuditLogPage() {
  const { organization } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filterTable, setFilterTable] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;

    setLoading(true);
    Promise.all([
      getAuditLogs(organization.id, {
        table_name: filterTable,
        action: filterAction,
        limit: PAGE_SIZE,
        offset,
      }),
      getAuditLogsCount(organization.id, {
        table_name: filterTable,
        action: filterAction,
      }),
    ]).then(([data, count]) => {
      if (cancelled) return;
      setLogs(data as AuditLog[]);
      setTotal(count);
      setLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, filterTable, filterAction, offset]);

  function handleFilterChange() {
    setOffset(0);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İşlem Günlüğü</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organizasyonda yapılan tüm değişikliklerin kaydı
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2 flex-1">
              <ClipboardList className="h-4 w-4" />
              Günlük Kayıtları
              {total > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs font-normal">
                  {total}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={filterTable}
                onValueChange={(v) => {
                  setFilterTable(v ?? "all");
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Tüm tablolar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Tablolar</SelectItem>
                  <SelectItem value="transactions">İşlemler</SelectItem>
                  <SelectItem value="invoices">Faturalar</SelectItem>
                  <SelectItem value="contacts">Rehber</SelectItem>
                  <SelectItem value="receipts">Fişler</SelectItem>
                  <SelectItem value="categories">Kategoriler</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterAction}
                onValueChange={(v) => {
                  setFilterAction(v ?? "all");
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Tüm işlemler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm İşlemler</SelectItem>
                  <SelectItem value="create">Oluşturuldu</SelectItem>
                  <SelectItem value="update">Güncellendi</SelectItem>
                  <SelectItem value="delete">Silindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Henüz kayıt yok</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Tarih</TableHead>
                  <TableHead className="w-32">Kullanıcı</TableHead>
                  <TableHead className="w-24">İşlem</TableHead>
                  <TableHead className="w-32">Tablo</TableHead>
                  <TableHead>Kayıt ID</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const ac = actionConfig[log.action];
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user_profiles?.full_name ?? (
                          <span className="text-muted-foreground text-xs">Bilinmiyor</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ac.color}`}>
                          {ac.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tableLabels[log.table_name] ?? log.table_name}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-xs">
                        {log.record_id}
                      </TableCell>
                      <TableCell>
                        {(log.old_data || log.new_data) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setDetailLog(log)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total} kayıt
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={currentPage === 1}
                  onClick={() => setOffset(offset - PAGE_SIZE)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={currentPage === totalPages}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Değişiklik Detayı</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Tarih:</span>{" "}
                  {formatDate(detailLog.created_at)}
                </div>
                <div>
                  <span className="font-medium text-foreground">Kullanıcı:</span>{" "}
                  {detailLog.user_profiles?.full_name ?? "Bilinmiyor"}
                </div>
                <div>
                  <span className="font-medium text-foreground">İşlem:</span>{" "}
                  {actionConfig[detailLog.action].label}
                </div>
                <div>
                  <span className="font-medium text-foreground">Tablo:</span>{" "}
                  {tableLabels[detailLog.table_name] ?? detailLog.table_name}
                </div>
              </div>

              {detailLog.old_data && (
                <div>
                  <p className="font-medium mb-1.5 text-destructive">Önceki Değer</p>
                  <pre className="bg-muted/50 rounded-md p-3 text-xs overflow-x-auto font-mono leading-relaxed">
                    {JSON.stringify(detailLog.old_data, null, 2)}
                  </pre>
                </div>
              )}

              {detailLog.new_data && (
                <div>
                  <p className="font-medium mb-1.5 text-green-600 dark:text-green-400">Yeni Değer</p>
                  <pre className="bg-muted/50 rounded-md p-3 text-xs overflow-x-auto font-mono leading-relaxed">
                    {JSON.stringify(detailLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
