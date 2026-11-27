"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Utensils,
  CreditCard,
  QrCode,
  Clock,
  Volume2,
  VolumeX,
  Check,
  CheckCheck,
  ExternalLink,
  Sparkles,
  ShoppingBag,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { chimeEngine } from "@/lib/audio-chime";
import { cn } from "@/lib/utils";
import type { DashboardNotificationItem } from "@/app/api/notifications/route";

function formatTimeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 30) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

interface NotificationContextValue {
  notifications: DashboardNotificationItem[];
  readIds: Set<string>;
  soundOn: boolean;
  toggleSound: () => void;
  markAllRead: () => void;
  markSingleRead: (id: string) => void;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<DashboardNotificationItem[]>([]);
  const [soundOn, setSoundOn] = React.useState(true);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());

  const initialLoadDone = React.useRef(false);
  const knownIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    setSoundOn(chimeEngine.isEnabled());
    try {
      const storedRead = localStorage.getItem("menuqr_read_notifications");
      if (storedRead) {
        setReadIds(new Set(JSON.parse(storedRead)));
      }
    } catch {
      // ignore storage parse error
    }
  }, []);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      const items: DashboardNotificationItem[] = data.notifications || [];

      setNotifications(items);

      if (!initialLoadDone.current) {
        items.forEach((item) => knownIdsRef.current.add(item.id));
        initialLoadDone.current = true;
        return;
      }

      const newItems = items.filter((item) => !knownIdsRef.current.has(item.id));
      if (newItems.length > 0) {
        newItems.forEach((item) => knownIdsRef.current.add(item.id));

        const newest = newItems[0];
        if (newest.type === "NEW_ORDER") {
          chimeEngine.playOrderBell();
          toast.success(
            `New Order from ${newest.tableNumber ? `Table ${newest.tableNumber}` : "Guest"}`,
            {
              id: newest.id,
              description: newest.message,
              action: {
                label: "View in Orders",
                onClick: () => router.push("/dashboard/orders"),
              },
              duration: 8000,
            }
          );
        } else if (newest.type === "PAYMENT_RECEIVED") {
          chimeEngine.playPaymentChime();
          toast.success(`Payment Confirmed: ₹${newest.amount}`, {
            id: newest.id,
            description: newest.message,
            action: {
              label: "View in Orders",
              onClick: () => router.push("/dashboard/orders"),
            },
            duration: 7000,
          });
        } else if (newest.type === "TABLE_SCAN") {
          chimeEngine.playStatusPing();
          toast.info(`Table ${newest.tableNumber} QR Scanned`, {
            id: newest.id,
            description: "Guest browsing digital menu live",
            duration: 4000,
          });
        } else if (newest.type === "ORDER_STATUS") {
          chimeEngine.playStatusPing();
          toast.info(`Order #${newest.orderNumber} ${newest.status}`, {
            id: newest.id,
            description: newest.message,
            duration: 4000,
          });
        }
      }
    } catch {
      // background silent fail
    }
  }, [router]);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 4500);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const toggleSound = React.useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      chimeEngine.setEnabled(next);
      toast.info(next ? "Audio alerts enabled" : "Audio alerts muted", {
        id: "audio-toggle",
      });
      return next;
    });
  }, []);

  const markAllRead = React.useCallback(() => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem("menuqr_read_notifications", JSON.stringify(Array.from(allIds)));
    } catch {
      // ignore
    }
    toast.success("All notifications marked as read", { id: "mark-all-read" });
  }, [notifications]);

  const markSingleRead = React.useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem("menuqr_read_notifications", JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({
      notifications,
      readIds,
      soundOn,
      toggleSound,
      markAllRead,
      markSingleRead,
    }),
    [notifications, readIds, soundOn, toggleSound, markAllRead, markSingleRead]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function NotificationCenter() {
  const router = useRouter();
  const ctx = React.useContext(NotificationContext);
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<"ALL" | "ORDERS" | "PAYMENTS" | "SCANS">("ALL");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const notifications = ctx?.notifications ?? [];
  const readIds = ctx?.readIds ?? new Set<string>();
  const soundOn = ctx?.soundOn ?? true;
  const toggleSound = ctx?.toggleSound ?? (() => {});
  const markAllRead = ctx?.markAllRead ?? (() => {});
  const markSingleRead = ctx?.markSingleRead ?? (() => {});

  // Handle click outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  function handleTestSound() {
    chimeEngine.playOrderBell();
    toast.success("Desk Bell Chime Test", {
      id: "desk-bell-test",
      description: "Audio is working and unlocked in your browser",
    });
  }

  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !readIds.has(n.id)).length;
  }, [notifications, readIds]);

  const filteredList = React.useMemo(() => {
    if (filter === "ORDERS") return notifications.filter((n) => n.type === "NEW_ORDER");
    if (filter === "PAYMENTS") return notifications.filter((n) => n.type === "PAYMENT_RECEIVED");
    if (filter === "SCANS") return notifications.filter((n) => n.type === "TABLE_SCAN");
    return notifications;
  }, [notifications, filter]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer",
          open
            ? "border-stone-400 bg-stone-100 text-stone-900 shadow-xs"
            : "border-stone-200/90 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 shadow-2xs"
        )}
        aria-label="View notifications"
        title="Live Restaurant Notifications"
      >
        <Bell className="h-4 w-4" />

        {/* Unread Badge Counter with Pulse */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E15A2B] px-1 text-[10px] font-black text-white shadow-md shadow-orange-500/30 animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
            <span className="absolute inset-0 rounded-full bg-[#E15A2B] opacity-40 animate-ping pointer-events-none" />
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {open && (
        <div className="absolute -right-2 sm:right-0 top-11 z-50 w-[calc(100vw-1.5rem)] max-w-[350px] sm:w-[420px] sm:max-w-none rounded-2xl border border-stone-200/90 bg-white shadow-2xl backdrop-blur-xl animate-in fade-in-50 slide-in-from-top-2 overflow-hidden">
          {/* Header */}
          <div className="border-b border-stone-100 bg-stone-50/70 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E15A2B]/10 text-[#E15A2B]">
                  <Bell className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900 leading-tight">
                    Live Restaurant Activity
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {unreadCount > 0 ? `${unreadCount} unread alerts` : "Everything up to date"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Audio Chime Mute/Unmute */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg border transition cursor-pointer",
                    soundOn
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-stone-200 bg-stone-100 text-stone-400 hover:bg-stone-200"
                  )}
                  title={soundOn ? "Mute audio chimes" : "Enable audio chimes"}
                >
                  {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                </button>

                {/* Test Sound Button */}
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-100 cursor-pointer shadow-2xs"
                  title="Test desk bell audio"
                >
                  Test Sound
                </button>

                {/* Mark All Read */}
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mt-3 flex items-center gap-1 rounded-xl bg-stone-200/60 p-1 text-[11px] font-bold text-stone-600">
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                className={cn(
                  "flex-1 rounded-lg py-1 transition cursor-pointer text-center",
                  filter === "ALL" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"
                )}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("ORDERS")}
                className={cn(
                  "flex-1 rounded-lg py-1 transition cursor-pointer text-center",
                  filter === "ORDERS" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"
                )}
              >
                Orders
              </button>
              <button
                type="button"
                onClick={() => setFilter("PAYMENTS")}
                className={cn(
                  "flex-1 rounded-lg py-1 transition cursor-pointer text-center",
                  filter === "PAYMENTS" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"
                )}
              >
                Payments
              </button>
              <button
                type="button"
                onClick={() => setFilter("SCANS")}
                className={cn(
                  "flex-1 rounded-lg py-1 transition cursor-pointer text-center",
                  filter === "SCANS" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"
                )}
              >
                Scans
              </button>
            </div>
          </div>

          {/* Notifications Scrollable List */}
          <div className="max-h-[380px] divide-y divide-stone-100 overflow-y-auto">
            {filteredList.length === 0 ? (
              <div className="py-12 text-center px-4">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="mt-2 text-xs font-bold text-stone-700">No notifications yet</p>
                <p className="mt-0.5 text-[11px] text-stone-400">
                  Customer table orders, UPI payments, and QR scans appear here in real time.
                </p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isUnread = !readIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      markSingleRead(item.id);
                      if (item.type === "NEW_ORDER" || item.type === "PAYMENT_RECEIVED" || item.type === "ORDER_STATUS") {
                        setOpen(false);
                        router.push("/dashboard/orders");
                      }
                    }}
                    className={cn(
                      "group flex items-start gap-3 p-3.5 transition cursor-pointer hover:bg-stone-50",
                      isUnread && "bg-orange-50/40"
                    )}
                  >
                    {/* Leading Icon */}
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        item.type === "NEW_ORDER" && "bg-[#E15A2B]/15 text-[#E15A2B]",
                        item.type === "PAYMENT_RECEIVED" && "bg-emerald-100 text-emerald-700",
                        item.type === "ORDER_STATUS" && "bg-blue-100 text-blue-700",
                        item.type === "TABLE_SCAN" && "bg-purple-100 text-purple-700"
                      )}
                    >
                      {item.type === "NEW_ORDER" && <Utensils className="h-4 w-4" />}
                      {item.type === "PAYMENT_RECEIVED" && <CreditCard className="h-4 w-4" />}
                      {item.type === "ORDER_STATUS" && <Clock className="h-4 w-4" />}
                      {item.type === "TABLE_SCAN" && <QrCode className="h-4 w-4" />}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="truncate text-xs font-bold text-stone-900">{item.title}</p>
                          {item.tableNumber && (
                            <span className="shrink-0 rounded-md bg-stone-200/70 px-1.5 py-0.2 text-[10px] font-extrabold text-stone-700">
                              T-{item.tableNumber}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] font-medium text-stone-400">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>

                      <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600 line-clamp-2">
                        {item.message}
                      </p>

                      {isUnread && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E15A2B]" />
                          <span className="text-[10px] font-bold text-[#E15A2B]">New</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          <div className="border-t border-stone-100 bg-stone-50/70 p-2.5 text-center">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/orders");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E15A2B] hover:underline cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Go to Kitchen Live Orders</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
