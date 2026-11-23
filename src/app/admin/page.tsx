"use client";

import * as React from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Building2,
  CheckCircle2,
  Clock,
  Ban,
  Users,
  ScanLine,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/ui/states";

interface AdminOverview {
  metrics: {
    totalRestaurants: number;
    activeRestaurants: number;
    trialRestaurants: number;
    suspendedRestaurants: number;
    inactiveRestaurants: number;
    totalUsers: number;
    totalScans: number;
  };
  registrationTrends: Array<{ date: string; label: string; registrations: number }>;
  latestRestaurants: Array<{
    id: string;
    name: string;
    slug: string;
    city: string | null;
    status: string;
    isPublished: boolean;
    createdAt: string;
    subscription?: { status: string; plan: { name: string } } | null;
    _count: { menuItems: number; tables: number; scanEvents: number };
  }>;
}

export default function AdminOverviewPage() {
  const [data, setData] = React.useState<AdminOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load admin overview");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Loading platform metrics..." />;
  if (error || !data) return <ErrorState message={error || "Failed"} onRetry={load} />;

  const { metrics } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Super Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Platform-wide restaurant onboarding, trials, and real QR scan volume.
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/restaurants">
            Manage Restaurants
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Platform KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Total Restaurants", value: metrics.totalRestaurants, icon: Building2 },
          { label: "Active Restaurants", value: metrics.activeRestaurants, icon: CheckCircle2 },
          { label: "Trial Restaurants", value: metrics.trialRestaurants, icon: Clock },
          { label: "Suspended Restaurants", value: metrics.suspendedRestaurants, icon: Ban },
          { label: "Total Registered Users", value: metrics.totalUsers, icon: Users },
          { label: "Total Platform QR Scans", value: metrics.totalScans, icon: ScanLine },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">{m.label}</p>
                <m.icon className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2.5 text-3xl font-bold text-slate-900">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Registration Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Registration Trends (Last 30 Days)</CardTitle>
          <CardDescription>Daily new restaurant signups on Tablory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.registrationTrends}
                margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickLine={false}
                />
                <Tooltip />
                <Bar
                  dataKey="registrations"
                  name="New Restaurants"
                  fill="#E15A2B"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Latest Registered Restaurants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recently Registered Restaurants</CardTitle>
            <CardDescription>Latest pilot signups and status</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/restaurants">View All</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Items / Tables / Scans</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.latestRestaurants.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-semibold text-slate-900">{r.name}</p>
                    <p className="font-mono text-xs text-slate-400">/menu/{r.slug}</p>
                  </TableCell>
                  <TableCell>{r.city || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "ACTIVE"
                          ? "success"
                          : r.status === "SUSPENDED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-slate-700">
                      {r.subscription?.plan?.name || "None"} ({r.subscription?.status || "N/A"})
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium text-slate-600">
                    {r._count.menuItems} / {r._count.tables} / {r._count.scanEvents}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
