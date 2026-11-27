import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  activateSubscriptionFromPayment,
  updateSubscriptionStatusByExternalId,
  verifyHmacSha256,
  type PaidBillingCycle,
} from "@/lib/billing";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyHmacSha256(rawBody, signature, process.env.LEMONSQUEEZY_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const meta = (payload.meta || {}) as Record<string, unknown>;
  const eventName = String(meta.event_name || "");
  const custom = (meta.custom_data || {}) as Record<string, unknown>;
  const data = (payload.data || {}) as Record<string, unknown>;
  const attrs = (data.attributes || {}) as Record<string, unknown>;

  if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
    const extSubId = data.id ? String(data.id) : "";
    if (extSubId) {
      await updateSubscriptionStatusByExternalId(
        extSubId,
        eventName === "subscription_expired" ? "EXPIRED" : "CANCELLED"
      );
    }
    return NextResponse.json({ received: true });
  }

  if (eventName !== "order_created" && eventName !== "subscription_payment_success") {
    return NextResponse.json({ received: true, ignored: eventName });
  }

  const restaurantId = typeof custom.restaurant_id === "string" ? custom.restaurant_id : "";
  const planId = typeof custom.plan_id === "string" ? custom.plan_id : "";
  const billingCycle =
    custom.billing_cycle === "YEARLY"
      ? "YEARLY"
      : custom.billing_cycle === "MONTHLY"
        ? "MONTHLY"
        : null;

  if (!restaurantId || !planId || !billingCycle) {
    return NextResponse.json({ received: true, skipped: "Missing custom_data metadata" });
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });
  if (!plan) {
    return NextResponse.json({ received: true, skipped: "Unknown planId" });
  }

  const externalPaymentId = `ls_${eventName}_${String(data.id || Date.now())}`;
  const totalCents = Number(attrs.total || attrs.subtotal || 0);
  if (totalCents <= 0) {
    return NextResponse.json({ error: "Invalid payment total" }, { status: 400 });
  }

  await activateSubscriptionFromPayment({
    restaurantId,
    planId,
    billingCycle: billingCycle as PaidBillingCycle,
    provider: "LEMON_SQUEEZY",
    amount: totalCents / 100,
    currency: typeof attrs.currency === "string" ? attrs.currency.toUpperCase() : "USD",
    externalOrderId: attrs.order_id ? String(attrs.order_id) : data.id ? String(data.id) : null,
    externalCustomerId: attrs.customer_id ? String(attrs.customer_id) : null,
    externalSubscriptionId: attrs.subscription_id
      ? String(attrs.subscription_id)
      : eventName.startsWith("subscription_") && data.id
        ? String(data.id)
        : null,
    externalPaymentId,
    rawPayload: payload as Prisma.InputJsonValue,
  });

  return NextResponse.json({ received: true });
}
