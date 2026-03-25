"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Building2 } from "lucide-react";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<"individual" | "corporate">("individual");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            org_name: orgName || fullName,
            org_type: orgType,
          },
        },
      });

      if (error) {
        toast.error("Kayit basarisiz", { description: error.message });
        return;
      }

      if (data.user?.identities?.length === 0) {
        toast.error("Bu e-posta adresi zaten kayitli");
        return;
      }

      toast.success("Kayit basarili!", {
        description: "E-posta adresinizi dogrulayin veya giris yapin.",
      });
      router.push("/login");
    } catch {
      toast.error("Bir hata olustu");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-xl shadow-black/5">
      <form onSubmit={handleRegister}>
        <CardContent className="space-y-4 pt-6">
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
            <Label htmlFor="email">E-posta</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="ornek@firma.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Sifre</Label>
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
          <div className="space-y-2">
            <Label>Hesap Turu</Label>
            <Select value={orgType} onValueChange={(v) => setOrgType((v ?? "individual") as "individual" | "corporate")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Bireysel</SelectItem>
                <SelectItem value="corporate">Kurumsal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgName">
              {orgType === "corporate" ? "Firma Adi" : "Hesap Adi"}
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="orgName"
                placeholder={orgType === "corporate" ? "Firma Adi Ltd. Sti." : "Kisisel Hesabim"}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kayit Ol
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Zaten hesabiniz var mi?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Giris Yap
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
