import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, requireRestaurantContext } from "@/lib/tenant";
import { isRazorpayConfigured } from "@/lib/billing";

const createOrderSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const { planId, billingCycle } = createOrderSchema.parse(await request.json());

    if (!isRazorpayConfigured()) {
      throw new ApiError(
        503,
        "Razorpay is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.",
        "GATEWAY_NOT_CONFIGURED"
      );
    }

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, isActive: true },
    });

    if (!plan) {
      throw new ApiError(404, "Selected subscription plan was not found.", "PLAN_NOT_FOUND");
    }

    const amountInr =
      billingCycle === "YEARLY" ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);

    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      throw new ApiError(400, "Free trial plans do not require online payment.", "INVALID_PLAN");
    }

    const keyId = process.env.RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amountInr * 100),
        currency: "INR",
        receipt: `tab_${ctx.restaurant.id.slice(-8)}_${Date.now()}`,
        notes: {
          restaurantId: ctx.restaurant.id,
          planId: plan.id,
          planCode: plan.code,
          billingCycle,
          userId: ctx.user.id,
        },
      }),
    });

    const orderJson = await razorpayRes.json();
    if (!razorpayRes.ok || !orderJson?.id) {
      throw new ApiError(
        502,
        orderJson?.error?.description || "Failed to initialize Razorpay order.",
        "RAZORPAY_ORDER_FAILED"
      );
    }

    return NextResponse.json({
      orderId: orderJson.id,
      amount: orderJson.amount,
      currency: orderJson.currency,
      keyId,
      planName: plan.name,
      restaurantName: ctx.restaurant.name,
      userEmail: ctx.user.email,
      userName: ctx.user.name,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
