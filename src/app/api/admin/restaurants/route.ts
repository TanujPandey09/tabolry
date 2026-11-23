import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status")?.trim();

    const where: Prisma.RestaurantWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status && ["ACTIVE", "SUSPENDED", "INACTIVE"].includes(status)) {
      where.status = status as "ACTIVE" | "SUSPENDED" | "INACTIVE";
    }

    const [restaurants, plans] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
      }),
      prisma.subscriptionPlan.findMany({
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return NextResponse.json({
      restaurants,
      plans: plans.map((p) => ({
        ...p,
        monthlyPrice: Number(p.monthlyPrice),
        yearlyPrice: Number(p.yearlyPrice),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
