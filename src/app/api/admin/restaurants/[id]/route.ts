import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, handleApiError, ApiError } from "@/lib/tenant";
import { adminUpdateRestaurantSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: { select: { id: true, name: true, email: true, createdAt: true } },
          },
        },
        subscription: { include: { plan: true } },
        _count: {
          select: {
            categories: true,
            menuItems: true,
            tables: true,
            scanEvents: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new ApiError(404, "Restaurant not found.", "NOT_FOUND");
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const existing = await prisma.restaurant.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!existing) {
      throw new ApiError(404, "Restaurant not found.", "NOT_FOUND");
    }

    const body = await request.json();
    const data = adminUpdateRestaurantSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      const restaurantUpdateData: Record<string, unknown> = {};
      if (data.status !== undefined) {
        restaurantUpdateData.status = data.status;
        // Automatically unpublish if suspended/inactive
        if (data.status !== "ACTIVE") {
          restaurantUpdateData.isPublished = false;
        }
      }
      if (data.isPublished !== undefined && (data.status ?? existing.status) === "ACTIVE") {
        restaurantUpdateData.isPublished = data.isPublished;
      }

      if (Object.keys(restaurantUpdateData).length > 0) {
        await tx.restaurant.update({
          where: { id },
          data: restaurantUpdateData,
        });
      }

      const hasSubUpdates =
        data.planId !== undefined ||
        data.subscriptionStatus !== undefined ||
        data.billingCycle !== undefined ||
        data.trialEndsAt !== undefined ||
        data.currentPeriodEnd !== undefined ||
        data.notes !== undefined;

      if (hasSubUpdates && existing.subscription) {
        await tx.subscription.update({
          where: { id: existing.subscription.id },
          data: {
            ...(data.planId !== undefined && { planId: data.planId }),
            ...(data.subscriptionStatus !== undefined && {
              status: data.subscriptionStatus,
            }),
            ...(data.billingCycle !== undefined && { billingCycle: data.billingCycle }),
            ...(data.trialEndsAt !== undefined && {
              trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : null,
            }),
            ...(data.currentPeriodEnd !== undefined && {
              currentPeriodEnd: data.currentPeriodEnd
                ? new Date(data.currentPeriodEnd)
                : null,
            }),
            ...(data.notes !== undefined && { notes: data.notes }),
          },
        });
      }

      return tx.restaurant.findUniqueOrThrow({
        where: { id },
        include: {
          memberships: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          subscription: { include: { plan: true } },
          _count: {
            select: {
              categories: true,
              menuItems: true,
              tables: true,
              scanEvents: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ restaurant: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
