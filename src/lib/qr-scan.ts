import { prisma } from "@/lib/prisma";
import { detectDeviceType, hashIp } from "@/lib/utils";
import { checkRateLimitDistributed } from "@/lib/rate-limit";

const BOT_USER_AGENT_REGEX =
  /bot|crawler|spider|slurp|mediapartners|whatsapp|facebookexternalhit|facebot|twitterbot|slackbot|linkedinbot|telegrambot|discordbot|pinterest|lighthouse|headlesschrome|pingdom|uptimerobot|statuscake|google-inspectiontool|bytespider|gptbot/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return BOT_USER_AGENT_REGEX.test(ua);
}

interface RecordQrScanInput {
  restaurantId: string;
  qrCodeId: string;
  tableId?: string | null;
  userAgent: string | null;
  ip: string;
}

/**
 * Records a genuine QRScanEvent while filtering out link-preview bots/crawlers
 * and deduplicating rapid reloads from the same IP within a 2-minute window.
 */
export async function recordQrScan(input: RecordQrScanInput): Promise<void> {
  try {
    if (isBotUserAgent(input.userAgent)) {
      return;
    }

    const ipHash = hashIp(input.ip);
    const dedupKey = `scan-dedup:${input.qrCodeId}:${ipHash || input.ip}`;

    // Deduplicate identical (qrCodeId, ipHash) hits within 2 minutes
    const dedup = await checkRateLimitDistributed(dedupKey, 1, 2 * 60 * 1000);
    if (!dedup.allowed) {
      return;
    }

    // Overall per-IP write-amplification guard (60/min across all QRs)
    const rate = await checkRateLimitDistributed(`scan-ip:${ipHash || input.ip}`, 60, 60 * 1000);
    if (!rate.allowed) {
      return;
    }

    await prisma.qRScanEvent.create({
      data: {
        restaurantId: input.restaurantId,
        qrCodeId: input.qrCodeId,
        tableId: input.tableId ?? null,
        userAgent: input.userAgent ? input.userAgent.slice(0, 255) : null,
        deviceType: detectDeviceType(input.userAgent),
        ipHash,
      },
    });
  } catch {
    // Non-blocking scan event telemetry
  }
}
