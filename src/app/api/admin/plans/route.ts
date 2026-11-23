import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant";
import { adminPlanSchema } from "@/lib/validators";
import { z } from "zod";

export async function GET() {
  try {
    await requireSuperAdmin();

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    return NextResponse.json({
      plans: plans.map((p) => ({
        ...p,
        monthlyPrice: Number(p.monthlyPrice),
        yearlyPrice: Number(p.yearlyPrice),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const createPlanSchema = adminPlanSchema.extend({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]+$/, "Code must contain uppercase letters, numbers, or underscores"),
});

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const data = createPlanSchema.parse(body);

    const maxSort = await prisma.subscriptionPlan.aggregate({
      _max: { sortOrder: true },
    });

    const plan = await prisma.subscriptionPlan.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description || null,
        monthlyPrice: data.monthlyPrice,
        yearlyPrice: data.yearlyPrice,
        currency: "INR",
        trialDays: data.trialDays,
        maxRestaurants: data.maxRestaurants,
        maxTables: data.maxTables,
        maxMenuItems: data.maxMenuItems,
        features: data.features,
        isActive: data.isActive,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json(
      {
        plan: {
          ...plan,
          monthlyPrice: Number(plan.monthlyPrice),
          yearlyPrice: Number(plan.yearlyPrice),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
