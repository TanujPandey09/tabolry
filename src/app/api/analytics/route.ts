import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get("days") || "14");
    const days = [7, 14, 30].includes(daysParam) ? daysParam : 14;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(startOfToday);
    startDate.setDate(startDate.getDate() - (days - 1));

    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [
      totalScans,
      todayScans,
      last7DaysScans,
      periodEvents,
      tables,
      generalScansCount,
      tableGroupedCounts,
      deviceGrouped,
    ] = await Promise.all([
      prisma.qRScanEvent.count({ where: { restaurantId: ctx.restaurant.id } }),
      prisma.qRScanEvent.count({
        where: { restaurantId: ctx.restaurant.id, scannedAt: { gte: startOfToday } },
      }),
      prisma.qRScanEvent.count({
        where: { restaurantId: ctx.restaurant.id, scannedAt: { gte: sevenDaysAgo } },
      }),
      prisma.qRScanEvent.findMany({
        where: {
          restaurantId: ctx.restaurant.id,
          scannedAt: { gte: startDate },
        },
        select: { scannedAt: true },
        orderBy: { scannedAt: "asc" },
      }),
      prisma.restaurantTable.findMany({
        where: { restaurantId: ctx.restaurant.id },
        select: { id: true, tableNumber: true, label: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.qRScanEvent.count({
        where: { restaurantId: ctx.restaurant.id, tableId: null },
      }),
      prisma.qRScanEvent.groupBy({
        by: ["tableId"],
        where: { restaurantId: ctx.restaurant.id, tableId: { not: null } },
        _count: { _all: true },
      }),
      prisma.qRScanEvent.groupBy({
        by: ["deviceType"],
        where: { restaurantId: ctx.restaurant.id },
        _count: { _all: true },
      }),
    ]);

    // Build real daily scan trend series (zero-filled for days with 0 scans)
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }

    for (const ev of periodEvents) {
      const key = ev.scannedAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
      }
    }

    const dailyTrends = Array.from(dailyMap.entries()).map(([date, scans]) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      scans,
    }));

    const tableCountMap = new Map<string, number>();
    for (const row of tableGroupedCounts) {
      if (row.tableId) {
        tableCountMap.set(row.tableId, row._count._all);
      }
    }

    const tableStats = tables
      .map((t) => ({
        tableId: t.id,
        tableNumber: t.tableNumber,
        label: t.label,
        scans: tableCountMap.get(t.id) || 0,
      }))
      .sort((a, b) => b.scans - a.scans);

    const mostScannedQRs = [
      {
        name: "General Restaurant Menu",
        type: "GENERAL" as const,
        scans: generalScansCount,
      },
      ...tableStats.map((t) => ({
        name: `Table ${t.tableNumber}${t.label ? ` (${t.label})` : ""}`,
        type: "TABLE" as const,
        scans: t.scans,
      })),
    ]
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 8);

    const deviceBreakdown = deviceGrouped.map((d) => ({
      device: d.deviceType,
      scans: d._count._all,
    }));

    return NextResponse.json({
      summary: {
        totalScans,
        todayScans,
        last7DaysScans,
        periodScans: periodEvents.length,
        days,
      },
      dailyTrends,
      tableStats,
      mostScannedQRs,
      deviceBreakdown,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
