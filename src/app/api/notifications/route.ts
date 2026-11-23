import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export interface DashboardNotificationItem {
  id: string;
  type: "NEW_ORDER" | "PAYMENT_RECEIVED" | "ORDER_STATUS" | "TABLE_SCAN";
  title: string;
  message: string;
  timestamp: string;
  tableNumber: string | null;
  orderId?: string;
  orderNumber?: string;
  amount?: number;
  status?: string;
  paymentMethod?: string;
  badge?: string;
}

export async function GET() {
  try {
    const ctx = await requireRestaurantContext();
    const restaurantId = ctx.restaurant.id;

    // 1. Fetch recent orders with items & table
    const recentOrders = await prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        table: {
          select: { id: true, tableNumber: true, label: true },
        },
        items: {
          select: { id: true, name: true, quantity: true, price: true },
        },
      },
    });

    // 2. Fetch recent table QR scans
    const recentScans = await prisma.qRScanEvent.findMany({
      where: {
        restaurantId,
        tableId: { not: null },
      },
      orderBy: { scannedAt: "desc" },
      take: 10,
      include: {
        table: {
          select: { id: true, tableNumber: true, label: true },
        },
      },
    });

    const notifications: DashboardNotificationItem[] = [];

    // Map orders to notifications
    for (const order of recentOrders) {
      const tableLabel = order.table ? `Table ${order.table.tableNumber}` : "Direct Guest";
      const itemsSummary =
        order.items.length > 0
          ? order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")
          : "Dishes ordered";

      // 1) New Order Notification
      notifications.push({
        id: `order-new-${order.id}`,
        type: "NEW_ORDER",
        title: `New Order #${order.orderNumber}`,
        message: `${tableLabel} • ${itemsSummary} • ₹${Number(order.totalAmount).toFixed(0)}`,
        timestamp: order.createdAt.toISOString(),
        tableNumber: order.table ? order.table.tableNumber : null,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: Number(order.totalAmount),
        status: order.status,
        badge: order.status,
      });

      // 2) Payment Received Notification
      if (order.paymentStatus === "PAID") {
        const methodLabel =
          order.paymentMethod === "UPI_ONLINE"
            ? "UPI Online"
            : order.paymentMethod === "CARD"
              ? "Card"
              : "Cash";

        notifications.push({
          id: `payment-${order.id}`,
          type: "PAYMENT_RECEIVED",
          title: `Payment Received • ₹${Number(order.totalAmount).toFixed(0)}`,
          message: `${tableLabel} paid ₹${Number(order.totalAmount).toFixed(0)} via ${methodLabel}`,
          timestamp: order.updatedAt.toISOString(),
          tableNumber: order.table ? order.table.tableNumber : null,
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: Number(order.totalAmount),
          paymentMethod: order.paymentMethod,
          badge: "PAID",
        });
      }

      // 3) Non-pending status transition
      if (order.status !== "PENDING") {
        notifications.push({
          id: `status-${order.id}-${order.status}`,
          type: "ORDER_STATUS",
          title: `Order #${order.orderNumber} ${order.status}`,
          message: `${tableLabel} order status transitioned to ${order.status}`,
          timestamp: order.updatedAt.toISOString(),
          tableNumber: order.table ? order.table.tableNumber : null,
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          badge: order.status,
        });
      }
    }

    // Map table scans to notifications
    for (const scan of recentScans) {
      if (scan.table) {
        notifications.push({
          id: `scan-${scan.id}`,
          type: "TABLE_SCAN",
          title: `Table ${scan.table.tableNumber} QR Scanned`,
          message: `Guest opened digital menu from ${scan.deviceType.toLowerCase()} device`,
          timestamp: scan.scannedAt.toISOString(),
          tableNumber: scan.table.tableNumber,
          badge: "SCAN",
        });
      }
    }

    // Sort all events by timestamp descending
    notifications.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const pendingOrdersCount = recentOrders.filter((o) => o.status === "PENDING").length;

    return NextResponse.json({
      notifications: notifications.slice(0, 30),
      counts: {
        total: notifications.length,
        pendingOrders: pendingOrdersCount,
        orders: notifications.filter((n) => n.type === "NEW_ORDER").length,
        payments: notifications.filter((n) => n.type === "PAYMENT_RECEIVED").length,
        scans: notifications.filter((n) => n.type === "TABLE_SCAN").length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
