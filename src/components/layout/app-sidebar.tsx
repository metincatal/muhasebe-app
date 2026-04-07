"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Receipt,
  BarChart3,
  BookOpen,
  Users,
  Landmark,
  Settings,
  LogOut,
  ChevronsUpDown,
  User,
  ChevronRight,
  Calculator,
  Target,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";

const navItems = [
  { title: "Genel Bakis", url: "/", icon: LayoutDashboard },
  {
    title: "Islemler",
    url: "/transactions",
    icon: ArrowLeftRight,
    children: [
      { title: "Tum Islemler", url: "/transactions" },
      { title: "Tekrarlayan", url: "/transactions/recurring" },
    ],
  },
  { title: "Faturalar", url: "/invoices", icon: FileText },
  { title: "Fisler", url: "/receipts", icon: Receipt },
  { title: "KDV Takvimi", url: "/tax", icon: Calculator },
  { title: "Butce", url: "/budgets", icon: Target },
  {
    title: "Raporlar",
    url: "/reports",
    icon: BarChart3,
    children: [
      { title: "Genel Bakis", url: "/reports" },
      { title: "Kar-Zarar", url: "/reports/profit-loss" },
      { title: "Bilanco", url: "/reports/balance-sheet" },
      { title: "Nakit Akis", url: "/reports/cash-flow" },
      { title: "Karsilastirma", url: "/reports/comparison" },
    ],
  },
];

