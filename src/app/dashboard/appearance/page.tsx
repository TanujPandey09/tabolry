"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, Save, Smartphone } from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  PublicMenuView,
  type PublicMenuCategory,
  type PublicMenuRestaurant,
} from "@/components/menu/public-menu-view";
import { cn } from "@/lib/utils";

const TEMPLATES: Array<{
  id: "MODERN" | "CLASSIC" | "MINIMAL";
  name: string;
  desc: string;
}> = [
  {
    id: "MODERN",
    name: "Modern Card",
    desc: "Clean elevated cards on soft slate canvas — ideal for cafes and casual dining.",
  },
  {
    id: "CLASSIC",
    name: "Classic Bistro",
    desc: "Warm stone tones with refined serif headings for fine and family dining.",
  },
  {
    id: "MINIMAL",
    name: "Minimal List",
    desc: "Crisp white divider list for ultra-fast scanning on large menus.",
  },
];

const COLOR_PRESETS = [
  "#E15A2B",
  "#C2410C",
  "#15803D",
  "#991B1B",
  "#854D0E",
  "#18181B",
];

export default function AppearancePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [restaurant, setRestaurant] = React.useState<
    (PublicMenuRestaurant & { isPublished: boolean; status: string }) | null
  >(null);
  const [categories, setCategories] = React.useState<PublicMenuCategory[]>([]);

  const [template, setTemplate] = React.useState<"MODERN" | "CLASSIC" | "MINIMAL">("MODERN");
  const [primaryColor, setPrimaryColor] = React.useState("#E15A2B");
  const [isPublished, setIsPublished] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [restRes, catRes, itemRes] = await Promise.all([
        fetch("/api/restaurants/current"),
        fetch("/api/categories"),
        fetch("/api/menu-items"),
      ]);
      const [restJson, catJson, itemJson] = await Promise.all([
        restRes.json(),
        catRes.json(),
        itemRes.json(),
      ]);
      if (!restRes.ok) throw new Error(restJson.error || "Failed to load");

      const r = restJson.restaurant;
      setRestaurant(r);
      setTemplate(r.template || "MODERN");
      const normalizedColor = !r.primaryColor || r.primaryColor.toUpperCase() === "#2563EB" ? "#E15A2B" : r.primaryColor;
      setPrimaryColor(normalizedColor);
      setIsPublished(Boolean(r.isPublished));

      const items = itemJson.items || [];
      const cats: PublicMenuCategory[] = (catJson.categories || []).map(
        (c: { id: string; name: string; description: string | null }) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          menuItems: items.filter((i: { categoryId: string | null }) => i.categoryId === c.id),
        })
      );

      const uncategorized = items.filter((i: { categoryId: string | null }) => !i.categoryId);
      if (uncategorized.length > 0) {
        cats.push({
          id: "other",
          name: "More Items",
          description: null,
          menuItems: uncategorized,
        });
      }
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load appearance settings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/restaurants/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, primaryColor, isPublished }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save appearance");
      setRestaurant(json.restaurant);
      toast.success("Menu appearance saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save appearance");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Loading menu appearance..." />;
  if (error || !restaurant) return <ErrorState message={error || "Failed"} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Menu Appearance</h1>
          <p className="text-sm text-slate-500">
            Choose a layout template, tune your brand accent color, and preview before publishing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/menu/${restaurant.slug}`} target="_blank">
              Open Live URL
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Appearance
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-5 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Choose Template</CardTitle>
              <CardDescription>Pick how dishes are presented on guest phones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {TEMPLATES.map((t) => {
                const selected = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-xl border p-4 text-left transition-colors cursor-pointer",
                      selected
                        ? "border-[#E15A2B] bg-[#E15A2B]/5 ring-1 ring-[#E15A2B]"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{t.desc}</p>
                    </div>
                    {selected && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E15A2B] text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Accent Color</CardTitle>
              <CardDescription>Applied to category pills, table badge, and QR PDFs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setPrimaryColor(hex)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 cursor-pointer transition-transform",
                      primaryColor.toLowerCase() === hex.toLowerCase()
                        ? "scale-110 border-slate-900"
                        : "border-white shadow-xs"
                    )}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                />
                <div className="flex-1">
                  <Label className="sr-only">Hex Color</Label>
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Publish Public Menu</p>
                <p className="text-xs text-slate-500">
                  Make your digital menu accessible via QR codes
                </p>
              </div>
              <Switch
                checked={isPublished}
                disabled={restaurant.status !== "ACTIVE"}
                onCheckedChange={setIsPublished}
              />
            </CardContent>
          </Card>
        </div>

        {/* Live Mobile Preview Column */}
        <div className="lg:col-span-7">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-slate-50/70 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Smartphone className="h-4 w-4 text-[#E15A2B]" />
                  Live Mobile Menu Preview
                </div>
                <span className="font-mono text-xs text-slate-400">
                  /menu/{restaurant.slug}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center bg-slate-100/80 p-5 sm:p-8">
              <div className="w-full max-w-[390px] overflow-hidden rounded-[2.5rem] border-[10px] border-slate-900 bg-white shadow-2xl relative">
                {/* iPhone Dynamic Island notch */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-4 w-24 bg-slate-900 rounded-full z-50 pointer-events-none flex items-center justify-end pr-2">
                  <span className="h-2 w-2 rounded-full bg-slate-800" />
                </div>
                <div
                  data-lenis-prevent
                  className="max-h-[660px] overflow-y-auto scrollbar-none overscroll-contain"
                >
                  <PublicMenuView
                    restaurant={{
                      ...restaurant,
                      template,
                      primaryColor,
                    }}
                    categories={categories}
                    table={{ tableNumber: "3", label: "Preview" }}
                    isPreview
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
