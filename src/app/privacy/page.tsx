import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Tablory",
  description:
    "How Tablory collects, stores, and protects restaurant and guest data across our QR dining and kitchen display platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 antialiased">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-10">
          <div className="border-b border-stone-100 pb-6">
            <span className="inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-brand">
              Legal &amp; Compliance
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              Last updated: November 2026 &middot; Operated by NovaStack Studio (Tablory)
            </p>
          </div>

          <div className="mt-8 space-y-7 text-sm leading-relaxed text-stone-600">
            <section>
              <h2 className="text-base font-semibold text-stone-900">1. Overview</h2>
              <p className="mt-2">
                Tablory (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), an independent
                SaaS product built and operated by{" "}
                <span className="font-medium text-stone-800">NovaStack Studio</span>, provides QR
                digital menus, table ordering, and live Kitchen Display System (KDS) software for
                restaurants, cafes, and hospitality venues at{" "}
                <span className="font-medium text-stone-800">tablory.online</span>. This Privacy
                Policy explains what information we collect, how we use it, and your rights.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">2. Information We Collect</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-stone-800">Restaurant Owner Accounts:</strong> Name,
                  business email address, encrypted password hash, restaurant name, city, phone
                  number, menu items, dish images, table configuration, and optional UPI ID for
                  direct guest payments.
                </li>
                <li>
                  <strong className="text-stone-800">Dine-In Guest Orders:</strong> When a guest
                  scans a table QR code and places an order, we process the selected menu items,
                  table number, optional guest note/name, and order timestamps so the restaurant
                  kitchen can fulfill the order.
                </li>
                <li>
                  <strong className="text-stone-800">Authentication &amp; Security Data:</strong>{" "}
                  Session cookies (HTTP-only JWT tokens) required to keep restaurant owners and
                  staff securely signed in.
                </li>
                <li>
                  <strong className="text-stone-800">Payment &amp; Billing Information:</strong>{" "}
                  Subscription payments are processed securely through third-party payment
                  processors (such as Razorpay or Lemon Squeezy). We do not store raw credit/debit
                  card numbers or UPI PINs on Tablory servers.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">
                3. How We Use Your Information
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>To provision and operate your restaurant menu, QR codes, and live KDS board.</li>
                <li>
                  To send essential transactional emails (account verification, password resets,
                  billing receipts, and service notices) via Resend.
                </li>
                <li>To prevent fraud, unauthorized access, and service abuse.</li>
                <li>To provide customer support when you contact us.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">
                4. Data Storage &amp; Subprocessors
              </h2>
              <p className="mt-2">
                Application data and uploaded dish photography are stored securely on managed cloud
                infrastructure (PostgreSQL and Supabase Storage) with encrypted transport (HTTPS/TLS).
                We never sell or rent restaurant or diner data to third-party advertisers.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">
                5. Data Retention &amp; Deletion
              </h2>
              <p className="mt-2">
                We retain your account and menu data for as long as your Tablory account remains
                active. You may request export or permanent deletion of your restaurant account and
                associated data at any time by emailing{" "}
                <a
                  href="mailto:tanujp09@gmail.com"
                  className="font-medium text-brand underline underline-offset-2"
                >
                  tanujp09@gmail.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">6. Contact Us</h2>
              <p className="mt-2">
                For privacy questions or data requests, reach us at{" "}
                <a
                  href="mailto:tanujp09@gmail.com"
                  className="font-medium text-brand underline underline-offset-2"
                >
                  tanujp09@gmail.com
                </a>{" "}
                or visit our{" "}
                <Link href="/contact" className="font-medium text-brand underline underline-offset-2">
                  Contact page
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
