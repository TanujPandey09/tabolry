import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "grr.la",
  "pokemail.net",
  "spam4.me",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "10minutemail.com",
  "10minutemail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "trashmail.com",
  "trashmail.net",
  "getnada.com",
  "nada.email",
  "dispostable.com",
  "fakeinbox.com",
  "throwawaymail.com",
  "maildrop.cc",
  "mohmal.com",
  "mintemail.com",
  "emailondeck.com",
  "burnermail.io",
  "mailnesia.com",
  "mytemp.email",
  "tempail.com",
  "tempmailo.com",
  "tmailor.com",
  "mailcatch.com",
  "inboxbear.com",
  "dropmail.me",
  "moakt.com",
  "crazymailing.com",
]);

/**
 * Checks whether an email uses a known disposable/throwaway mail provider.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Canonicalizes an email address to stop "+tag" and Gmail dot-trick trial cycling.
 * Example: "R.a.j+trial2@googlemail.com" -> "raj@gmail.com"
 */
export function canonicalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex === -1) return normalized;

  let local = normalized.slice(0, atIndex);
  let domain = normalized.slice(atIndex + 1);

  if (domain === "googlemail.com") {
    domain = "gmail.com";
  }

  // Strip +subaddressing across all providers
  const plusIndex = local.indexOf("+");
  if (plusIndex !== -1) {
    local = local.slice(0, plusIndex);
  }

  // Gmail ignores dots in the local part
  if (domain === "gmail.com") {
    local = local.replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

/**
 * Extracts normalized phone digits (last 10 digits for 10+ digit numbers)
 * so "+91 98100-00001" and "9810000001" match identically.
 */
export function normalizePhoneForMatch(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function normalizeUpiForMatch(upiId: string | null | undefined): string | null {
  if (!upiId) return null;
  const cleaned = upiId.trim().toLowerCase();
  return cleaned.length >= 3 ? cleaned : null;
}

const GENERIC_RESTAURANT_WORDS = /\b(the|restaurant|cafe|bistro|kitchen|hotel|dhaba|lounge|bar|family|dining|house|express|foods|food)\b/g;

export function normalizeRestaurantNameForMatch(name: string | null | undefined): string | null {
  if (!name) return null;
  const stripped = name
    .toLowerCase()
    .replace(GENERIC_RESTAURANT_WORDS, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return stripped.length >= 3 ? stripped : null;
}

export function normalizeCityForMatch(city: string | null | undefined): string | null {
  if (!city) return null;
  const cleaned = city.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  return cleaned.length >= 2 ? cleaned : null;
}

export interface SubscriptionAccessInfo {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

/**
 * Returns true ONLY if the restaurant currently has a live, non-expired
 * trial or paid subscription.
 */
export function isSubscriptionLive(
  subscription: SubscriptionAccessInfo | null | undefined
): boolean {
  if (!subscription) return false;
  const now = new Date();

  if (subscription.status === "ACTIVE") {
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < now) {
      return false;
    }
    return true;
  }

  if (subscription.status === "TRIALING") {
    if (subscription.trialEndsAt && subscription.trialEndsAt < now) {
      return false;
    }
    return true;
  }

  // EXPIRED, SUSPENDED, CANCELLED
  return false;
}

/**
 * Detects whether another restaurant already claimed a trial/account using the
 * same business phone number, WhatsApp number, Merchant UPI ID, or
 * identical Restaurant Name + City fingerprint.
 */
export async function findTrialIdentifierConflict(params: {
  name?: string | null;
  city?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  upiId?: string | null;
  excludeRestaurantId?: string;
}): Promise<{ field: "phone" | "whatsappNumber" | "upiId" | "restaurantName" } | null> {
  const normPhone = normalizePhoneForMatch(params.phone);
  const normWhatsApp = normalizePhoneForMatch(params.whatsappNumber);
  const normUpi = normalizeUpiForMatch(params.upiId);
  const normName = normalizeRestaurantNameForMatch(params.name);
  const normCity = normalizeCityForMatch(params.city);

  if (!normPhone && !normWhatsApp && !normUpi && !(normName && normCity)) {
    return null;
  }

  // Check UPI ID match directly (case-insensitive)
  if (normUpi) {
    const upiMatch = await prisma.restaurant.findFirst({
      where: {
        ...(params.excludeRestaurantId && { id: { not: params.excludeRestaurantId } }),
        upiId: { equals: normUpi, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (upiMatch) {
      return { field: "upiId" };
    }
  }

  // Check phone / WhatsApp / Name+City fingerprint
  const existingRestaurants = await prisma.restaurant.findMany({
    where: {
      ...(params.excludeRestaurantId && { id: { not: params.excludeRestaurantId } }),
    },
    select: {
      name: true,
      city: true,
      phone: true,
      whatsappNumber: true,
    },
  });

  for (const r of existingRestaurants) {
    const existingPhone = normalizePhoneForMatch(r.phone);
    const existingWa = normalizePhoneForMatch(r.whatsappNumber);

    if (normPhone && (existingPhone === normPhone || existingWa === normPhone)) {
      return { field: "phone" };
    }
    if (normWhatsApp && (existingPhone === normWhatsApp || existingWa === normWhatsApp)) {
      return { field: "whatsappNumber" };
    }

    if (normName && normCity) {
      const existingName = normalizeRestaurantNameForMatch(r.name);
      const existingCity = normalizeCityForMatch(r.city);
      if (existingName === normName && existingCity === normCity) {
        return { field: "restaurantName" };
      }
    }
  }

  return null;
}
