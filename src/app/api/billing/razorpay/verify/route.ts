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

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: body.planId },
    });

    if (!plan) {
      throw new ApiError(404, "Subscription plan not found.", "PLAN_NOT_FOUND");
    }

    const amount =
      body.billingCycle === "YEARLY" ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);

    const result = await activateSubscriptionFromPayment({
      restaurantId: ctx.restaurant.id,
      planId: plan.id,
      billingCycle: body.billingCycle,
      provider: "RAZORPAY",
      amount,
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
