"use client";

import * as React from "react";
import { Search, SlidersHorizontal, Loader2, ExternalLink } from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { getTrialDaysRemaining } from "@/lib/utils";

interface AdminRestaurant {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  isPublished: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
  createdAt: string;
  memberships: Array<{
    role: string;
    user: { id: string; name: string; email: string };
  }>;
  subscription: {
    id: string;
    planId: string;
    status: "TRIALING" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "CANCELLED";
    billingCycle: "TRIAL" | "MONTHLY" | "YEARLY";
    trialEndsAt: string | null;
    notes: string | null;
    plan: { id: string; name: string; code: string };
  } | null;
  _count: {
    categories: number;
    menuItems: number;
    tables: number;
    scanEvents: number;
  };
}

interface AdminPlan {
  id: string;
  code: string;
  name: string;
  monthlyPrice: number;
}

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = React.useState<AdminRestaurant[]>([]);
  const [plans, setPlans] = React.useState<AdminPlan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const [selected, setSelected] = React.useState<AdminRestaurant | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState({
    status: "ACTIVE" as "ACTIVE" | "SUSPENDED" | "INACTIVE",
    planId: "",
    subscriptionStatus: "TRIALING" as
      | "TRIALING"
      | "ACTIVE"
      | "EXPIRED"
      | "SUSPENDED"
      | "CANCELLED",
    billingCycle: "TRIAL" as "TRIAL" | "MONTHLY" | "YEARLY",
    trialEndsAt: "",
    notes: "",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (statusFilter !== "ALL") qs.set("status", statusFilter);

      const res = await fetch(`/api/admin/restaurants?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load restaurants");
      setRestaurants(json.restaurants || []);
      setPlans(json.plans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  function openManage(r: AdminRestaurant) {
    setSelected(r);
    setForm({
      status: r.status,
      planId: r.subscription?.planId || plans[0]?.id || "",
      subscriptionStatus: r.subscription?.status || "TRIALING",
      billingCycle: r.subscription?.billingCycle || "TRIAL",
      trialEndsAt: r.subscription?.trialEndsAt
        ? new Date(r.subscription.trialEndsAt).toISOString().slice(0, 10)
        : "",
      notes: r.subscription?.notes || "",
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/restaurants/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: form.status,
          planId: form.planId || undefined,
          subscriptionStatus: form.subscriptionStatus,
          billingCycle: form.billingCycle,
          trialEndsAt: form.trialEndsAt
            ? new Date(`${form.trialEndsAt}T23:59:59.000Z`).toISOString()
            : null,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      toast.success(`Updated ${selected.name}`);
      setSelected(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(r: AdminRestaurant, status: "ACTIVE" | "SUSPENDED") {
    const res = await fetch(`/api/admin/restaurants/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`${r.name} set to ${status}`);
      await load();
    } else {
      toast.error("Failed to update status");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Restaurants</h1>
        <p className="text-sm text-slate-500">
          Inspect onboarding progress, activate or suspend restaurants, and manage pilot
          subscriptions.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by restaurant name, slug, or city..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {loading ? (
        <LoadingState message="Loading restaurants..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurant &amp; Owner</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((r) => {
                  const owner = r.memberships[0]?.user;
                  const daysLeft = getTrialDaysRemaining(r.subscription?.trialEndsAt);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-semibold text-slate-900">{r.name}</p>
                        <p className="text-xs text-slate-500">
                          {owner ? `${owner.name} (${owner.email})` : "No owner"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {[r.city, r.state].filter(Boolean).join(", ") || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={r.onboardingCompleted ? "success" : "warning"}>
                            {r.onboardingCompleted ? "Completed" : `Step ${r.onboardingStep}/5`}
                          </Badge>
                          <p className="text-[11px] text-slate-500">
                            {r.isPublished ? "Published" : "Draft"}
                          </p>
                        </div>
                      </TableCell>
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
                        <p className="text-xs font-semibold text-slate-900">
                          {r.subscription?.plan?.name || "None"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {r.subscription?.status || "N/A"}
                          {r.subscription?.status === "TRIALING"
                            ? ` · ${daysLeft}d left`
                            : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <div>{r._count.menuItems} items</div>
                        <div>
                          {r._count.tables} tables · {r._count.scanEvents} scans
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {r.status === "ACTIVE" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => quickStatus(r, "SUSPENDED")}
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => quickStatus(r, "ACTIVE")}
                            >
                              Activate
                            </Button>
                          )}
                          <Button size="sm" onClick={() => openManage(r)}>
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Manage
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Manage Restaurant & Pilot Subscription Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <span className="font-mono text-xs">/menu/{selected.slug}</span>
                  {selected.isPublished && selected.status === "ACTIVE" && (
                    <a
                      href={`/menu/${selected.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#E15A2B] hover:text-[#C2410C] font-medium"
                    >
                      Open Menu <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Restaurant Account Status</Label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status: e.target.value as "ACTIVE" | "SUSPENDED" | "INACTIVE",
                        })
                      }
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED (hides public menu)</option>
                      <option value="INACTIVE">INACTIVE (hides public menu)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Subscription Plan</Label>
                    <select
                      value={form.planId}
                      onChange={(e) => setForm({ ...form, planId: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.monthlyPrice}/mo)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Subscription Status</Label>
                    <select
                      value={form.subscriptionStatus}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          subscriptionStatus: e.target.value as typeof form.subscriptionStatus,
                        })
                      }
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="TRIALING">TRIALING</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="EXPIRED">EXPIRED</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Billing Cycle</Label>
                    <select
                      value={form.billingCycle}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          billingCycle: e.target.value as "TRIAL" | "MONTHLY" | "YEARLY",
                        })
                      }
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="TRIAL">TRIAL</option>
                      <option value="MONTHLY">MONTHLY</option>
                      <option value="YEARLY">YEARLY</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="trial-end">Trial Expiry Date</Label>
                  <Input
                    id="trial-end"
                    type="date"
                    value={form.trialEndsAt}
                    onChange={(e) => setForm({ ...form, trialEndsAt: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-notes">Internal Pilot Notes</Label>
                  <Textarea
                    id="admin-notes"
                    placeholder="e.g. Meerut pilot cohort #1 — cash/UPI collected for Q1"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelected(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
