"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  ScanLine,
  Bell,
  Building2,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";

const pathLabels: Record<string, string> = {
  "/": "Genel Bakis",
  "/transactions": "Islemler",
  "/transactions/new": "Yeni Islem",
  "/invoices": "Faturalar",
  "/invoices/new": "Yeni Fatura",
  "/receipts": "Fisler",
  "/receipts/scan": "Fis Tara",
  "/reports": "Raporlar",
  "/reports/profit-loss": "Kar-Zarar",
  "/reports/balance-sheet": "Bilanco",
  "/reports/cash-flow": "Nakit Akis",
  "/accounts": "Hesap Plani",
  "/contacts": "Rehber",
  "/bank": "Banka",
  "/bank/reconcile": "Mutabakat",
  "/settings": "Ayarlar",
  "/settings/organization": "Organizasyon",
  "/settings/users": "Kullanicilar",
  "/settings/categories": "Kategoriler",
  "/settings/currencies": "Para Birimleri",
};

function getBreadcrumbs(pathname: string) {
  if (pathname === "/") return [{ label: "Genel Bakis", href: "/" }];

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let currentPath = "";

  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = pathLabels[currentPath] || segment;
    crumbs.push({ label, href: currentPath });
  }

  return crumbs;
}

export function DashboardHeader() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md px-4">
      {/* Sidebar toggle */}
      <SidebarTrigger className="-ml-1 h-8 w-8 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-5" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.href} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Right Actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Quick Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-amber-500 dark:to-amber-600 text-white dark:text-slate-900 shadow-sm hover:shadow-md transition-shadow"
              />
            }
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Yeni</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem render={<Link href="/transactions/new" />} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Islem
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/receipts/scan" />} className="cursor-pointer">
              <ScanLine className="mr-2 h-4 w-4" />
              Fis Tara
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/invoices/new" />} className="cursor-pointer">
              <Building2 className="mr-2 h-4 w-4" />
              Yeni Fatura
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8" />
            }
          >
            <Sun className="h-4 w-4 text-muted-foreground rotate-0 scale-100 transition-transform dark:rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 text-muted-foreground rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Tema degistir</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Acik
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Koyu
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("system")}>
              <Monitor className="mr-2 h-4 w-4" />
              Sistem
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-amber text-[0.55rem] font-bold text-amber-foreground flex items-center justify-center">
            3
          </span>
        </Button>
      </div>
    </header>
  );
}
