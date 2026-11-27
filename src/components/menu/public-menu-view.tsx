"use client";

import * as React from "react";
import {
  Search,
  MapPin,
  Phone,
  Utensils,
  X,
  Share2,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  SlidersHorizontal,
  Info,
  Navigation,
  Sparkles,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Trash2,
  ShoppingBag,
  Plus,
  Minus,
  Clock,
  CreditCard,
  ArrowRight,
  QrCode as QrIcon,
  Receipt,
  Loader2,
  User,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { chimeEngine } from "@/lib/audio-chime";
import { formatCurrency, formatWhatsAppPhone, cn } from "@/lib/utils";
import { DietaryIndicator } from "@/components/ui/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  galleryImages?: string[];
  price: number;
  dietaryType: "VEG" | "NON_VEG" | "EGG";
  isAvailable: boolean;
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  description: string | null;
  menuItems: PublicMenuItem[];
}

export interface PublicMenuRestaurant {
  name: string;
  slug: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  phone: string | null;
  whatsappNumber?: string | null;
  upiId?: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  currency: string;
  primaryColor: string;
  template: "MODERN" | "CLASSIC" | "MINIMAL";
}

export interface PublicMenuViewProps {
  restaurant: PublicMenuRestaurant;
  categories: PublicMenuCategory[];
  table?: {
    id?: string;
    tableNumber: string;
    label?: string | null;
    token?: string;
  } | null;
  isPreview?: boolean;
}

type SortMode = "RECOMMENDED" | "PRICE_ASC" | "PRICE_DESC";

interface CartEntry {
  item: PublicMenuItem;
  quantity: number;
  notes?: string;
}

interface ActiveOrder {
  id: string;
  orderNumber: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "SERVED" | "COMPLETED" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID" | "REFUNDED";
  paymentMethod: "CASH_AT_COUNTER" | "UPI_ONLINE" | "CARD";
  subtotal: number;
  totalAmount: number;
  tableNumber: string | null;
  notes: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
    notes?: string | null;
  }>;
}

