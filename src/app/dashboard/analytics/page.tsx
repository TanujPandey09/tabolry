"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { BarChart3, ScanLine, Calendar, TrendingUp, QrCode } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  summary: {
    totalScans: number;
    todayScans: number;
    last7DaysScans: number;
    periodScans: number;
    days: number;
  };
  dailyTrends: Array<{ date: string; label: string; scans: number }>;
  tableStats: Array<{
    tableId: string;
    tableNumber: string;
    label: string | null;
    scans: number;
  }>;
  mostScannedQRs: Array<{
    name: string;
    type: "GENERAL" | "TABLE";
    scans: number;
  }>;
  deviceBreakdown: Array<{ device: string; scans: number }>;
}

export default function AnalyticsPage() {
  const [days, setDays] = React.useState<7 | 14 | 30>(14);
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?days=${days}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load analytics");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [days]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Loading real QR scan analytics..." />;
  if (error || !data) return <ErrorState message={error || "Failed"} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">QR Scan Analytics</h1>
          <p className="text-sm text-slate-500">
            Real tracked customer menu scans across your general and table QR codes.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs font-medium">
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors cursor-pointer",
                days === d ? "bg-[#18181B] text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total All-Time Scans", value: data.summary.totalScans, icon: ScanLine },
          { label: "Scans Today", value: data.summary.todayScans, icon: Calendar },
          { label: "Last 7 Days", value: data.summary.last7DaysScans, icon: TrendingUp },
          {
            label: `Last ${data.summary.days} Days`,
            value: data.summary.periodScans,
            icon: BarChart3,
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                <kpi.icon className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2.5 text-3xl font-bold text-slate-900">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Scan Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily QR Scan Trend</CardTitle>
          <CardDescription>
            Number of menu scans recorded per day over the last {days} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.dailyTrends}
                margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E15A2B" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#E15A2B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "0.5rem",
                    borderColor: "#E2E8F0",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  name="Scans"
                  stroke="#E15A2B"
                  strokeWidth={2}
                  fill="url(#scanGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Most Scanned QRs + Table-wise Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Scanned Menu QR Codes</CardTitle>
            <CardDescription>Top performing QR codes across your restaurant</CardDescription>
          </CardHeader>
          <CardContent>
            {data.summary.totalScans === 0 ? (
              <EmptyState
                className="py-8"
                icon={<QrCode className="h-5 w-5" />}
                title="No scans recorded yet"
                description="Once guests scan your general or table QR codes, real scan counts appear here."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.mostScannedQRs.map((qr) => (
                  <li
                    key={qr.name}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{qr.name}</span>
                      <Badge variant={qr.type === "GENERAL" ? "default" : "secondary"}>
                        {qr.type === "GENERAL" ? "General" : "Table"}
                      </Badge>
                    </div>
                    <span className="font-bold text-slate-900">{qr.scans}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Table-Wise Scan Statistics</CardTitle>
            <CardDescription>Total tracked scans for every dining table</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.tableStats.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No tables created yet. Add tables under Tables &amp; QR Codes.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="text-right">Scans</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tableStats.map((t) => (
                    <TableRow key={t.tableId}>
                      <TableCell className="font-semibold text-slate-900">
                        Table {t.tableNumber}
                      </TableCell>
                      <TableCell className="text-slate-500">{t.label || "—"}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {t.scans}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
