import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError, ApiError } from "@/lib/tenant";
import { updateMenuItemSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRestaurantContext();
    const { id } = await params;

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId: ctx.restaurant.id },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!item) {
      throw new ApiError(404, "Menu item not found.", "NOT_FOUND");
    }

    return NextResponse.json({ item: { ...item, price: Number(item.price) } });
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

    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: ctx.restaurant.id },
    });

    if (!existing) {
      throw new ApiError(404, "Menu item not found.", "NOT_FOUND");
    }

    const body = await request.json();
    const data = updateMenuItemSchema.parse(body);

    let categoryUpdate: string | null | undefined = undefined;
    if (data.categoryId !== undefined) {
      if (data.categoryId === null || data.categoryId === "") {
        categoryUpdate = null;
      } else {
        const cat = await prisma.category.findFirst({
          where: { id: data.categoryId, restaurantId: ctx.restaurant.id },
          select: { id: true },
        });
        if (!cat) {
          throw new ApiError(400, "Selected category does not belong to your restaurant.", "INVALID_CATEGORY");
        }
        categoryUpdate = cat.id;
      }
    }

    const item = await prisma.menuItem.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
        ...(data.galleryImages !== undefined && { galleryImages: data.galleryImages }),
        ...(data.price !== undefined && { price: data.price }),
        ...(categoryUpdate !== undefined && { categoryId: categoryUpdate }),
        ...(data.dietaryType !== undefined && { dietaryType: data.dietaryType }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ item: { ...item, price: Number(item.price) } });
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

    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: ctx.restaurant.id },
    });

    if (!existing) {
      throw new ApiError(404, "Menu item not found.", "NOT_FOUND");
    }

    await prisma.menuItem.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
