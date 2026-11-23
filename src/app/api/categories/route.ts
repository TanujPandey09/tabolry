import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError } from "@/lib/tenant";
import { createCategorySchema } from "@/lib/validators";

const DEFAULT_CATEGORIES = [
  { name: "Starters", description: "Appetizers and light bites", displayOrder: 1 },
  { name: "Main Course", description: "Signature curries, breads, and rice", displayOrder: 2 },
  { name: "Beverages", description: "Cold drinks, teas, coffees, and mocktails", displayOrder: 3 },
  { name: "Desserts", description: "Traditional sweets and ice creams", displayOrder: 4 },
];

export async function GET() {
  try {
    const ctx = await requireRestaurantContext();

    const categories = await prisma.category.findMany({
      where: { restaurantId: ctx.restaurant.id },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { menuItems: true } },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const body = await request.json();

    // Support 1-click creation of default suggested categories during onboarding
    if (body && body.seedDefaults === true) {
      const existing = await prisma.category.findMany({
        where: { restaurantId: ctx.restaurant.id },
        select: { name: true, displayOrder: true },
      });
      const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
      let nextOrder =
        existing.reduce((max, c) => Math.max(max, c.displayOrder), 0) + 1;

      const toCreate = DEFAULT_CATEGORIES.filter(
        (d) => !existingNames.has(d.name.toLowerCase())
      ).map((d) => ({
        restaurantId: ctx.restaurant.id,
        name: d.name,
        description: d.description,
        displayOrder: nextOrder++,
      }));

      if (toCreate.length > 0) {
        await prisma.category.createMany({ data: toCreate });
      }

      const categories = await prisma.category.findMany({
        where: { restaurantId: ctx.restaurant.id },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { menuItems: true } } },
      });

      return NextResponse.json({ categories }, { status: 201 });
    }

    const data = createCategorySchema.parse(body);

    const maxOrder = await prisma.category.aggregate({
      where: { restaurantId: ctx.restaurant.id },
      _max: { displayOrder: true },
    });

    const category = await prisma.category.create({
      data: {
        restaurantId: ctx.restaurant.id,
        name: data.name,
        description: data.description || null,
        displayOrder: data.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
        isActive: data.isActive ?? true,
      },
      include: { _count: { select: { menuItems: true } } },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
