import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError, ApiError } from "@/lib/tenant";
import { updateCategorySchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRestaurantContext();
    const { id } = await params;

    const existing = await prisma.category.findFirst({
      where: { id, restaurantId: ctx.restaurant.id },
    });

    if (!existing) {
      throw new ApiError(404, "Category not found.", "NOT_FOUND");
    }

    const body = await request.json();
    const data = updateCategorySchema.parse(body);

    const category = await prisma.category.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { _count: { select: { menuItems: true } } },
    });

    return NextResponse.json({ category });
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

    const existing = await prisma.category.findFirst({
      where: { id, restaurantId: ctx.restaurant.id },
    });

    if (!existing) {
      throw new ApiError(404, "Category not found.", "NOT_FOUND");
    }

    // MenuItems referencing this category safely have categoryId set to null (onDelete: SetNull)
    await prisma.category.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
