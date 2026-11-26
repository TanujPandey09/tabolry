import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  requireRestaurantContext,
  handleApiError,
  ApiError,
  ACTIVE_RESTAURANT_COOKIE,
} from "@/lib/tenant";
import { updateRestaurantSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { isLemonSqueezyConfigured, isRazorpayConfigured } from "@/lib/billing";
import { findTrialIdentifierConflict, isSubscriptionLive } from "@/lib/trial-guard";
import { z } from "zod";

export async function GET() {
  try {
    const ctx = await requireRestaurantContext();

    const [categoriesCount, menuItemsCount, tablesCount, totalScans, activeOrdersCount, plans] =
      await Promise.all([
        prisma.category.count({ where: { restaurantId: ctx.restaurant.id } }),
        prisma.menuItem.count({ where: { restaurantId: ctx.restaurant.id } }),
        prisma.restaurantTable.count({ where: { restaurantId: ctx.restaurant.id } }),
        prisma.qRScanEvent.count({ where: { restaurantId: ctx.restaurant.id } }),
        prisma.order.count({
          where: {
            restaurantId: ctx.restaurant.id,
            status: { in: ["PENDING", "CONFIRMED", "PREPARING", "SERVED"] },
          },
        }),
        prisma.subscriptionPlan.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        }),
      ]);

    return NextResponse.json({
      restaurant: ctx.restaurant,
      allRestaurants: ctx.allRestaurants,
      stats: {
        categoriesCount,
        menuItemsCount,
        tablesCount,
        totalScans,
        activeOrdersCount,
      },
      plans,
      billingGateways: {
        razorpayEnabled: isRazorpayConfigured(),
        lemonSqueezyEnabled: isLemonSqueezyConfigured(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const body = await request.json();

    const normalized = { ...body };
    if (typeof normalized.slug === "string") {
      normalized.slug = slugify(normalized.slug);
    }

    const data = updateRestaurantSchema.parse(normalized);

    if (data.slug && data.slug !== ctx.restaurant.slug) {
      const existing = await prisma.restaurant.findUnique({
        where: { slug: data.slug },
        select: { id: true },
      });
      if (existing && existing.id !== ctx.restaurant.id) {
        throw new ApiError(409, "This URL slug is already in use.", "SLUG_TAKEN");
      }
    }

    if (data.isPublished === true && ctx.restaurant.status !== "ACTIVE") {
      throw new ApiError(
        403,
        "Your restaurant is currently suspended or inactive and cannot be published.",
        "RESTAURANT_SUSPENDED"
      );
    }

    if (data.isPublished === true && !isSubscriptionLive(ctx.restaurant.subscription)) {
      throw new ApiError(
        403,
        "Your free trial or subscription has expired. Upgrade your plan in Settings to publish your QR menu.",
        "SUBSCRIPTION_EXPIRED"
      );
    }

    // Prevent onboarding with fake details and swapping in an already-trialed business phone/UPI/name later
    if (
      ctx.user.role !== "SUPER_ADMIN" &&
      ctx.restaurant.subscription?.status !== "ACTIVE" &&
      (data.name !== undefined ||
        data.city !== undefined ||
        data.phone !== undefined ||
        data.whatsappNumber !== undefined ||
        data.upiId !== undefined)
    ) {
      const conflict = await findTrialIdentifierConflict({
        name: data.name ?? ctx.restaurant.name,
        city: data.city ?? ctx.restaurant.city,
        phone: data.phone,
        whatsappNumber: data.whatsappNumber,
        upiId: data.upiId,
        excludeRestaurantId: ctx.restaurant.id,
      });
      if (conflict) {
        const label =
          conflict.field === "upiId"
            ? "UPI ID"
            : conflict.field === "whatsappNumber"
              ? "WhatsApp number"
              : conflict.field === "restaurantName"
                ? "restaurant name in this city"
                : "phone number";
        throw new ApiError(
          409,
          `This ${label} is already linked to another Tablory account. Upgrade your existing account instead of starting a new trial.`,
          "TRIAL_ALREADY_USED"
        );
      }
    }

    const updated = await prisma.restaurant.update({
      where: { id: ctx.restaurant.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
        ...(data.coverImageUrl !== undefined && {
          coverImageUrl: data.coverImageUrl || null,
        }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.whatsappNumber !== undefined && {
          whatsappNumber: data.whatsappNumber || null,
        }),
        ...(data.upiId !== undefined && { upiId: data.upiId || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.state !== undefined && { state: data.state || null }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.template !== undefined && { template: data.template }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        ...(data.onboardingCompleted !== undefined && {
          onboardingCompleted: data.onboardingCompleted,
        }),
        ...(data.onboardingStep !== undefined && {
          onboardingStep: data.onboardingStep,
        }),
      },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    return NextResponse.json({ restaurant: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

const switchSchema = z.object({
  restaurantId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { restaurantId } = switchSchema.parse(body);

    const membership = await prisma.restaurantMembership.findUnique({
      where: {
        userId_restaurantId: {
          userId: user.id,
          restaurantId,
        },
      },
    });

    if (!membership) {
      throw new ApiError(403, "You do not have access to this restaurant.", "FORBIDDEN");
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_RESTAURANT_COOKIE, restaurantId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({ success: true, restaurantId });
  } catch (error) {
    return handleApiError(error);
  }
}
