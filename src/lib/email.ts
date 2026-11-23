import { Resend } from "resend";

const BRAND_THEME = {
  name: "Tablory",
  tagline: "Every Table Has a Story. Serve It Faster.",
  primary: "#E15A2B",
  background: "#FAF8F5",
  foreground: "#18181B",
  muted: "#78716C",
  border: "#E7E5E4",
} as const;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendWelcomeEmail({
  to,
  ownerName,
  appUrl,
}: {
  to: string;
  ownerName: string;
  appUrl?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Tablory <onboarding@resend.dev>";
  const baseUrl = (appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://tabolry.vercel.app").replace(/\/$/, "");
  const onboardingUrl = `${baseUrl}/onboarding`;
  const safeName = escapeHtml(ownerName || "Partner");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${BRAND_THEME.name}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND_THEME.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND_THEME.foreground};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid ${BRAND_THEME.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid ${BRAND_THEME.border};">
              <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background-color:${BRAND_THEME.primary};color:#ffffff;font-weight:800;font-size:15px;vertical-align:middle;">T</span>
              <span style="margin-left:10px;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${BRAND_THEME.foreground};vertical-align:middle;">Tabl<span style="color:${BRAND_THEME.primary};">ory</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:800;color:${BRAND_THEME.foreground};">
                Welcome to Tablory, ${safeName}!
              </h1>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#44403C;">
                Your restaurant account is ready with a <strong>14-day free trial</strong>. You can now publish your mobile QR menu, generate table-specific QR standees, and receive live kitchen &amp; UPI payment alerts.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
                <tr>
                  <td style="border-radius:12px;background-color:${BRAND_THEME.primary};">
                    <a href="${onboardingUrl}" target="_blank" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
                      Complete Restaurant Setup &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:${BRAND_THEME.muted};">
                Need help setting up your menu? Just reply to this email or open your dashboard anytime.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background-color:${BRAND_THEME.background};border-top:1px solid ${BRAND_THEME.border};font-size:12px;color:${BRAND_THEME.muted};">
              <strong>Tablory</strong> &middot; ${BRAND_THEME.tagline}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "Welcome to Tablory — Your 14-Day Free Trial is Ready",
      html,
    });

    if (error) {
      console.error("Resend welcome email error:", error);
      return { sent: false, error: error.message };
    }

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("Resend welcome email exception:", message);
    return { sent: false, error: message };
  }
}