export function PublicMenuView({
  restaurant,
  categories,
  table,
  isPreview = false,
}: PublicMenuViewProps) {
  const [search, setSearch] = React.useState("");
  const [dietFilter, setDietFilter] = React.useState<"ALL" | "VEG" | "NON_VEG" | "EGG">("ALL");
  const [hideSoldOut, setHideSoldOut] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortMode>("RECOMMENDED");
  const [activeCategoryId, setActiveCategoryId] = React.useState<string>("ALL");

  // Interactive UI states
  const [selectedDish, setSelectedDish] = React.useState<
    (PublicMenuItem & { categoryName: string }) | null
  >(null);
  const [activeDishPhotoIdx, setActiveDishPhotoIdx] = React.useState(0);
  const [menuDrawerOpen, setMenuDrawerOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [shortlistOpen, setShortlistOpen] = React.useState(false);
  const [shortlistIds, setShortlistIds] = React.useState<string[]>([]);

  // Cart & Ordering States
  const [cart, setCart] = React.useState<Record<string, CartEntry>>({});
  const [orderModalOpen, setOrderModalOpen] = React.useState(false);
  const [submittingOrder, setSubmittingOrder] = React.useState(false);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [orderNotes, setOrderNotes] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH_AT_COUNTER" | "UPI_ONLINE">("CASH_AT_COUNTER");

  // Active Placed Orders Tracking (persisted per table session so diners don't lose orders or double-order)
  const [placedOrders, setPlacedOrders] = React.useState<ActiveOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [orderStatusOpen, setOrderStatusOpen] = React.useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = React.useState<string | null>(null);
  const [showQrOnScreen, setShowQrOnScreen] = React.useState(false);
  const [upiRefInput, setUpiRefInput] = React.useState("");
  const [copiedUpi, setCopiedUpi] = React.useState(false);
  const [payingNow, setPayingNow] = React.useState(false);

  const sessionStorageKey = React.useMemo(
    () => `tablory_orders:${restaurant.slug}:${table?.id || "general"}`,
    [restaurant.slug, table?.id]
  );

  // Restore active table orders from sessionStorage on load
  React.useEffect(() => {
    if (isPreview || typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(sessionStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ActiveOrder[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlacedOrders(parsed);
          setSelectedOrderId(parsed[0].id);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [sessionStorageKey, isPreview]);

  React.useEffect(() => {
    if (isPreview || typeof window === "undefined") return;
    try {
      if (placedOrders.length > 0) {
        window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(placedOrders));
      }
    } catch {
      // ignore storage errors
    }
  }, [placedOrders, sessionStorageKey, isPreview]);

  const activeOrder = React.useMemo(
    () =>
      placedOrders.find((o) => o.id === selectedOrderId) ||
      placedOrders[0] ||
      null,
    [placedOrders, selectedOrderId]
  );

  // Track already-ordered quantities across active (non-cancelled, non-completed) table rounds
  const orderedQtyByName = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const ord of placedOrders) {
      if (ord.status === "CANCELLED" || ord.status === "COMPLETED") continue;
      for (const it of ord.items || []) {
        const key = it.name.trim().toLowerCase();
        map.set(key, (map.get(key) || 0) + it.quantity);
      }
    }
    return map;
  }, [placedOrders]);

  const duplicateCartItems = React.useMemo(
    () =>
      Object.values(cart).filter(
        (entry) => (orderedQtyByName.get(entry.item.name.trim().toLowerCase()) || 0) > 0
      ),
    [cart, orderedQtyByName]
  );

  const rawAccent = restaurant.primaryColor;
  const accent = !rawAccent || rawAccent.toUpperCase() === "#2563EB" ? "#E15A2B" : rawAccent;
  const template = restaurant.template || "MODERN";

  const nonEmptyCategories = React.useMemo(
    () => categories.filter((c) => c.menuItems.length > 0),
    [categories]
  );

  const allItemsFlat = React.useMemo(
    () =>
      nonEmptyCategories.flatMap((cat) =>
        cat.menuItems.map((item) => ({ ...item, categoryName: cat.name }))
      ),
    [nonEmptyCategories]
  );

  const vegCount = React.useMemo(
    () => allItemsFlat.filter((i) => i.dietaryType === "VEG").length,
    [allItemsFlat]
  );
  const isPureVeg = allItemsFlat.length > 0 && vegCount === allItemsFlat.length;

  const shortlistedItems = React.useMemo(
    () => allItemsFlat.filter((i) => shortlistIds.includes(i.id)),
    [allItemsFlat, shortlistIds]
  );

  const shortlistTotal = React.useMemo(
    () => shortlistedItems.reduce((sum, i) => sum + i.price, 0),
    [shortlistedItems]
  );

  // Cart calculations
  const cartEntries = React.useMemo(() => Object.values(cart), [cart]);
  const cartItemCount = React.useMemo(
    () => cartEntries.reduce((sum, e) => sum + e.quantity, 0),
    [cartEntries]
  );
  const cartSubtotal = React.useMemo(
    () => cartEntries.reduce((sum, e) => sum + e.item.price * e.quantity, 0),
    [cartEntries]
  );

  function addToCart(item: PublicMenuItem) {
    if (!item.isAvailable) {
      toast.error(`${item.name} is currently sold out`);
      return;
    }
    const alreadyOrdered = orderedQtyByName.get(item.name.trim().toLowerCase()) || 0;
    setCart((prev) => {
      const existing = prev[item.id];
      const quantity = (existing?.quantity || 0) + 1;
      return {
        ...prev,
        [item.id]: { item, quantity, notes: existing?.notes || "" },
      };
    });
    if (alreadyOrdered > 0) {
      toast.warning(`Already ordered ×${alreadyOrdered} ${item.name} on this table`, {
        description: "Added 1 more to your new round. Remove in cart if accidental.",
      });
    } else {
      toast.success(`Added ${item.name} to order`);
    }
  }

  function updateCartQuantity(itemId: string, delta: number) {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity: newQty },
      };
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  }

  const activeUpiUri = React.useMemo(() => {
    if (!activeOrder || !restaurant.upiId?.trim()) return null;
    return `upi://pay?pa=${encodeURIComponent(restaurant.upiId.trim())}&pn=${encodeURIComponent(
      restaurant.name
    )}&am=${activeOrder.totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
      `Order ${activeOrder.orderNumber}`
    )}`;
  }, [activeOrder, restaurant.name, restaurant.upiId]);

  // Generate UPI QR code for active order only when needed
  React.useEffect(() => {
    let cancelled = false;
    if (activeOrder && activeOrder.paymentMethod === "UPI_ONLINE" && activeOrder.paymentStatus !== "PAID") {
      const uri =
        activeUpiUri ||
        `upi://pay?pa=${encodeURIComponent("restaurant@upi")}&pn=${encodeURIComponent(
          restaurant.name
        )}&am=${activeOrder.totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
          `Order ${activeOrder.orderNumber}`
        )}`;
      import("qrcode")
        .then(({ default: QRCode }) => {
          if (!cancelled) {
            QRCode.toDataURL(uri, { width: 220, margin: 1 })
              .then((url) => {
                if (!cancelled) setUpiQrDataUrl(url);
              })
              .catch(console.error);
          }
        })
        .catch(console.error);
    }
    return () => {
      cancelled = true;
    };
  }, [activeOrder, activeUpiUri, restaurant.name]);

  // Real-time polling for active order status with audio-visual notifications
  React.useEffect(() => {
    if (!activeOrder || activeOrder.status === "COMPLETED" || activeOrder.status === "CANCELLED") {
      return;
    }
    const polledId = activeOrder.id;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/orders/${polledId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.order) {
            setPlacedOrders((prevList) =>
              prevList.map((ord) => {
                if (ord.id !== polledId) return ord;
                if (ord.status !== data.order.status) {
                  const s = data.order.status;
                  const orderNum = data.order.orderNumber;
                  const tableStr = table ? `Table ${table.tableNumber}` : "your table";

                  if (s === "CONFIRMED") {
                    chimeEngine.playStatusPing();
                    toast.success(`Kitchen Confirmed Order #${orderNum}`, {
                      description: `Staff confirmed your dishes for ${tableStr}.`,
                      duration: 5000,
                    });
                  } else if (s === "PREPARING") {
                    chimeEngine.playStatusPing();
                    toast.info(`Chef Started Preparing Order #${orderNum}`, {
                      description: `Your food is now being prepared fresh in the kitchen.`,
                      duration: 6000,
                    });
                  } else if (s === "SERVED") {
                    chimeEngine.playOrderBell();
                    toast.success(`Order #${orderNum} Served!`, {
                      description: `Your food has arrived at ${tableStr}. Enjoy your meal!`,
                      duration: 7000,
                    });
                  } else if (s === "COMPLETED") {
                    chimeEngine.playPaymentChime();
                    toast.success(`Order Complete`, {
                      description: `Thank you for dining at ${restaurant.name}!`,
                      duration: 7000,
                    });
                  } else if (s === "CANCELLED") {
                    toast.error(`Order #${orderNum} Cancelled`, {
                      description: "Please speak with the restaurant staff for assistance.",
                    });
                  }
                }
                if (ord.paymentStatus !== "PAID" && data.order.paymentStatus === "PAID") {
                  chimeEngine.playPaymentChime();
                  toast.success(`Payment Verified for #${data.order.orderNumber}`, {
                    description: "Staff confirmed your payment.",
                    duration: 5000,
                  });
                }
                return data.order;
              })
            );
          }
        }
      } catch {
        // network polling silent retry
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeOrder, restaurant.name, table]);

  async function handlePlaceOrder() {
    if (cartEntries.length === 0) return;
    setSubmittingOrder(true);
    try {
      const payload = {
        restaurantSlug: restaurant.slug,
        tableToken: table?.token || null,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        paymentMethod,
        notes: orderNotes.trim() || null,
        items: cartEntries.map((e) => ({
          menuItemId: e.item.id,
          quantity: e.quantity,
          notes: e.notes || null,
        })),
      };

      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      chimeEngine.playOrderBell();
      const tableInfo = table ? `Table ${table.tableNumber}` : "Dine-in";
      toast.success(`Order #${data.order.orderNumber} Placed!`, {
        description: `Sent to the kitchen for ${tableInfo} (${cartEntries.length} dishes · ${formatCurrency(Number(data.order.totalAmount), restaurant.currency)})`,
        duration: 7000,
      });

      setPlacedOrders((prev) => [data.order, ...prev]);
      setSelectedOrderId(data.order.id);
      setCart({});
      setOrderNotes("");
      setUpiRefInput("");
      setShowQrOnScreen(false);
      setOrderModalOpen(false);
      setOrderStatusOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmittingOrder(false);
    }
  }

  async function handleCopyUpiId() {
    if (!restaurant.upiId?.trim()) return;
    try {
      await navigator.clipboard.writeText(restaurant.upiId.trim());
      setCopiedUpi(true);
      toast.success("UPI ID copied");
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {
      toast.error("Could not copy UPI ID");
    }
  }

  async function handleNotifyUpiPaid() {
    if (!activeOrder) return;
    setPayingNow(true);
    try {
      const res = await fetch(`/api/public/orders/${activeOrder.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "UPI_ONLINE",
          transactionRef: upiRefInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not record payment");

      setPlacedOrders((prev) =>
        prev.map((ord) =>
          ord.id === activeOrder.id
            ? {
                ...ord,
                paymentMethod: "UPI_ONLINE",
                paymentStatus: data.order?.paymentStatus || ord.paymentStatus,
                notes: data.order?.notes ?? ord.notes,
              }
            : ord
        )
      );
      chimeEngine.playStatusPing();
      toast.success("Payment Sent for Staff Verification", {
        description: "Show your UPI confirmation if asked — staff will mark it Paid shortly.",
        duration: 6000,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment update failed");
    } finally {
      setPayingNow(false);
    }
  }

  const filteredCategories = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return nonEmptyCategories
      .filter((c) => activeCategoryId === "ALL" || c.id === activeCategoryId)
      .map((cat) => {
        const filtered = cat.menuItems.filter((item) => {
          const matchesDiet =
            dietFilter === "ALL" || item.dietaryType === dietFilter;
          const matchesAvailability = !hideSoldOut || item.isAvailable;
          const matchesSearch =
            !q ||
            item.name.toLowerCase().includes(q) ||
            cat.name.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q));
          return matchesDiet && matchesAvailability && matchesSearch;
        });

        const sorted =
          sortBy === "PRICE_ASC"
            ? [...filtered].sort((a, b) => a.price - b.price)
            : sortBy === "PRICE_DESC"
              ? [...filtered].sort((a, b) => b.price - a.price)
              : filtered;

        return { ...cat, menuItems: sorted };
      })
      .filter((cat) => cat.menuItems.length > 0);
  }, [nonEmptyCategories, activeCategoryId, dietFilter, hideSoldOut, search, sortBy]);

  const totalVisibleItems = React.useMemo(
    () => filteredCategories.reduce((sum, c) => sum + c.menuItems.length, 0),
    [filteredCategories]
  );

  const locationLine = [restaurant.address, restaurant.city, restaurant.state]
    .filter(Boolean)
    .join(", ");

  function toggleShortlist(itemId: string, itemName: string) {
    setShortlistIds((prev) => {
      const exists = prev.includes(itemId);
      if (exists) {
        toast.info(`Removed ${itemName} from your table shortlist`);
        return prev.filter((id) => id !== itemId);
      }
      toast.success(`Saved ${itemName} to your table shortlist`);
      return [...prev, itemId];
    });
  }

  async function handleShare() {
    const shareUrl =
      typeof window !== "undefined" ? window.location.href : `/menu/${restaurant.slug}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `${restaurant.name} — Digital Menu`,
          text: `Explore the digital menu of ${restaurant.name}`,
          url: shareUrl,
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Menu link copied to clipboard");
      }
    } catch {
      // User cancelled native share sheet
    }
  }

  function jumpToCategory(catId: string) {
    setActiveCategoryId("ALL");
    setMenuDrawerOpen(false);
    setTimeout(() => {
      const el = document.getElementById(`menu-cat-${catId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  }

  const isClassic = template === "CLASSIC";
  const isMinimal = template === "MINIMAL";

  return (
    <div
      className={cn(
        "min-h-screen overflow-x-hidden pb-28",
        isClassic
          ? "bg-[#FAF7F2] text-stone-900"
          : isMinimal
            ? "bg-white text-slate-900"
            : "bg-slate-50 text-slate-900",
        isPreview && "min-h-0 pb-12"
      )}
    >
      {/* Editorial Hero Header */}
      <header className="relative">
        {/* Cover Banner (compact on 320x538 screens so dishes appear above the fold) */}
        <div className="relative h-36 w-full overflow-hidden sm:h-56">
          {restaurant.coverImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={restaurant.coverImageUrl}
                alt={restaurant.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/30 to-slate-950/20" />
            </>
          ) : (
            <div
              className="h-full w-full relative overflow-hidden"
              style={{
                background: isClassic
                  ? "linear-gradient(135deg, #292524 0%, #44403C 100%)"
                  : `linear-gradient(135deg, ${accent} 0%, #0F172A 100%)`,
              }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
            </div>
          )}

          {/* Top Floating Badges & Quick Actions */}
          <div className="absolute inset-x-0 top-3.5 z-10 flex items-center justify-between px-4">
            {table ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-md border border-white/20">
                <Utensils className="h-3 w-3 text-amber-400" />
                <span>{`Table ${table.tableNumber}`}</span>
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/50 text-white backdrop-blur-md transition hover:bg-slate-950/70 cursor-pointer shadow-md border border-white/10"
                aria-label="Share Menu"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/50 text-white backdrop-blur-md transition hover:bg-slate-950/70 cursor-pointer shadow-md border border-white/10"
                aria-label="Restaurant Details"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Restaurant Identity Card - Cleanly protected on elevated white surface */}
        <div className="relative mx-auto max-w-2xl px-3 sm:px-4 -mt-7 sm:-mt-8 z-20">
          <div
            className={cn(
              "rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-white p-3.5 sm:p-6 shadow-md",
              isClassic && "border-stone-200 bg-[#FAF7F2]"
            )}
          >
            {/* Top row: Logo overlapping card edge on left, Dine-In Badge on right */}
            <div className="flex items-center justify-between gap-2.5">
              <div
                className={cn(
                  "relative -mt-10 sm:-mt-14 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:h-22 sm:w-22",
                  isClassic && "rounded-full border-stone-100"
                )}
              >
                {restaurant.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={restaurant.logoUrl}
                    alt={restaurant.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center text-2xl font-black text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {restaurant.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {table && (
                <div
                  className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs border"
                  style={{
                    backgroundColor: `${accent}15`,
                    borderColor: `${accent}35`,
                    color: accent,
                  }}
                >
                  <Utensils className="h-3.5 w-3.5" />
                  <span className="font-extrabold">{`Table ${table.tableNumber}`}</span>
                  {table.label && (
                    <span className="opacity-80 font-medium text-[11px]">({table.label})</span>
                  )}
                </div>
              )}
            </div>

            {/* Title, Address & Description with Full Width on clean white surface */}
            <div className="mt-3 space-y-1.5">
              <h1
                className={cn(
                  "text-xl sm:text-2xl font-black tracking-tight text-slate-950 leading-snug",
                  isClassic && "font-serif tracking-normal text-stone-900 text-2xl sm:text-3xl"
                )}
              >
                {restaurant.name}
              </h1>

              {locationLine && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#E15A2B]" />
                  <span className="line-clamp-1">{locationLine}</span>
                </p>
              )}

              {restaurant.description && (
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 pt-0.5 line-clamp-2">
                  {restaurant.description}
                </p>
              )}

              {/* Tags & Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                {isPureVeg && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    100% Pure Veg
                  </span>
                )}
                {table && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                    <Utensils className="h-3 w-3 text-[#E15A2B]" />
                    <span>Dine-In Menu</span>
                    <span className="font-bold">{`Table ${table.tableNumber}`}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 shadow-2xs">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Live Digital Menu
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Interactive Filter Bar */}
      <div className="sticky top-0 z-30 mt-3 sm:mt-4 border-y border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto max-w-2xl px-3 sm:px-4 py-2 sm:py-3 space-y-2 sm:space-y-3">
          {/* Search Input & Filter Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes..."
                className="h-9 sm:h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#E15A2B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortMode)}
              aria-label="Sort dishes"
              className="h-9 sm:h-10 max-w-[106px] sm:max-w-none shrink-0 rounded-xl border border-slate-200 bg-white px-2 sm:px-3 text-[11px] sm:text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/20 cursor-pointer"
            >
              <option value="RECOMMENDED">Featured</option>
              <option value="PRICE_ASC">Price: Low–High</option>
              <option value="PRICE_DESC">Price: High–Low</option>
            </select>
          </div>

          {/* Dietary Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setDietFilter("ALL")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer shrink-0",
                dietFilter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              All Dishes
            </button>
            <button
              type="button"
              onClick={() => setDietFilter((prev) => (prev === "VEG" ? "ALL" : "VEG"))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer shrink-0 border",
                dietFilter === "VEG"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Veg Only
            </button>
            <button
              type="button"
              onClick={() => setDietFilter((prev) => (prev === "NON_VEG" ? "ALL" : "NON_VEG"))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer shrink-0 border",
                dietFilter === "NON_VEG"
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-slate-200 bg-white text-red-700 hover:bg-red-50"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-red-600" />
              Non-Veg
            </button>
            <button
              type="button"
              onClick={() => setHideSoldOut((prev) => !prev)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer shrink-0 border",
                hideSoldOut
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              )}
            >
              {hideSoldOut ? "✓ In-Stock Only" : "Hide Sold Out"}
            </button>
          </div>

          {/* Category Tabs Pill Bar */}
          {nonEmptyCategories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveCategoryId("ALL")}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer border",
                  activeCategoryId === "ALL"
                    ? "text-white border-transparent shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
                style={
                  activeCategoryId === "ALL" ? { backgroundColor: accent } : undefined
                }
              >
                Full Menu ({allItemsFlat.length})
              </button>
              {nonEmptyCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer border",
                    activeCategoryId === cat.id
                      ? "text-white border-transparent shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                  style={
                    activeCategoryId === cat.id ? { backgroundColor: accent } : undefined
                  }
                >
                  {cat.name}
                  <span className="ml-1 opacity-75">({cat.menuItems.length})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Menu Sections */}
      <main className="mx-auto max-w-2xl px-4 pt-6 space-y-8">
        {(search || dietFilter !== "ALL" || hideSoldOut || activeCategoryId !== "ALL") && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-900">{totalVisibleItems}</strong>{" "}
              {totalVisibleItems === 1 ? "dish" : "dishes"}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDietFilter("ALL");
                setHideSoldOut(false);
                setActiveCategoryId("ALL");
                setSortBy("RECOMMENDED");
              }}
              className="font-semibold text-[#E15A2B] hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}

        {filteredCategories.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-2xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Utensils className="h-6 w-6" />
            </div>
            <p className="mt-3 text-base font-semibold text-slate-900">No matching dishes</p>
            <p className="mt-1 text-xs text-slate-500">
              Try a different keyword or clear your dietary / availability filters.
            </p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <section
              key={cat.id}
              id={`menu-cat-${cat.id}`}
              className="scroll-mt-44 space-y-3.5"
            >
              {/* Section Heading */}
              <div
                className={cn(
                  "flex items-end justify-between pb-2",
                  isClassic
                    ? "border-b-2 border-stone-300/80"
                    : "border-b border-slate-200"
                )}
              >
                <div>
                  <h2
                    className={cn(
                      "text-lg font-bold tracking-tight text-slate-900 sm:text-xl",
                      isClassic && "font-serif tracking-normal text-stone-900"
                    )}
                  >
                    {cat.name}
                  </h2>
                  {cat.description && (
                    <p className="mt-0.5 text-xs text-slate-500">{cat.description}</p>
                  )}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                  {cat.menuItems.length}
                </span>
              </div>

              {/* Items List */}
              <div
                className={cn(
                  isMinimal ? "divide-y divide-slate-100" : "space-y-3.5"
                )}
              >
                {cat.menuItems.map((item) => {
                  const isSaved = shortlistIds.includes(item.id);
                  const inCartQty = cart[item.id]?.quantity || 0;
                  const alreadyOrderedQty = orderedQtyByName.get(item.name.trim().toLowerCase()) || 0;

                  return (
                    <article
                      key={item.id}
                      onClick={() => {
                        setActiveDishPhotoIdx(0);
                        setSelectedDish({ ...item, categoryName: cat.name });
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedDish({ ...item, categoryName: cat.name });
                        }
                      }}
                      className={cn(
                        "group relative flex items-start justify-between gap-3.5 sm:gap-4 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/40",
                        template === "MODERN" &&
                          "rounded-2xl border border-stone-200/90 bg-white p-3.5 sm:p-4 hover:border-stone-300",
                        isClassic &&
                          "rounded-2xl border border-stone-200 bg-[#FAF7F2] p-3.5 sm:p-4 hover:border-stone-300",
                        isMinimal && "py-4 hover:bg-slate-50/60 px-2 -mx-2 rounded-xl",
                        !item.isAvailable && "opacity-70"
                      )}
                    >
                      {/* Left Column: Meta, Title, Clean Price, Description */}
                      <div className="flex min-w-0 flex-1 flex-col space-y-1.5">
                        {/* Meta Row: Dietary + Ordered Badge + Subtle Bookmark */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <DietaryIndicator type={item.dietaryType} />
                            {alreadyOrderedQty > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-emerald-800 tabular-nums">
                                <Check className="h-2.5 w-2.5" />
                                Ordered ×{alreadyOrderedQty}
                              </span>
                            )}
                            {!item.isAvailable && (
                              <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                                Sold Out
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleShortlist(item.id, item.name);
                            }}
                            aria-label={
                              isSaved ? "Remove from shortlist" : "Save to shortlist"
                            }
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition cursor-pointer",
                              isSaved
                                ? "text-[#E15A2B] bg-orange-50"
                                : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                            )}
                          >
                            {isSaved ? (
                              <BookmarkCheck className="h-3.5 w-3.5" />
                            ) : (
                              <Bookmark className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Dish Name */}
                        <h3
                          className={cn(
                            "text-[15px] sm:text-base font-bold leading-snug text-stone-950 group-hover:text-[#E15A2B] transition-colors",
                            isClassic && "font-serif text-[17px]"
                          )}
                        >
                          {item.name}
                        </h3>

                        {/* Dedicated Clean Price Line (never squished on 360px phones) */}
                        <div className="flex items-baseline gap-2">
                          <span
                            className={cn(
                              "text-[15px] sm:text-base font-extrabold tracking-tight tabular-nums",
                              item.isAvailable ? "text-stone-950" : "text-stone-400 line-through"
                            )}
                          >
                            {formatCurrency(item.price, restaurant.currency)}
                          </span>
                        </div>

                        {/* Dish Description */}
                        {item.description && (
                          <p className="text-xs sm:text-[13px] leading-relaxed text-stone-500 line-clamp-2 pt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Right Column: Dish Photo + Anchored ADD / Stepper (sized cleanly for 320px width) */}
                      <div className="flex shrink-0 flex-col items-center">
                        {item.imageUrl ? (
                          <div className="relative h-22 w-22 sm:h-28 sm:w-28 overflow-hidden rounded-2xl border border-stone-200/70 bg-stone-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              loading="lazy"
                              className={cn(
                                "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
                                !item.isAvailable && "grayscale"
                              )}
                            />
                            {!item.isAvailable ? (
                              <div className="absolute inset-x-0 bottom-0 bg-stone-950/80 py-0.5 text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white">
                                Sold Out
                              </div>
                            ) : (item.galleryImages?.length || 0) > 0 ? (
                              <span className="absolute top-1.5 right-1.5 rounded-full bg-stone-950/75 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white backdrop-blur-xs">
                                +{(item.galleryImages?.length || 0)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {/* Interactive Order Add / Stepper */}
                        {item.isAvailable && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "relative z-10 flex items-center justify-center",
                              item.imageUrl ? "-mt-3.5 sm:-mt-4" : "mt-1.5"
                            )}
                          >
                            {inCartQty === 0 ? (
                              <button
                                type="button"
                                onClick={() => addToCart(item)}
                                className="inline-flex h-8 sm:h-9 w-[80px] sm:w-[96px] items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white text-[11px] sm:text-xs font-extrabold tracking-wide shadow-sm transition hover:bg-stone-50 active:scale-[0.97] cursor-pointer"
                                style={{ color: accent }}
                              >
                                <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                ADD
                              </button>
                            ) : (
                              <div
                                className="inline-flex h-8 sm:h-9 w-[80px] sm:w-[96px] items-center justify-between rounded-xl px-1 text-white shadow-sm"
                                style={{ backgroundColor: accent }}
                              >
                                <button
                                  type="button"
                                  onClick={() => updateCartQuantity(item.id, -1)}
                                  aria-label={`Remove one ${item.name}`}
                                  className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg hover:bg-white/15 cursor-pointer"
                                >
                                  <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                </button>
                                <span className="text-[11px] sm:text-xs font-extrabold tabular-nums">
                                  {inCartQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCartQuantity(item.id, 1)}
                                  aria-label={`Add one more ${item.name}`}
                                  className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg hover:bg-white/15 cursor-pointer"
                                >
                                  <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}

        {/* Menu Footer Disclaimer */}
        <footer className="border-t border-slate-200/80 pt-6 pb-4 text-center space-y-1.5">
          <p className="text-xs text-slate-500">
            Prices are in {restaurant.currency}. Please inform your server of any food allergies.
          </p>
          <p className="text-[11px] text-slate-400">
            Digital Menu powered by{" "}
            <span className="font-semibold text-slate-600">Tablory</span>
          </p>
        </footer>
      </main>

      {/* Floating Bottom Bar: Active Order Status or Table Cart Bar */}
      {!isPreview && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl flex-col gap-2 px-3 sm:px-4">
          {/* If there is an active placed order, show live status button */}
          {activeOrder && (
            <button
              type="button"
              onClick={() => setOrderStatusOpen(true)}
              className="pointer-events-auto flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl transition hover:bg-slate-800 cursor-pointer border border-slate-700"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight">
                    Order {activeOrder.orderNumber} ({activeOrder.status})
                  </p>
                  <p className="text-[11px] text-slate-300">
                    {activeOrder.paymentStatus === "PAID"
                      ? "✓ Paid"
                      : "⚠ Payment Pending"}
                    {activeOrder.tableNumber ? ` · Table ${activeOrder.tableNumber}` : ""}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                View Status <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          )}

          {/* Cart Floating Bar */}
          {cartItemCount > 0 && (
            <div
              className="pointer-events-auto flex items-center justify-between gap-2 rounded-2xl p-2.5 sm:p-3 text-white shadow-2xl"
              style={{ backgroundColor: accent }}
            >
              <div className="flex items-center gap-2.5 pl-0.5 min-w-0">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <ShoppingBag className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/80 truncate">
                    {table ? `Table ${table.tableNumber} Order` : "Your Order"}
                  </p>
                  <p className="text-xs sm:text-sm font-extrabold tabular-nums truncate">
                    {cartItemCount} {cartItemCount === 1 ? "item" : "items"} ·{" "}
                    {formatCurrency(cartSubtotal, restaurant.currency)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOrderModalOpen(true)}
                className="flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-slate-900 shadow-md transition hover:bg-slate-100 cursor-pointer"
              >
                <span>View Order</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          )}

          {/* Quick Menu Categories Jump Button (when no cart bar) */}
          {cartItemCount === 0 && nonEmptyCategories.length > 1 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMenuDrawerOpen(true)}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xl transition hover:opacity-95 cursor-pointer"
                style={{ backgroundColor: accent }}
              >
                <BookOpen className="h-4 w-4" />
                Menu Categories
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dish Detail Modal */}
      <Dialog open={!!selectedDish} onOpenChange={(open) => !open && setSelectedDish(null)}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          {selectedDish && (
            <div>
              {(() => {
                const dishPhotos = [
                  ...(selectedDish.imageUrl ? [selectedDish.imageUrl] : []),
                  ...(selectedDish.galleryImages || []),
                ];
                const currentPhoto = dishPhotos[activeDishPhotoIdx] || dishPhotos[0];

                if (dishPhotos.length === 0) {
                  return (
                    <div
                      className="flex h-28 items-center justify-center"
                      style={{ backgroundColor: `${accent}14` }}
                    >
                      <Utensils className="h-10 w-10" style={{ color: accent }} />
                    </div>
                  );
                }

                return (
                  <div className="bg-stone-100">
                    <div className="relative h-60 w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentPhoto}
                        alt={selectedDish.name}
                        className={cn(
                          "h-full w-full object-cover",
                          !selectedDish.isAvailable && "grayscale"
                        )}
                      />
                      {dishPhotos.length > 1 && (
                        <span className="absolute right-3 bottom-3 rounded-full bg-stone-950/75 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-xs">
                          {activeDishPhotoIdx + 1} / {dishPhotos.length}
                        </span>
                      )}
                      {!selectedDish.isAvailable && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45">
                          <span className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                            Currently Sold Out
                          </span>
                        </div>
                      )}
                    </div>
                    {dishPhotos.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto bg-white px-4 py-2.5 border-b border-stone-100">
                        {dishPhotos.map((photoUrl, idx) => (
                          <button
                            key={`${photoUrl}-${idx}`}
                            type="button"
                            onClick={() => setActiveDishPhotoIdx(idx)}
                            className={cn(
                              "h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition cursor-pointer",
                              idx === activeDishPhotoIdx
                                ? "border-[#E15A2B] ring-2 ring-[#E15A2B]/25"
                                : "border-transparent opacity-65 hover:opacity-100"
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoUrl}
                              alt={`${selectedDish.name} ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="p-5 space-y-4">
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <DietaryIndicator type={selectedDish.dietaryType} showLabel />
                    <span className="text-slate-300">·</span>
                    <span className="text-xs font-medium text-slate-500">
                      {selectedDish.categoryName}
                    </span>
                  </div>
                  <DialogTitle className="pt-1 text-xl font-bold text-slate-900">
                    {selectedDish.name}
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed text-slate-600">
                    {selectedDish.description || "Freshly prepared by our kitchen."}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      Price
                    </p>
                    <p className="text-xl font-extrabold text-slate-900">
                      {formatCurrency(selectedDish.price, restaurant.currency)}
                    </p>
                  </div>

                  {selectedDish.isAvailable ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
                      <XCircle className="h-3.5 w-3.5" />
                      Sold Out
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {selectedDish.isAvailable && (
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(selectedDish);
                        setSelectedDish(null);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-95 cursor-pointer shadow-sm"
                      style={{ backgroundColor: accent }}
                    >
                      <Plus className="h-4 w-4" />
                      Add to Order
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleShortlist(selectedDish.id, selectedDish.name)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {shortlistIds.includes(selectedDish.id) ? (
                      <BookmarkCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    Save
                  </button>
                </div>

                <p className="text-center text-[11px] text-slate-400">
                  {table
                    ? `Seated at Table ${table.tableNumber} · Order through your phone anytime`
                    : "Digital viewing menu · Place your order directly"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Table Order / Checkout Bottom Sheet (Mobile-First, Pixel-Perfect) */}
      <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
        <DialogContent
          data-lenis-prevent
          className="fixed inset-x-0 bottom-0 top-auto left-auto translate-x-0 translate-y-0 w-full max-w-none rounded-t-3xl rounded-b-none border-x-0 border-b-0 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-3xl sm:border p-0 gap-0 overflow-hidden flex flex-col max-h-[92dvh] bg-white"
        >
          {/* Mobile Grab Handle */}
          <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-white shrink-0">
            <span className="h-1 w-10 rounded-full bg-stone-300" />
          </div>

          {/* Sticky Header */}
          <div className="px-5 pt-3 pb-3.5 sm:pt-5 border-b border-stone-200/80 bg-white shrink-0 pr-12">
            <DialogHeader>
              <div className="flex items-center gap-2.5 flex-wrap">
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-extrabold tracking-tight text-stone-900">
                  <ShoppingBag className="h-5 w-5 shrink-0" style={{ color: accent }} />
                  <span>{placedOrders.length > 0 ? "Add More Dishes" : "Your Table Order"}</span>
                </DialogTitle>
                {table && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {`Table ${table.tableNumber}`}
                  </span>
                )}
              </div>
              <DialogDescription className="text-xs text-stone-500 mt-0.5">
                Review your dishes and choose how you&apos;d like to pay.
              </DialogDescription>
            </DialogHeader>
          </div>

          {cartEntries.length === 0 ? (
            <div className="py-12 px-5 text-center text-sm text-stone-500 bg-[#FAF8F5]/60">
              Your cart is empty. Add items from the menu to place an order.
            </div>
          ) : (
            <>
              {/* Scrollable Sheet Body */}
              <div
                data-lenis-prevent
                className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#FAF8F5]/60"
              >
                {/* Duplicate Item Protection Warning */}
                {duplicateCartItems.length > 0 && (
                  <div className="rounded-2xl border border-amber-300/80 bg-amber-50 p-3.5 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-950 leading-relaxed">
                        <p className="font-bold">Already ordered on this table</p>
                        <p className="text-amber-800 mt-0.5">
                          You already ordered{" "}
                          {duplicateCartItems
                            .map(
                              (e) =>
                                `${e.item.name} (×${orderedQtyByName.get(e.item.name.trim().toLowerCase())})`
                            )
                            .join(", ")}
                          . Keep only if you want another serving.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-6">
                      {duplicateCartItems.map((e) => (
                        <button
                          key={e.item.id}
                          type="button"
                          onClick={() => removeFromCart(e.item.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                          Remove {e.item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items List Card */}
                <div className="rounded-2xl border border-stone-200/80 bg-white divide-y divide-stone-100 overflow-hidden">
                  {cartEntries.map(({ item, quantity }) => (
                    <div key={item.id} className="flex items-center justify-between gap-2.5 p-3.5">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div className="pt-0.5 shrink-0">
                          <DietaryIndicator type={item.dietaryType} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-stone-900 leading-snug truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-stone-500 tabular-nums mt-0.5">
                            {formatCurrency(item.price, restaurant.currency)} each
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="inline-flex items-center rounded-xl border border-stone-200 bg-stone-50 p-0.5">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-stone-700 hover:bg-stone-100 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs font-extrabold text-stone-900 tabular-nums">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-stone-700 hover:bg-stone-100 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="w-16 text-right font-extrabold text-sm text-stone-900 tabular-nums">
                          {formatCurrency(item.price * quantity, restaurant.currency)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-stone-400 hover:text-red-600 cursor-pointer p-1"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Method Selector (Full-width responsive cards) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH_AT_COUNTER")}
                      className={cn(
                        "text-left rounded-2xl border p-3.5 cursor-pointer transition flex items-start gap-3",
                        paymentMethod === "CASH_AT_COUNTER"
                          ? "border-[#E15A2B] bg-white ring-2 ring-[#E15A2B]/20"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-stone-900">Pay at Counter</span>
                          <span
                            className={cn(
                              "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                              paymentMethod === "CASH_AT_COUNTER"
                                ? "border-[#E15A2B]"
                                : "border-stone-300"
                            )}
                          >
                            {paymentMethod === "CASH_AT_COUNTER" && (
                              <span className="h-2 w-2 rounded-full bg-[#E15A2B]" />
                            )}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-stone-500 leading-snug">
                          Cash, card, or UPI at the counter after dining.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("UPI_ONLINE")}
                      className={cn(
                        "text-left rounded-2xl border p-3.5 cursor-pointer transition flex items-start gap-3",
                        paymentMethod === "UPI_ONLINE"
                          ? "border-[#E15A2B] bg-white ring-2 ring-[#E15A2B]/20"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-stone-900">UPI Direct</span>
                          <span
                            className={cn(
                              "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                              paymentMethod === "UPI_ONLINE"
                                ? "border-[#E15A2B]"
                                : "border-stone-300"
                            )}
                          >
                            {paymentMethod === "UPI_ONLINE" && (
                              <span className="h-2 w-2 rounded-full bg-[#E15A2B]" />
                            )}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-stone-500 leading-snug">
                          Pay directly via GPay, PhonePe, or Paytm (0% fee).
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Cooking Instructions & Optional Guest Details */}
                <div className="rounded-2xl border border-stone-200/80 bg-white p-3.5 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 mb-1 block">
                      Cooking Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Less spicy, extra crispy, no onions..."
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-[#E15A2B] focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-semibold text-stone-700 mb-1 block">
                        Your Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Guest name"
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-[#E15A2B] focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-700 mb-1 block">
                        Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-[#E15A2B] focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Clean Bill Summary */}
                <div className="rounded-2xl bg-white border border-stone-200/80 p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Items Subtotal ({cartItemCount})</span>
                    <span className="font-semibold text-stone-900 tabular-nums">
                      {formatCurrency(cartSubtotal, restaurant.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Platform Fee</span>
                    <span className="font-semibold text-emerald-700">Free (0%)</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-stone-200/80 pt-2.5 text-sm font-extrabold text-stone-900">
                    <span>Total Payable</span>
                    <span className="text-lg tabular-nums" style={{ color: accent }}>
                      {formatCurrency(cartSubtotal, restaurant.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sticky Bottom CTA Footer */}
              <div className="px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-stone-200 bg-white shrink-0">
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={submittingOrder}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-bold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                >
                  {submittingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending Order to Kitchen...
                    </>
                  ) : (
                    <>
                      <span className="tabular-nums">
                        Place Order · {formatCurrency(cartSubtotal, restaurant.currency)}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Live Order Status & Pixel-Perfect Mobile Payment Bottom Sheet */}
      <Dialog open={orderStatusOpen} onOpenChange={setOrderStatusOpen}>
        <DialogContent
          data-lenis-prevent
          className="fixed inset-x-0 bottom-0 top-auto left-auto translate-x-0 translate-y-0 w-full max-w-none rounded-t-3xl rounded-b-none border-x-0 border-b-0 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-3xl sm:border p-0 gap-0 overflow-hidden flex flex-col max-h-[92dvh] bg-white"
        >
          {/* Mobile Grab Handle */}
          <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-white shrink-0">
            <span className="h-1 w-10 rounded-full bg-stone-300" />
          </div>

          {activeOrder ? (
            <>
              {/* Sticky Header */}
              <div className="px-5 pt-3 pb-3.5 sm:pt-5 border-b border-stone-200/80 bg-white shrink-0 pr-12">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                      activeOrder.status === "CANCELLED"
                        ? "bg-red-50 text-red-600"
                        : "bg-emerald-50 text-emerald-600"
                    )}
                  >
                    {activeOrder.status === "CANCELLED" ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <DialogTitle className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight truncate">
                      Order {activeOrder.orderNumber}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{restaurant.name}</span>
                      {activeOrder.tableNumber && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-stone-700">
                            Table {activeOrder.tableNumber}
                          </span>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </div>

                {/* Multi-Round Order Switcher */}
                {placedOrders.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-3 scrollbar-none">
                    {placedOrders.map((ord, idx) => (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => setSelectedOrderId(ord.id)}
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold border transition cursor-pointer tabular-nums",
                          ord.id === activeOrder.id
                            ? "bg-stone-900 text-white border-stone-900"
                            : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                        )}
                      >
                        Round {placedOrders.length - idx} · {ord.orderNumber}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scrollable Body */}
              <div
                data-lenis-prevent
                className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#FAF8F5]/60 text-left"
              >
                {/* 4-Step Kitchen Progress Card */}
                {(() => {
                  const steps = [
                    { key: "PENDING", label: "Received" },
                    { key: "CONFIRMED", label: "Accepted" },
                    { key: "PREPARING", label: "Cooking" },
                    { key: "SERVED", label: "Served" },
                  ] as const;
                  const statusIndexMap: Record<ActiveOrder["status"], number> = {
                    PENDING: 0,
                    CONFIRMED: 1,
                    PREPARING: 2,
                    SERVED: 3,
                    COMPLETED: 3,
                    CANCELLED: -1,
                  };
                  const currentIdx = statusIndexMap[activeOrder.status];

                  return (
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                          Kitchen Status
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                            activeOrder.status === "CANCELLED"
                              ? "bg-red-50 text-red-700"
                              : activeOrder.status === "COMPLETED" || activeOrder.status === "SERVED"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-800"
                          )}
                        >
                          {activeOrder.status === "PENDING" && "Waiting for Kitchen"}
                          {activeOrder.status === "CONFIRMED" && "Order Accepted"}
                          {activeOrder.status === "PREPARING" && "Preparing Fresh"}
                          {activeOrder.status === "SERVED" && "Served at Table"}
                          {activeOrder.status === "COMPLETED" && "Completed"}
                          {activeOrder.status === "CANCELLED" && "Cancelled"}
                        </span>
                      </div>

                      {activeOrder.status !== "CANCELLED" && (
                        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                          {steps.map((step, i) => {
                            const done = i <= currentIdx;
                            return (
                              <div key={step.key} className="space-y-1.5">
                                <div
                                  className={cn(
                                    "h-1.5 rounded-full transition-colors",
                                    done ? "bg-emerald-500" : "bg-stone-200"
                                  )}
                                />
                                <p
                                  className={cn(
                                    "text-[10px] font-semibold text-center",
                                    done ? "text-stone-900" : "text-stone-400"
                                  )}
                                >
                                  {step.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Pixel-Perfect Payment Card */}
                {activeOrder.status !== "CANCELLED" && (
                  <div className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden">
                    {/* Payment Card Header */}
                    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-100 bg-stone-50/70">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-stone-900">
                          {activeOrder.paymentMethod === "UPI_ONLINE"
                            ? "Direct UPI Payment"
                            : "Counter Payment"}
                        </span>
                      </div>

                      {activeOrder.paymentStatus === "PAID" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                          <Check className="h-3 w-3" /> Paid
                        </span>
                      ) : activeOrder.notes?.includes("verify on UPI") ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                          Verifying with Staff
                        </span>
                      ) : (
                        <span className="rounded-full bg-stone-200/80 px-2.5 py-0.5 text-[11px] font-bold text-stone-700">
                          {activeOrder.paymentMethod === "UPI_ONLINE" ? "Payment Due" : "Pay Later"}
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-3.5">
                      {/* Amount Hero Row */}
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-medium text-stone-500">Amount Payable</span>
                        <span className="text-2xl font-black tracking-tight text-stone-900 tabular-nums">
                          {formatCurrency(activeOrder.totalAmount, restaurant.currency)}
                        </span>
                      </div>

                      {activeOrder.paymentStatus === "PAID" ? (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 px-3.5 py-2.5 text-xs font-medium text-emerald-900 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Payment verified by staff. Thank you for dining with us!</span>
                        </div>
                      ) : activeOrder.paymentMethod === "UPI_ONLINE" ? (
                        <div className="space-y-3">
                          {/* Direct UPI App Launch Button (Primary on Phones!) */}
                          {activeUpiUri && (
                            <a
                              href={activeUpiUri}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-stone-800 active:scale-[0.99]"
                            >
                              <Smartphone className="h-4 w-4" />
                              <span className="tabular-nums">
                                Open UPI App · {formatCurrency(activeOrder.totalAmount, "INR")}
                              </span>
                            </a>
                          )}

                          {/* Merchant UPI ID Copy Bar */}
                          {restaurant.upiId?.trim() && (
                            <div className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                  Merchant UPI ID (0% Fee)
                                </p>
                                <p className="text-xs font-bold text-stone-800 truncate font-mono">
                                  {restaurant.upiId.trim()}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleCopyUpiId}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer shrink-0"
                              >
                                {copiedUpi ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Optional Collapsible QR for Scanning from Another Phone */}
                          {upiQrDataUrl && (
                            <div className="text-center">
                              <button
                                type="button"
                                onClick={() => setShowQrOnScreen((v) => !v)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
                              >
                                <QrIcon className="h-3.5 w-3.5" />
                                {showQrOnScreen
                                  ? "Hide QR code"
                                  : "Paying from another phone? Show UPI QR"}
                              </button>
                              {showQrOnScreen && (
                                <div className="mt-2.5 flex flex-col items-center rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={upiQrDataUrl}
                                    alt="UPI Payment QR"
                                    className="h-40 w-40 rounded-xl border border-stone-200 bg-white p-2"
                                  />
                                  <p className="mt-2 text-[11px] text-stone-500">
                                    Scan with GPay, PhonePe, Paytm, or BHIM
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Honest Staff-Verification Confirmation Step */}
                          {activeOrder.notes?.includes("verify on UPI") ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950 leading-relaxed">
                              <p className="font-bold">Payment marked as sent</p>
                              <p className="text-amber-800 mt-0.5">
                                Staff will verify it on their UPI soundbox and update your receipt to Paid.
                              </p>
                            </div>
                          ) : (
                            <div className="pt-1 border-t border-stone-100 space-y-2">
                              <input
                                type="text"
                                value={upiRefInput}
                                onChange={(e) => setUpiRefInput(e.target.value)}
                                placeholder="Optional: Last 4 digits of UTR / Ref No."
                                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-[#E15A2B] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={handleNotifyUpiPaid}
                                disabled={payingNow}
                                className="w-full rounded-xl bg-emerald-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer disabled:opacity-50 transition"
                              >
                                {payingNow
                                  ? "Notifying Staff..."
                                  : "I've Completed UPI Payment"}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Relax and enjoy your meal. Pay via cash, card, or UPI at the counter when you&apos;re ready to leave.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Itemized Order Receipt */}
                <div className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="font-bold text-stone-900">Ordered Items</span>
                    <span className="text-stone-400 tabular-nums">
                      {activeOrder.items?.reduce((s, i) => s + i.quantity, 0) || 0} items
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {activeOrder.items?.map((it) => (
                      <div key={it.id} className="flex items-center justify-between gap-2 text-stone-700">
                        <span className="truncate">
                          <strong className="text-stone-900 tabular-nums">{it.quantity}×</strong>{" "}
                          {it.name}
                        </span>
                        <span className="font-semibold text-stone-900 tabular-nums shrink-0">
                          {formatCurrency(it.subtotal, restaurant.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between border-t border-stone-100 pt-2.5 text-sm font-extrabold text-stone-900">
                    <span>Order Total</span>
                    <span className="tabular-nums">
                      {formatCurrency(activeOrder.totalAmount, restaurant.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sticky Bottom Footer */}
              <div className="px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-stone-200 bg-white shrink-0 flex flex-col sm:flex-row gap-2">
                {(restaurant.whatsappNumber || restaurant.phone) && (
                  <a
                    href={`https://wa.me/${formatWhatsAppPhone(restaurant.whatsappNumber || restaurant.phone)}?text=${encodeURIComponent(
                      `*New Order #${activeOrder.orderNumber}* — ${restaurant.name}\n${
                        activeOrder.tableNumber ? `Table: *${activeOrder.tableNumber}*\n` : ""
                      }\n${(activeOrder.items || [])
                        .map((i) => `- ${i.quantity}x ${i.name} (${formatCurrency(i.subtotal, restaurant.currency)})`)
                        .join("\n")}\n\n*Total: ${formatCurrency(activeOrder.totalAmount, restaurant.currency)}*`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-3 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    Send on WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setOrderStatusOpen(false)}
                  className="flex-1 rounded-xl bg-stone-900 py-3 px-3 text-xs font-bold text-white hover:bg-stone-800 cursor-pointer transition"
                >
                  Order More Dishes
                </button>
              </div>
            </>
          ) : (
            <div className="py-10 px-5 text-center text-sm text-stone-500">No active order</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Category Jump Directory Dialog */}
      <Dialog open={menuDrawerOpen} onOpenChange={setMenuDrawerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#E15A2B]" />
              Menu Categories
            </DialogTitle>
            <DialogDescription>Quickly jump to any section of the menu</DialogDescription>
          </DialogHeader>
          <ul className="divide-y divide-slate-100">
            {nonEmptyCategories.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => jumpToCategory(cat.id)}
                  className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-slate-800 transition hover:text-[#E15A2B] cursor-pointer"
                >
                  <span>{cat.name}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    {cat.menuItems.length}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Personal Table Shortlist Modal (Reference) */}
      <Dialog open={shortlistOpen} onOpenChange={setShortlistOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkCheck className="h-5 w-5 text-emerald-600" />
              Your Table Shortlist
              {table && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {`Table ${table.tableNumber}`}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Personal reference list — show or read these dishes to your server.
            </DialogDescription>
          </DialogHeader>

          {shortlistedItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No dishes saved yet. Tap &ldquo;Save&rdquo; on any dish to remember it.
            </p>
          ) : (
            <div className="space-y-4">
              <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {shortlistedItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <DietaryIndicator type={item.dietaryType} />
                      <span className="truncate font-medium text-slate-900">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(item.price, restaurant.currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleShortlist(item.id, item.name)}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 cursor-pointer"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-200">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Estimated Subtotal
                </span>
                <span className="text-lg font-extrabold text-slate-900">
                  {formatCurrency(shortlistTotal, restaurant.currency)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setShortlistIds([]);
                    setShortlistOpen(false);
                  }}
                  className="text-xs font-medium text-red-600 hover:underline cursor-pointer"
                >
                  Clear shortlist
                </button>
                <button
                  type="button"
                  onClick={() => setShortlistOpen(false)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restaurant Details Info Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{restaurant.name}</DialogTitle>
            <DialogDescription>Restaurant Details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-700">
            {restaurant.description && <p className="leading-relaxed">{restaurant.description}</p>}
            {locationLine && (
              <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <span>{locationLine}</span>
              </div>
            )}
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="flex items-center gap-2.5 rounded-lg bg-slate-50 p-3 hover:bg-slate-100"
              >
                <Phone className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="font-medium text-[#E15A2B]">{restaurant.phone}</span>
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
