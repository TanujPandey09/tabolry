import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/tenant";
import { updateAccountSchema } from "@/lib/validators";

export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = updateAccountSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: data.name },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
