"use client";

import * as React from "react";
import {
  Loader2,
  Save,
  ShieldCheck,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { slugify } from "@/lib/utils";

export default function RestaurantProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verifyingUpi, setVerifyingUpi] = React.useState(false);
  const [upiVerifyState, setUpiVerifyState] = React.useState<{
    status: "idle" | "npci_verified" | "format_ok" | "invalid";
    customerName?: string | null;
    isLikelyMerchant?: boolean;
    message?: string;
  }>({ status: "idle" });
  const [testQrOpen, setTestQrOpen] = React.useState(false);
  const [testQrDataUrl, setTestQrDataUrl] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    name: "",
    slug: "",
    logoUrl: "",
    coverImageUrl: "",
    description: "",
    phone: "",
    whatsappNumber: "",
    upiId: "",
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
        whatsappNumber: r.whatsappNumber || "",
        upiId: r.upiId || "",
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

  const testUpiUri = React.useMemo(() => {
    const vpa = form.upiId.trim();
    if (!vpa) return "";
    return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(
      form.name || "Restaurant"
    )}&am=1.00&cu=INR&tn=${encodeURIComponent("Tablory UPI Test")}`;
  }, [form.upiId, form.name]);

  async function openTestQrModal() {
    if (!form.upiId.trim()) {
      toast.error("Enter a UPI ID first");
      return;
    }
    try {
      const { default: QRCode } = await import("qrcode");
      const url = await QRCode.toDataURL(testUpiUri, { width: 240, margin: 1 });
      setTestQrDataUrl(url);
      setTestQrOpen(true);
    } catch {
      toast.error("Could not generate test UPI QR");
    }
  }

  async function handleVerifyUpi() {
    const vpa = form.upiId.trim();
    if (!vpa) {
      toast.error("Enter your Merchant UPI ID first");
      return;
    }
    setVerifyingUpi(true);
    try {
      const res = await fetch("/api/upi/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId: vpa }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setUpiVerifyState({
          status: "invalid",
          message: data.error || "Invalid UPI ID",
        });
        toast.error(data.error || "Invalid UPI ID");
        return;
      }

      if (data.verified === true) {
        setUpiVerifyState({
          status: "npci_verified",
          customerName: data.customerName,
          isLikelyMerchant: data.isLikelyMerchant,
          message: data.message,
        });
        toast.success(
          data.customerName
            ? `UPI Verified: ${data.customerName}`
            : "UPI ID verified via NPCI"
        );
      } else {
        setUpiVerifyState({
          status: "format_ok",
          isLikelyMerchant: data.isLikelyMerchant,
          message: data.message,
        });
        toast.info("Valid Indian UPI handle — scan the ₹1 Test QR to confirm account name");
        await openTestQrModal();
      }
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setVerifyingUpi(false);
    }
  }

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
                <Label htmlFor="whatsappNumber">WhatsApp Orders Number (with country code)</Label>
                <Input
                  id="whatsappNumber"
                  placeholder="e.g. 919810000000"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value.replace(/[^0-9+]/g, "") })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="upiId">Merchant UPI ID (Direct 0% Fee Payments)</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="upiId"
                    placeholder="e.g. yourcafe@okbizaxis or paytmqr...@paytm"
                    value={form.upiId}
                    onChange={(e) => {
                      setForm({ ...form, upiId: e.target.value.trim() });
                      setUpiVerifyState({ status: "idle" });
                    }}
                    className="flex-1 font-mono text-sm"
                  />
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerifyUpi}
                      disabled={verifyingUpi || !form.upiId.trim()}
                    >
                      {verifyingUpi ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      )}
                      Verify UPI
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openTestQrModal}
                      disabled={!form.upiId.trim()}
                    >
                      <QrCode className="h-4 w-4" />
                      Test ₹1 QR
                    </Button>
                  </div>
                </div>

                {upiVerifyState.status === "npci_verified" && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Verified via NPCI
                      {upiVerifyState.customerName ? (
                        <>
                          {" "}
                          — Registered Name:{" "}
                          <strong className="font-bold">{upiVerifyState.customerName}</strong>
                        </>
                      ) : null}
                    </span>
                  </div>
                )}

                {upiVerifyState.status === "format_ok" && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Valid Indian UPI handle. Use <strong>Test ₹1 QR</strong> to scan with your own
                      phone and confirm your business name before accepting diner payments.
                    </span>
                  </div>
                )}

                {upiVerifyState.status === "invalid" && (
                  <p className="text-xs font-medium text-red-600">{upiVerifyState.message}</p>
                )}

                <p className="text-xs text-slate-500">
                  <strong>Recommended:</strong> Use your Business / Merchant UPI ID (Paytm for
                  Business, PhonePe Business, or GPay Business) for UPI soundbox alerts and highest
                  payment success.
                </p>
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

      {/* ₹1 Test UPI Verification Modal */}
      <Dialog open={testQrOpen} onOpenChange={setTestQrOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Verify Your UPI ID (₹1 Test)
            </DialogTitle>
            <DialogDescription className="text-center">
              Scan this QR with GPay, PhonePe, or Paytm. Your UPI app will display the exact
              NPCI-registered account name before you pay.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-3 py-2">
            {testQrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={testQrDataUrl}
                alt="Test ₹1 UPI QR"
                className="h-48 w-48 rounded-2xl border border-stone-200 bg-white p-2.5 shadow-xs"
              />
            )}
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-mono font-bold text-stone-800">
              {form.upiId}
            </div>
            {testUpiUri && (
              <a
                href={testUpiUri}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition"
              >
                <Smartphone className="h-4 w-4" />
                Open UPI App on This Phone (₹1)
              </a>
            )}
            <p className="text-[11px] text-stone-500 leading-relaxed">
              If your registered name looks correct, close this window and click{" "}
              <strong>Save Changes</strong>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
