import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/tenant";
import { detectDeviceType, hashIp } from "@/lib/utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim() || null;
    const shouldTrack = searchParams.get("track") === "1";

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        coverImageUrl: true,
        description: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        currency: true,
        primaryColor: true,
        template: true,
        status: true,
        isPublished: true,
      },
    });

    // Strictly block suspended, inactive, or unpublished restaurants from exposing menu data
    if (!restaurant || restaurant.status !== "ACTIVE" || !restaurant.isPublished) {
      throw new ApiError(404, "This restaurant menu is not currently available.", "MENU_UNAVAILABLE");
    }

    let tableInfo: { id: string; tableNumber: string; label: string | null } | null = null;
    let activeQrId: string | null = null;

    if (token) {
      const qr = await prisma.qRCode.findFirst({
        where: {
          restaurantId: restaurant.id,
          token,
          type: "TABLE",
          isActive: true,
        },
        include: {
          table: {
            select: { id: true, tableNumber: true, label: true, isActive: true },
          },
        },
      });

      if (!qr || !qr.table || !qr.table.isActive) {
        throw new ApiError(404, "This table QR code is invalid or has been replaced.", "INVALID_QR_TOKEN");
      }

      activeQrId = qr.id;
      tableInfo = {
        id: qr.table.id,
        tableNumber: qr.table.tableNumber,
        label: qr.table.label,
      };
    } else {
      const generalQr = await prisma.qRCode.findFirst({
        where: {
          restaurantId: restaurant.id,
          type: "GENERAL",
          isActive: true,
        },
        select: { id: true },
      });
      activeQrId = generalQr?.id ?? null;
    }

    // Track real QR scan event if requested (with rate limiting to prevent spam)
    if (shouldTrack && activeQrId) {
      const ip = getClientIp(request);
      const rl = checkRateLimit(`scan:${activeQrId}:${ip}`, 60, 60 * 1000);
      if (rl.allowed) {
        const ua = request.headers.get("user-agent") || null;
        await prisma.qRScanEvent.create({
          data: {
            restaurantId: restaurant.id,
            qrCodeId: activeQrId,
            tableId: tableInfo?.id ?? null,
            userAgent: ua ? ua.slice(0, 255) : null,
            deviceType: detectDeviceType(ua),
            ipHash: hashIp(ip),
          },
        });
      }
    }

    const categories = await prisma.category.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        displayOrder: true,
        menuItems: {
          orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            price: true,
            dietaryType: true,
            isAvailable: true,
            displayOrder: true,
          },
        },
      },
    });

    const uncategorizedItems = await prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id, categoryId: null },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        dietaryType: true,
        isAvailable: true,
        displayOrder: true,
      },
    });

    const formattedCategories = categories.map((cat) => ({
      ...cat,
      menuItems: cat.menuItems.map((i) => ({ ...i, price: Number(i.price) })),
    }));

    if (uncategorizedItems.length > 0) {
      formattedCategories.push({
        id: "other",
        name: "More Items",
        description: null,
        displayOrder: 9999,
        menuItems: uncategorizedItems.map((i) => ({ ...i, price: Number(i.price) })),
      });
    }

    return NextResponse.json(
      {
        restaurant: {
          name: restaurant.name,
          slug: restaurant.slug,
          logoUrl: restaurant.logoUrl,
          coverImageUrl: restaurant.coverImageUrl,
          description: restaurant.description,
          phone: restaurant.phone,
          address: restaurant.address,
          city: restaurant.city,
          state: restaurant.state,
          currency: restaurant.currency,
          primaryColor: restaurant.primaryColor,
          template: restaurant.template,
        },
        table: tableInfo,
        categories: formattedCategories,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
