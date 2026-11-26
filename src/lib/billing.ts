import crypto from "crypto";
import { Prisma, type BillingCycle, type SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PaymentProvider = "RAZORPAY" | "LEMON_SQUEEZY";
export type PaidBillingCycle = "MONTHLY" | "YEARLY";

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function isLemonSqueezyConfigured(): boolean {
  return Boolean(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID);
}

export function getLemonSqueezyVariantId(
  planCode: string,
  billingCycle: PaidBillingCycle
): string | null {
  const code = planCode.toUpperCase();
  if (code === "STARTER" && billingCycle === "MONTHLY") {
    return process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY || null;
  }
  if (code === "STARTER" && billingCycle === "YEARLY") {
    return process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY || null;
  }
  if (code === "GROWTH" && billingCycle === "MONTHLY") {
    return process.env.LEMONSQUEEZY_VARIANT_GROWTH_MONTHLY || null;
  }
  if (code === "GROWTH" && billingCycle === "YEARLY") {
    return process.env.LEMONSQUEEZY_VARIANT_GROWTH_YEARLY || null;
  }
  return null;
}

export function verifyHmacSha256(
  payload: string,
  signature: string | null | undefined,
  secret: string | undefined
): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export function computePeriodEnd(start: Date, billingCycle: PaidBillingCycle): Date {
  const end = new Date(start);
  if (billingCycle === "YEARLY") {
    end.setDate(end.getDate() + 365);
  } else {
    end.setDate(end.getDate() + 30);
  }
  return end;
}

export interface ActivateSubscriptionInput {
  restaurantId: string;
  planId: string;
  billingCycle: PaidBillingCycle;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  externalPaymentId: string;
  externalOrderId?: string | null;
  externalCustomerId?: string | null;
  externalSubscriptionId?: string | null;
  rawPayload?: Prisma.InputJsonValue;
}

/**
 * Idempotently activates or renews a restaurant subscription after a verified
 * Razorpay or Lemon Squeezy payment.
 */
export async function activateSubscriptionFromPayment(input: ActivateSubscriptionInput) {
  const now = new Date();
  const periodEnd = computePeriodEnd(now, input.billingCycle);

  return prisma.$transaction(async (tx) => {
    const existingPayment = await tx.subscriptionPayment.findUnique({
      where: { externalPaymentId: input.externalPaymentId },
      select: { id: true, status: true },
    });

    if (existingPayment?.status === "PAID") {
      const current = await tx.subscription.findUnique({
        where: { restaurantId: input.restaurantId },
        include: { plan: true },
      });
      return { alreadyProcessed: true, subscription: current };
    }

    const subscription = await tx.subscription.upsert({
      where: { restaurantId: input.restaurantId },
      update: {
        planId: input.planId,
        billingCycle: input.billingCycle as BillingCycle,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        paymentProvider: input.provider,
        externalOrderId: input.externalOrderId ?? undefined,
        externalCustomerId: input.externalCustomerId ?? undefined,
        externalSubscriptionId: input.externalSubscriptionId ?? undefined,
        lastPaymentId: input.externalPaymentId,
      },
      create: {
        restaurantId: input.restaurantId,
        planId: input.planId,
        billingCycle: input.billingCycle as BillingCycle,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        paymentProvider: input.provider,
        externalOrderId: input.externalOrderId ?? null,
        externalCustomerId: input.externalCustomerId ?? null,
        externalSubscriptionId: input.externalSubscriptionId ?? null,
        lastPaymentId: input.externalPaymentId,
      },
      include: { plan: true },
    });

    await tx.subscriptionPayment.upsert({
      where: { externalPaymentId: input.externalPaymentId },
      update: {
        status: "PAID",
        rawPayload: input.rawPayload,
      },
      create: {
        restaurantId: input.restaurantId,
        planId: input.planId,
        provider: input.provider,
        billingCycle: input.billingCycle as BillingCycle,
        amount: input.amount,
        currency: input.currency,
        externalOrderId: input.externalOrderId ?? null,
        externalPaymentId: input.externalPaymentId,
        status: "PAID",
        rawPayload: input.rawPayload,
      },
    });

    return { alreadyProcessed: false, subscription };
  });
}

export async function updateSubscriptionStatusByExternalId(
  externalSubscriptionId: string,
  status: SubscriptionStatus
) {
  return prisma.subscription.updateMany({
    where: { externalSubscriptionId },
    data: { status },
  });
}
