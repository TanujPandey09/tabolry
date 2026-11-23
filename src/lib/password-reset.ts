import crypto from "crypto";

const RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }
  return secret;
}

function hashFingerprint(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

/**
 * Generates a single-use, 15-minute signed password reset token.
 * Bound to the user's current passwordHash fingerprint so it auto-invalidates once used.
 */
export function createPasswordResetToken(userId: string, passwordHash: string): string {
  const exp = Date.now() + RESET_TTL_MS;
  const fp = hashFingerprint(passwordHash);
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp, fp })).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyPasswordResetTokenPayload(token: string): {
  uid: string;
  exp: number;
  fp: string;
} | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, providedSig] = parts;
  if (!payload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: string;
      exp?: number;
      fp?: string;
    };
    if (!parsed.uid || !parsed.exp || !parsed.fp) return null;
    if (Date.now() > parsed.exp) return null;
    return { uid: parsed.uid, exp: parsed.exp, fp: parsed.fp };
  } catch {
    return null;
  }
}

export function matchesPasswordFingerprint(passwordHash: string, fp: string): boolean {
  const expected = Buffer.from(hashFingerprint(passwordHash));
  const actual = Buffer.from(fp);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
