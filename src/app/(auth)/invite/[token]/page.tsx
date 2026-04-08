"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock, User, Mail, CheckCircle, AlertTriangle } from "lucide-react";

type InviteData = {
  email: string;
  role: string;
  organization_id: string;
  userExists: boolean;
};

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const supabase = createClient();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Yeni kullanıcı form alanları
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  // Token doğrula + mevcut oturumu kontrol et
  useEffect(() => {
    async function init() {
      // Paralel: token doğrula + oturum kontrol et
      const [tokenRes, sessionRes] = await Promise.all([
        fetch(`/api/auth/invite?token=${token}`).then(async (r) => {
          let data: Record<string, unknown>;
          try {
            data = await r.json();
          } catch {
            return { ok: false, data: null as null, status: r.status };
          }
          return { ok: r.ok, data, status: r.status };
        }),
        supabase.auth.getUser(),
      ]);

      if (!tokenRes.ok || !tokenRes.data?.email) {
        setTokenValid(false);
        setErrorMessage(
          (tokenRes.data?.error as string) || `Bilinmeyen hata (HTTP ${tokenRes.status})`
        );
        return;
      }

      setInviteData(tokenRes.data as unknown as InviteData);
      setTokenValid(true);
      setCurrentUserEmail(sessionRes.data.user?.email ?? null);
    }

    init().catch((err) => {
      console.error("Invite init error:", err);
      setTokenValid(false);
      setErrorMessage("Sunucuya baglanamadi. Internet baglantinizi kontrol edin.");
    });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni kullanıcı kaydı
  async function handleNewUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, full_name: fullName, password }),
      });
      const data: { success?: boolean; email?: string; error?: string } = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        toast.error("Kayit basarisiz", { description: data.error || "Bilinmeyen hata" });
        return;
      }

      const email = data.email || inviteData?.email;
      if (!email) { toast.error("Giris yapilamadi"); return; }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        toast.error("Hesap olusturuldu fakat giris yapilamadi", {
          description: "Giris sayfasindan giris yapin.",
        });
        router.push("/login");
        return;
      }

      toast.success("Hosgeldiniz! Hesabiniz olusturuldu.");
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Invite error:", err);
      toast.error("Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  }

  // Mevcut kullanıcı: accept_only
  async function handleAcceptOnly() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, accept_only: true }),
      });
      const data: { success?: boolean; error?: string } = await res.json().catch(() => ({}));

      if (res.status === 409) {
        toast.info("Bu organizasyonun zaten uyesisiniz.");
        router.push("/");
        return;
      }

      if (!res.ok || !data.success) {
        toast.error("Davet kabul edilemedi", { description: data.error || "Bilinmeyen hata" });
        return;
      }

      toast.success("Davet kabul edildi! Hosgeldiniz.");
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Accept invite error:", err);
      toast.error("Beklenmeyen bir hata olustu.");
    } finally {
      setIsLoading(false);
    }
  }

  // --- Render ---

  if (tokenValid === null) {
    return (
      <Card className="border-0 shadow-xl shadow-black/5">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (tokenValid === false) {
    return (
      <Card className="border-0 shadow-xl shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-destructive">Gecersiz Davet</CardTitle>
          <CardDescription className="text-center">
            {errorMessage || "Bu davet linki gecersiz, suresi dolmus veya zaten kullanilmis."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button variant="outline" onClick={() => router.push("/login")}>
            Girise Don
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { email: invitedEmail, userExists } = inviteData!;

  // Kayıtlı kullanıcı — giriş yapmış, doğru hesap
  if (userExists && currentUserEmail === invitedEmail) {
    return (
      <Card className="border-0 shadow-xl shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center">Daveti Kabul Et</CardTitle>
          <CardDescription className="text-center flex items-center justify-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {invitedEmail}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-4">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <p className="text-sm text-muted-foreground text-center">
            Hesabiniz mevcut. Daveti kabul ederek organizasyona katilabilirsiniz.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleAcceptOnly} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Daveti Kabul Et
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Kayıtlı kullanıcı — giriş yapmış ama yanlış hesap
  if (userExists && currentUserEmail && currentUserEmail !== invitedEmail) {
    return (
      <Card className="border-0 shadow-xl shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center">Yanlis Hesap</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-2">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-sm text-muted-foreground text-center">
            Bu davet <strong>{invitedEmail}</strong> adresine ait. Simdi{" "}
            <strong>{currentUserEmail}</strong> ile giris yapilmis.
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Dogru hesapla giris yapip bu sayfaya geri donun.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push(`/login`);
            }}
          >
            Cikis Yap
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Kayıtlı kullanıcı — giriş yapmamış
  if (userExists && !currentUserEmail) {
    return (
      <Card className="border-0 shadow-xl shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center">Daveti Kabul Et</CardTitle>
          <CardDescription className="text-center flex items-center justify-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {invitedEmail}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Bu e-posta adresi sistemde kayitli. Devam etmek icin{" "}
            <strong>{invitedEmail}</strong> hesabinizla giris yapin, sonra bu sayfaya geri donun.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" variant="outline" onClick={() => router.push("/login")}>
            Giris Yap
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Yeni kullanıcı — kayıt formu
  return (
    <Card className="border-0 shadow-xl shadow-black/5">
      <CardHeader>
        <CardTitle className="text-center">Davete Katil</CardTitle>
        {invitedEmail && (
          <CardDescription className="text-center flex items-center justify-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {invitedEmail}
          </CardDescription>
        )}
      </CardHeader>
      <form onSubmit={handleNewUserSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Ad Soyad</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                placeholder="Adiniz Soyadiniz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Sifre Belirleyin</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Katil
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
