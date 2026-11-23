import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/tenant";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";

const forgotSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`forgot-pwd:${ip}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        "Too many password reset requests. Please try again in a few minutes.",
        "RATE_LIMITED"
      );
    }

    const body = await request.json();
    const { email } = forgotSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, passwordHash: true, isActive: true },
    });

    // Always return generic success to prevent email enumeration
    if (user && user.isActive) {
      const token = createPasswordResetToken(user.id, user.passwordHash);
      const baseUrl = (
        process.env.NEXT_PUBLIC_APP_URL ||
        new URL(request.url).origin
      ).replace(/\/$/, "");
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      await sendPasswordResetEmail({
        to: user.email,
        ownerName: user.name,
        resetUrl,
      });
    }

    return NextResponse.json({
      message: "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
