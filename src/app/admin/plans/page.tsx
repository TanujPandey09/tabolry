"use client";

import * as React from "react";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { formatCurrency } from "@/lib/utils";

interface PlanItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  trialDays: number;
  maxRestaurants: number;
  maxTables: number;
  maxMenuItems: number;
  features: string[];
  isActive: boolean;
  _count: { subscriptions: number };
}

export default function AdminPlansPage() {
  const [plans, setPlans] = React.useState<PlanItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [editing, setEditing] = React.useState<PlanItem | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    monthlyPrice: "0",
    yearlyPrice: "0",
    trialDays: "14",
    maxTables: "15",
    maxMenuItems: "150",
    featuresText: "",
    isActive: true,
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/plans");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load plans");
      setPlans(
        (json.plans || []).map((p: PlanItem) => ({
          ...p,
          features: Array.isArray(p.features) ? p.features : [],
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function openEdit(p: PlanItem) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || "",
      monthlyPrice: String(p.monthlyPrice),
      yearlyPrice: String(p.yearlyPrice),
      trialDays: String(p.trialDays),
      maxTables: String(p.maxTables),
      maxMenuItems: String(p.maxMenuItems),
      featuresText: p.features.join("\n"),
      isActive: p.isActive,
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const features = form.featuresText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const res = await fetch(`/api/admin/plans/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          monthlyPrice: Number(form.monthlyPrice),
          yearlyPrice: Number(form.yearlyPrice),
          trialDays: Number(form.trialDays),
          maxTables: Number(form.maxTables),
          maxMenuItems: Number(form.maxMenuItems),
          features,
          isActive: form.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update plan");
      toast.success("Subscription plan updated");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Loading subscription plans..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Subscription Plans
        </h1>
        <p className="text-sm text-slate-500">
          Configure experimental INR launch pricing, trial duration, and table limits.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{plan.name}</CardTitle>
                <Badge variant={plan.isActive ? "success" : "secondary"}>
                  {plan.isActive ? "Active" : "Hidden"}
                </Badge>
              </div>
              <CardDescription className="font-mono text-xs">{plan.code}</CardDescription>
              <div className="pt-2 space-y-0.5">
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(plan.monthlyPrice, plan.currency)}
                  <span className="text-xs font-normal text-slate-500"> /month</span>
                </p>
                <p className="text-xs text-slate-500">
                  Yearly: {formatCurrency(plan.yearlyPrice, plan.currency)} /year
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                <div>Trial Days: {plan.trialDays}</div>
                <div>Max Tables: {plan.maxTables}</div>
                <div>Max Menu Items: {plan.maxMenuItems}</div>
                <div>Subscribed Restaurants: {plan._count.subscriptions}</div>
              </div>

              <Button variant="outline" size="sm" className="w-full" onClick={() => openEdit(plan)}>
                <Pencil className="h-3.5 w-3.5" />
                Configure Plan
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>Configure {editing.name}</DialogTitle>
                <DialogDescription>Code: {editing.code}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Plan Name</Label>
                  <Input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Monthly Price (INR)</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={form.monthlyPrice}
                      onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Yearly Price (INR)</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={form.yearlyPrice}
                      onChange={(e) => setForm({ ...form, yearlyPrice: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Trial Days</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.trialDays}
                      onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max Tables</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.maxTables}
                      onChange={(e) => setForm({ ...form, maxTables: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max Items</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.maxMenuItems}
                      onChange={(e) => setForm({ ...form, maxMenuItems: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Features (one per line)</Label>
                  <Textarea
                    rows={4}
                    value={form.featuresText}
                    onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-800">Plan visible to users</span>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Plan
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
