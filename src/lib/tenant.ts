import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSubscriptionLive } from "@/lib/trial-guard";

export const ACTIVE_RESTAURANT_COOKIE = "menuqr_active_restaurant";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return user;
}

export async function requireAuth() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new ApiError(401, "Authentication required", "UNAUTHORIZED");
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAuth();
  if (user.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Super admin access required", "FORBIDDEN");
  }
  return user;
}

/**
 * Resolves the authorized restaurant context strictly from the authenticated user's
 * verified RestaurantMembership rows in PostgreSQL. Never trusts client-provided
 * restaurant IDs without membership verification.
 */
export async function requireRestaurantContext() {
  const user = await requireAuth();

  let preferredRestaurantId: string | undefined;
  try {
    const cookieStore = await cookies();
    preferredRestaurantId = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value;
  } catch {
    // cookies() unavailable in some contexts
  }

  const memberships = await prisma.restaurantMembership.findMany({
    where: { userId: user.id },
    include: {
      restaurant: {
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    throw new ApiError(
      404,
      "No restaurant found for this account. Complete onboarding first.",
      "NO_RESTAURANT"
    );
  }

  const activeMembership =
    (preferredRestaurantId
      ? memberships.find((m) => m.restaurantId === preferredRestaurantId)
      : undefined) ?? memberships[0];

  const restaurant = activeMembership.restaurant;

  // Automate trial expiry calculation when reading tenant context
  if (
    restaurant.subscription &&
    restaurant.subscription.status === "TRIALING" &&
    restaurant.subscription.trialEndsAt &&
    restaurant.subscription.trialEndsAt < new Date()
  ) {
    const updatedSub = await prisma.subscription.update({
      where: { id: restaurant.subscription.id },
      data: { status: "EXPIRED" },
      include: { plan: true },
    });
    restaurant.subscription = updatedSub;
  }

  return {
    user,
    membership: activeMembership,
    restaurant,
    allRestaurants: memberships.map((m) => ({
      id: m.restaurant.id,
      name: m.restaurant.name,
      slug: m.restaurant.slug,
      role: m.role,
    })),
  };
}

/**
 * Ensures the restaurant's trial or paid subscription is currently active before
 * allowing mutations (adding dishes/categories/tables) or QR code downloads.
 */
export function assertActiveSubscription(
  ctx: Awaited<ReturnType<typeof requireRestaurantContext>>
): void {
  if (ctx.user.role === "SUPER_ADMIN") return;
  if (!isSubscriptionLive(ctx.restaurant.subscription)) {
    throw new ApiError(
      403,
      "Your 14-day free trial or subscription has expired. Upgrade your plan in Settings to continue.",
      "SUBSCRIPTION_EXPIRED"
    );
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message || "Invalid request payload",
        code: "VALIDATION_ERROR",
        issues: error.issues,
      },
      { status: 400 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : "field";
      return NextResponse.json(
        { error: `A record with this ${target} already exists.`, code: "CONFLICT" },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Requested record was not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
  }

  console.error("[API Error]", error);
  return NextResponse.json(
    { error: "An unexpected server error occurred.", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
