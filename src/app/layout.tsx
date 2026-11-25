import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.tablory.online";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Tablory — Every Table Has a Story. Serve It Faster.",
  description:
    "Create, customize, and publish mobile-first QR digital menus with table-level ordering, instant UPI payments, and real-time kitchen alerts.",
  icons: {
    icon: "/assets/favicon.png",
    shortcut: "/assets/favicon.png",
    apple: "/assets/favicon.png",
  },
  openGraph: {
    title: "Tablory — Every Table Has a Story. Serve It Faster.",
    description:
      "Mobile-first QR digital menus, table-level ordering, instant UPI payments, and live kitchen alerts.",
    url: APP_URL,
    siteName: "Tablory",
    type: "website",
    images: [
      {
        url: "/assets/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tablory — QR Digital Menus & Table Ordering",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tablory — Every Table Has a Story. Serve It Faster.",
    description:
      "Mobile-first QR digital menus, table-level ordering, instant UPI payments, and live kitchen alerts.",
    images: ["/assets/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#FAF8F5] text-[#18181B] antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
