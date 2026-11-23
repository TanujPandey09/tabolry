import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant";

export async function GET() {
  try {
    await requireSuperAdmin();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(startOfToday);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    // Sync any expired trials before computing counts
    await prisma.subscription.updateMany({
      where: {
        status: "TRIALING",
        trialEndsAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });

    const [
      totalRestaurants,
      activeRestaurants,
      suspendedRestaurants,
      inactiveRestaurants,
      trialRestaurants,
      totalUsers,
      totalScans,
      recentRestaurants,
      latestRestaurants,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({ where: { status: "ACTIVE" } }),
      prisma.restaurant.count({ where: { status: "SUSPENDED" } }),
      prisma.restaurant.count({ where: { status: "INACTIVE" } }),
      prisma.subscription.count({ where: { status: "TRIALING" } }),
      prisma.user.count(),
      prisma.qRScanEvent.count(),
      prisma.restaurant.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.restaurant.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { menuItems: true, tables: true, scanEvents: true } },
        },
      }),
    ]);

    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      dailyMap.set(d.toISOString().slice(0, 10), 0);
    }

    for (const r of recentRestaurants) {
      const key = r.createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
      }
    }

    const registrationTrends = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      registrations: count,
    }));

    return NextResponse.json({
      metrics: {
        totalRestaurants,
        activeRestaurants,
        trialRestaurants,
        suspendedRestaurants,
        inactiveRestaurants,
        totalUsers,
        totalScans,
      },
      registrationTrends,
      latestRestaurants,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
