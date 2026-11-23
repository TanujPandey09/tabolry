import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, handleApiError, ApiError } from "@/lib/tenant";
import { adminPlanSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Subscription plan not found.", "NOT_FOUND");
    }

    const body = await request.json();
    const data = adminPlanSchema.partial().parse(body);

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.monthlyPrice !== undefined && { monthlyPrice: data.monthlyPrice }),
        ...(data.yearlyPrice !== undefined && { yearlyPrice: data.yearlyPrice }),
        ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
        ...(data.maxRestaurants !== undefined && { maxRestaurants: data.maxRestaurants }),
        ...(data.maxTables !== undefined && { maxTables: data.maxTables }),
        ...(data.maxMenuItems !== undefined && { maxMenuItems: data.maxMenuItems }),
        ...(data.features !== undefined && { features: data.features }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json({
      plan: {
        ...updated,
        monthlyPrice: Number(updated.monthlyPrice),
        yearlyPrice: Number(updated.yearlyPrice),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
