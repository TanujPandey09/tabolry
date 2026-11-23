import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, ApiError } from "@/lib/tenant";
import { changePasswordSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const rl = checkRateLimit(`pw-change:${user.id}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      throw new ApiError(429, "Too many password change attempts. Try again later.", "RATE_LIMITED");
    }

    const body = await request.json();
    const data = changePasswordSchema.parse(body);

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });

    const matches = await bcrypt.compare(data.currentPassword, dbUser.passwordHash);
    if (!matches) {
      throw new ApiError(400, "Current password is incorrect.", "INVALID_PASSWORD");
    }

    const newHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
