import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireRestaurantContext,
  assertActiveSubscription,
  handleApiError,
  ApiError,
} from "@/lib/tenant";
import { generateSecureToken, getAppBaseUrl } from "@/lib/utils";
import { buildMenuUrl, generateQrDataUrl } from "@/lib/qr";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRestaurantContext();
    assertActiveSubscription(ctx);
    const { id } = await params;
    const baseUrl = getAppBaseUrl(request.url);

    const existing = await prisma.qRCode.findFirst({
      where: { id, restaurantId: ctx.restaurant.id },
      include: { table: true },
    });

    if (!existing) {
      throw new ApiError(404, "QR code not found.", "NOT_FOUND");
    }

    const newToken = generateSecureToken();
    const now = new Date();

    // Invalidate previous active tokens for this scope and create a fresh active QR code
    const newQr = await prisma.$transaction(async (tx) => {
      await tx.qRCode.updateMany({
        where: {
          restaurantId: ctx.restaurant.id,
          type: existing.type,
          tableId: existing.tableId,
          isActive: true,
        },
        data: { isActive: false },
      });

      return tx.qRCode.create({
        data: {
          restaurantId: ctx.restaurant.id,
          tableId: existing.tableId,
          type: existing.type,
          token: newToken,
          isActive: true,
          regeneratedAt: now,
        },
      });
    });

    const url =
      newQr.type === "TABLE"
        ? buildMenuUrl(baseUrl, ctx.restaurant.slug, newQr.token)
        : buildMenuUrl(baseUrl, ctx.restaurant.slug);
    const qrDataUrl = await generateQrDataUrl(url, 320);

    return NextResponse.json({
      qrCode: {
        id: newQr.id,
        token: newQr.token,
        type: newQr.type,
        url,
        qrDataUrl,
        regeneratedAt: newQr.regeneratedAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
