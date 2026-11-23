import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError, ApiError } from "@/lib/tenant";
import { createTableSchema } from "@/lib/validators";
import { generateSecureToken, getAppBaseUrl } from "@/lib/utils";
import { buildMenuUrl, generateQrDataUrl } from "@/lib/qr";

export async function GET(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const baseUrl = getAppBaseUrl(request.url);

    // Ensure restaurant always has an active general menu QR code
    let generalQr = await prisma.qRCode.findFirst({
      where: {
        restaurantId: ctx.restaurant.id,
        type: "GENERAL",
        isActive: true,
      },
      include: { _count: { select: { scanEvents: true } } },
    });

    if (!generalQr) {
      generalQr = await prisma.qRCode.create({
        data: {
          restaurantId: ctx.restaurant.id,
          type: "GENERAL",
          token: generateSecureToken(),
          isActive: true,
        },
        include: { _count: { select: { scanEvents: true } } },
      });
    }

    const tables = await prisma.restaurantTable.findMany({
      where: { restaurantId: ctx.restaurant.id },
      orderBy: [{ createdAt: "asc" }],
      include: {
        qrCodes: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { scanEvents: true },
        },
      },
    });

    const generalUrl = buildMenuUrl(baseUrl, ctx.restaurant.slug);
    const generalQrDataUrl = await generateQrDataUrl(generalUrl, 320);

    const enrichedTables = await Promise.all(
      tables.map(async (table) => {
        let activeQr = table.qrCodes[0];
        if (!activeQr) {
          activeQr = await prisma.qRCode.create({
            data: {
              restaurantId: ctx.restaurant.id,
              tableId: table.id,
              type: "TABLE",
              token: generateSecureToken(),
              isActive: true,
            },
          });
        }
        const url = buildMenuUrl(baseUrl, ctx.restaurant.slug, activeQr.token);
        const qrDataUrl = await generateQrDataUrl(url, 320);
        return {
          id: table.id,
          tableNumber: table.tableNumber,
          label: table.label,
          capacity: table.capacity,
          isActive: table.isActive,
          createdAt: table.createdAt,
          scanCount: table._count.scanEvents,
          qrCode: {
            id: activeQr.id,
            token: activeQr.token,
            url,
            qrDataUrl,
            regeneratedAt: activeQr.regeneratedAt,
          },
        };
      })
    );

    return NextResponse.json({
      restaurant: {
        id: ctx.restaurant.id,
        name: ctx.restaurant.name,
        slug: ctx.restaurant.slug,
        primaryColor: ctx.restaurant.primaryColor,
        isPublished: ctx.restaurant.isPublished,
      },
      generalQr: {
        id: generalQr.id,
        token: generalQr.token,
        url: generalUrl,
        qrDataUrl: generalQrDataUrl,
        scanCount: generalQr._count.scanEvents,
        regeneratedAt: generalQr.regeneratedAt,
      },
      tables: enrichedTables,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const baseUrl = getAppBaseUrl(request.url);
    const body = await request.json();

    // Respect plan table limits
    const maxTables = ctx.restaurant.subscription?.plan?.maxTables ?? 50;
    const currentCount = await prisma.restaurantTable.count({
      where: { restaurantId: ctx.restaurant.id },
    });
    if (currentCount >= maxTables) {
      throw new ApiError(
        403,
        `Your current plan supports up to ${maxTables} tables. Contact support to upgrade.`,
        "PLAN_LIMIT_REACHED"
      );
    }

    const data = createTableSchema.parse(body);

    const existing = await prisma.restaurantTable.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId: ctx.restaurant.id,
          tableNumber: data.tableNumber,
        },
      },
    });

    if (existing) {
      throw new ApiError(
        409,
        `Table "${data.tableNumber}" already exists in your restaurant.`,
        "DUPLICATE_TABLE"
      );
    }

    const token = generateSecureToken();

    const table = await prisma.restaurantTable.create({
      data: {
        restaurantId: ctx.restaurant.id,
        tableNumber: data.tableNumber,
        label: data.label || null,
        capacity: data.capacity ?? null,
        isActive: data.isActive ?? true,
        qrCodes: {
          create: {
            restaurantId: ctx.restaurant.id,
            type: "TABLE",
            token,
            isActive: true,
          },
        },
      },
      include: {
        qrCodes: { where: { isActive: true }, take: 1 },
      },
    });

    const activeQr = table.qrCodes[0];
    const url = buildMenuUrl(baseUrl, ctx.restaurant.slug, activeQr.token);
    const qrDataUrl = await generateQrDataUrl(url, 320);

    return NextResponse.json(
      {
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          label: table.label,
          capacity: table.capacity,
          isActive: table.isActive,
          createdAt: table.createdAt,
          scanCount: 0,
          qrCode: {
            id: activeQr.id,
            token: activeQr.token,
            url,
            qrDataUrl,
            regeneratedAt: activeQr.regeneratedAt,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
