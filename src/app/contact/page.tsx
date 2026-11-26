import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, Globe, Mail, Building2 } from "@/components/ui/icons";
import { TabloryLogo } from "@/components/ui/tablory-logo";

export const metadata: Metadata = {
  title: "Contact Us | Tablory",
  description:
    "Get in touch with Tablory and NovaStack Studio for restaurant onboarding, billing, or technical support.",
};

export default function ContactPage() {
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
              Support &amp; Inquiries
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Contact Us
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              Need help setting up your QR menu, upgrading your plan, or requesting a refund? Reach
              our team directly.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-brand">
                <Mail className="h-4 w-4" />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-stone-900">Email Support</h2>
              <p className="mt-1 text-xs text-stone-500">
                For onboarding, billing, refunds, or technical issues:
              </p>
              <a
                href="mailto:tanujp09@gmail.com"
                className="mt-2 inline-block text-sm font-semibold text-brand underline underline-offset-2"
              >
                tanujp09@gmail.com
              </a>
            </div>

            <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-brand">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-stone-900">Support Hours</h2>
              <p className="mt-1 text-xs text-stone-500">
                Monday &ndash; Saturday, 10:00 AM &ndash; 7:00 PM IST
              </p>
              <p className="mt-2 text-xs font-medium text-stone-700">
                Typical response time: within 24 hours
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-brand">
                <Building2 className="h-4 w-4" />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-stone-900">Operated By</h2>
              <p className="mt-1 text-xs text-stone-500">
                Tablory is an independent SaaS product built by:
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-900">
                NovaStack Studio (Tanuj Pandey)
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-brand">
                <Globe className="h-4 w-4" />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-stone-900">Website &amp; Studio</h2>
              <p className="mt-1 text-xs text-stone-500">Product &amp; agency links:</p>
              <div className="mt-2 flex flex-col gap-1 text-xs font-medium">
                <Link href="/" className="text-brand underline underline-offset-2">
                  https://www.tablory.online
                </Link>
                <a
                  href="https://tanujbuilds.site/agency"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-700 underline underline-offset-2 hover:text-stone-900"
                >
                  https://tanujbuilds.site/agency
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 px-5 py-4">
            <p className="text-xs text-stone-600">
              Ready to launch your restaurant&rsquo;s QR menu? Start your 14-day free trial in
              minutes.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-stone-800"
              >
                Start Free Trial
              </Link>
            </div>
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
          <Link href="/refund-policy" className="hover:text-stone-900">
            Refund Policy
          </Link>
          <Link href="/contact" className="font-medium text-stone-900">
            Contact Us
          </Link>
        </div>
      </footer>
    </div>
  );
}
