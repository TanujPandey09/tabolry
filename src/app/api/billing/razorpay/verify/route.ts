import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, requireRestaurantContext } from "@/lib/tenant";
import { activateSubscriptionFromPayment, verifyHmacSha256 } from "@/lib/billing";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  planId: z.string().min(1),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const body = verifySchema.parse(await request.json());

    const isValid = verifyHmacSha256(
      `${body.razorpay_order_id}|${body.razorpay_payment_id}`,
      body.razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      throw new ApiError(400, "Invalid Razorpay payment signature.", "INVALID_SIGNATURE");
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new ApiError(503, "Razorpay credentials are not configured.", "GATEWAY_NOT_CONFIGURED");
    }

    // Fetch the authoritative order directly from Razorpay to prevent client-side plan/amount tampering
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
    const orderRes = await fetch(
      `https://api.razorpay.com/v1/orders/${encodeURIComponent(body.razorpay_order_id)}`,
      {
        method: "GET",
        headers: { Authorization: authHeader },
        cache: "no-store",
      }
    );

    const rzpOrder = (await orderRes.json().catch(() => null)) as {
      id?: string;
      amount?: number;
      amount_paid?: number;
      currency?: string;
      status?: string;
      notes?: {
        restaurantId?: string;
        planId?: string;
        billingCycle?: string;
      };
    } | null;

    if (!orderRes.ok || !rzpOrder?.id) {
      throw new ApiError(
        502,
        "Unable to verify order details with Razorpay.",
        "RAZORPAY_VERIFY_FAILED"
      );
    }

    const noteRestaurantId = rzpOrder.notes?.restaurantId;
    const notePlanId = rzpOrder.notes?.planId;
    const noteBillingCycle =
      rzpOrder.notes?.billingCycle === "YEARLY"
        ? "YEARLY"
        : rzpOrder.notes?.billingCycle === "MONTHLY"
          ? "MONTHLY"
          : null;

    if (!noteRestaurantId || noteRestaurantId !== ctx.restaurant.id) {
      throw new ApiError(
        403,
        "This payment order belongs to a different restaurant account.",
        "ORDER_TENANT_MISMATCH"
      );
    }

    if (!notePlanId || !noteBillingCycle) {
      throw new ApiError(
        400,
        "Payment order is missing subscription plan metadata.",
        "INVALID_ORDER_METADATA"
      );
    }

    if (notePlanId !== body.planId || noteBillingCycle !== body.billingCycle) {
      throw new ApiError(
        400,
        "Plan or billing cycle does not match the authorized Razorpay order.",
        "PLAN_TAMPERING_DETECTED"
      );
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: notePlanId },
    });

    if (!plan || !plan.isActive) {
      throw new ApiError(404, "Subscription plan not found.", "PLAN_NOT_FOUND");
    }

    const expectedInr =
      noteBillingCycle === "YEARLY" ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);
    const expectedPaise = Math.round(expectedInr * 100);

    if (
      typeof rzpOrder.amount !== "number" ||
      rzpOrder.amount < expectedPaise ||
      (typeof rzpOrder.amount_paid === "number" && rzpOrder.amount_paid < expectedPaise)
    ) {
      throw new ApiError(
        400,
        "Paid amount does not match the required subscription plan price.",
        "AMOUNT_MISMATCH"
      );
    }

    const result = await activateSubscriptionFromPayment({
      restaurantId: ctx.restaurant.id,
      planId: plan.id,
      billingCycle: noteBillingCycle,
      provider: "RAZORPAY",
      amount: expectedInr,
      currency: "INR",
      externalOrderId: body.razorpay_order_id,
      externalPaymentId: body.razorpay_payment_id,
    });

    return NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      subscription: result.subscription,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
