import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRestaurantContext, handleApiError, ApiError } from "@/lib/tenant";
import { checkRateLimitDistributed } from "@/lib/rate-limit";
import { validateUpiIdFormat, verifyUpiWithRazorpay } from "@/lib/upi";

const verifyUpiSchema = z.object({
  upiId: z.string().trim().min(3, "Enter a UPI ID to verify").max(120),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireRestaurantContext();

    const rl = await checkRateLimitDistributed(
      `upi-verify:${ctx.restaurant.id}`,
      20,
      15 * 60 * 1000
    );
    if (!rl.allowed) {
      throw new ApiError(
        429,
        "Too many UPI verification requests. Please wait a few minutes.",
        "RATE_LIMITED"
      );
    }

    const body = await request.json();
    const { upiId } = verifyUpiSchema.parse(body);

    const formatCheck = validateUpiIdFormat(upiId);
    if (!formatCheck.valid) {
      return NextResponse.json(
        {
          valid: false,
          verified: false,
          source: "format_only",
          isLikelyMerchant: false,
          customerName: null,
          error: formatCheck.error,
        },
        { status: 400 }
      );
    }

    const npciResult = await verifyUpiWithRazorpay(formatCheck.normalized);

    if (npciResult.verified === false) {
      return NextResponse.json(
        {
          valid: false,
          verified: false,
          source: npciResult.source,
          isLikelyMerchant: formatCheck.isLikelyMerchant,
          customerName: null,
          error: npciResult.error || "This UPI ID could not be verified with NPCI.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      verified: npciResult.verified, // true if NPCI confirmed, null if format-only (use ₹1 test scan)
      source: npciResult.source,
      normalizedUpiId: formatCheck.normalized,
      isLikelyMerchant: formatCheck.isLikelyMerchant,
      customerName: npciResult.customerName,
      message:
        npciResult.verified === true
          ? `Verified via NPCI${npciResult.customerName ? ` — Account: ${npciResult.customerName}` : ""}`
          : "Valid Indian UPI bank handle. Scan the ₹1 Test QR with your phone to confirm your registered business name.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
