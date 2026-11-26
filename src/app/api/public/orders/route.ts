import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validations/order";
import { checkRateLimitDistributed } from "@/lib/rate-limit";
import { isSubscriptionLive } from "@/lib/trial-guard";
import { headers } from "next/headers";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const ip =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      reqHeaders.get("x-real-ip") ||
      "127.0.0.1";

    // Prank-order protection: max 5 orders per 15 minutes per IP
    const rl = await checkRateLimitDistributed(`public:orders:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many orders placed from this device. Please wait a few minutes or ask your server." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid order data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      restaurantSlug,
      tableToken,
      customerName,
      customerPhone,
      paymentMethod,
      notes,
      items,
    } = parsed.data;

    // Verify restaurant is active, published, and has a live subscription
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        isPublished: true,
        currency: true,
        subscription: {
          select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
        },
      },
    });

    if (
      !restaurant ||
      restaurant.status !== "ACTIVE" ||
      !restaurant.isPublished ||
      !isSubscriptionLive(restaurant.subscription)
    ) {
      return NextResponse.json(
        { error: "This restaurant is not currently accepting orders" },
        { status: 404 }
      );
    }

    // If table token provided, resolve table
    let tableId: string | null = null;
    let tableNumber: string | null = null;

    if (tableToken) {
      const qrCode = await prisma.qRCode.findFirst({
        where: {
          restaurantId: restaurant.id,
          token: tableToken,
          type: "TABLE",
          isActive: true,
        },
        include: {
          table: {
            select: { id: true, tableNumber: true, isActive: true },
          },
        },
      });

      if (!qrCode || !qrCode.table || !qrCode.table.isActive) {
        return NextResponse.json(
          { error: "Invalid or inactive table QR code" },
          { status: 400 }
        );
      }

      tableId = qrCode.table.id;
      tableNumber = qrCode.table.tableNumber;
    }

    // Fetch menu items from DB to verify prices and availability
    const itemIds = items.map((i) => i.menuItemId);
    const dbItems = await prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        restaurantId: restaurant.id,
      },
    });

    if (dbItems.length !== itemIds.length) {
      return NextResponse.json(
        { error: "One or more items do not belong to this restaurant" },
        { status: 400 }
      );
    }

    // Check availability
    const unavailable = dbItems.filter((i) => !i.isAvailable);
    if (unavailable.length > 0) {
      return NextResponse.json(
        {
          error: `Sorry, "${unavailable[0].name}" is currently sold out`,
          unavailableItem: unavailable[0].name,
        },
        { status: 400 }
      );
    }

    const dbItemMap = new Map(dbItems.map((i) => [i.id, i]));

    // Compute prices securely on server
    let subtotalNum = 0;
    const orderItemsData = items.map((cartItem) => {
      const itemRecord = dbItemMap.get(cartItem.menuItemId)!;
      const priceNum = Number(itemRecord.price);
      const itemSubtotal = priceNum * cartItem.quantity;
      subtotalNum += itemSubtotal;

      return {
        menuItemId: itemRecord.id,
        name: itemRecord.name,
        price: itemRecord.price,
        quantity: cartItem.quantity,
        subtotal: new Decimal(itemSubtotal.toFixed(2)),
        notes: cartItem.notes || null,
      };
    });

    const subtotal = new Decimal(subtotalNum.toFixed(2));
    const taxAmount = new Decimal("0.00");
    const totalAmount = subtotal;

    // Generate collision-free daily sequential order number per restaurant (e.g. ORD-101, ORD-102)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todaysOrderCount = await prisma.order.count({
      where: {
        restaurantId: restaurant.id,
        createdAt: { gte: startOfToday },
      },
    });
    const orderNumber = `ORD-${101 + todaysOrderCount}`;

    const order = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId,
        orderNumber,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        status: "PENDING",
        paymentStatus: paymentMethod === "UPI_ONLINE" ? "PENDING" : "PENDING",
        paymentMethod,
        subtotal,
        taxAmount,
        totalAmount,
        notes: notes || null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        table: {
          select: { id: true, tableNumber: true, label: true },
        },
        items: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          restaurantName: restaurant.name,
          currency: restaurant.currency,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          subtotal: Number(order.subtotal),
          totalAmount: Number(order.totalAmount),
          table: order.table,
          tableNumber,
          notes: order.notes,
          createdAt: order.createdAt,
          items: order.items.map((i) => ({
            id: i.id,
            name: i.name,
            price: Number(i.price),
            quantity: i.quantity,
            subtotal: Number(i.subtotal),
            notes: i.notes,
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create public order:", error);
    return NextResponse.json(
      { error: "Internal server error while creating order" },
      { status: 500 }
    );
  }
}
