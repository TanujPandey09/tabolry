import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError, ApiError } from "@/lib/tenant";
import { reorderSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const body = await request.json();
    const { orderedIds } = reorderSchema.parse(body);

    const existing = await prisma.menuItem.findMany({
      where: {
        id: { in: orderedIds },
        restaurantId: ctx.restaurant.id,
      },
      select: { id: true },
    });

    if (existing.length !== orderedIds.length) {
      throw new ApiError(400, "One or more items do not belong to your restaurant.", "INVALID_IDS");
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.menuItem.update({
          where: { id },
          data: { displayOrder: index + 1 },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
