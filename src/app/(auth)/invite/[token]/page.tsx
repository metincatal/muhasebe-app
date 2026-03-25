"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock, User } from "lucide-react";

export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Verify invitation token via API
      const res = await fetch(`/api/auth/invite?token=${token}`);
      const invitation = await res.json();

      if (!res.ok || !invitation.email) {
        toast.error("Gecersiz veya suresi dolmus davet");
        return;
      }

      // Sign up with the invited email
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast.error("Kayit basarisiz", { description: error.message });
        return;
      }

      // Kullaniciyi organizasyona ekle
      if (signUpData.user) {
        const acceptRes = await fetch("/api/auth/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, user_id: signUpData.user.id }),
        });

        if (!acceptRes.ok) {
          const err = await acceptRes.json();
          toast.error("Organizasyona eklenemedi", { description: err.error });
          return;
        }
      }

      toast.success("Kayit basarili! Hosgeldiniz.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Bir hata olustu");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-xl shadow-black/5">
      <CardHeader>
        <CardTitle className="text-center">Davete Katil</CardTitle>
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
