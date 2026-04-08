"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore, type Membership } from "@/stores/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const { setUser, setOrganization, setRole, setMemberships, setLoading, reset } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function loadUserData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          reset();
          router.push("/login");
          return;
        }

        // Profil bilgisi
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUser({
            id: profile.id,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
            email: user.email || "",
          });
        }

        // Tüm aktif üyelikler
        const { data: memberRows } = await supabase
          .from("organization_members")
          .select("organization_id, role")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("accepted_at", { ascending: false });

        if (!memberRows || memberRows.length === 0) {
          setLoading(false);
          return;
        }

        const orgIds = memberRows.map((m) => m.organization_id);

        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name, type, default_currency")
          .in("id", orgIds);

        if (!orgs) {
          setLoading(false);
          return;
        }

        const memberships: Membership[] = memberRows
          .map((m) => {
            const org = orgs.find((o) => o.id === m.organization_id);
            if (!org) return null;
            return {
              orgId: org.id,
              orgName: org.name,
              orgType: org.type as "individual" | "corporate",
              defaultCurrency: org.default_currency,
              role: m.role as "admin" | "accountant" | "viewer",
            };
          })
          .filter((m): m is Membership => m !== null);

        setMemberships(memberships);

        // Aktif org: localStorage > ilk üyelik
        const lastUsedOrgId = typeof window !== "undefined"
          ? localStorage.getItem("lastUsedOrgId")
          : null;

        const activeMembership =
          (lastUsedOrgId && memberships.find((m) => m.orgId === lastUsedOrgId)) ||
          memberships[0];

        if (activeMembership) {
          setOrganization({
            id: activeMembership.orgId,
            name: activeMembership.orgName,
            type: activeMembership.orgType,
            defaultCurrency: activeMembership.defaultCurrency,
          });
          setRole(activeMembership.role);

          // Varsayılan kategorileri kontrol et, yoksa oluştur
          const { count } = await supabase
            .from("categories")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", activeMembership.orgId);

          if (count === 0) {
            await seedDefaultCategories(activeMembership.orgId);
          }
        }
      } catch (err) {
        console.error("Auth load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          reset();
          router.push("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function seedDefaultCategories(orgId: string) {
    const incomeCategories = [
      { name: "Satis Geliri", icon: "shopping-bag", color: "#22c55e" },
      { name: "Hizmet Geliri", icon: "briefcase", color: "#3b82f6" },
      { name: "Faiz Geliri", icon: "percent", color: "#8b5cf6" },
      { name: "Kira Geliri", icon: "home", color: "#f59e0b" },
      { name: "Yatirim Geliri", icon: "trending-up", color: "#06b6d4" },
      { name: "Diger Gelir", icon: "plus-circle", color: "#6b7280" },
    ];

    const expenseCategories = [
      { name: "Kira", icon: "home", color: "#ef4444" },
      { name: "Maas & Personel", icon: "users", color: "#f97316" },
      { name: "Market & Gida", icon: "shopping-cart", color: "#84cc16" },
      { name: "Ulasim & Yakit", icon: "car", color: "#06b6d4" },
      { name: "Faturalar", icon: "zap", color: "#eab308" },
      { name: "Iletisim", icon: "phone", color: "#8b5cf6" },
      { name: "Ofis & Kirtasiye", icon: "file-text", color: "#64748b" },
      { name: "Pazarlama & Reklam", icon: "megaphone", color: "#ec4899" },
      { name: "Sigorta", icon: "shield", color: "#14b8a6" },
      { name: "Vergi & Harc", icon: "landmark", color: "#dc2626" },
      { name: "Bakim & Onarim", icon: "wrench", color: "#78716c" },
      { name: "Egitim", icon: "graduation-cap", color: "#6366f1" },
      { name: "Saglik", icon: "heart", color: "#f43f5e" },
      { name: "Diger Gider", icon: "minus-circle", color: "#9ca3af" },
    ];

    const rows = [
      ...incomeCategories.map((c) => ({
        organization_id: orgId,
        name: c.name,
        type: "income" as const,
        color: c.color,
        icon: c.icon,
        is_system: true,
      })),
      ...expenseCategories.map((c) => ({
        organization_id: orgId,
        name: c.name,
        type: "expense" as const,
        color: c.color,
        icon: c.icon,
        is_system: true,
      })),
    ];

    await supabase.from("categories").insert(rows);
  }

  return <>{children}</>;
}
