/**
 * Production-grade Indian UPI (VPA) validation & NPCI verification helpers.
 */

const UPI_SYNTAX_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

// Common real Indian NPCI PSP handles (banks, GPay, PhonePe, Paytm, Amazon Pay, BharatPe, etc.)
export const KNOWN_UPI_HANDLES = new Set([
  // Google Pay (Personal & Business)
  "okaxis",
  "okhdfcbank",
  "okicici",
  "oksbi",
  "okbizaxis",
  "okbizicici",
  "okbizhdfcbank",
  "okbizsbi",
  // PhonePe
  "ybl",
  "ibl",
  "axl",
  // Paytm
  "paytm",
  "ptyes",
  "ptaxis",
  "pthdfc",
  "ptsbi",
  // BHIM / NPCI / Generic
  "upi",
  // Major Indian Banks
  "icici",
  "sbi",
  "hdfcbank",
  "axisbank",
  "kotak",
  "indus",
  "yesbank",
  "yesbankltd",
  "barodampay",
  "fbl",
  "federal",
  "idfcbank",
  "idbi",
  "pnb",
  "uboi",
  "unionbank",
  "unionbankofindia",
  "cnrb",
  "boi",
  "cbin",
  "indianbank",
  "indianbk",
  "mahb",
  "rbl",
  "sc",
  "hsbc",
  "citi",
  "citigold",
  "dbs",
  "kbl",
  "kvb",
  "sib",
  "tmb",
  "bandhan",
  "aubank",
  "equitas",
  "ujjivan",
  "csbpay",
  "dcb",
  "cub",
  "iob",
  "psb",
  "uco",
  "allbank",
  "andb",
  "corp",
  "karb",
  "lvb",
  "syndicate",
  "vijaya",
  "postbank",
  // Fintech / Merchant / Wallets
  "jio",
  "airtel",
  "airtelpaymentsbank",
  "apl",
  "rapl",
  "yapl",
  "amazonpay",
  "freecharge",
  "mobikwik",
  "ikwik",
  "waaxis",
  "wahdfcbank",
  "waicici",
  "wasbi",
  "bharatpe",
  "bajaj",
  "slice",
  "sliceaxis",
  "jupiteraxis",
  "naviaxis",
  "superyes",
  "fam",
  "pingpay",
  "cred",
  "tapicici",
  "timecosmos",
  "eazypay",
  "razorpay",
  "pinelabs",
]);

const BLOCKED_EMAIL_HANDLES = new Set([
  "gmail",
  "yahoo",
  "outlook",
  "hotmail",
  "icloud",
  "protonmail",
  "live",
  "rediffmail",
]);

export interface UpiFormatCheckResult {
  valid: boolean;
  normalized: string;
  handle: string;
  isKnownHandle: boolean;
  isLikelyMerchant: boolean;
  error?: string;
}

export function validateUpiIdFormat(raw: string): UpiFormatCheckResult {
  const normalized = raw.trim().toLowerCase();
  if (!UPI_SYNTAX_REGEX.test(normalized)) {
    return {
      valid: false,
      normalized,
      handle: "",
      isKnownHandle: false,
      isLikelyMerchant: false,
      error: "Enter a valid UPI ID (e.g. yourcafe@okbizaxis or paytmqr...@paytm).",
    };
  }

  const [localPart, handle] = normalized.split("@");

  if (BLOCKED_EMAIL_HANDLES.has(handle)) {
    return {
      valid: false,
      normalized,
      handle,
      isKnownHandle: false,
      isLikelyMerchant: false,
      error: `"@${handle}" looks like an email domain, not an Indian UPI bank handle.`,
    };
  }

  const isKnownHandle = KNOWN_UPI_HANDLES.has(handle);
  if (!isKnownHandle) {
    return {
      valid: false,
      normalized,
      handle,
      isKnownHandle: false,
      isLikelyMerchant: false,
      error: `Unknown UPI bank handle "@${handle}". Check for typos (e.g. @okaxis, @ybl, @paytm, @okbizaxis).`,
    };
  }

  const isLikelyMerchant =
    handle.startsWith("okbiz") ||
    handle === "bharatpe" ||
    handle === "eazypay" ||
    handle === "razorpay" ||
    handle === "pinelabs" ||
    localPart.startsWith("paytmqr") ||
    localPart.startsWith("bharatpe") ||
    localPart.startsWith("q") && localPart.length > 10 && handle === "ybl";

  return {
    valid: true,
    normalized,
    handle,
    isKnownHandle: true,
    isLikelyMerchant,
  };
}

export interface RazorpayVpaVerification {
  source: "razorpay_npci" | "format_only";
  verified: boolean | null;
  customerName: string | null;
  error?: string;
}

/**
 * Verifies a UPI VPA directly against NPCI via Razorpay's VPA Validation API
 * when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are configured.
 * Falls back gracefully to format_only if Razorpay keys aren't configured or VPA API isn't enabled.
 */
export async function verifyUpiWithRazorpay(vpa: string): Promise<RazorpayVpaVerification> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return { source: "format_only", verified: null, customerName: null };
  }

  try {
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/payments/validate/vpa", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vpa }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as {
      vpa?: string;
      success?: boolean;
      customer_name?: string;
      error?: { description?: string; code?: string };
    };

    if (res.ok && data.success === true) {
      return {
        source: "razorpay_npci",
        verified: true,
        customerName: data.customer_name || null,
      };
    }

    if (res.status === 400 && data.error?.description) {
      // Distinguish genuine invalid VPA from "feature not enabled on Razorpay account"
      const desc = data.error.description.toLowerCase();
      if (desc.includes("invalid vpa") || desc.includes("not valid") || desc.includes("does not exist")) {
        return {
          source: "razorpay_npci",
          verified: false,
          customerName: null,
          error: "NPCI could not find this UPI ID. Please double-check the spelling.",
        };
      }
    }

    // Account may not have VPA validation enabled yet — fall back to format + ₹1 test QR
    return { source: "format_only", verified: null, customerName: null };
  } catch {
    return { source: "format_only", verified: null, customerName: null };
  }
}
