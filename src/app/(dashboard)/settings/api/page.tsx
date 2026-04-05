"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  EyeOff,
  AlertTriangle,
  Power,
  PowerOff,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import {
  getApiKeys,
  generateApiKey,
  revokeApiKey,
  deleteApiKey,
  getWebhooks,
  createWebhook,
  deleteWebhook,
  toggleWebhook,
} from "@/lib/actions/api-keys";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}

const WEBHOOK_EVENTS = [
  { value: "transaction.created", label: "İşlem oluşturuldu" },
  { value: "transaction.deleted", label: "İşlem silindi" },
  { value: "invoice.created", label: "Fatura oluşturuldu" },
  { value: "invoice.updated", label: "Fatura güncellendi" },
  { value: "invoice.paid", label: "Fatura ödendi" },
  { value: "contact.created", label: "Rehber kaydı oluşturuldu" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export default function ApiSettingsPage() {
  const { organization, user, role } = useAuthStore();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);

  // API Key oluşturma dialog
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyPerms, setKeyPerms] = useState<string[]>(["read"]);
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Webhook oluşturma dialog
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["transaction.created"]);
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  // Silme onayı
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);

  const [loadTrigger, setLoadTrigger] = useState(0);

  function load() {
    setLoadTrigger((n) => n + 1);
  }

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;

    setLoading(true);
    Promise.all([
      getApiKeys(organization.id),
      getWebhooks(organization.id),
    ]).then(([keys, hooks]) => {
      if (cancelled) return;
      setApiKeys(keys as ApiKey[]);
      setWebhooks(hooks as WebhookRow[]);
      setLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, loadTrigger]);

  async function handleCreateKey() {
    if (!organization?.id || !user?.id) return;
    setCreating(true);
    const result = await generateApiKey({
      organization_id: organization.id,
      name: keyName,
      permissions: keyPerms,
      created_by: user.id,
    });
    if (result.error) {
      toast.error("API anahtarı oluşturulamadı", { description: result.error });
    } else {
      setNewRawKey(result.data!.raw_key);
      load();
    }
    setCreating(false);
  }

  async function handleRevokeKey(id: string) {
    const result = await revokeApiKey(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Anahtar devre dışı bırakıldı");
      load();
    }
  }

  async function handleDeleteKey(id: string) {
    const result = await deleteApiKey(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Anahtar silindi");
      setDeleteKeyId(null);
      load();
    }
  }

  async function handleCreateWebhook() {
    if (!organization?.id || !user?.id) return;
    setCreatingWebhook(true);
    const result = await createWebhook({
      organization_id: organization.id,
      name: webhookName,
      url: webhookUrl,
      events: webhookEvents,
      created_by: user.id,
    });
    if (result.error) {
      toast.error("Webhook oluşturulamadı", { description: result.error });
    } else {
      toast.success("Webhook oluşturuldu");
      setShowCreateWebhook(false);
      setWebhookName("");
      setWebhookUrl("");
      setWebhookEvents(["transaction.created"]);
      load();
    }
    setCreatingWebhook(false);
  }

  async function handleDeleteWebhook(id: string) {
    const result = await deleteWebhook(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Webhook silindi");
      setDeleteWebhookId(null);
      load();
    }
  }

  async function handleToggleWebhook(id: string, current: boolean) {
    const result = await toggleWebhook(id, !current);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(current ? "Webhook durduruldu" : "Webhook etkinleştirildi");
      load();
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Bu sayfaya erişim için yönetici yetkisi gereklidir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API & Entegrasyon</h1>
        <p className="text-sm text-muted-foreground mt-1">
          REST API anahtarları ve webhook yapılandırması
        </p>
      </div>

      {/* API Endpoint Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium">Temel URL</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-sm bg-muted px-3 py-1.5 rounded-md font-mono">
            {typeof window !== "undefined" ? window.location.origin : ""}/api/v1
          </code>
          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <p><code className="text-foreground">GET /api/v1/transactions</code> — İşlem listesi</p>
            <p><code className="text-foreground">POST /api/v1/transactions</code> — İşlem oluştur (write yetkisi)</p>
            <p><code className="text-foreground">GET /api/v1/invoices</code> — Fatura listesi</p>
            <p><code className="text-foreground">GET /api/v1/contacts</code> — Rehber listesi</p>
            <p className="mt-2 italic">Kimlik doğrulama: <code className="text-foreground">Authorization: Bearer {"<api_key>"}</code></p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Anahtarları
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCreateKey(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Yeni Anahtar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Henüz API anahtarı yok
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Yetkiler</TableHead>
                  <TableHead>Son Kullanım</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="text-sm font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {key.key_prefix}...
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {key.permissions.map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            {p === "read" ? "Okuma" : "Yazma"}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(key.last_used_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.is_active ? "default" : "secondary"} className="text-xs">
                        {key.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {key.is_active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            title="Devre dışı bırak"
                            onClick={() => handleRevokeKey(key.id)}
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteKeyId(key.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCreateWebhook(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Yeni Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Henüz webhook yok
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Olaylar</TableHead>
                  <TableHead>Başarısızlık</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((hook) => (
                  <TableRow key={hook.id}>
                    <TableCell className="text-sm font-medium">{hook.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                      {hook.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {hook.events.slice(0, 2).map((e) => (
                          <Badge key={e} variant="outline" className="text-[0.65rem]">
                            {e}
                          </Badge>
                        ))}
                        {hook.events.length > 2 && (
                          <Badge variant="outline" className="text-[0.65rem]">
                            +{hook.events.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hook.failure_count > 0 ? (
                        <span className="text-xs text-destructive font-medium">
                          {hook.failure_count} hata
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={hook.is_active ? "default" : "secondary"} className="text-xs">
                        {hook.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          title={hook.is_active ? "Durdur" : "Etkinleştir"}
                          onClick={() => handleToggleWebhook(hook.id, hook.is_active)}
                        >
                          {hook.is_active ? (
                            <PowerOff className="h-3.5 w-3.5" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteWebhookId(hook.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog
        open={showCreateKey && !newRawKey}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateKey(false);
            setKeyName("");
            setKeyPerms(["read"]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni API Anahtarı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="keyName">Ad *</Label>
              <Input
                id="keyName"
                placeholder="Örn: Muhasebe Entegrasyonu"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Yetkiler</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="perm-read"
                    checked={keyPerms.includes("read")}
                    onCheckedChange={(checked) => {
                      if (checked) setKeyPerms((p) => [...p, "read"]);
                      else setKeyPerms((p) => p.filter((x) => x !== "read"));
                    }}
                  />
                  <Label htmlFor="perm-read" className="font-normal cursor-pointer">Okuma</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="perm-write"
                    checked={keyPerms.includes("write")}
                    onCheckedChange={(checked) => {
                      if (checked) setKeyPerms((p) => [...p, "write"]);
                      else setKeyPerms((p) => p.filter((x) => x !== "write"));
                    }}
                  />
                  <Label htmlFor="perm-write" className="font-normal cursor-pointer">Yazma</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateKey(false)}>İptal</Button>
            <Button
              onClick={handleCreateKey}
              disabled={creating || !keyName || keyPerms.length === 0}
            >
              {creating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Raw Key Dialog */}
      <Dialog open={!!newRawKey} onOpenChange={() => { setNewRawKey(null); setShowCreateKey(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Anahtarınız Hazır</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Bu anahtar yalnızca bir kez gösterilir. Şimdi kopyalayın!
            </p>
            <div className="flex items-center gap-2 bg-muted rounded-md p-3">
              <code className="text-xs font-mono flex-1 break-all">{newRawKey}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => copyKey(newRawKey!)}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setNewRawKey(null); setShowCreateKey(false); }}>
              Anladım, kopyaladım
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="whName">Ad *</Label>
              <Input
                id="whName"
                placeholder="Örn: Slack Bildirimleri"
                value={webhookName}
                onChange={(e) => setWebhookName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whUrl">URL *</Label>
              <Input
                id="whUrl"
                type="url"
                placeholder="https://example.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Olaylar *</Label>
              <div className="space-y-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <div key={ev.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`ev-${ev.value}`}
                      checked={webhookEvents.includes(ev.value)}
                      onCheckedChange={(checked) => {
                        if (checked) setWebhookEvents((e) => [...e, ev.value]);
                        else setWebhookEvents((e) => e.filter((x) => x !== ev.value));
                      }}
                    />
                    <Label htmlFor={`ev-${ev.value}`} className="font-normal text-sm cursor-pointer">
                      <span className="font-mono text-xs text-muted-foreground mr-2">{ev.value}</span>
                      {ev.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWebhook(false)}>İptal</Button>
            <Button
              onClick={handleCreateWebhook}
              disabled={creatingWebhook || !webhookName || !webhookUrl || webhookEvents.length === 0}
            >
              {creatingWebhook && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Key Confirmation */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anahtarı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu API anahtarını kalıcı olarak silmek istediğinize emin misiniz?
              Bu anahtarı kullanan uygulamalar artık erişemeyecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteKeyId && handleDeleteKey(deleteKeyId)}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Webhook Confirmation */}
      <AlertDialog open={!!deleteWebhookId} onOpenChange={() => setDeleteWebhookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Webhook Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu webhook&apos;u kalıcı olarak silmek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteWebhookId && handleDeleteWebhook(deleteWebhookId)}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
