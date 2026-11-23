import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { handleApiError, ApiError } from "@/lib/tenant";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`register:${ip}`, 15, 15 * 60 * 1000);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        "Too many registration attempts. Please try again in a few minutes.",
        "RATE_LIMITED"
      );
    }

    const body = await request.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existing) {
      throw new ApiError(
        409,
        "An account with this email address already exists.",
        "EMAIL_EXISTS"
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: "RESTAURANT_OWNER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Await email send inside try/catch so Vercel serverless does not terminate it early
    try {
      await sendWelcomeEmail({
        to: user.email,
        ownerName: user.name,
        appUrl: new URL(request.url).origin,
      });
    } catch (emailErr) {
      console.error("Welcome email failed after registration:", emailErr);
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
