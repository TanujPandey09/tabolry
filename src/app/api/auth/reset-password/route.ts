import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/tenant";
import { checkRateLimitDistributed, getClientIp } from "@/lib/rate-limit";
import {
  verifyPasswordResetTokenPayload,
  matchesPasswordFingerprint,
} from "@/lib/password-reset";

const resetSchema = z.object({
  token: z.string().min(10, "Invalid or missing reset token"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = await checkRateLimitDistributed(`reset-pwd:${ip}`, 15, 15 * 60 * 1000);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        "Too many attempts. Please try again in a few minutes.",
        "RATE_LIMITED"
      );
    }

    const body = await request.json();
    const { token, password } = resetSchema.parse(body);

    const payload = verifyPasswordResetTokenPayload(token);
    if (!payload) {
      throw new ApiError(
        400,
        "This password reset link is invalid or has expired.",
        "INVALID_TOKEN"
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive || !matchesPasswordFingerprint(user.passwordHash, payload.fp)) {
      throw new ApiError(
        400,
        "This password reset link has already been used or is no longer valid.",
        "TOKEN_USED"
      );
    }

    const newPasswordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({
      message: "Password updated successfully. You can now sign in.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
