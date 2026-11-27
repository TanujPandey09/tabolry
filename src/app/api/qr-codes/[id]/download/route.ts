import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireRestaurantContext,
  assertActiveSubscription,
  handleApiError,
  ApiError,
} from "@/lib/tenant";
import { getAppBaseUrl } from "@/lib/utils";
import {
  buildMenuUrl,
  generatePrintableQrPdf,
  generateQrPngBuffer,
} from "@/lib/qr";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRestaurantContext();
    assertActiveSubscription(ctx);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "png").toLowerCase();

    const qrCode = await prisma.qRCode.findFirst({
      where: { id, restaurantId: ctx.restaurant.id, isActive: true },
      include: { table: true },
    });

    if (!qrCode) {
      throw new ApiError(404, "Active QR code not found.", "NOT_FOUND");
    }

    const baseUrl = getAppBaseUrl(request.url);
    const menuUrl =
      qrCode.type === "TABLE"
        ? buildMenuUrl(baseUrl, ctx.restaurant.slug, qrCode.token)
        : buildMenuUrl(baseUrl, ctx.restaurant.slug);

    const safeSlug = ctx.restaurant.slug;
    const tablePart = qrCode.table
      ? `table-${qrCode.table.tableNumber.replace(/[^a-zA-Z0-9_-]/g, "")}`
      : "general-menu";

    if (format === "pdf") {
      const subtitle = qrCode.table
        ? `Table ${qrCode.table.tableNumber}${qrCode.table.label ? ` - ${qrCode.table.label}` : ""}`
        : "Digital Menu";

      const pdfBytes = await generatePrintableQrPdf([
        {
          restaurantName: ctx.restaurant.name,
          subtitle,
          url: menuUrl,
          primaryColor: ctx.restaurant.primaryColor,
        },
      ]);

      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeSlug}-${tablePart}-qr.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pngBuffer = await generateQrPngBuffer(menuUrl, 800);
    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${safeSlug}-${tablePart}-qr.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
