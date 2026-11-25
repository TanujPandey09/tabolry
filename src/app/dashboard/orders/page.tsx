"use client";

import * as React from "react";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Phone,
  User,
  CreditCard,
  IndianRupee,
  Utensils,
  ChevronRight,
  Filter,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/states";
import { chimeEngine } from "@/lib/audio-chime";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  notes: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "SERVED" | "COMPLETED" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID" | "REFUNDED";
  paymentMethod: "CASH_AT_COUNTER" | "UPI_ONLINE" | "CARD";
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  table: { id: string; tableNumber: string; label: string | null } | null;
  items: OrderItem[];
}

export default function DashboardOrdersPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const prevPendingCountRef = React.useRef<number>(0);

  const fetchOrders = React.useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      const list: Order[] = data.orders || [];
      setOrders(list);

      const pendingCount = list.filter((o) => o.status === "PENDING").length;
      if (pendingCount > prevPendingCountRef.current && prevPendingCountRef.current > 0) {
        toast.info(`🔔 New order received! Total pending: ${pendingCount}`);
        if (soundEnabled) {
          chimeEngine.playOrderBell();
        }
      }
      prevPendingCountRef.current = pendingCount;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [soundEnabled]);

  React.useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function updateOrderStatus(orderId: string, newStatus: Order["status"]) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }
      toast.success(`Order status changed to ${newStatus}`);
      await fetchOrders(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setUpdatingId(null);
    }
  }

  async function togglePayment(orderId: string, currentStatus: Order["paymentStatus"]) {
    setUpdatingId(orderId);
    const newStatus = currentStatus === "PAID" ? "PENDING" : "PAID";
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      if (!res.ok) throw new Error("Payment update failed");
      toast.success(`Payment marked as ${newStatus}`);
      await fetchOrders(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update payment");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredOrders = React.useMemo(() => {
    if (statusFilter === "ALL") return orders;
    if (statusFilter === "ACTIVE") {
      return orders.filter((o) => ["PENDING", "CONFIRMED", "PREPARING", "SERVED"].includes(o.status));
    }
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const metrics = React.useMemo(() => {
    const pending = orders.filter((o) => o.status === "PENDING").length;
    const kitchen = orders.filter((o) => ["CONFIRMED", "PREPARING"].includes(o.status)).length;
    const completed = orders.filter((o) => o.status === "COMPLETED").length;
    const totalRev = orders
      .filter((o) => o.status !== "CANCELLED" && o.paymentStatus === "PAID")
      .reduce((sum, o) => sum + o.totalAmount, 0);
    return { pending, kitchen, completed, totalRev };
  }, [orders]);

  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-[#E15A2B]" />
            Live Table Orders
          </h1>
          <p className="text-sm text-slate-500">
            Real-time incoming customer orders from table QR codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="gap-2"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">Chime On</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-slate-400" />
                <span className="hidden sm:inline">Muted</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-[#E15A2B]" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Pending Approval
          </span>
          <p className="mt-1 text-2xl font-bold text-amber-900">{metrics.pending}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-orange-700">
            In Kitchen
          </span>
          <p className="mt-1 text-2xl font-bold text-orange-900">{metrics.kitchen}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Completed Orders
          </span>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{metrics.completed}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Paid Revenue
          </span>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(metrics.totalRev, "INR")}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: "ACTIVE", label: "Active Orders" },
          { key: "PENDING", label: `Pending (${metrics.pending})` },
          { key: "PREPARING", label: "In Kitchen" },
          { key: "SERVED", label: "Served" },
          { key: "COMPLETED", label: "Completed" },
          { key: "ALL", label: `All (${orders.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              statusFilter === tab.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-800">No orders in this view</h3>
          <p className="mt-1 text-xs text-slate-500">
            When guests at tables place an order via QR, it will appear here immediately.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const isPending = order.status === "PENDING";
            const isConfirmed = order.status === "CONFIRMED";
            const isPreparing = order.status === "PREPARING";
            const isServed = order.status === "SERVED";
            const isCompleted = order.status === "COMPLETED";
            const isCancelled = order.status === "CANCELLED";

            return (
              <div
                key={order.id}
                className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                  isPending
                    ? "border-amber-300 ring-2 ring-amber-100"
                    : isPreparing
                    ? "border-blue-200"
                    : isCompleted
                    ? "border-slate-200 opacity-80"
                    : "border-slate-200"
                }`}
              >
                <div>
                  {/* Top Bar: Order Number, Table & Time */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{order.orderNumber}</span>
                      {order.table ? (
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                          Table {order.table.tableNumber}
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Takeaway / Counter
                        </span>
                      )}
                    </div>

                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Customer Info if present */}
                  {(order.customerName || order.customerPhone) && (
                    <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-600">
                      {order.customerName && (
                        <span className="flex items-center gap-1 font-medium">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {order.customerName}
                        </span>
                      )}
                      {order.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {order.customerPhone}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Items List */}
                  <div className="mt-3 space-y-1.5 divide-y divide-slate-50">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between pt-1.5 text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-900">{item.quantity}x</span>{" "}
                          <span className="text-slate-800 font-medium">{item.name}</span>
                          {item.notes && (
                            <p className="text-[11px] italic text-amber-700">Note: {item.notes}</p>
                          )}
                        </div>
                        <span className="shrink-0 font-medium text-slate-700">
                          {formatCurrency(item.subtotal, "INR")}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Special Order Instructions */}
                  {order.notes && (
                    <div className="mt-3 rounded-lg bg-amber-50/70 p-2 text-xs text-amber-900 border border-amber-200/50">
                      <strong>Instructions:</strong> {order.notes}
                    </div>
                  )}
                </div>

                {/* Footer: Price, Payment and Status Actions */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                        Total
                      </span>
                      <p className="text-base font-extrabold text-slate-900">
                        {formatCurrency(order.totalAmount, "INR")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://wa.me/${(order.customerPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                          `🧾 *Digital Bill - Order #${order.orderNumber}*\n${
                            order.table ? `Table ${order.table.tableNumber}\n` : ""
                          }\n${order.items
                            .map((i) => `• ${i.quantity}x ${i.name} — ₹${Number(i.subtotal).toFixed(0)}`)
                            .join("\n")}\n\n*Total: ₹${Number(order.totalAmount).toFixed(0)}*\nStatus: ${
                            order.paymentStatus === "PAID" ? "✅ Paid" : "⏳ Payment Pending"
                          }`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition"
                        title="Send digital bill on WhatsApp"
                      >
                        WhatsApp Bill
                      </a>
                      <button
                        type="button"
                        onClick={() => togglePayment(order.id, order.paymentStatus)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition ${
                          order.paymentStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        }`}
                        title="Click to toggle payment status"
                      >
                        {order.paymentStatus === "PAID" ? "✓ Paid" : "⚠ Unpaid"} (
                        {order.paymentMethod === "UPI_ONLINE" ? "UPI" : "Cash"})
                      </button>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="flex flex-wrap gap-2">
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, "CONFIRMED")}
                          disabled={updatingId === order.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                        >
                          Accept Order
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                          disabled={updatingId === order.id}
                          className="text-red-600 hover:bg-red-50 text-xs h-8"
                        >
                          Decline
                        </Button>
                      </>
                    )}

                    {isConfirmed && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "PREPARING")}
                        disabled={updatingId === order.id}
                        className="w-full bg-[#E15A2B] hover:bg-[#C2410C] text-white text-xs h-8"
                      >
                        Start Preparing in Kitchen
                      </Button>
                    )}

                    {isPreparing && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "SERVED")}
                        disabled={updatingId === order.id}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                      >
                        Mark as Served to Table
                      </Button>
                    )}

                    {isServed && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, "COMPLETED")}
                        disabled={updatingId === order.id}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
                      >
                        Complete Order (Paid & Done)
                      </Button>
                    )}

                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 w-full justify-center py-1">
                        <CheckCircle2 className="h-4 w-4" /> Order Completed
                      </span>
                    )}

                    {isCancelled && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 w-full justify-center py-1">
                        <AlertCircle className="h-4 w-4" /> Order Cancelled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
