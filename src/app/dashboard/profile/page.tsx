"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { slugify } from "@/lib/utils";

export default function RestaurantProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    name: "",
    slug: "",
    logoUrl: "",
    coverImageUrl: "",
    description: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    currency: "INR",
    primaryColor: "#E15A2B",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/restaurants/current");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load profile");
      const r = json.restaurant;
      setForm({
        name: r.name || "",
        slug: r.slug || "",
        logoUrl: r.logoUrl || "",
        coverImageUrl: r.coverImageUrl || "",
        description: r.description || "",
        phone: r.phone || "",
        address: r.address || "",
        city: r.city || "",
        state: r.state || "",
        country: r.country || "India",
        currency: r.currency || "INR",
        primaryColor: (!r.primaryColor || r.primaryColor.toUpperCase() === "#2563EB") ? "#E15A2B" : r.primaryColor,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/restaurants/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update profile");
      toast.success("Restaurant profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Loading restaurant profile..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Restaurant Profile</h1>
        <p className="text-sm text-slate-500">
          Update your restaurant&apos;s public information, branding assets, and location details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Details</CardTitle>
            <CardDescription>Displayed at the top of your customer-facing QR menu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Restaurant name *</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Public menu slug *</Label>
                <div className="flex items-center">
                  <span className="inline-flex h-10 items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 px-3 text-xs text-slate-500">
                    /menu/
                  </span>
                  <Input
                    id="slug"
                    required
                    className="rounded-l-none"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Changing the slug updates your menu URL; re-download QR codes if changed.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tell diners about your cuisine and specialties..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Restaurant Logo</Label>
                <ImageUpload
                  value={form.logoUrl}
                  onChange={(url) => setForm({ ...form, logoUrl: url })}
                  folder="branding"
                  label="Upload Logo"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cover Banner Image</Label>
                <ImageUpload
                  value={form.coverImageUrl}
                  onChange={(url) => setForm({ ...form, coverImageUrl: url })}
                  folder="branding"
                  label="Upload Cover Image"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location &amp; Currency</CardTitle>
            <CardDescription>Contact and regional preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <CityAutocomplete
                  id="city"
                  value={form.city}
                  onChange={(val) => setForm({ ...form, city: val })}
                  onSelectLocation={(loc) =>
                    setForm((prev) => ({
                      ...prev,
                      city: loc.city,
                      state: loc.state || prev.state,
                      country: loc.country || prev.country,
                      currency: loc.currency || prev.currency,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
