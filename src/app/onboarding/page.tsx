"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  QrCode,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { DietaryIndicator, LoadingState } from "@/components/ui/states";
import { TabloryLogo } from "@/components/ui/tablory-logo";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import {
  onboardingRestaurantSchema,
  onboardingCategorySchema,
  onboardingMenuItemSchema,
  onboardingTableSchema,
} from "@/lib/validators";
import { formatCurrency, slugify, cn } from "@/lib/utils";

const STEPS = [
  { num: 1, label: "Restaurant" },
  { num: 2, label: "Categories" },
  { num: 3, label: "Menu Items" },
  { num: 4, label: "Tables & QR" },
  { num: 5, label: "Publish" },
];

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  dietaryType: "VEG" | "NON_VEG" | "EGG";
  isAvailable: boolean;
  category?: { id: string; name: string } | null;
}

interface TableEntry {
  id: string;
  tableNumber: string;
  label: string | null;
  qrCode: { id: string; url: string; qrDataUrl: string };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [initializing, setInitializing] = React.useState(true);
  const [step, setStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  // Step 1: Restaurant fields
  const [restaurantId, setRestaurantId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("Meerut");
  const [stateName, setStateName] = React.useState("Uttar Pradesh");
  const [country, setCountry] = React.useState("India");
  const [currency, setCurrency] = React.useState("INR");
  const [primaryColor, setPrimaryColor] = React.useState("#E15A2B");

  // Step 2: Categories
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [newCatName, setNewCatName] = React.useState("");

  // Step 3: Menu Items
  const [items, setItems] = React.useState<MenuItem[]>([]);
  const [itemName, setItemName] = React.useState("");
  const [itemDesc, setItemDesc] = React.useState("");
  const [itemPrice, setItemPrice] = React.useState("");
  const [itemCategoryId, setItemCategoryId] = React.useState("");
  const [itemDiet, setItemDiet] = React.useState<"VEG" | "NON_VEG" | "EGG">("VEG");
  const [itemImage, setItemImage] = React.useState("");

  // Step 4: Tables
  const [tables, setTables] = React.useState<TableEntry[]>([]);
  const [generalQr, setGeneralQr] = React.useState<{
    id: string;
    url: string;
    qrDataUrl: string;
  } | null>(null);
  const [tableNumber, setTableNumber] = React.useState("");
  const [tableLabel, setTableLabel] = React.useState("");

  React.useEffect(() => {
    async function loadExisting() {
      try {
        const res = await fetch("/api/restaurants/current");
        if (res.ok) {
          const data = await res.json();
          const r = data.restaurant;
          setRestaurantId(r.id);
          setName(r.name);
          setSlug(r.slug);
          setSlugEdited(true);
          setLogoUrl(r.logoUrl || "");
          setDescription(r.description || "");
          setPhone(r.phone || "");
          setAddress(r.address || "");
          setCity(r.city || "Meerut");
          setStateName(r.state || "Uttar Pradesh");
          setCountry(r.country || "India");
          setCurrency(r.currency || "INR");
          const normalizedColor = !r.primaryColor || r.primaryColor.toUpperCase() === "#2563EB" ? "#E15A2B" : r.primaryColor;
          setPrimaryColor(normalizedColor);
          setStep(Math.min(5, Math.max(2, r.onboardingStep || 2)));
          await Promise.all([loadCategories(), loadItems(), loadTables()]);
        }
      } finally {
        setInitializing(false);
      }
    }
    loadExisting();
  }, []);

  async function loadCategories() {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories || []);
      if (data.categories?.[0] && !itemCategoryId) {
        setItemCategoryId(data.categories[0].id);
      }
    }
  }

  async function loadItems() {
    const res = await fetch("/api/menu-items");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  }

  async function loadTables() {
    const res = await fetch("/api/tables");
    if (res.ok) {
      const data = await res.json();
      setTables(data.tables || []);
      setGeneralQr(data.generalQr || null);
    }
  }

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setStepError(null);
    setFieldErrors({});

    const candidateSlug = (slug || slugify(name)).trim().toLowerCase();
    const parsed = onboardingRestaurantSchema.safeParse({
      name,
      slug: candidateSlug,
      phone,
      city,
      state: stateName,
      country,
      currency,
      primaryColor,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || "form");
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      const firstMsg = parsed.error.issues[0]?.message || "Please check the highlighted fields.";
      setStepError(firstMsg);
      toast.error(firstMsg);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: parsed.data.name,
        slug: parsed.data.slug,
        logoUrl,
        description,
        phone: parsed.data.phone,
        address,
        city: parsed.data.city,
        state: parsed.data.state || "",
        country: parsed.data.country,
        currency: parsed.data.currency,
        primaryColor: parsed.data.primaryColor,
      };

