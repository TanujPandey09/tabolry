import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const paySchema = z.object({
  paymentMethod: z.enum(["UPI_ONLINE", "CARD", "CASH_AT_COUNTER"]).default("UPI_ONLINE"),
  transactionRef: z.string().trim().max(80).optional(),
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

    if (order.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot pay for a cancelled order" }, { status: 400 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({
        success: true,
        verificationPending: false,
        message: "Order is already verified as paid",
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
        },
      });
    }

    // Security: Never trust an unauthenticated public client to mark an order PAID.
    // Record the customer's payment claim + optional UTR reference so staff can verify
    // it on their UPI soundbox / merchant app and mark PAID from /dashboard/orders.
    const refTag = parsed.data.transactionRef
      ? `[UPI Ref: ${parsed.data.transactionRef} — verify on UPI app]`
      : "[Guest initiated UPI — verify on UPI soundbox]";

    const existingNotes = order.notes?.trim() || "";
    const updatedNotes = existingNotes.includes("verify on UPI")
      ? existingNotes
      : existingNotes
        ? `${existingNotes} | ${refTag}`
        : refTag;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        paymentMethod: parsed.data.paymentMethod,
        notes: updatedNotes.slice(0, 500),
      },
    });

    return NextResponse.json({
      success: true,
      verificationPending: true,
      message: "UPI payment noted. Staff will verify and confirm shortly.",
      order: {
        id: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        paymentMethod: updated.paymentMethod,
        notes: updated.notes,
      },
    });
  } catch (error) {
    console.error("Failed to record payment intent:", error);
    return NextResponse.json({ error: "Could not update payment status" }, { status: 500 });
  }
}
