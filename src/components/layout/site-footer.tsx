import Link from "next/link";
import { TabloryLogo } from "@/components/ui/tablory-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white py-10">
      <div className="mx-auto max-w-7xl safe-area-px-4 sm:px-6 lg:px-8 text-xs text-stone-500">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Link href="/">
              <TabloryLogo size="sm" />
            </Link>
            <span>&middot; Every Table Has a Story. Serve It Faster.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium">
            <Link href="/login" className="hover:text-stone-900">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-stone-900">
              Start Free Trial
            </Link>
            <Link
              href="/menu/spice-garden-demo"
              target="_blank"
              className="hover:text-stone-900"
            >
              Live Demo
            </Link>
            <Link href="/privacy" className="hover:text-stone-900">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-stone-900">
              Terms
            </Link>
            <Link href="/refund-policy" className="hover:text-stone-900">
              Refund Policy
            </Link>
            <Link href="/contact" className="hover:text-stone-900">
              Contact
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-stone-100 pt-5 text-center sm:flex-row sm:text-left">
          <p className="text-stone-400">
            &copy; {new Date().getFullYear()} Tablory. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-stone-500">
            <span>
              Designed &amp; Developed by{" "}
              <a
                href="https://tanujbuilds.site"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-stone-800 underline decoration-stone-300 underline-offset-2 transition hover:text-brand hover:decoration-brand"
              >
                Tanuj Pandey
              </a>
            </span>
            <span className="hidden sm:inline text-stone-300">&bull;</span>
            <span>
              Independent Product by{" "}
              <a
                href="https://tanujbuilds.site/agency"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-stone-800 underline decoration-stone-300 underline-offset-2 transition hover:text-brand hover:decoration-brand"
              >
                NovaStack Studio
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
