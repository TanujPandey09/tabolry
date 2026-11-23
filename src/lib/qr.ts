import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export function buildMenuUrl(
  baseUrl: string,
  restaurantSlug: string,
  tableToken?: string | null
): string {
  const cleanBase = baseUrl.replace(/\/$/, "");
  if (tableToken) {
    return `${cleanBase}/menu/${restaurantSlug}/t/${tableToken}`;
  }
  return `${cleanBase}/menu/${restaurantSlug}`;
}

export async function generateQrPngBuffer(url: string, width = 600): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });
}

export async function generateQrDataUrl(url: string, width = 400): Promise<string> {
  return QRCode.toDataURL(url, {
    width,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return [37 / 255, 99 / 255, 235 / 255];
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [
    Number.isNaN(r) ? 0.145 : r,
    Number.isNaN(g) ? 0.388 : g,
    Number.isNaN(b) ? 0.922 : b,
  ];
}

function sanitizePdfText(text: string): string {
  // Standard PDF Helvetica fonts use WinAnsi encoding; replace unsupported characters safely
  return text.replace(/[^\x20-\x7E]/g, "");
}

export interface PrintableQrItem {
  restaurantName: string;
  subtitle: string; // e.g., "Table 3" or "General Menu"
  url: string;
  primaryColor?: string;
}

export async function generatePrintableQrPdf(
  items: PrintableQrItem[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // A5 portrait table tent card size (420 x 595 pt)
  const pageWidth = 420;
  const pageHeight = 595;

  for (const item of items) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const [r, g, b] = hexToRgbTuple(
      !item.primaryColor || item.primaryColor.toUpperCase() === "#2563EB"
        ? "#E15A2B"
        : item.primaryColor
    );
    const accent = rgb(r, g, b);
    const dark = rgb(0.06, 0.09, 0.16);
    const muted = rgb(0.39, 0.45, 0.55);
    const border = rgb(0.88, 0.91, 0.94);

    // Outer subtle card border
    page.drawRectangle({
      x: 24,
      y: 24,
      width: pageWidth - 48,
      height: pageHeight - 48,
      borderColor: border,
      borderWidth: 1.5,
      color: rgb(1, 1, 1),
    });

    // Top accent bar
    page.drawRectangle({
      x: 24,
      y: pageHeight - 40,
      width: pageWidth - 48,
      height: 16,
      color: accent,
    });

    // Restaurant name (centered)
    const restTitle = sanitizePdfText(item.restaurantName).slice(0, 38) || "Restaurant";
    const restFontSize = restTitle.length > 26 ? 17 : 21;
    const restWidth = fontBold.widthOfTextAtSize(restTitle, restFontSize);
    page.drawText(restTitle, {
      x: Math.max(36, (pageWidth - restWidth) / 2),
      y: pageHeight - 92,
      size: restFontSize,
      font: fontBold,
      color: dark,
    });

    // Subtitle badge ("Table 3" / "Digital Menu")
    const subText = sanitizePdfText(item.subtitle).slice(0, 32) || "Digital Menu";
    const subSize = 14;
    const subWidth = fontBold.widthOfTextAtSize(subText, subSize);
    const badgeWidth = Math.min(pageWidth - 96, subWidth + 36);
    const badgeX = (pageWidth - badgeWidth) / 2;
    const badgeY = pageHeight - 134;

    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeWidth,
      height: 28,
      color: rgb(0.94, 0.96, 1),
      borderColor: accent,
      borderWidth: 1,
    });

    page.drawText(subText, {
      x: (pageWidth - subWidth) / 2,
      y: badgeY + 9,
      size: subSize,
      font: fontBold,
      color: accent,
    });

    // QR Code PNG embedded cleanly in the center
    const pngBuffer = await generateQrPngBuffer(item.url, 720);
    const qrImage = await pdfDoc.embedPng(pngBuffer);
    const qrSize = 236;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = 185;

    // QR Frame
    page.drawRectangle({
      x: qrX - 10,
      y: qrY - 10,
      width: qrSize + 20,
      height: qrSize + 20,
      borderColor: border,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Scan instruction
    const cta = "SCAN TO VIEW MENU & ORDER";
    const ctaWidth = fontBold.widthOfTextAtSize(cta, 11.5);
    page.drawText(cta, {
      x: (pageWidth - ctaWidth) / 2,
      y: 132,
      size: 11.5,
      font: fontBold,
      color: dark,
    });

    const helper = "Point phone camera to scan · Pay via UPI or Cash at Table";
    const helperWidth = fontRegular.widthOfTextAtSize(helper, 9.5);
    page.drawText(helper, {
      x: (pageWidth - helperWidth) / 2,
      y: 112,
      size: 9.5,
      font: fontRegular,
      color: muted,
    });

    // Shortened display URL
    const cleanUrl = sanitizePdfText(item.url.replace(/^https?:\/\//, "")).slice(0, 56);
    const urlWidth = fontRegular.widthOfTextAtSize(cleanUrl, 8.5);
    page.drawText(cleanUrl, {
      x: Math.max(36, (pageWidth - urlWidth) / 2),
      y: 66,
      size: 8.5,
      font: fontRegular,
      color: muted,
    });

    const footer = "Powered by Tablory";
    const footerWidth = fontRegular.widthOfTextAtSize(footer, 8.5);
    page.drawText(footer, {
      x: (pageWidth - footerWidth) / 2,
      y: 42,
      size: 8.5,
      font: fontRegular,
      color: muted,
    });
  }

  return pdfDoc.save();
}
