import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TabloryLogo } from "@/components/ui/tablory-logo";

export const metadata: Metadata = {
  title: "Terms & Conditions | Tablory",
  description:
    "Terms of Service governing the use of Tablory QR menu, table ordering, and kitchen display SaaS subscriptions.",
};

export default function TermsPage() {
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
              Legal &amp; Compliance
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Terms &amp; Conditions
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              Last updated: November 2026 &middot; Operated by NovaStack Studio (Tablory)
            </p>
          </div>

          <div className="mt-8 space-y-7 text-sm leading-relaxed text-stone-600">
            <section>
              <h2 className="text-base font-semibold text-stone-900">1. Acceptance of Terms</h2>
              <p className="mt-2">
                By registering for or using Tablory (
                <span className="font-medium text-stone-800">tablory.online</span>), operated by{" "}
                <span className="font-medium text-stone-800">NovaStack Studio</span>, you agree to be
                bound by these Terms &amp; Conditions. If you are using Tablory on behalf of a
                restaurant or hospitality business, you represent that you are authorized to bind
                that business to these terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">2. Service Description</h2>
              <p className="mt-2">
                Tablory provides cloud software for creating QR table menus, receiving dine-in table
                orders, and managing order preparation via a real-time Kitchen Display System (KDS).
                Tablory is a software provider only and does not prepare, sell, or deliver food or
                beverages.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">
                3. Subscriptions, Free Trial &amp; Pricing
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-stone-800">14-Day Free Trial:</strong> New restaurants
                  receive a 14-day free trial to evaluate the platform before upgrading to a paid
                  subscription.
                </li>
                <li>
                  <strong className="text-stone-800">Paid Plans:</strong> Starter is billed at
                  ₹499/month (or ₹4,990/year) and Growth is billed at ₹999/month (or ₹9,990/year),
                  or the equivalent USD/local rate displayed at checkout.
                </li>
                <li>
                  <strong className="text-stone-800">Renewals:</strong> Subscriptions renew
                  automatically at the end of each billing cycle unless cancelled prior to renewal.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">
                4. Restaurant Responsibilities
              </h2>
              <p className="mt-2">
                Each restaurant merchant is solely responsible for the accuracy of its menu prices,
                allergen/dietary labels, uploaded dish photos, applicable GST/taxes, food safety
                compliance, and any direct UPI IDs configured for receiving dine-in payments from
                guests.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">5. Acceptable Use</h2>
              <p className="mt-2">
                You agree not to upload unlawful content, impersonate another business, attempt to
                disrupt or reverse-engineer the platform, or bypass authentication and multi-tenant
                isolation boundaries. We reserve the right to suspend accounts violating these terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">
                6. Limitation of Liability &amp; Governing Law
              </h2>
              <p className="mt-2">
                To the maximum extent permitted by law, Tablory and NovaStack Studio shall not be
                liable for indirect, incidental, or consequential damages, including lost restaurant
                revenue. These terms are governed by the laws of India, with disputes subject to
                competent courts in India.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-stone-900">7. Contact</h2>
              <p className="mt-2">
                Questions about these terms may be sent to{" "}
                <a
                  href="mailto:tanujp09@gmail.com"
                  className="font-medium text-brand underline underline-offset-2"
                >
                  tanujp09@gmail.com
                </a>
                .
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
          <Link href="/terms" className="font-medium text-stone-900">
            Terms &amp; Conditions
          </Link>
          <Link href="/refund-policy" className="hover:text-stone-900">
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
