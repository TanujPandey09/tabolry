import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError, ApiError } from "@/lib/tenant";
import { createMenuItemSchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const categoryId = searchParams.get("categoryId")?.trim();
    const dietaryType = searchParams.get("dietaryType")?.trim();
    const availability = searchParams.get("availability")?.trim();

    const where: Prisma.MenuItemWhereInput = {
      restaurantId: ctx.restaurant.id,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (categoryId === "uncategorized") {
      where.categoryId = null;
    } else if (categoryId && categoryId !== "ALL") {
      where.categoryId = categoryId;
    }
    if (dietaryType && ["VEG", "NON_VEG", "EGG"].includes(dietaryType)) {
      where.dietaryType = dietaryType as "VEG" | "NON_VEG" | "EGG";
    }
    if (availability === "available") {
      where.isAvailable = true;
    } else if (availability === "sold_out") {
      where.isAvailable = false;
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        price: Number(item.price),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const body = await request.json();
    const data = createMenuItemSchema.parse(body);

    // Enforce subscription plan menu item limit
    const maxMenuItems = ctx.restaurant.subscription?.plan?.maxMenuItems ?? 150;
    const currentItemCount = await prisma.menuItem.count({
      where: { restaurantId: ctx.restaurant.id },
    });
    if (currentItemCount >= maxMenuItems) {
      throw new ApiError(
        403,
        `Your current plan supports up to ${maxMenuItems} menu items. Upgrade your plan to add more dishes.`,
        "PLAN_LIMIT_REACHED"
      );
    }

    // Strictly verify category ownership to prevent cross-tenant linking
    let verifiedCategoryId: string | null = null;
    if (data.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: data.categoryId, restaurantId: ctx.restaurant.id },
        select: { id: true },
      });
      if (!cat) {
        throw new ApiError(400, "Selected category does not exist in your restaurant.", "INVALID_CATEGORY");
      }
      verifiedCategoryId = cat.id;
    }

    const maxOrder = await prisma.menuItem.aggregate({
      where: { restaurantId: ctx.restaurant.id },
      _max: { displayOrder: true },
    });

    const item = await prisma.menuItem.create({
      data: {
        restaurantId: ctx.restaurant.id,
        categoryId: verifiedCategoryId,
        name: data.name,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        galleryImages: data.galleryImages ?? [],
        price: data.price,
        dietaryType: data.dietaryType,
        isAvailable: data.isAvailable,
        displayOrder: data.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { item: { ...item, price: Number(item.price) } },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