const managementItems = [
  { title: "Hesap Plani", url: "/accounts", icon: BookOpen },
  { title: "Rehber", url: "/contacts", icon: Users },
  {
    title: "Banka",
    url: "/bank",
    icon: Landmark,
    children: [
      { title: "Hesaplar", url: "/bank" },
      { title: "Mutabakat", url: "/bank/reconcile" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { user, organization, role } = useAuthStore();
  const menuRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    [...navItems, ...managementItems].forEach((item) => {
      if ("children" in item && item.children) {
        initial[item.url] = pathname.startsWith(item.url);
      }
    });
    initial["/settings"] = pathname.startsWith("/settings");
    return initial;
  });

  function toggleMenu(url: string) {
    const opening = !openMenus[url];
    setOpenMenus((prev) => ({ ...prev, [url]: opening }));
    if (opening) {
      setTimeout(() => {
        menuRefs.current[url]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
    }
  }

  function closeMobile() {
    if (isMobile) setOpenMobile(false);
  }

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "MP";

  const roleLabels: Record<string, string> = {
    admin: "Yonetici",
    accountant: "Muhasebeci",
    viewer: "Izleyici",
  };

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Cikis yapildi");
    router.push("/login");
    router.refresh();
  }

  function isActive(url: string) {
    if (url === "/") return pathname === "/";
    return pathname.startsWith(url);
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Logo */}
      <SidebarHeader className="pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-md">
                <Image src="/logo.png" alt="Siyakat" width={36} height={36} className="object-contain" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-semibold text-[0.9rem] tracking-tight">
                  Siyakat
                </span>
                <span className="text-[0.7rem] text-muted-foreground mt-0.5 truncate max-w-[120px]">
                  {organization?.name || "Finans Yonetimi"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground/70 font-medium">
            Ana Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item.url);
                if (item.children) {
                  return (
                    <Collapsible key={item.url} open={!!openMenus[item.url]} onOpenChange={() => toggleMenu(item.url)} className="group/collapsible">
                      <SidebarMenuItem ref={(el) => { menuRefs.current[item.url] = el; }}>
                        <CollapsibleTrigger
                          render={
                            <SidebarMenuButton
                              tooltip={item.title}
                              className={cn(
                                "transition-all duration-200",
                                active && "nav-active-bar font-medium"
                              )}
                            />
                          }
                        >
                          <item.icon
                            className={cn(
                              "h-[1.1rem] w-[1.1rem] transition-colors",
                              active ? "text-amber dark:text-amber" : "text-muted-foreground"
                            )}
                          />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => {
                              const childActive = pathname === child.url;
                              return (
                                <SidebarMenuSubItem key={child.url}>
                                  <SidebarMenuSubButton
                                    render={<Link href={child.url} />}
                                    isActive={childActive}
                                    className={cn(childActive && "font-medium")}
                                    onClick={closeMobile}
                                  >
                                    <span>{child.title}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={active}
                      tooltip={item.title}
                      className={cn(
                        "transition-all duration-200",
                        active && "nav-active-bar font-medium"
                      )}
                      onClick={closeMobile}
                    >
                      <item.icon
                        className={cn(
                          "h-[1.1rem] w-[1.1rem] transition-colors",
                          active
                            ? "text-amber dark:text-amber"
                            : "text-muted-foreground"
                        )}
                      />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground/70 font-medium">
            Yonetim
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => {
                const active = isActive(item.url);
                if (item.children) {
                  return (
                    <Collapsible key={item.url} open={!!openMenus[item.url]} onOpenChange={() => toggleMenu(item.url)} className="group/collapsible">
                      <SidebarMenuItem ref={(el) => { menuRefs.current[item.url] = el; }}>
                        <CollapsibleTrigger
                          render={
                            <SidebarMenuButton
                              tooltip={item.title}
                              className={cn(
                                "transition-all duration-200",
                                active && "nav-active-bar font-medium"
                              )}
                            />
                          }
                        >
                          <item.icon
                            className={cn(
                              "h-[1.1rem] w-[1.1rem] transition-colors",
                              active ? "text-amber dark:text-amber" : "text-muted-foreground"
                            )}
                          />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => {
                              const childActive = pathname === child.url;
                              return (
                                <SidebarMenuSubItem key={child.url}>
                                  <SidebarMenuSubButton
                                    render={<Link href={child.url} />}
                                    isActive={childActive}
                                    className={cn(childActive && "font-medium")}
                                    onClick={closeMobile}
                                  >
                                    <span>{child.title}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={active}
                      tooltip={item.title}
                      className={cn(
                        "transition-all duration-200",
                        active && "nav-active-bar font-medium"
                      )}
                      onClick={closeMobile}
                    >
                      <item.icon
                        className={cn(
                          "h-[1.1rem] w-[1.1rem] transition-colors",
                          active
                            ? "text-amber dark:text-amber"
                            : "text-muted-foreground"
                        )}
                      />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible open={!!openMenus["/settings"]} onOpenChange={() => toggleMenu("/settings")} className="group/collapsible">
                <SidebarMenuItem ref={(el) => { menuRefs.current["/settings"] = el; }}>
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton
                        tooltip="Ayarlar"
                        className={cn(
                          "transition-all duration-200",
                          isActive("/settings") && "nav-active-bar font-medium"
                        )}
                      />
                    }
                  >
                    <Settings
                      className={cn(
                        "h-[1.1rem] w-[1.1rem]",
                        isActive("/settings") ? "text-amber" : "text-muted-foreground"
                      )}
                    />
                    <span>Ayarlar</span>
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {[
                        { title: "Genel", url: "/settings" },
                        { title: "Kullanicilar", url: "/settings/users" },
                        { title: "Doviz Kurlari", url: "/settings/currencies" },
                        { title: "Islem Gunlugu", url: "/settings/audit-log" },
                        { title: "API & Entegrasyon", url: "/settings/api" },
                      ].map((child) => {
                        const childActive = pathname === child.url;
                        return (
                          <SidebarMenuSubItem key={child.url}>
                            <SidebarMenuSubButton
                              render={<Link href={child.url} />}
                              isActive={childActive}
                              className={cn(childActive && "font-medium")}
                              onClick={closeMobile}
                            >
                              <span>{child.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="transition-colors hover:bg-sidebar-accent"
                  />
                }
              >
                <Avatar className="h-8 w-8 rounded-lg border border-border/50">
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-none text-left">
                  <span className="text-sm font-medium">{user?.fullName || "Kullanici"}</span>
                  <span className="text-[0.7rem] text-muted-foreground">
                    {role ? roleLabels[role] : ""}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground/50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side={isCollapsed ? "right" : "top"}
                align="start"
                sideOffset={8}
              >
                <DropdownMenuItem render={<Link href="/settings" />} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/settings" />} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Ayarlar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cikis Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
