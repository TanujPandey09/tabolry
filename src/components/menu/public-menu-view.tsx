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

  // Active Placed Order Tracking
  const [activeOrder, setActiveOrder] = React.useState<ActiveOrder | null>(null);
  const [orderStatusOpen, setOrderStatusOpen] = React.useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = React.useState<string | null>(null);
  const [payingNow, setPayingNow] = React.useState(false);

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
    setCart((prev) => {
      const existing = prev[item.id];
      const quantity = (existing?.quantity || 0) + 1;
      return {
        ...prev,
        [item.id]: { item, quantity, notes: existing?.notes || "" },
      };
    });
    toast.success(`Added ${item.name} to order`);
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

  // Generate UPI QR code for active order (dynamically imports qrcode only when customer initiates UPI)
  React.useEffect(() => {
    let cancelled = false;
    if (activeOrder && activeOrder.paymentMethod === "UPI_ONLINE" && activeOrder.paymentStatus !== "PAID") {
      const payeeUpi = restaurant.upiId?.trim() || "restaurant@upi";
      const upiUri = `upi://pay?pa=${encodeURIComponent(payeeUpi)}&pn=${encodeURIComponent(
        restaurant.name
      )}&am=${activeOrder.totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
        `Order ${activeOrder.orderNumber}`
      )}`;
      import("qrcode")
        .then(({ default: QRCode }) => {
          if (!cancelled) {
            QRCode.toDataURL(upiUri, { width: 220, margin: 1 })
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
  }, [activeOrder, restaurant.name]);

  // Real-time polling for active order status with audio-visual notifications
  React.useEffect(() => {
    if (!activeOrder || activeOrder.status === "COMPLETED" || activeOrder.status === "CANCELLED") {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/orders/${activeOrder.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.order) {
            setActiveOrder((current) => {
              if (current && current.status !== data.order.status) {
                const s = data.order.status;
                const orderNum = data.order.orderNumber;
                const tableStr = table ? `Table ${table.tableNumber}` : "your table";

                if (s === "CONFIRMED") {
                  chimeEngine.playStatusPing();
                  toast.success(`✅ Kitchen Confirmed Order #${orderNum}`, {
                    description: `Staff confirmed your dishes for ${tableStr}. Cooking will begin shortly.`,
                    duration: 5000,
                  });
                } else if (s === "PREPARING") {
                  chimeEngine.playStatusPing();
                  toast.info(`👨‍🍳 Chef Started Preparing Your Food!`, {
                    description: `Order #${orderNum} is now being prepared fresh in the kitchen.`,
                    duration: 6000,
                  });
                } else if (s === "SERVED") {
                  chimeEngine.playOrderBell();
                  toast.success(`🍽️ Order #${orderNum} Served!`, {
                    description: `Your food has arrived at ${tableStr}. Enjoy your meal!`,
                    duration: 7000,
                  });
                } else if (s === "COMPLETED") {
                  chimeEngine.playPaymentChime();
                  toast.success(`✨ Order Complete`, {
                    description: `Thank you for dining at ${restaurant.name}! Have a wonderful day.`,
                    duration: 7000,
                  });
                } else if (s === "CANCELLED") {
                  toast.error(`❌ Order #${orderNum} Cancelled`, {
                    description: "Please speak with the restaurant staff for assistance.",
                  });
                }
              }
              return data.order;
            });
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
      toast.success(`🎉 Order #${data.order.orderNumber} Placed Successfully!`, {
        description: `Sent directly to the kitchen for ${tableInfo} (${cartEntries.length} dishes • ₹${Number(data.order.totalAmount).toFixed(0)})`,
        duration: 7000,
      });

      setActiveOrder(data.order);
      setCart({});
      setOrderModalOpen(false);
      setOrderStatusOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmittingOrder(false);
    }
  }

  async function handleSimulatePayment() {
    if (!activeOrder) return;
    setPayingNow(true);
    try {
      const res = await fetch(`/api/public/orders/${activeOrder.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "UPI_ONLINE",
          transactionRef: `UPI-TXN-${Date.now()}`,
        }),
      });
      if (!res.ok) throw new Error("Payment verification failed");
      const data = await res.json();
      setActiveOrder((prev) =>
        prev
          ? {
              ...prev,
              paymentStatus: "PAID",
              status: data.order?.status || "CONFIRMED",
            }
          : null
      );
      chimeEngine.playPaymentChime();
      toast.success("✅ Payment Received via UPI!", {
        description: `₹${Number(activeOrder.totalAmount).toFixed(0)} confirmed for Order #${activeOrder.orderNumber}. Digital receipt saved.`,
        duration: 6000,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
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
        "min-h-screen pb-28",
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
        {/* Cover Banner */}
        <div className="relative h-44 w-full overflow-hidden sm:h-56">
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
        <div className="relative mx-auto max-w-2xl px-4 -mt-8 z-20">
          <div
            className={cn(
              "rounded-3xl border border-stone-200/80 bg-white p-5 shadow-xl sm:p-6",
              isClassic && "border-stone-200 bg-[#FAF7F2]"
            )}
          >
            {/* Top row: Logo overlapping card edge on left, Dine-In Badge on right */}
            <div className="flex items-center justify-between gap-3">
              <div
                className={cn(
                  "relative -mt-12 sm:-mt-14 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg sm:h-22 sm:w-22",
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
      <div className="sticky top-0 z-30 mt-4 border-y border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto max-w-2xl px-4 py-3 space-y-3">
          {/* Search Input & Filter Pills */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#E15A2B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortMode)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/20 cursor-pointer"
            >
              <option value="RECOMMENDED">Sort: Featured</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
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
                        "group relative flex items-stretch justify-between gap-4 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/40",
                        template === "MODERN" &&
                          "rounded-3xl border border-stone-200/80 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-stone-300 hover:shadow-md",
                        isClassic &&
                          "rounded-2xl border border-stone-200 bg-[#FAF7F2] p-4 shadow-xs hover:border-stone-300",
                        isMinimal && "py-4 hover:bg-slate-50/60 px-2 -mx-2 rounded-xl",
                        !item.isAvailable && "opacity-70"
                      )}
                    >
                      {/* Text Content */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between space-y-2">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <DietaryIndicator type={item.dietaryType} />
                            {!item.isAvailable && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                                Sold Out
                              </span>
                            )}
                          </div>

                          <h3
                            className={cn(
                              "text-base font-bold leading-snug text-slate-900 group-hover:text-[#E15A2B] transition-colors",
                              isClassic && "font-serif text-[17px]"
                            )}
                          >
                            {item.name}
                          </h3>

                          {item.description && (
                            <p className="text-xs sm:text-sm leading-relaxed text-slate-500 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                          <span
                            className="text-base font-extrabold tracking-tight"
                            style={{ color: item.isAvailable ? "#0F172A" : "#64748B" }}
                          >
                            {formatCurrency(item.price, restaurant.currency)}
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Interactive Order Add / Stepper */}
                            {item.isAvailable && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center"
                              >
                                {inCartQty === 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => addToCart(item)}
                                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:opacity-90 cursor-pointer"
                                    style={{ backgroundColor: accent }}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    ADD
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 p-0.5 shadow-xs">
                                    <button
                                      type="button"
                                      onClick={() => updateCartQuantity(item.id, -1)}
                                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="w-7 text-center text-xs font-bold text-slate-900">
                                      {inCartQty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateCartQuantity(item.id, 1)}
                                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Bookmark Save Button */}
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
                                "inline-flex items-center gap-1 rounded-full border p-1.5 text-[11px] font-semibold transition cursor-pointer",
                                isSaved
                                  ? "border-transparent text-white"
                                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                              )}
                              style={isSaved ? { backgroundColor: accent } : undefined}
                            >
                              {isSaved ? (
                                <BookmarkCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Bookmark className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Food Image */}
                      {item.imageUrl ? (
                        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-stone-100 bg-stone-100 sm:h-32 sm:w-32 shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            loading="lazy"
                            className={cn(
                              "h-full w-full object-cover transition-transform duration-500 group-hover:scale-108",
                              !item.isAvailable && "grayscale"
                            )}
                          />
                          {!item.isAvailable ? (
                            <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 backdrop-blur-xs py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white">
                              Sold Out
                            </div>
                          ) : (item.galleryImages?.length || 0) > 0 ? (
                            <span className="absolute bottom-1.5 right-1.5 rounded-full bg-stone-950/75 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                              +{(item.galleryImages?.length || 0)} photos
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border border-stone-200/60 bg-gradient-to-br from-stone-50 to-stone-100 text-stone-400">
                          <Utensils className="h-6 w-6 opacity-60" />
                          <span className="mt-1 text-[10px] font-medium text-stone-500">
                            Chef's Special
                          </span>
                        </div>
                      )}
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
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 mx-auto flex max-w-xl flex-col gap-2 px-4">
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
            <div className="pointer-events-auto flex items-center justify-between rounded-2xl p-3 text-white shadow-2xl"
              style={{ backgroundColor: accent }}
            >
              <div className="flex items-center gap-3 pl-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                    {table ? `Table ${table.tableNumber} Order` : "Your Order"}
                  </p>
                  <p className="text-sm font-extrabold">
                    {cartItemCount} {cartItemCount === 1 ? "item" : "items"} ·{" "}
                    {formatCurrency(cartSubtotal, restaurant.currency)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOrderModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-md transition hover:bg-slate-100 cursor-pointer"
              >
                <span>View Order</span>
                <ArrowRight className="h-4 w-4" />
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

      {/* Complete Table Order / Checkout Dialog */}
      <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
        <DialogContent className="max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <ShoppingBag className="h-5 w-5 text-[#E15A2B]" />
                Table Order
              </DialogTitle>
              {table && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {`Table ${table.tableNumber}`}
                </span>
              )}
            </div>
            <DialogDescription>
              Review your items and confirm your order for the kitchen.
            </DialogDescription>
          </DialogHeader>

          {cartEntries.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Your cart is empty. Add items from the menu to place an order.
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              {/* Items List */}
              <div className="space-y-3 divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                {cartEntries.map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 pt-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <DietaryIndicator type={item.dietaryType} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(item.price, restaurant.currency)} each
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-900">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="w-16 text-right font-bold text-sm text-slate-900">
                        {formatCurrency(item.price * quantity, restaurant.currency)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-400 hover:text-red-600 cursor-pointer p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Instructions */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Cooking Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Less spicy, make extra crispy, no onions..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/20"
                />
              </div>

              {/* Customer Contact (Optional) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Guest name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Phone (For SMS receipt)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E15A2B]/20"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">
                  Select Payment Option
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaymentMethod("CASH_AT_COUNTER")}
                    className={cn(
                      "rounded-xl border p-3 cursor-pointer transition flex flex-col justify-between",
                      paymentMethod === "CASH_AT_COUNTER"
                        ? "border-[#E15A2B] bg-[#E15A2B]/5 ring-2 ring-[#E15A2B]/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-[#E15A2B]" />
                      <span className="text-xs font-bold text-slate-900">Pay at Counter</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Order now, pay cash/card at the counter when leaving.
                    </p>
                  </div>

                  <div
                    onClick={() => setPaymentMethod("UPI_ONLINE")}
                    className={cn(
                      "rounded-xl border p-3 cursor-pointer transition flex flex-col justify-between",
                      paymentMethod === "UPI_ONLINE"
                        ? "border-[#E15A2B] bg-[#E15A2B]/5 ring-2 ring-[#E15A2B]/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <QrIcon className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-900">UPI / Pay Now</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Scan restaurant UPI QR on phone or instant digital payment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bill Summary */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({cartItemCount} items)</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(cartSubtotal, restaurant.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes & Service Charge</span>
                  <span className="font-semibold text-slate-900">₹0.00</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-base" style={{ color: accent }}>
                    {formatCurrency(cartSubtotal, restaurant.currency)}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={submittingOrder}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition hover:opacity-95 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                {submittingOrder ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Placing Order with Kitchen...
                  </>
                ) : (
                  <>
                    <span>
                      Place Table Order ({formatCurrency(cartSubtotal, restaurant.currency)})
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Live Order Confirmation & Status Dialog */}
      <Dialog open={orderStatusOpen} onOpenChange={setOrderStatusOpen}>
        <DialogContent className="max-w-md p-6 max-h-[90vh] overflow-y-auto text-center">
          {activeOrder ? (
            <div className="space-y-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Order Placed Successfully!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order Number: <strong className="text-slate-800">{activeOrder.orderNumber}</strong>
                  {activeOrder.tableNumber ? ` · Table ${activeOrder.tableNumber}` : ""}
                </p>
              </div>

              {/* Status Visual Tracker */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Live Kitchen Status
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-base font-extrabold text-slate-900">
                    {activeOrder.status === "PENDING" && "🕒 Received — Waiting for kitchen"}
                    {activeOrder.status === "CONFIRMED" && "👨‍🍳 Accepted by Kitchen"}
                    {activeOrder.status === "PREPARING" && "🍳 Food is being prepared"}
                    {activeOrder.status === "SERVED" && "🍽️ Served at your table"}
                    {activeOrder.status === "COMPLETED" && "✅ Order Complete — Thank you!"}
                    {activeOrder.status === "CANCELLED" && "❌ Order Cancelled"}
                  </span>
                  <span className="rounded-full bg-[#E15A2B]/10 px-2.5 py-0.5 text-xs font-bold text-[#E15A2B]">
                    {activeOrder.status}
                  </span>
                </div>
              </div>

              {/* UPI Payment Flow */}
              {activeOrder.paymentMethod === "UPI_ONLINE" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <QrIcon className="h-4 w-4" /> UPI Payment
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        activeOrder.paymentStatus === "PAID"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-200 text-amber-900"
                      }`}
                    >
                      {activeOrder.paymentStatus === "PAID" ? "✓ Paid" : "Unpaid"}
                    </span>
                  </div>

                  {activeOrder.paymentStatus !== "PAID" ? (
                    <div className="flex flex-col items-center space-y-2">
                      {upiQrDataUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={upiQrDataUrl}
                          alt="UPI Payment QR"
                          className="h-40 w-40 rounded-xl border border-emerald-200 bg-white p-2 shadow-xs"
                        />
                      )}
                      <p className="text-[11px] text-emerald-800">
                        Scan with GPay, PhonePe, Paytm, or BHIM to pay{" "}
                        <strong>{formatCurrency(activeOrder.totalAmount, "INR")}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={handleSimulatePayment}
                        disabled={payingNow}
                        className="mt-1 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
                      >
                        {payingNow ? "Confirming..." : "Simulate / Confirm Instant Payment"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-emerald-800">
                      Payment received! Thank you for paying via UPI.
                    </p>
                  )}
                </div>
              )}

              {/* Order Items Summary */}
              <div className="rounded-xl border border-slate-200 p-3 text-left space-y-1.5 text-xs">
                <span className="font-semibold text-slate-800 block border-b border-slate-100 pb-1">
                  Ordered Items
                </span>
                {activeOrder.items?.map((it) => (
                  <div key={it.id} className="flex justify-between py-0.5 text-slate-600">
                    <span>
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(it.subtotal, "INR")}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-slate-900">
                  <span>Total Amount</span>
                  <span>{formatCurrency(activeOrder.totalAmount, "INR")}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
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
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 px-3 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    Send on WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setOrderStatusOpen(false)}
                  className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Order More Dishes
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-slate-500">No active order</div>
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
