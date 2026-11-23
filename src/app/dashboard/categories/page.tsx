"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  FolderTree,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

interface Category {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  _count: { menuItems: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load categories");
      setCategories(json.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/categories/${editing.id}` : "/api/categories",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save category");
      toast.success(editing ? "Category updated" : "Category created");
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save category");
    } finally {
      setSaving(false);
    }
  }

  async function handleSeedDefaults() {
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedDefaults: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setCategories(json.categories);
      toast.success("Suggested categories added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error adding defaults");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    if (
      !window.confirm(
        `Delete category "${cat.name}"? Menu items in this category will remain intact under Uncategorized.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Category deleted");
      await load();
    } else {
      toast.error("Failed to delete category");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setCategories(reordered);

    const res = await fetch("/api/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
    });
    if (!res.ok) {
      toast.error("Failed to reorder categories");
      await load();
    }
  }

  if (loading) return <LoadingState message="Loading categories..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Menu Categories</h1>
          <p className="text-sm text-slate-500">
            Organize your dishes and control the order sections appear on your digital menu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={saving}>
            <Sparkles className="h-4 w-4 text-[#E15A2B]" />
            Add Defaults
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="h-6 w-6" />}
          title="No categories yet"
          description="Create categories like Starters, Main Course, Beverages, and Desserts to structure your menu."
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSeedDefaults}>
                Add Suggested Categories
              </Button>
              <Button onClick={openCreate}>Create Category</Button>
            </div>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100">
              {categories.map((cat, idx) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/70"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-slate-900">{cat.name}</span>
                      <Badge variant="secondary">
                        {cat._count.menuItems}{" "}
                        {cat._count.menuItems === 1 ? "item" : "items"}
                      </Badge>
                    </div>
                    {cat.description && (
                      <p className="mt-0.5 text-xs text-slate-500">{cat.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => move(idx, -1)}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === categories.length - 1}
                      onClick={() => move(idx, 1)}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(cat)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cat)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Menu Category"}</DialogTitle>
            <DialogDescription>
              Categories group related dishes together on your digital menu.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Category name *</Label>
              <Input
                id="cat-name"
                required
                placeholder="e.g. Starters"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Subtitle / description (optional)</Label>
              <Input
                id="cat-desc"
                placeholder="e.g. Served hot from our clay oven"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
