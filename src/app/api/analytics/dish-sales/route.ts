import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today"; // today | week | month | all

    const now = new Date();
    let startDate: Date;

    if (period === "week") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (period === "all") {
      startDate = new Date(2020, 0, 1);
    } else {
      // today: start of current day in local/server time
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Fetch all non-cancelled orders for this restaurant in the period
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: ctx.restaurant.id,
        createdAt: { gte: startDate },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        orderType: true,
        createdAt: true,
        status: true,
        items: {
          select: {
            id: true,
            menuItemId: true,
            name: true,
            price: true,
            quantity: true,
            subtotal: true,
            menuItem: {
              select: {
                category: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    // Aggregate sales per dish and per category
    const dishMap = new Map<
      string,
      {
        name: string;
        categoryName: string;
        quantity: number;
        revenue: number;
        ordersCount: number;
        lastOrderedAt: Date;
      }
    >();

    const categoryMap = new Map<
      string,
      {
        categoryName: string;
        quantity: number;
        revenue: number;
      }
    >();

    let totalDishesSold = 0;
    let totalDishRevenue = 0;

    for (const order of orders) {
      for (const item of order.items) {
        const key = item.name.trim().toLowerCase();
        const existing = dishMap.get(key);
        const itemQty = item.quantity;
        const itemRevenue = Number(item.subtotal);
        const catName = item.menuItem?.category?.name || "Main Menu";

        totalDishesSold += itemQty;
        totalDishRevenue += itemRevenue;

        // Category breakdown (Desserts, Starters, Drinks, etc.)
        const catKey = catName.trim().toLowerCase();
        const existingCat = categoryMap.get(catKey);
        if (existingCat) {
          existingCat.quantity += itemQty;
          existingCat.revenue += itemRevenue;
        } else {
          categoryMap.set(catKey, {
            categoryName: catName,
            quantity: itemQty,
            revenue: itemRevenue,
          });
        }

        if (existing) {
          existing.quantity += itemQty;
          existing.revenue += itemRevenue;
          existing.ordersCount += 1;
          if (order.createdAt > existing.lastOrderedAt) {
            existing.lastOrderedAt = order.createdAt;
          }
        } else {
          dishMap.set(key, {
            name: item.name,
            categoryName: catName,
            quantity: itemQty,
            revenue: itemRevenue,
            ordersCount: 1,
            lastOrderedAt: order.createdAt,
          });
        }
      }
    }

    // Sort dishes by quantity sold descending
    const dishList = Array.from(dishMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .map((dish) => ({
        ...dish,
        revenueFormatted: `₹${dish.revenue.toFixed(2)}`,
      }));

    // Sort categories by quantity sold descending
    const categoryList = Array.from(categoryMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .map((cat) => ({
        ...cat,
        revenueFormatted: `₹${cat.revenue.toFixed(2)}`,
      }));

    return NextResponse.json({
      period,
      totalDishesSold,
      totalDishRevenue,
      categories: categoryList,
      dishes: dishList,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
