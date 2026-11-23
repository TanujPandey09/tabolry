"use client";

import * as React from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  UtensilsCrossed,
  Loader2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImageUpload } from "@/components/ui/image-upload";
import { DietaryIndicator, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { formatCurrency } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  categoryId: string | null;
  dietaryType: "VEG" | "NON_VEG" | "EGG";
  isAvailable: boolean;
  displayOrder: number;
  category: { id: string; name: string } | null;
}

export default function MenuManagementPage() {
  const [items, setItems] = React.useState<MenuItem[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [currency, setCurrency] = React.useState("INR");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState("ALL");
  const [filterDiet, setFilterDiet] = React.useState("ALL");

  // Modal state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MenuItem | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    dietaryType: "VEG" as "VEG" | "NON_VEG" | "EGG",
    imageUrl: "",
    isAvailable: true,
  });

  const loadAll = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [itemsRes, catRes, restRes] = await Promise.all([
        fetch("/api/menu-items"),
        fetch("/api/categories"),
        fetch("/api/restaurants/current"),
      ]);
      const [itemsJson, catJson, restJson] = await Promise.all([
        itemsRes.json(),
        catRes.json(),
        restRes.json(),
      ]);
      if (!itemsRes.ok) throw new Error(itemsJson.error || "Failed to load menu");
      setItems(itemsJson.items || []);
      setCategories(catJson.categories || []);
      if (restJson?.restaurant?.currency) setCurrency(restJson.restaurant.currency);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      price: "",
      categoryId: categories[0]?.id || "",
      dietaryType: "VEG",
      imageUrl: "",
      isAvailable: true,
    });
    setDialogOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      categoryId: item.categoryId || "",
      dietaryType: item.dietaryType,
      imageUrl: item.imageUrl || "",
      isAvailable: item.isAvailable,
    });
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        categoryId: form.categoryId || null,
        dietaryType: form.dietaryType,
        imageUrl: form.imageUrl || null,
        isAvailable: form.isAvailable,
      };

      const res = await fetch(
        editing ? `/api/menu-items/${editing.id}` : "/api/menu-items",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save item");

      toast.success(
        editing
          ? "Item updated — changes are live on your QR menu"
          : "Menu item added"
      );
      if (json.item) {
        if (editing) {
          setItems((prev) =>
            prev.map((i) => (i.id === json.item.id ? json.item : i))
          );
        } else {
          setItems((prev) => [...prev, json.item]);
        }
      }
      setDialogOpen(false);
      void loadAll(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save item");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item: MenuItem) {
    const next = !item.isAvailable;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isAvailable: next } : i))
    );
    const res = await fetch(`/api/menu-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: next }),
    });
    if (!res.ok) {
      toast.error("Failed to update availability");
      void loadAll(true);
    } else {
      toast.success(next ? `${item.name} marked Available` : `${item.name} marked Sold Out`);
    }
  }

  async function handleDelete(item: MenuItem) {
    if (!window.confirm(`Delete "${item.name}" from your menu?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const res = await fetch(`/api/menu-items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Menu item deleted");
      void loadAll(true);
    } else {
      toast.error("Failed to delete item");
      void loadAll(true);
    }
  }

  async function reorderItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setItems(next);

    const res = await fetch("/api/menu-items/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((i) => i.id) }),
    });
    if (!res.ok) {
      toast.error("Failed to reorder items");
      void loadAll(true);
    }
  }

  const filteredItems = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const matchSearch =
        !q ||
        it.name.toLowerCase().includes(q) ||
        (it.description && it.description.toLowerCase().includes(q));
      const matchCat =
        filterCategory === "ALL" ||
        (filterCategory === "uncategorized"
          ? !it.categoryId
          : it.categoryId === filterCategory);
      const matchDiet = filterDiet === "ALL" || it.dietaryType === filterDiet;
      return matchSearch && matchCat && matchDiet;
    });
  }, [items, search, filterCategory, filterDiet]);

  if (loading) return <TableSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={loadAll} />;

  const isFiltered = search.trim() !== "" || filterCategory !== "ALL" || filterDiet !== "ALL";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Menu Management</h1>
          <p className="text-sm text-slate-500">
            Add dishes, update prices, and toggle availability — changes reflect immediately on all
            QR codes.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Menu Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search dishes by name or description..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="uncategorized">Uncategorized</option>
        </select>
        <select
          value={filterDiet}
          onChange={(e) => setFilterDiet(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="ALL">All Dietary</option>
          <option value="VEG">Veg Only</option>
          <option value="NON_VEG">Non-Veg</option>
          <option value="EGG">Egg</option>
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-6 w-6" />}
          title={items.length === 0 ? "Your menu is empty" : "No matching items"}
          description={
            items.length === 0
              ? "Add your first dish with INR price and Veg/Non-Veg indicator."
              : "Try adjusting your search or filter criteria."
          }
          action={
            items.length === 0 ? (
              <Button onClick={openCreate}>Add First Menu Item</Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dish</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <UtensilsCrossed className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <DietaryIndicator type={item.dietaryType} />
                            <span className="font-semibold text-slate-900">{item.name}</span>
                          </div>
                          {item.description && (
                            <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-slate-500">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.category?.name || "Uncategorized"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {formatCurrency(item.price, currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() => toggleAvailability(item)}
                        />
                        <span className="text-xs font-medium text-slate-600">
                          {item.isAvailable ? "In Stock" : "Sold Out"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {!isFiltered && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={idx === 0}
                              onClick={() => reorderItem(idx, -1)}
                              title="Move up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={idx === filteredItems.length - 1}
                              onClick={() => reorderItem(idx, 1)}
                              title="Move down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(item)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
            <DialogDescription>
              Saved changes appear immediately on your public QR menu.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="item-name">Food name *</Label>
                <Input
                  id="item-name"
                  required
                  placeholder="e.g. Paneer Tikka"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-price">Price ({currency}) *</Label>
                <Input
                  id="item-price"
                  required
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="240"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="item-cat">Category</Label>
                <select
                  id="item-cat"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
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
                <Label htmlFor="item-diet">Dietary type</Label>
                <select
                  id="item-diet"
                  value={form.dietaryType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dietaryType: e.target.value as "VEG" | "NON_VEG" | "EGG",
                    })
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
              <Label htmlFor="item-desc">Description</Label>
              <Textarea
                id="item-desc"
                placeholder="Ingredients, portion size, spice level..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Food Photo</Label>
              <ImageUpload
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                folder="menu"
                label="Upload dish photo"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-900">Available for guests</p>
                <p className="text-xs text-slate-500">Turn off to display a Sold Out badge</p>
              </div>
              <Switch
                checked={form.isAvailable}
                onCheckedChange={(checked) => setForm({ ...form, isAvailable: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
