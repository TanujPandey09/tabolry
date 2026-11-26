import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";
import type { DeviceType } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string | { toNumber?: () => number },
  currency = "INR"
): string {
  const numeric =
    typeof amount === "object" && amount !== null && typeof amount.toNumber === "function"
      ? amount.toNumber()
      : Number(amount);

  if (Number.isNaN(numeric)) return currency === "INR" ? "₹0" : "0";

  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function generateSecureToken(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function detectDeviceType(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) return "UNKNOWN";
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) {
    return "TABLET";
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    return "MOBILE";
  }
  if (/mozilla|chrome|safari|firefox|edge|msie|trident|node|curl/i.test(ua)) {
    return "DESKTOP";
  }
  return "UNKNOWN";
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const salt = process.env.AUTH_SECRET;
  if (!salt && isProd) {
    throw new Error("AUTH_SECRET must be set in production to hash client IPs.");
  }
  return crypto
    .createHash("sha256")
    .update(`${salt || "dev-only-ip-salt"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export function getAppBaseUrl(requestUrl?: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (requestUrl) {
    try {
      const parsed = new URL(requestUrl);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      // fall through
    }
  }
  return "http://localhost:3000";
}

export function getTrialDaysRemaining(trialEndsAt: Date | string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const end = typeof trialEndsAt === "string" ? new Date(trialEndsAt) : trialEndsAt;
  const diffMs = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Normalizes a phone number for https://wa.me/<digits> links.
 * Strips non-digits and prepends India's 91 code when a 10-digit mobile number is provided.
 */
export function formatWhatsAppPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}