      const res = await fetch(
        restaurantId ? "/api/restaurants/current" : "/api/restaurants",
        {
          method: restaurantId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save restaurant");

      setRestaurantId(data.restaurant.id);
      setSlug(data.restaurant.slug);
      setStepError(null);
      setFieldErrors({});
      toast.success("Restaurant profile saved!", {
        description: "Now let's organize your menu categories.",
      });
      await loadTables();
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save restaurant";
      setStepError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function seedDefaultCategories() {
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedDefaults: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add default categories");
      setCategories(data.categories);
      if (data.categories[0]) setItemCategoryId(data.categories[0].id);
      toast.success("Default categories added!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error adding categories");
    } finally {
      setSaving(false);
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const parsed = onboardingCategorySchema.safeParse({ name: newCatName });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Enter a valid category name";
      toast.error(msg);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: parsed.data.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add category");
      setNewCatName("");
      await loadCategories();
      toast.success("Category added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadCategories();
      toast.success("Category removed");
    }
  }

  async function addMenuItem(e: React.FormEvent) {
    e.preventDefault();
    const parsed = onboardingMenuItemSchema.safeParse({
      name: itemName,
      price: itemPrice,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Enter a valid dish name and price";
      toast.error(msg);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          description: itemDesc.trim() || null,
          price: parsed.data.price,
          categoryId: itemCategoryId || null,
          dietaryType: itemDiet,
          imageUrl: itemImage || null,
          isAvailable: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add dish");
      setItemName("");
      setItemDesc("");
      setItemPrice("");
      setItemImage("");
      await loadItems();
      toast.success("Menu item added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add menu item");
    } finally {
      setSaving(false);
    }
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    const parsed = onboardingTableSchema.safeParse({ tableNumber });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Enter a valid table number";
      toast.error(msg);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: parsed.data.tableNumber,
          label: tableLabel.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add table");
      setTableNumber("");
      setTableLabel("");
      await loadTables();
      toast.success("Table & unique QR code created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create table");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setSaving(true);
    try {
      const res = await fetch("/api/restaurants/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublished: true,
          onboardingCompleted: true,
          onboardingStep: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish menu");
      toast.success("Your digital menu is now live!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish menu");
    } finally {
      setSaving(false);
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message="Loading your onboarding workspace..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Bar */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <TabloryLogo size="sm" />
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Setup
            </span>
          </div>
          {restaurantId && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Skip to Dashboard</Link>
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-5 sm:pt-8 pb-12">
        {/* Mobile App-Style Progress Header */}
        <div className="mb-5 sm:hidden rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-brand">
              Step {step} of {STEPS.length}
            </span>
            <span className="text-stone-900">{STEPS[step - 1]?.label}</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop Stepper */}
        <ol className="mb-8 hidden sm:grid grid-cols-5 gap-2">
          {STEPS.map((s) => {
            const done = step > s.num;
            const active = step === s.num;
            return (
              <li key={s.num} className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold border transition-colors",
                    done && "border-[#E15A2B] bg-[#E15A2B] text-white",
                    active && "border-[#E15A2B] bg-[#E15A2B]/10 text-[#E15A2B]",
                    !done && !active && "border-slate-300 bg-white text-slate-400"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-xs font-medium",
                    active ? "text-slate-900" : "text-slate-500"
                  )}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* STEP 1: Create Restaurant */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Step 1: Create your restaurant profile</CardTitle>
              <CardDescription>
                This information appears at the top of your public QR menu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep1Submit} noValidate className="space-y-5">
                {stepError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {stepError}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-name">
                      Restaurant name <span className="text-brand">*</span>
                    </Label>
                    <Input
                      id="r-name"
                      required
                      placeholder="e.g. Spice Garden"
                      className={cn("text-base sm:text-sm", fieldErrors.name && "border-red-400 focus-visible:ring-red-200")}
                      value={name}
                      onChange={(e) => {
                        clearFieldError("name");
                        setName(e.target.value);
                        if (!slugEdited) {
                          clearFieldError("slug");
                          setSlug(slugify(e.target.value));
                        }
                      }}
                    />
                    {fieldErrors.name && (
                      <p className="text-xs font-medium text-red-600">{fieldErrors.name}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-slug">
                      Menu URL slug <span className="text-brand">*</span>
                    </Label>
                    <div className="flex items-center">
                      <span className="inline-flex h-10 items-center rounded-l-xl border border-r-0 border-stone-200 bg-stone-100 px-3 text-xs text-stone-500">
                        /menu/
                      </span>
                      <Input
                        id="r-slug"
                        required
                        className={cn("rounded-l-none text-base sm:text-sm", fieldErrors.slug && "border-red-400 focus-visible:ring-red-200")}
                        placeholder="spice-garden"
                        value={slug}
                        onChange={(e) => {
                          clearFieldError("slug");
                          setSlugEdited(true);
                          setSlug(slugify(e.target.value));
                        }}
                      />
                    </div>
                    {fieldErrors.slug && (
                      <p className="text-xs font-medium text-red-600">{fieldErrors.slug}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Restaurant logo <span className="text-xs font-normal text-stone-400">(Optional)</span>
                  </Label>
                  <ImageUpload
                    value={logoUrl}
                    onChange={setLogoUrl}
                    folder="branding"
                    label="Upload restaurant logo"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="r-desc">
                    Short description <span className="text-xs font-normal text-stone-400">(Optional)</span>
                  </Label>
                  <Textarea
                    id="r-desc"
                    className="text-base sm:text-sm"
                    placeholder="e.g. Authentic North Indian cuisine and tandoor specialties."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-phone">
                      Phone number <span className="text-brand">*</span>
                    </Label>
                    <Input
                      id="r-phone"
                      type="tel"
                      inputMode="tel"
                      required
                      placeholder="+91 98100 00000"
                      className={cn("text-base sm:text-sm", fieldErrors.phone && "border-red-400 focus-visible:ring-red-200")}
                      value={phone}
                      onChange={(e) => {
                        clearFieldError("phone");
                        setPhone(e.target.value.replace(/[^0-9+\s\-()]/g, ""));
                      }}
                    />
                    {fieldErrors.phone && (
                      <p className="text-xs font-medium text-red-600">{fieldErrors.phone}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-address">
                      Street address <span className="text-xs font-normal text-stone-400">(Optional)</span>
                    </Label>
                    <Input
                      id="r-address"
                      className="text-base sm:text-sm"
                      placeholder="Shop 12, Main Market"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-city">
                      City <span className="text-brand">*</span>
                    </Label>
                    <CityAutocomplete
                      id="r-city"
                      required
                      className={cn("text-base sm:text-sm", fieldErrors.city && "border-red-400 focus-visible:ring-red-200")}
                      value={city}
                      onChange={(val) => {
                        clearFieldError("city");
                        setCity(val.replace(/[^a-zA-Z\s.\-']/g, ""));
                      }}
                      onSelectLocation={(loc) => {
                        clearFieldError("city");
                        clearFieldError("state");
                        clearFieldError("country");
                        clearFieldError("currency");
                        setCity(loc.city);
                        if (loc.state) setStateName(loc.state);
                        if (loc.country) setCountry(loc.country);
                        if (loc.currency) setCurrency(loc.currency);
                      }}
                    />
                    {fieldErrors.city && (
                      <p className="text-xs font-medium text-red-600">{fieldErrors.city}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-state">State</Label>
                    <Input
                      id="r-state"
                      className={cn("text-base sm:text-sm", fieldErrors.state && "border-red-400 focus-visible:ring-red-200")}
                      value={stateName}
                      onChange={(e) => {
                        clearFieldError("state");
                        setStateName(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ""));
                      }}
                    />
                    {fieldErrors.state && (
                      <p className="text-xs font-medium text-red-600">{fieldErrors.state}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-country">Country</Label>
                    <Input
                      id="r-country"
                      className={cn("text-base sm:text-sm", fieldErrors.country && "border-red-400 focus-visible:ring-red-200")}
                      value={country}
                      onChange={(e) => {
                        clearFieldError("country");
                        setCountry(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ""));
                      }}
                    />
                    {fieldErrors.country && (
                      <p className="text-xs font-medium text-red-600">{fieldErrors.country}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-currency">Currency (3-letter code)</Label>
                    <Input
                      id="r-currency"
                      className={cn("text-base sm:text-sm uppercase", fieldErrors.currency && "border-red-400 focus-visible:ring-red-200")}
                      value={currency}
                      onChange={(e) => {
                        clearFieldError("currency");
                        setCurrency(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3));
                      }}
                    />
                    {fieldErrors.currency && (
                      <p className="text-xs font-medium text-red-600">{fieldErrors.currency}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-color">Primary brand color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="r-color"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => {
                          clearFieldError("primaryColor");
                          setPrimaryColor(e.target.value);
                        }}
                        className="h-10 w-14 cursor-pointer rounded-xl border border-stone-200 bg-white p-1"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => {
                          clearFieldError("primaryColor");
                          setPrimaryColor(e.target.value);
                        }}
                        className={cn("font-mono text-base sm:text-sm", fieldErrors.primaryColor && "border-red-400 focus-visible:ring-red-200")}
                      />
                    </div>
                    {fieldErrors.primaryColor && (
                      <p className="text-xs font-medium text-red-600">{fieldErrors.primaryColor}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving} className="w-full sm:w-auto h-11 rounded-xl font-bold">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save &amp; Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Categories */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">Step 2: Add menu categories</CardTitle>
                  <CardDescription>
                    Organize your menu into clear sections for guests.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={seedDefaultCategories}
                >
                  <Sparkles className="h-4 w-4 text-[#E15A2B]" />
                  Add Suggested Categories
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={addCategory} className="flex gap-2">
                <Input
                  placeholder="e.g. Tandoor, Chinese, South Indian..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <Button type="submit" disabled={saving || !newCatName.trim()}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </form>

              {categories.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No categories yet. Click <strong>Add Suggested Categories</strong> (Starters, Main
                  Course, Beverages, Desserts) or add your own above.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {categories.map((cat) => (
                    <li
                      key={cat.id}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-slate-900">{cat.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCategory(cat.id)}
                      >
                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => { setStepError(null); setStep(1); }}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  {categories.length === 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStepError(null);
                        setStep(3);
                      }}
                    >
                      Skip for now
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      if (categories.length === 0) {
                        toast.error("Please add at least 1 category or click 'Add Suggested Categories' first.");
                        return;
                      }
                      if (categories[0] && !itemCategoryId) setItemCategoryId(categories[0].id);
                      setStepError(null);
                      setStep(3);
                    }}
                  >
                    Continue to Menu Items
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Menu Items */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Step 3: Add menu items</CardTitle>
              <CardDescription>
                Add a few dishes now — you can always add or update items later from the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form
                onSubmit={addMenuItem}
                className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Dish name *</Label>
                    <Input
                      required
                      placeholder="e.g. Paneer Butter Masala"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Price (₹ {currency}) *</Label>
                    <Input
                      required
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="0.5"
                      placeholder="260"
                      className="text-base sm:text-sm"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <select
                      value={itemCategoryId}
                      onChange={(e) => setItemCategoryId(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Dietary type</Label>
                    <select
                      value={itemDiet}
                      onChange={(e) =>
                        setItemDiet(e.target.value as "VEG" | "NON_VEG" | "EGG")
                      }
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="VEG">Vegetarian</option>
                      <option value="NON_VEG">Non-Vegetarian</option>
                      <option value="EGG">Contains Egg</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="Short appetizing description..."
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                  />
                </div>

                <ImageUpload
                  value={itemImage}
                  onChange={setItemImage}
                  folder="menu"
                  label="Upload dish photo (optional)"
                />

                <Button type="submit" disabled={saving}>
                  <Plus className="h-4 w-4" />
                  Add Menu Item
                </Button>
              </form>

              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    Added items ({items.length})
                  </p>
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {items.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <DietaryIndicator type={it.dietaryType} />
                          <div>
                            <p className="font-medium text-slate-900">{it.name}</p>
                            <p className="text-xs text-slate-500">
                              {it.category?.name || "Uncategorized"}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(it.price, currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(4)}>
                  Continue to Tables &amp; QR
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Tables & QR */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Step 4: Add restaurant tables &amp; QR codes</CardTitle>
              <CardDescription>
                Each table gets its own permanent QR code that identifies the table when scanned.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={addTable} className="grid gap-3 sm:grid-cols-3">
                <Input
                  required
                  placeholder="Table number (e.g. 1, 2, A1)"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
                <Input
                  placeholder="Optional label (e.g. Window Seat)"
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value)}
                />
                <Button type="submit" disabled={saving}>
                  <Plus className="h-4 w-4" />
                  Add Table
                </Button>
              </form>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {generalQr && (
                  <div className="flex flex-col items-center rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 text-center">
                    <Badge className="mb-2">General Restaurant QR</Badge>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generalQr.qrDataUrl}
                      alt="General Menu QR"
                      className="h-32 w-32 rounded-lg border border-slate-200 bg-white p-1"
                    />
                    <p className="mt-2 text-xs text-slate-500">Works for entrance / counter</p>
                  </div>
                )}

                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 text-center"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      Table {t.tableNumber}
                    </p>
                    {t.label && <p className="text-xs text-slate-500">{t.label}</p>}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.qrCode.qrDataUrl}
                      alt={`Table ${t.tableNumber} QR`}
                      className="mt-2 h-32 w-32 rounded-lg border border-slate-200 bg-white p-1"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(5)}>
                  Review &amp; Publish
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 5: Preview & Publish */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Step 5: Publish your digital menu</CardTitle>
              <CardDescription>
                Everything is set! Publish your menu so customers scanning your QR codes can browse
                it immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Categories</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{categories.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Menu Items</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{items.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Table QR Codes</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{tables.length}</p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Your public menu link:</p>
                <p className="mt-1 font-mono text-xs text-[#E15A2B]">/menu/{slug}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Your 14-day Free Trial is active. You can customize templates, download printable
                  PDFs, and track QR scans from your dashboard anytime.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(4)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/appearance">
                      Preview Templates
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button onClick={handlePublish} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Publish Digital Menu
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
