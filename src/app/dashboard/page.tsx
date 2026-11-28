"use client";

import * as React from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  FolderTree,
  Table2,
  ScanLine,
  ExternalLink,
  Plus,
  QrCode,
  Palette,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
  Sparkles,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LoadingState, DashboardSkeleton, ErrorState } from "@/components/ui/states";
import { getTrialDaysRemaining } from "@/lib/utils";

interface DashboardData {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
    isPublished: boolean;
    currency: string;
    subscription?: {
      status: string;
      trialEndsAt: string | null;
      billingCycle: string;
      plan: { name: string; code: string };
    } | null;
  };
  stats: {
    categoriesCount: number;
    menuItemsCount: number;
    tablesCount: number;
    totalScans: number;
    activeOrdersCount?: number;
  };
}

interface DishSale {
  name: string;
  quantity: number;
  revenue: number;
  ordersCount: number;
  revenueFormatted: string;
}

export default function DashboardOverviewPage() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [dishSales, setDishSales] = React.useState<{
    totalDishesSold: number;
    totalDishRevenue: number;
    dishes: DishSale[];
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [toggling, setToggling] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, dishRes] = await Promise.all([
        fetch("/api/restaurants/current"),
        fetch("/api/analytics/dish-sales?period=today").catch(() => null),
      ]);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard");
      setData(json);

      if (dishRes && dishRes.ok) {
        const dishJson = await dishRes.json();
        setDishSales(dishJson);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  async function togglePublish(next: boolean) {
    setToggling(true);
    try {
      const res = await fetch("/api/restaurants/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update publish status");
      setData((prev) => (prev ? { ...prev, restaurant: json.restaurant } : prev));
      toast.success(next ? "🎉 Public digital menu is now live!" : "Menu set to draft (hidden)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setToggling(false);
    }
  }

  if (loading) return <DashboardSkeleton />;
  if (error || !data) {
    return <ErrorState message={error || "Unable to load data"} onRetry={loadData} />;
  }

  const { restaurant, stats } = data;
  const sub = restaurant.subscription;
  const trialDaysLeft = getTrialDaysRemaining(sub?.trialEndsAt);

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {restaurant.name}
          </h1>
          <p className="text-sm text-slate-500">
            Digital QR Menu &amp; Table Ordering Control Center
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" asChild className="bg-white border-slate-200 shadow-2xs font-semibold">
            <Link href={`/menu/${restaurant.slug}`} target="_blank">
              <span>Preview Public Menu</span>
              <ExternalLink className="h-3.5 w-3.5 ml-1.5 text-slate-400" />
            </Link>
          </Button>
          <Button size="sm" asChild className="bg-[#E15A2B] hover:bg-[#C2410C] text-white font-bold shadow-xs">
            <Link href="/dashboard/menu">
              <Plus className="h-4 w-4 mr-1" />
              Add Menu Item
            </Link>
          </Button>
        </div>
      </div>

      {/* Status & Subscription Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200/90 shadow-2xs bg-white">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Menu Visibility</span>
                {restaurant.status !== "ACTIVE" ? (
                  <Badge variant="destructive">{restaurant.status}</Badge>
                ) : restaurant.isPublished ? (
                  <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                    ● Published Live
                  </Badge>
                ) : (
                  <Badge variant="warning" className="bg-amber-50 text-amber-800 border-amber-200 font-bold">
                    Draft Mode (Hidden)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {restaurant.status !== "ACTIVE"
                  ? "Your restaurant account is suspended. Contact support."
                  : restaurant.isPublished
                    ? `Diners can scan and browse at /menu/${restaurant.slug}`
                    : "Toggle ON to allow customers to view your menu upon scanning."}
              </p>
            </div>
            <Switch
              checked={restaurant.isPublished}
              disabled={toggling || restaurant.status !== "ACTIVE"}
              onCheckedChange={togglePublish}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {sub?.plan?.name || "14-Day Free Trial"}
                </span>
                <Badge
                  variant={
                    sub?.status === "ACTIVE"
                      ? "success"
                      : sub?.status === "TRIALING"
                        ? "default"
                        : "warning"
                  }
                  className="font-bold"
                >
                  {sub?.status || "TRIALING"}
                </Badge>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                {sub?.status === "TRIALING" ? (
                  <>
                    <Clock className="h-3.5 w-3.5 text-[#E15A2B]" />
                    <span>
                      {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} remaining in your 14-day trial
                    </span>
                  </>
                ) : sub?.status === "ACTIVE" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Active {sub.billingCycle.toLowerCase()} subscription</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Trial expired — upgrade your plan in Settings</span>
                  </>
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="bg-white border-slate-200 text-xs font-semibold">
              <Link href="/dashboard/settings">Manage Plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Live Table Orders",
            value: stats.activeOrdersCount ?? 0,
            icon: ShoppingBag,
            href: "/dashboard/orders",
            highlight: (stats.activeOrdersCount ?? 0) > 0,
            desc: "Active in kitchen",
          },
          {
            label: "Total Menu Items",
            value: stats.menuItemsCount,
            icon: UtensilsCrossed,
            href: "/dashboard/menu",
            desc: "Dishes in catalog",
          },
          {
            label: "Total Categories",
            value: stats.categoriesCount,
            icon: FolderTree,
            href: "/dashboard/categories",
            desc: "Menu sections",
          },
          {
            label: "Active Tables",
            value: stats.tablesCount,
            icon: Table2,
            href: "/dashboard/tables",
            desc: "Dining tables configured",
          },
          {
            label: "Total QR Scans",
            value: stats.totalScans,
            icon: ScanLine,
            href: "/dashboard/analytics",
            desc: "Real diner visits",
          },
        ].map((metric) => (
          <Link key={metric.label} href={metric.href}>
            <Card
              className={`transition-all hover:border-slate-300 hover:shadow-xs cursor-pointer ${
                metric.highlight
                  ? "border-[#E15A2B]/40 bg-[#E15A2B]/5 ring-2 ring-[#E15A2B]/10"
                  : "border-slate-200/90 bg-white"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {metric.label}
                  </p>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      metric.highlight
                        ? "bg-[#E15A2B] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <metric.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                  {metric.value}
                </p>
                <p className="mt-1 text-[11px] text-slate-400 font-medium">{metric.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Today's Dish Sales Tracker */}
      <Card className="border-slate-200/90 bg-white shadow-2xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-[#E15A2B]" />
              Today&apos;s Dish Sales Tracker
            </CardTitle>
            <CardDescription className="text-xs">
              Live tally of dishes ordered today, units sold, and revenue generated
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Sold Today
            </span>
            <p className="text-xl font-extrabold text-slate-900">
              {dishSales?.totalDishesSold || 0} <span className="text-xs font-normal text-slate-500">portions</span>
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {!dishSales || dishSales.dishes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
              <p className="text-xs text-slate-500">
                No orders received yet today. As guests order dishes, live sales will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dishSales.dishes.slice(0, 8).map((dish, idx) => (
                <div
                  key={dish.name}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                        #{idx + 1}
                      </span>
                      <p className="text-xs font-bold text-slate-900 truncate">{dish.name}</p>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {dish.ordersCount} {dish.ordersCount === 1 ? "order" : "orders"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      {dish.quantity} sold
                    </span>
                    <p className="mt-1 text-xs font-extrabold text-slate-900">
                      {dish.revenueFormatted}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Bar */}
      <Card className="border-slate-200/90 bg-white shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-extrabold text-slate-900">Quick Actions</CardTitle>
          <CardDescription className="text-xs">
            Manage your restaurant operations, QR downloads, and customer experience
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/orders"
            className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-4 transition hover:border-[#E15A2B]/30 hover:bg-[#E15A2B]/5 group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E15A2B]/10 text-[#E15A2B] group-hover:bg-[#E15A2B] group-hover:text-white transition">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Kitchen Orders (KDS)</p>
              <p className="text-[11px] text-slate-500 truncate">Real-time table orders</p>
            </div>
          </Link>

          <Link
            href="/dashboard/tables"
            className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-4 transition hover:border-[#E15A2B]/30 hover:bg-[#E15A2B]/5 group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-[#E15A2B] group-hover:text-white transition">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Download Table QRs</p>
              <p className="text-[11px] text-slate-500 truncate">Printable PDF &amp; PNG</p>
            </div>
          </Link>

          <Link
            href="/dashboard/appearance"
            className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-4 transition hover:border-[#E15A2B]/30 hover:bg-[#E15A2B]/5 group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-[#E15A2B] group-hover:text-white transition">
              <Palette className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Menu Appearance</p>
              <p className="text-[11px] text-slate-500 truncate">3 templates &amp; branding</p>
            </div>
          </Link>

          <Link
            href="/dashboard/analytics"
            className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-4 transition hover:border-[#E15A2B]/30 hover:bg-[#E15A2B]/5 group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-[#E15A2B] group-hover:text-white transition">
              <ScanLine className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Scan Analytics</p>
              <p className="text-[11px] text-slate-500 truncate">Daily trends &amp; tables</p>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
