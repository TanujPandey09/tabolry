import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  handleApiError,
  ApiError,
  ACTIVE_RESTAURANT_COOKIE,
} from "@/lib/tenant";
import { createRestaurantSchema } from "@/lib/validators";
import { generateSecureToken, slugify } from "@/lib/utils";
import { findTrialIdentifierConflict } from "@/lib/trial-guard";

async function ensureFreeTrialPlan() {
  const existing = await prisma.subscriptionPlan.findUnique({
    where: { code: "FREE_TRIAL" },
  });
  if (existing) return existing;

  return prisma.subscriptionPlan.create({
    data: {
      code: "FREE_TRIAL",
      name: "Free Trial",
      description: "14-day full-featured free trial for pilot restaurants.",
      monthlyPrice: 0,
      yearlyPrice: 0,
      currency: "INR",
      trialDays: 14,
      maxRestaurants: 1,
      maxTables: 15,
      maxMenuItems: 100,
      sortOrder: 1,
      features: [
        "14 days free trial",
        "1 restaurant location",
        "Menu & category management",
        "General & table QR codes",
      ],
    },
  });
}

export async function GET() {
  try {
    const user = await requireAuth();

    const memberships = await prisma.restaurantMembership.findMany({
      where: { userId: user.id },
      include: {
        restaurant: {
          include: {
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
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      restaurants: memberships.map((m) => ({
        ...m.restaurant,
        membershipRole: m.role,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // Enforce plan maxRestaurants limit for non-admin owners
    if (user.role !== "SUPER_ADMIN") {
      const existingMemberships = await prisma.restaurantMembership.findMany({
        where: { userId: user.id, role: "OWNER" },
        include: {
          restaurant: {
            include: { subscription: { include: { plan: true } } },
          },
        },
      });
      if (existingMemberships.length > 0) {
        const maxAllowed = Math.max(
          1,
          ...existingMemberships.map(
            (m) => m.restaurant.subscription?.plan?.maxRestaurants ?? 1
          )
        );
        if (existingMemberships.length >= maxAllowed) {
          throw new ApiError(
            403,
            `Your current plan supports up to ${maxAllowed} restaurant location(s). Upgrade your plan to add another branch.`,
            "PLAN_LIMIT_REACHED"
          );
        }
      }
    }

    const rawSlug = body.slug ? slugify(String(body.slug)) : slugify(String(body.name || ""));
    const data = createRestaurantSchema.parse({
      ...body,
      slug: rawSlug,
    });

    const slugTaken = await prisma.restaurant.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });

    if (slugTaken) {
      throw new ApiError(
        409,
        "This restaurant URL slug is already taken. Please choose another.",
        "SLUG_TAKEN"
      );
    }

    // Prevent free-trial cycling by reusing the same phone, WhatsApp, UPI ID, or Restaurant Name + City
    if (user.role !== "SUPER_ADMIN") {
      const conflict = await findTrialIdentifierConflict({
        name: data.name,
        city: data.city,
        phone: data.phone,
        whatsappNumber: data.whatsappNumber,
        upiId: data.upiId,
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
          `This ${label} has already been used for a Tablory trial. Please sign in to your existing account and upgrade your plan to continue.`,
          "TRIAL_ALREADY_USED"
        );
      }
    }

    const trialPlan = await ensureFreeTrialPlan();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialPlan.trialDays);

    const restaurant = await prisma.$transaction(async (tx) => {
      const created = await tx.restaurant.create({
        data: {
          name: data.name,
          slug: data.slug,
          logoUrl: data.logoUrl || null,
          coverImageUrl: data.coverImageUrl || null,
          description: data.description || null,
          phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || "India",
          currency: data.currency || "INR",
          primaryColor: data.primaryColor || "#E15A2B",
          status: "ACTIVE",
          isPublished: false,
          onboardingCompleted: false,
          onboardingStep: 2,
          memberships: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
          subscription: {
            create: {
              planId: trialPlan.id,
              billingCycle: "TRIAL",
              status: "TRIALING",
              trialEndsAt,
              currentPeriodStart: new Date(),
              currentPeriodEnd: trialEndsAt,
            },
          },
          qrCodes: {
            create: {
              type: "GENERAL",
              token: generateSecureToken(),
              isActive: true,
            },
          },
        },
        include: {
          subscription: { include: { plan: true } },
          qrCodes: true,
        },
      });

      return created;
    });

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_RESTAURANT_COOKIE, restaurant.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({ restaurant }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
