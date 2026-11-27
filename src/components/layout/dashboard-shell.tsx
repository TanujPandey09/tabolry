"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  QrCode,
  Menu,
  X,
  LogOut,
  ExternalLink,
  LayoutDashboard,
  Store,
  FolderTree,
  UtensilsCrossed,
  Table2,
  Palette,
  BarChart3,
  Settings,
  ShieldCheck,
  Building2,
  CreditCard,
  ShoppingBag,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  NotificationCenter,
  NotificationProvider,
} from "@/components/notifications/notification-center";

const ICONS = {
  LayoutDashboard,
  Store,
  FolderTree,
  UtensilsCrossed,
  Table2,
  Palette,
  BarChart3,
  Settings,
  ShieldCheck,
  Building2,
  CreditCard,
  ShoppingBag,
} as const;

export type NavIconName = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
}

interface DashboardShellProps {
  brandTitle: string;
  brandBadge?: string;
  navItems: NavItem[];
  userName: string;
  userEmail: string;
  publicMenuUrl?: string | null;
  children: React.ReactNode;
}

export function DashboardShell({
  brandTitle,
  brandBadge,
  navItems,
  userName,
  userEmail,
  publicMenuUrl,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const initialChar = brandTitle ? brandTitle.charAt(0).toUpperCase() : "M";

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      {/* Top Brand Header */}
      <div className="flex h-18 items-center justify-between border-b border-stone-100 px-5">
        <Link href={navItems[0]?.href || "/"} className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E15A2B] via-[#D97706] to-amber-500 text-white font-black text-sm shadow-md shadow-orange-500/20">
            {initialChar}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-stone-900 leading-tight">{brandTitle}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {brandBadge || "Active Menu"}
              </span>
            </div>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 lg:hidden cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Restaurant Operating System
        </p>
        {navItems.map((item) => {
          const Icon = ICONS[item.icon];
          const isActive =
            item.href === "/dashboard" || item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          const isOrders = item.href === "/dashboard/orders";

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all cursor-pointer",
                isActive
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-[#E15A2B]"
                      : "text-stone-400 group-hover:text-stone-700"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {isOrders && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                    isActive
                      ? "bg-[#E15A2B]/30 text-orange-200"
                      : "bg-orange-100 text-orange-800"
                  )}
                >
                  Live
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Section */}
      <div className="border-t border-stone-100 p-4 space-y-3 bg-[#FAF8F5]/60">
        {publicMenuUrl && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between bg-white border-stone-200 text-xs font-bold text-stone-800 shadow-2xs hover:bg-stone-50 hover:text-[#E15A2B]"
            asChild
          >
            <Link href={publicMenuUrl} target="_blank">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Open Guest Menu
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
            </Link>
          </Button>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-stone-800">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-stone-900">{userName}</p>
              <p className="truncate text-[11px] text-stone-400">{userEmail}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
            title="Sign out"
            onClick={() => {
              toast.loading("Signing out...", { description: "Securing your session" });
              signOut({ callbackUrl: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-[#FAF8F5] lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-stone-200/90 bg-white">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Desktop Top Header Bar */}
        <header className="sticky top-0 z-20 hidden lg:flex h-16 items-center justify-between border-b border-stone-200/80 bg-white/80 backdrop-blur-md px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50/80 px-3 py-1 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-stone-700">Kitchen & QR Active</span>
            </div>
            <span className="text-xs font-medium text-stone-400">• Real-Time Desk Bell Notifications</span>
          </div>

          <div className="flex items-center gap-3">
            {publicMenuUrl && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 hover:text-[#E15A2B] shadow-2xs cursor-pointer"
                asChild
              >
                <Link href={publicMenuUrl} target="_blank">
                  <span className="flex items-center gap-1.5">
                    <span>Live Menu</span>
                    <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                  </span>
                </Link>
              </Button>
            )}

            <NotificationCenter />
          </div>
        </header>

        {/* Mobile Navbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200/80 bg-white/95 backdrop-blur-md safe-area-px-4 lg:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-sm font-extrabold text-stone-900">{brandTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationCenter />
            {publicMenuUrl && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-stone-600" asChild>
                <Link href={publicMenuUrl} target="_blank" title="Public Menu">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        {/* Native-App-Style Mobile Bottom Navigation */}
        <nav
          aria-label="Mobile quick navigation"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200/90 bg-white/95 backdrop-blur-md lg:hidden pb-[max(env(safe-area-inset-bottom),0.75rem)]"
        >
          <div className="grid h-16 grid-cols-5 items-center px-1 safe-area-px-4">
            {navItems
              .filter((item) =>
                [
                  "/dashboard",
                  "/dashboard/orders",
                  "/dashboard/menu",
                  "/dashboard/tables",
                  "/admin",
                  "/admin/restaurants",
                  "/admin/plans",
                ].includes(item.href)
              )
              .slice(0, 4)
              .map((item) => {
                const Icon = ICONS[item.icon];
                const isActive =
                  item.href === "/dashboard" || item.href === "/admin"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-semibold transition-colors",
                      isActive ? "text-brand" : "text-stone-500 hover:text-stone-900"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive && "stroke-[2.3]")} />
                    <span className="truncate max-w-[64px]">
                      {item.label === "Dashboard"
                        ? "Home"
                        : item.label === "Live Orders"
                          ? "Orders"
                          : item.label === "Menu Management"
                            ? "Menu"
                            : item.label === "Tables & QR Codes"
                              ? "Tables"
                              : item.label}
                    </span>
                  </Link>
                );
              })}

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-stone-500 hover:text-stone-900 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
              <span>More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
    </NotificationProvider>
  );
}
