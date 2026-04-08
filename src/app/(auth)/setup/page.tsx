"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { createOrganization } from "@/lib/actions/organizations";

export default function SetupPage() {
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<"individual" | "corporate">("individual");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) return;

    setIsLoading(true);
    try {
      const result = await createOrganization(orgName.trim(), orgType);
      if (result.error) {
        toast.error("Hata", { description: result.error });
        return;
      }
      toast.success("Organizasyon oluşturuldu");
      router.push("/");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-xl shadow-black/5">
      <CardHeader className="pb-2">
        <CardDescription>
          Hesabınız var, ancak henüz bir organizasyona bağlı değilsiniz. Devam etmek için bir organizasyon oluşturun.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Hesap Türü</Label>
            <Select value={orgType} onValueChange={(v) => setOrgType(v as "individual" | "corporate")}>
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
              {orgType === "corporate" ? "Firma Adı" : "Hesap Adı"}
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="orgName"
                placeholder={orgType === "corporate" ? "Firma Adı Ltd. Şti." : "Kişisel Hesabım"}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading || !orgName.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Organizasyon Oluştur ve Devam Et
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
