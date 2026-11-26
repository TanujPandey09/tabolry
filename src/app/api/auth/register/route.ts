import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { handleApiError, ApiError } from "@/lib/tenant";
import { checkRateLimitDistributed, getClientIp } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/email";
import { canonicalizeEmail, isDisposableEmail } from "@/lib/trial-guard";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = await checkRateLimitDistributed(`register:${ip}`, 15, 15 * 60 * 1000);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        "Too many registration attempts. Please try again in a few minutes.",
        "RATE_LIMITED"
      );
    }

    const body = await request.json();
    const data = registerSchema.parse(body);

    if (isDisposableEmail(data.email)) {
      throw new ApiError(
        400,
        "Disposable or temporary email addresses are not allowed. Please use your business or personal email.",
        "DISPOSABLE_EMAIL_NOT_ALLOWED"
      );
    }

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

    // Prevent Gmail dot-trick & "+alias" trial cycling (e.g. user+2@gmail.com)
    const canonical = canonicalizeEmail(data.email);
    const domain = canonical.split("@")[1];
    if (domain) {
      const sameDomainUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { endsWith: `@${domain}` } },
            ...(domain === "gmail.com"
              ? [{ email: { endsWith: "@googlemail.com" } }]
              : []),
          ],
        },
        select: { email: true },
      });

      const aliasConflict = sameDomainUsers.some(
        (u) => canonicalizeEmail(u.email) === canonical
      );
      if (aliasConflict) {
        throw new ApiError(
          409,
          "An account with this email address (or an alias of it) already exists. Please sign in instead.",
          "EMAIL_EXISTS"
        );
      }
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
