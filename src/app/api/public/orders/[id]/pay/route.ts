import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const paySchema = z.object({
  paymentMethod: z.enum(["UPI_ONLINE", "CARD", "CASH_AT_COUNTER"]).default("UPI_ONLINE"),
  transactionRef: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = paySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({
        message: "Order is already paid",
        order: { id: order.id, paymentStatus: order.paymentStatus },
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        paymentStatus: "PAID",
        paymentMethod: parsed.data.paymentMethod,
        // If pending, advance to CONFIRMED since customer paid
        status: order.status === "PENDING" ? "CONFIRMED" : order.status,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        paymentMethod: updated.paymentMethod,
      },
    });
  } catch (error) {
    console.error("Failed to process payment:", error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
