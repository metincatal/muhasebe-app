"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock, User, Mail } from "lucide-react";

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Sayfa açılınca token'ı doğrula ve email'i göster
  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/auth/invite?token=${token}`);
        const data = await res.json();
        if (!res.ok || !data.email) {
          setTokenValid(false);
        } else {
          setInvitedEmail(data.email);
          setTokenValid(true);
        }
      } catch {
        setTokenValid(false);
      }
    }
    validateToken();
  }, [token]);

  async function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Tüm işlemi server-side yap: kullanıcı oluştur + org'a ekle
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, full_name: fullName, password }),
      });

      let data: { success?: boolean; email?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        toast.error("Sunucu hatasi. Lutfen tekrar deneyin.");
        return;
      }

      if (!res.ok || !data.success) {
        toast.error("Kayit basarisiz", { description: data.error || "Bilinmeyen hata" });
        return;
      }

      // Server kullanıcıyı oluşturdu, şimdi giriş yap
      const email = data.email || invitedEmail;
      if (!email) {
        toast.error("Giris yapilamadi");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        toast.error("Hesap olusturuldu fakat giris yapilamadi", {
          description: "Lutfen giris sayfasindan giris yapin.",
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
            Bu davet linki gecersiz, suresi dolmus veya zaten kullanilmis.
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
      <form onSubmit={handleAcceptInvite}>
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
