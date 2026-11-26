import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { ApiError } from "@/lib/tenant";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function verifyImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

export async function uploadRestaurantImage(
  file: File,
  restaurantId: string,
  folder: "menu" | "branding" = "menu"
): Promise<{ url: string; provider: string }> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new ApiError(400, "Image file is required", "INVALID_FILE");
  }

  const ext = ALLOWED_MIME_TYPES[file.type];
  if (!ext) {
    throw new ApiError(
      400,
      "Unsupported file type. Upload a JPEG, PNG, or WebP image.",
      "INVALID_FILE_TYPE"
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ApiError(400, "Image must be 5 MB or smaller.", "FILE_TOO_LARGE");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!verifyImageMagicBytes(buffer, file.type)) {
    throw new ApiError(
      400,
      "File content does not match a valid JPEG, PNG, or WebP image.",
      "CORRUPT_IMAGE"
    );
  }

  const provider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
  const filename = `${folder}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

  if (
    provider === "cloudinary" &&
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    const timestamp = Math.floor(Date.now() / 1000);
    const cloudFolder = `menuqr/${restaurantId}/${folder}`;
    const signaturePayload = `folder=${cloudFolder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
    const signature = crypto
      .createHash("sha1")
      .update(signaturePayload)
      .digest("hex");

    const formData = new FormData();
    formData.append(
      "file",
      `data:${file.type};base64,${buffer.toString("base64")}`
    );
    formData.append("folder", cloudFolder);
    formData.append("timestamp", String(timestamp));
    formData.append("api_key", process.env.CLOUDINARY_API_KEY);
    formData.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!res.ok) {
      throw new ApiError(502, "Failed to upload image to Cloudinary.", "UPLOAD_FAILED");
    }

    const data = (await res.json()) as { secure_url?: string };
    if (!data.secure_url) {
      throw new ApiError(502, "Cloudinary did not return an image URL.", "UPLOAD_FAILED");
    }

    // Apply automatic format/quality/width optimization for fast Indian 4G loading
    const optimizedUrl = data.secure_url.includes("/image/upload/")
      ? data.secure_url.replace("/image/upload/", "/image/upload/f_auto,q_auto,w_800/")
      : data.secure_url;

    return { url: optimizedUrl, provider: "cloudinary" };
  }

  if (provider === "cloudinary") {
    throw new ApiError(
      500,
      "Cloudinary storage is selected but credentials are incomplete.",
      "STORAGE_NOT_CONFIGURED"
    );
  }

  if (
    provider === "supabase" &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "menu-images";
    const objectPath = `${restaurantId}/${filename}`;
    const uploadUrl = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${bucket}/${objectPath}`;

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: buffer,
    });

    if (!res.ok) {
      throw new ApiError(
        502,
        "Failed to upload image to Supabase Storage.",
        "UPLOAD_FAILED"
      );
    }

    const publicUrl = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath}`;
    return { url: publicUrl, provider: "supabase" };
  }

  if (provider === "supabase") {
    throw new ApiError(
      500,
      "Supabase storage is selected but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
      "STORAGE_NOT_CONFIGURED"
    );
  }

  // Block ephemeral local disk uploads in production / Vercel serverless
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  if (isProduction) {
    throw new ApiError(
      500,
      "Local image storage is disabled in production. Configure Cloudinary or Supabase Storage.",
      "STORAGE_NOT_CONFIGURED"
    );
  }

  // Local development storage fallback under /public/uploads/<restaurantId>/
  const safeTenantDir = restaurantId.replace(/[^a-zA-Z0-9_-]/g, "");
  const targetDir = path.join(process.cwd(), "public", "uploads", safeTenantDir);
  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, filename), buffer);

  return {
    url: `/uploads/${safeTenantDir}/${filename}`,
    provider: "local",
  };
}
