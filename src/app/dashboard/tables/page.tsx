"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  QrCode,
  Download,
  FileDown,
  RefreshCw,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  Loader2,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface QrPayload {
  id: string;
  token: string;
  url: string;
  qrDataUrl: string;
  regeneratedAt: string | null;
  scanCount?: number;
}

interface TableItem {
  id: string;
  tableNumber: string;
  label: string | null;
  capacity: number | null;
  isActive: boolean;
  scanCount: number;
  qrCode: QrPayload;
}

interface TablesResponse {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
    isPublished: boolean;
  };
  generalQr: QrPayload;
  tables: TableItem[];
}

export default function TablesAndQrPage() {
  const [data, setData] = React.useState<TablesResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create / Edit Table Dialog
  const [tableDialogOpen, setTableDialogOpen] = React.useState(false);
  const [editingTable, setEditingTable] = React.useState<TableItem | null>(null);
  const [tableNumber, setTableNumber] = React.useState("");
  const [tableLabel, setTableLabel] = React.useState("");
  const [tableCapacity, setTableCapacity] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // QR Preview Dialog
  const [previewQr, setPreviewQr] = React.useState<{
    title: string;
    subtitle: string;
    qr: QrPayload;
    isTable: boolean;
  } | null>(null);
  const [regenerating, setRegenerating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tables");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load tables");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function openCreateTable() {
    setEditingTable(null);
    setTableNumber("");
    setTableLabel("");
    setTableCapacity("");
    setTableDialogOpen(true);
  }

  function openEditTable(t: TableItem) {
    setEditingTable(t);
    setTableNumber(t.tableNumber);
    setTableLabel(t.label || "");
    setTableCapacity(t.capacity ? String(t.capacity) : "");
    setTableDialogOpen(true);
  }

  async function handleSaveTable(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        tableNumber: tableNumber.trim(),
        label: tableLabel.trim() || null,
        capacity: tableCapacity ? Number(tableCapacity) : null,
      };
      const res = await fetch(
        editingTable ? `/api/tables/${editingTable.id}` : "/api/tables",
        {
          method: editingTable ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save table");
      toast.success(editingTable ? "Table updated" : "Table & unique QR code created");
      setTableDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save table");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTable(t: TableItem) {
    if (
      !window.confirm(
        `Delete Table ${t.tableNumber}? Its printed QR code will stop working immediately.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/tables/${t.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`Table ${t.tableNumber} deleted`);
      await load();
    } else {
      toast.error("Failed to delete table");
    }
  }

  async function handleRegenerate(qrId: string) {
    if (
      !window.confirm(
        "Regenerate this QR code? The previous QR token will be permanently invalidated and you will need to reprint this table's QR card."
      )
    ) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await fetch(`/api/qr-codes/${qrId}/regenerate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Regeneration failed");
      toast.success("QR code regenerated — old token invalidated");
      setPreviewQr((prev) => (prev ? { ...prev, qr: json.qrCode } : null));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate QR");
    } finally {
      setRegenerating(false);
    }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("Menu link copied to clipboard");
  }

  if (loading) return <LoadingState message="Loading tables and QR codes..." />;
  if (error || !data) return <ErrorState message={error || "Unable to load"} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tables &amp; QR Codes
          </h1>
          <p className="text-sm text-slate-500">
            Permanent QR codes that stay valid even when you edit items or prices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/api/qr-codes/bulk-pdf">
              <FileDown className="h-4 w-4" />
              Bulk Printable PDF
            </a>
          </Button>
          <Button size="sm" onClick={openCreateTable}>
            <Plus className="h-4 w-4" />
            Add Table
          </Button>
        </div>
      </div>

      {!data.restaurant.isPublished && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your menu is currently in <strong>Draft</strong> mode. Publish it from your{" "}
          <Link href="/dashboard" className="font-semibold underline">
            Dashboard
          </Link>{" "}
          so customers scanning these QR codes can view the menu.
        </div>
      )}

      {/* General Restaurant QR Card */}
      <Card className="border-amber-200/80 bg-amber-50/30">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>General Restaurant Menu QR</CardTitle>
                <Badge>Entrance / Counter / Standee</Badge>
              </div>
              <CardDescription className="mt-1">
                Opens your general menu at{" "}
                <span className="font-mono text-xs text-slate-700">
                  /menu/{data.restaurant.slug}
                </span>
              </CardDescription>
            </div>
            <Badge variant="secondary">{data.generalQr.scanCount ?? 0} scans</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.generalQr.qrDataUrl}
            alt="General Menu QR"
            className="h-36 w-36 shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-2xs"
          />
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Place this QR code at your reception desk, takeaway counter, or front window for
              customers who are not seated at a specific table.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={`/api/qr-codes/${data.generalQr.id}/download?format=png`}>
                  <Download className="h-3.5 w-3.5" />
                  Download PNG
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`/api/qr-codes/${data.generalQr.id}/download?format=pdf`}>
                  <FileDown className="h-3.5 w-3.5" />
                  Printable PDF
                </a>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyLink(data.generalQr.url)}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Link
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/menu/${data.restaurant.slug}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Table QR Cards */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">
          Table-Specific QR Codes ({data.tables.length})
        </h2>

        {data.tables.length === 0 ? (
          <EmptyState
            icon={<Table2 className="h-6 w-6" />}
            title="No tables created yet"
            description="Create a table for each dining table in your restaurant to generate unique table-identified QR codes."
            action={<Button onClick={openCreateTable}>Create First Table</Button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.tables.map((table) => (
              <Card key={table.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>Table {table.tableNumber}</CardTitle>
                      <CardDescription>
                        {[
                          table.label,
                          table.capacity ? `${table.capacity} seats` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Dining table"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{table.scanCount} scans</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div
                    onClick={() =>
                      setPreviewQr({
                        title: data.restaurant.name,
                        subtitle: `Table ${table.tableNumber}${table.label ? ` · ${table.label}` : ""}`,
                        qr: table.qrCode,
                        isTable: true,
                      })
                    }
                    className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50/70 p-4 cursor-pointer transition-colors hover:border-blue-300"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={table.qrCode.qrDataUrl}
                      alt={`Table ${table.tableNumber} QR`}
                      className="h-32 w-32 rounded-lg border border-slate-200 bg-white p-1.5"
                    />
                    <span className="mt-2 text-xs font-medium text-[#E15A2B]">
                      Click to preview &amp; manage
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/api/qr-codes/${table.qrCode.id}/download?format=png`}>
                          <Download className="h-3.5 w-3.5" />
                          PNG
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/api/qr-codes/${table.qrCode.id}/download?format=pdf`}>
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </a>
                      </Button>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditTable(table)}
                        title="Edit table"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTable(table)}
                        title="Delete table"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Table Dialog */}
      <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? "Edit Table" : "Add Restaurant Table"}</DialogTitle>
            <DialogDescription>
              A unique permanent QR code token is automatically generated for every table.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTable} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-num">Table number or name *</Label>
              <Input
                id="t-num"
                required
                placeholder="e.g. 1, 2, 3, Patio-A"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="t-label">Location label (optional)</Label>
                <Input
                  id="t-label"
                  placeholder="e.g. Window Booth"
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-cap">Seating capacity (optional)</Label>
                <Input
                  id="t-cap"
                  type="number"
                  min="1"
                  max="50"
                  placeholder="4"
                  value={tableCapacity}
                  onChange={(e) => setTableCapacity(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTableDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTable ? "Save Table" : "Create Table & QR"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Preview & Regenerate Dialog */}
      <Dialog open={!!previewQr} onOpenChange={(o) => !o && setPreviewQr(null)}>
        <DialogContent className="max-w-md">
          {previewQr && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-[#E15A2B]" />
                  QR Code Preview
                </DialogTitle>
                <DialogDescription>
                  Ready to print and place on the dining table
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xs">
                <p className="text-base font-bold text-slate-900">{previewQr.title}</p>
                <Badge className="mt-1.5">{previewQr.subtitle}</Badge>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewQr.qr.qrDataUrl}
                  alt="QR Preview"
                  className="mt-4 h-52 w-52 rounded-lg border border-slate-200 p-2"
                />
                <p className="mt-3 text-xs font-medium text-slate-600">
                  Scan with phone camera to view digital menu
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-400">
                  {previewQr.qr.url}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/qr-codes/${previewQr.qr.id}/download?format=png`}>
                    <Download className="h-4 w-4" />
                    Download PNG
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/qr-codes/${previewQr.qr.id}/download?format=pdf`}>
                    <FileDown className="h-4 w-4" />
                    Printable PDF
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyLink(previewQr.qr.url)}
                >
                  <Copy className="h-4 w-4" />
                  Copy URL
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={previewQr.qr.url} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                    Test Link
                  </Link>
                </Button>
              </div>

              {previewQr.isTable && (
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Need to invalidate the old QR link?
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={regenerating}
                    onClick={() => handleRegenerate(previewQr.qr.id)}
                  >
                    {regenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Regenerate Token
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
