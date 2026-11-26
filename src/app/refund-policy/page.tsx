import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TabloryLogo } from "@/components/ui/tablory-logo";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Tablory",
  description:
    "Clear refund, free trial, and subscription cancellation terms for Tablory restaurant SaaS plans.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 antialiased">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#FAF8F5]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="transition hover:opacity-85">
            <TabloryLogo size="sm" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 transition hover:text-stone-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-10">
          <div className="border-b border-stone-100 pb-6">
            <span className="inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-brand">
              Billing &amp; Support
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Refund &amp; Cancellation Policy
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              Last updated: November 2026 &middot; Operated by NovaStack Studio (Tablory)
            </p>
          </div>

          <div className="mt-8 space-y-7 text-sm leading-relaxed text-stone-600">
            <section>
              <h2 className="text-base font-semibold text-stone-900">1. 14-Day Free Trial</h2>
              <p className="mt-2">
                Every new Tablory restaurant account begins with a{" "}
                <strong className="text-stone-800">14-day free trial</strong> with no upfront
                payment required. You can test the digital menu, QR code generator, and live Kitchen
                Display System before choosing a paid plan.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">
                2. Subscription Cancellation
              </h2>
              <p className="mt-2">
                You may cancel your monthly (Starter ₹499/mo or Growth ₹999/mo) or annual
                subscription at any time prior to your next renewal date. Upon cancellation, your
                plan remains active until the end of the current paid billing period and will not be
                charged again.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">
                3. 7-Day Refund Eligibility
              </h2>
              <p className="mt-2">
                If you are billed for a new subscription (monthly or annual) and experience a
                technical issue that our team cannot resolve, or if you were charged in error after
                requesting cancellation, you may request a full refund within{" "}
                <strong className="text-stone-800">7 calendar days</strong> of the charge date.
              </p>
              <p className="mt-2">
                Approved refunds are processed back to the original payment method within{" "}
                <strong className="text-stone-800">5&ndash;7 business days</strong>, depending on
                your bank or card issuer.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">
                4. Dine-In Guest Food Orders
              </h2>
              <p className="mt-2">
                Tablory is a software platform for restaurants. Any food or beverage payments made by
                dine-in guests directly to a restaurant (via cash, card, or the restaurant&rsquo;s
                own UPI ID) are handled solely by that restaurant. Guests seeking refunds for food
                orders should contact the restaurant directly.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">
                5. How to Request a Refund or Cancellation
              </h2>
              <p className="mt-2">
                Email{" "}
                <a
                  href="mailto:tanujp09@gmail.com"
                  className="font-medium text-brand underline underline-offset-2"
                >
                  tanujp09@gmail.com
                </a>{" "}
                with your registered restaurant email address and payment receipt or transaction ID.
                We respond within 24&ndash;48 business hours.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-5 px-4">
          <Link href="/privacy" className="hover:text-stone-900">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-stone-900">
            Terms &amp; Conditions
          </Link>
          <Link href="/refund-policy" className="font-medium text-stone-900">
            Refund Policy
          </Link>
          <Link href="/contact" className="hover:text-stone-900">
            Contact Us
          </Link>
        </div>
      </footer>
    </div>
  );
}
