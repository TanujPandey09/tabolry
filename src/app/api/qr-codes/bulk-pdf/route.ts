import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRestaurantContext, handleApiError, ApiError } from "@/lib/tenant";
import { getAppBaseUrl } from "@/lib/utils";
import { buildMenuUrl, generatePrintableQrPdf, type PrintableQrItem } from "@/lib/qr";

export async function GET(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const baseUrl = getAppBaseUrl(request.url);

    const tables = await prisma.restaurantTable.findMany({
      where: { restaurantId: ctx.restaurant.id, isActive: true },
      orderBy: { createdAt: "asc" },
      include: {
        qrCodes: { where: { isActive: true }, take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    const items: PrintableQrItem[] = [
      {
        restaurantName: ctx.restaurant.name,
        subtitle: "General Digital Menu",
        url: buildMenuUrl(baseUrl, ctx.restaurant.slug),
        primaryColor: ctx.restaurant.primaryColor,
      },
    ];

    for (const table of tables) {
      const qr = table.qrCodes[0];
      if (!qr) continue;
      items.push({
        restaurantName: ctx.restaurant.name,
        subtitle: `Table ${table.tableNumber}${table.label ? ` - ${table.label}` : ""}`,
        url: buildMenuUrl(baseUrl, ctx.restaurant.slug, qr.token),
        primaryColor: ctx.restaurant.primaryColor,
      });
    }

    if (items.length === 0) {
      throw new ApiError(404, "No active QR codes available to export.", "NO_QR_CODES");
    }

    const pdfBytes = await generatePrintableQrPdf(items);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${ctx.restaurant.slug}-all-qr-codes.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
