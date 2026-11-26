let validated = false;

/**
 * Validates critical runtime environment variables in production.
 * Skipped during `next build` static phase so CI builds do not require live secrets.
 */
export function validateProductionEnv(): void {
  if (validated) return;

  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  const isProd =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  if (!isProd || isBuildPhase) {
    return;
  }

  validated = true;

  const missing: string[] = [];

  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    missing.push("AUTH_SECRET (must be at least 32 characters)");
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) missing.push("NEXT_PUBLIC_APP_URL");
  if (!process.env.AUTH_URL) missing.push("AUTH_URL");

  const provider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
  if (provider === "cloudinary") {
    if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push("CLOUDINARY_CLOUD_NAME");
    if (!process.env.CLOUDINARY_API_KEY) missing.push("CLOUDINARY_API_KEY");
    if (!process.env.CLOUDINARY_API_SECRET) missing.push("CLOUDINARY_API_SECRET");
  } else if (provider === "supabase") {
    if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  } else {
    missing.push('STORAGE_PROVIDER ("cloudinary" or "supabase" required in production)');
  }

  if (missing.length > 0) {
    console.error(
      `[Tablory Env Check] Missing or invalid production environment variables: ${missing.join(", ")}`
    );
  }
}
