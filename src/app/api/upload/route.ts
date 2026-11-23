import { NextResponse } from "next/server";
import { requireAuth, requireRestaurantContext, handleApiError, ApiError } from "@/lib/tenant";
import { uploadRestaurantImage } from "@/lib/storage";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Allow uploads during step 1 onboarding (before restaurant exists) scoped to userId,
    // or scoped to verified restaurantId once restaurant is created.
    const user = await requireAuth();

    const rl = checkRateLimit(`upload:${user.id}`, 40, 15 * 60 * 1000);
    if (!rl.allowed) {
      throw new ApiError(
        429,
        "Upload rate limit exceeded. Please wait a few minutes.",
        "RATE_LIMITED"
      );
    }

    let tenantScope = `user-${user.id}`;
    try {
      const ctx = await requireRestaurantContext();
      tenantScope = ctx.restaurant.id;
    } catch {
      // User is in onboarding Step 1 before restaurant creation
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folderRaw = String(formData.get("folder") || "menu");
    const folder = folderRaw === "branding" ? "branding" : "menu";

    if (!(file instanceof File)) {
      throw new ApiError(400, "No image file provided.", "MISSING_FILE");
    }

    const result = await uploadRestaurantImage(file, tenantScope, folder);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
