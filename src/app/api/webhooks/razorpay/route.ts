import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  activateSubscriptionFromPayment,
  verifyHmacSha256,
  type PaidBillingCycle,
} from "@/lib/billing";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyHmacSha256(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const event = String(payload.event || "");
  if (event !== "payment.captured" && event !== "order.paid") {
    return NextResponse.json({ received: true, ignored: event });
  }

  const innerPayload = (payload.payload || {}) as Record<string, unknown>;
  const paymentEntity = ((innerPayload.payment as Record<string, unknown> | undefined)?.entity ||
    {}) as Record<string, unknown>;
  const orderEntity = ((innerPayload.order as Record<string, unknown> | undefined)?.entity ||
    {}) as Record<string, unknown>;

  const notes = (paymentEntity.notes || orderEntity.notes || {}) as Record<string, unknown>;
  const restaurantId = typeof notes.restaurantId === "string" ? notes.restaurantId : "";
  const planId = typeof notes.planId === "string" ? notes.planId : "";
  const billingCycle = notes.billingCycle === "YEARLY" ? "YEARLY" : notes.billingCycle === "MONTHLY" ? "MONTHLY" : null;
  const externalPaymentId = typeof paymentEntity.id === "string" ? paymentEntity.id : "";

  if (!restaurantId || !planId || !billingCycle || !externalPaymentId) {
    return NextResponse.json({ received: true, skipped: "Missing subscription metadata" });
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });
  if (!plan) {
    return NextResponse.json({ received: true, skipped: "Unknown planId" });
  }

  const expectedAmountInr =
    billingCycle === "YEARLY" ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);
  const paidAmountInr = Number(paymentEntity.amount || 0) / 100;

  if (paidAmountInr < expectedAmountInr) {
    return NextResponse.json(
      { error: "Captured amount is less than required plan price" },
      { status: 400 }
    );
  }

  await activateSubscriptionFromPayment({
    restaurantId,
    planId: plan.id,
    billingCycle: billingCycle as PaidBillingCycle,
    provider: "RAZORPAY",
    amount: paidAmountInr,
    currency: typeof paymentEntity.currency === "string" ? paymentEntity.currency : "INR",
    externalOrderId:
      typeof paymentEntity.order_id === "string"
        ? paymentEntity.order_id
        : typeof orderEntity.id === "string"
          ? orderEntity.id
          : null,
    externalPaymentId,
    rawPayload: payload as Prisma.InputJsonValue,
  });

  return NextResponse.json({ received: true });
}
