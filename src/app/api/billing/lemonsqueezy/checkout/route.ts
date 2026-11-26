import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, requireRestaurantContext } from "@/lib/tenant";
import { getAppBaseUrl } from "@/lib/utils";
import { getLemonSqueezyVariantId, isLemonSqueezyConfigured } from "@/lib/billing";

const checkoutSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireRestaurantContext();
    const { planId, billingCycle } = checkoutSchema.parse(await request.json());

    if (!isLemonSqueezyConfigured()) {
      throw new ApiError(
        503,
        "Lemon Squeezy is not configured yet. Add LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID in environment variables.",
        "GATEWAY_NOT_CONFIGURED"
      );
    }

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, isActive: true },
    });

    if (!plan) {
      throw new ApiError(404, "Selected subscription plan was not found.", "PLAN_NOT_FOUND");
    }

    const variantId = getLemonSqueezyVariantId(plan.code, billingCycle);
    if (!variantId) {
      throw new ApiError(
        503,
        `Lemon Squeezy variant ID is not configured for ${plan.name} (${billingCycle}).`,
        "VARIANT_NOT_CONFIGURED"
      );
    }

    const redirectUrl = `${getAppBaseUrl(request.url)}/dashboard/settings?payment=success&provider=lemonsqueezy`;

    const lsRes = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: ctx.user.email,
              name: ctx.user.name,
              custom: {
                restaurant_id: ctx.restaurant.id,
                plan_id: plan.id,
                plan_code: plan.code,
                billing_cycle: billingCycle,
                user_id: ctx.user.id,
              },
            },
            product_options: {
              redirect_url: redirectUrl,
            },
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: String(process.env.LEMONSQUEEZY_STORE_ID),
              },
            },
            variant: {
              data: {
                type: "variants",
                id: String(variantId),
              },
            },
          },
        },
      }),
    });

    const lsJson = await lsRes.json();
    const checkoutUrl = lsJson?.data?.attributes?.url;

    if (!lsRes.ok || !checkoutUrl) {
      throw new ApiError(
        502,
        lsJson?.errors?.[0]?.detail || "Failed to create Lemon Squeezy checkout session.",
        "LEMONSQUEEZY_CHECKOUT_FAILED"
      );
    }

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
