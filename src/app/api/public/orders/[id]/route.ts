import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
            phone: true,
            primaryColor: true,
          },
        },
        table: {
          select: { id: true, tableNumber: true, label: true },
        },
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        restaurantName: order.restaurant.name,
        restaurantSlug: order.restaurant.slug,
        currency: order.restaurant.currency,
        restaurantPhone: order.restaurant.phone,
        primaryColor: order.restaurant.primaryColor,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        totalAmount: Number(order.totalAmount),
        table: order.table,
        tableNumber: order.table?.tableNumber || null,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map((i) => ({
          id: i.id,
          name: i.name,
          price: Number(i.price),
          quantity: i.quantity,
          subtotal: Number(i.subtotal),
          notes: i.notes,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to fetch public order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
