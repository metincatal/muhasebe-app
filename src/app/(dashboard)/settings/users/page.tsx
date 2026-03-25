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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserCog,
  Plus,
  Loader2,
  Trash2,
  MoreHorizontal,
  Mail,
  Shield,
  Users,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import {
  getMembers,
  updateMemberRole,
  removeMember,
  createInvitation,
  getInvitations,
  deleteInvitation,
} from "@/lib/actions/members";
import { toast } from "sonner";

interface Member {
  id: string;
  role: string;
  created_at: string;
  user_id: string;
  user_profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

const roleLabels: Record<string, string> = {
  admin: "Yonetici",
  accountant: "Muhasebeci",
  viewer: "Izleyici",
};

const roleColors: Record<string, string> = {
  admin: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  accountant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  viewer: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

export default function UsersSettingsPage() {
  const { organization, user, role: currentUserRole } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [saving, setSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const [membersData, invitationsData] = await Promise.all([
      getMembers(organization.id),
      getInvitations(organization.id),
    ]);
    setMembers(
      (membersData as unknown as Member[]).map((m) => ({
        ...m,
        user_profiles: m.user_profiles as unknown as Member["user_profiles"],
      }))
    );
    setInvitations(invitationsData as Invitation[]);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleInvite() {
    if (!organization?.id) return;
    setSaving(true);

    const result = await createInvitation(organization.id, inviteEmail, inviteRole);
    if (result.error) {
      toast.error("Davet gonderilemedi", { description: result.error });
    } else {
      toast.success("Davet olusturuldu", { description: `${inviteEmail} adresine davet gonderildi.` });
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("viewer");
      loadData();
    }
    setSaving(false);
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    const result = await updateMemberRole(memberId, newRole);
    if (result.error) {
      toast.error("Rol guncellenemedi");
    } else {
      toast.success("Rol guncellendi");
      loadData();
    }
  }

  async function handleRemoveMember(memberId: string) {
    const result = await removeMember(memberId);
    if (result.error) {
      toast.error("Uye kaldirilamadi");
    } else {
      toast.success("Uye kaldirildi");
      loadData();
    }
  }

  async function handleDeleteInvitation(id: string) {
    const result = await deleteInvitation(id);
    if (result.error) {
      toast.error("Davet silinemedi");
    } else {
      toast.success("Davet iptal edildi");
      loadData();
    }
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success("Davet linki kopyalandi");
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const isAdmin = currentUserRole === "admin";
  const pendingInvitations = invitations.filter((i) => !i.accepted_at);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kullanici Yonetimi</h1>
          <p className="text-sm text-muted-foreground mt-1">Ekip uyeleri ve davetler</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowInviteDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Davet Gonder
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Toplam Uye</p>
              <p className="text-lg font-bold">{members.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-amber/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-amber" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Yonetici</p>
              <p className="text-lg font-bold">{members.filter((m) => m.role === "admin").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Mail className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bekleyen Davet</p>
              <p className="text-lg font-bold">{pendingInvitations.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Members Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Ekip Uyeleri ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanici</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Katilma Tarihi</TableHead>
                    {isAdmin && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const profile = member.user_profiles;
                    const name = profile?.full_name || "Isimsiz";
                    const initials = name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    const isCurrentUser = member.user_id === user?.id;

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {name}
                                {isCurrentUser && (
                                  <span className="text-xs text-muted-foreground ml-1">(Sen)</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${roleColors[member.role] || ""}`}>
                            {roleLabels[member.role] || member.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(member.created_at).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {!isCurrentUser && (
                              <DropdownMenu>
                                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {member.role !== "admin" && (
                                    <DropdownMenuItem onClick={() => handleRoleChange(member.id, "admin")}>
                                      <Shield className="mr-2 h-4 w-4" />
                                      Yonetici Yap
                                    </DropdownMenuItem>
                                  )}
                                  {member.role !== "accountant" && (
                                    <DropdownMenuItem onClick={() => handleRoleChange(member.id, "accountant")}>
                                      <UserCog className="mr-2 h-4 w-4" />
                                      Muhasebeci Yap
                                    </DropdownMenuItem>
                                  )}
                                  {member.role !== "viewer" && (
                                    <DropdownMenuItem onClick={() => handleRoleChange(member.id, "viewer")}>
                                      <Users className="mr-2 h-4 w-4" />
                                      Izleyici Yap
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => handleRemoveMember(member.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Kaldir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Bekleyen Davetler ({pendingInvitations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Son Kullanma</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((inv) => {
                      const expired = new Date(inv.expires_at) < new Date();
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="text-sm font-medium">{inv.email}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${roleColors[inv.role] || ""}`}>
                              {roleLabels[inv.role] || inv.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {expired ? (
                              <Badge variant="secondary" className="text-xs text-destructive">
                                Suresi dolmus
                              </Badge>
                            ) : (
                              new Date(inv.expires_at).toLocaleDateString("tr-TR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!expired && (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => copyInviteLink(inv.token)}
                                >
                                  {copiedToken === inv.token ? (
                                    <Check className="h-3.5 w-3.5 text-success" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteInvitation(inv.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Davet Gonder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">E-posta Adresi *</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="ornek@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v ?? "viewer")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Yonetici — Tam yetki</SelectItem>
                  <SelectItem value="accountant">Muhasebeci — Islem yapabilir</SelectItem>
                  <SelectItem value="viewer">Izleyici — Sadece goruntuler</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Davet 7 gun boyunca gecerlidir. Kullanici daveti kabul edene kadar bekleyen davetler listesinde gorunur.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Iptal
            </Button>
            <Button onClick={handleInvite} disabled={saving || !inviteEmail}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              <Mail className="mr-1.5 h-4 w-4" />
              Davet Gonder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
