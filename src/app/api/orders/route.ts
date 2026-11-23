import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError } from "@/lib/tenant";
import type { Prisma, OrderStatus, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();
    const paymentStatus = searchParams.get("paymentStatus")?.trim();
    const tableId = searchParams.get("tableId")?.trim();

    const where: Prisma.OrderWhereInput = {
      restaurantId: ctx.restaurant.id,
    };

    if (status && status !== "ALL") {
      where.status = status as OrderStatus;
    }

    if (paymentStatus && paymentStatus !== "ALL") {
      where.paymentStatus = paymentStatus as PaymentStatus;
    }

    if (tableId && tableId !== "ALL") {
      where.tableId = tableId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: {
          select: { id: true, tableNumber: true, label: true },
        },
        items: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            subtotal: true,
            notes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        subtotal: Number(o.subtotal),
        taxAmount: Number(o.taxAmount),
        totalAmount: Number(o.totalAmount),
        notes: o.notes,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        table: o.table,
        items: o.items.map((i) => ({
          ...i,
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
