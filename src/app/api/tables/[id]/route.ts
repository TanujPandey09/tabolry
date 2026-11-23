import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError, ApiError } from "@/lib/tenant";
import { updateTableSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRestaurantContext();
    const { id } = await params;

    const table = await prisma.restaurantTable.findFirst({
      where: { id, restaurantId: ctx.restaurant.id },
      include: {
        qrCodes: { where: { isActive: true }, take: 1 },
      },
    });

    if (!table) {
      throw new ApiError(404, "Table not found.", "NOT_FOUND");
    }

    return NextResponse.json({ table });
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

    const existing = await prisma.restaurantTable.findFirst({
      where: { id, restaurantId: ctx.restaurant.id },
    });

    if (!existing) {
      throw new ApiError(404, "Table not found.", "NOT_FOUND");
    }

    const body = await request.json();
    const data = updateTableSchema.parse(body);

    const updated = await prisma.restaurantTable.update({
      where: { id: existing.id },
      data: {
        ...(data.tableNumber !== undefined && { tableNumber: data.tableNumber }),
        ...(data.label !== undefined && { label: data.label || null }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json({ table: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRestaurantContext();
    const { id } = await params;

    const existing = await prisma.restaurantTable.findFirst({
      where: { id, restaurantId: ctx.restaurant.id },
    });

    if (!existing) {
      throw new ApiError(404, "Table not found.", "NOT_FOUND");
    }

    await prisma.restaurantTable.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
