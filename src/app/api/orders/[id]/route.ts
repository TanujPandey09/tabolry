import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError, ApiError } from "@/lib/tenant";
import { updateOrderStatusSchema } from "@/lib/validations/order";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRestaurantContext();
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: { select: { id: true, tableNumber: true, label: true } },
        items: true,
      },
    });

    if (!order || order.restaurantId !== ctx.restaurant.id) {
      throw new ApiError(404, "Order not found");
    }

    return NextResponse.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        totalAmount: Number(order.totalAmount),
        items: order.items.map((i) => ({
          ...i,
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRestaurantContext();
    const { id } = await params;

    const existing = await prisma.order.findUnique({
      where: { id },
    });

    if (!existing || existing.restaurantId !== ctx.restaurant.id) {
      throw new ApiError(404, "Order not found");
    }

    const body = await request.json();
    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: parsed.data,
      include: {
        table: { select: { id: true, tableNumber: true, label: true } },
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        ...updated,
        subtotal: Number(updated.subtotal),
        taxAmount: Number(updated.taxAmount),
        totalAmount: Number(updated.totalAmount),
        items: updated.items.map((i) => ({
          ...i,
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
