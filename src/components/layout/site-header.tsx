"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Menu, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { TabloryLogo } from "@/components/ui/tablory-logo";

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isHome = pathname === "/";
  const sectionHref = (hash: string) => (isHome ? hash : `/${hash}`);

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center shrink-0">
          <TabloryLogo size="sm" className="sm:hidden" />
          <TabloryLogo className="hidden sm:inline-flex" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-stone-600 lg:flex">
          <Link href={sectionHref("#demo")} className="transition hover:text-stone-950">
            Interactive Table
          </Link>
          <Link href={sectionHref("#features")} className="transition hover:text-stone-950">
            Features
          </Link>
          <Link href={sectionHref("#how-it-works")} className="transition hover:text-stone-950">
            How It Works
          </Link>
          <Link href={sectionHref("#pricing")} className="transition hover:text-stone-950">
            Pricing
          </Link>
          <Link
            href="/menu/spice-garden-demo"
            target="_blank"
            className="inline-flex items-center gap-1 text-[#E15A2B] hover:text-[#C94A1E] font-bold"
          >
            Guest Menu Demo
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden sm:inline-flex font-semibold text-stone-700"
          >
            <Link href="/login">Sign in</Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="bg-stone-950 hover:bg-stone-800 text-white font-bold px-2.5 sm:px-4 text-xs sm:text-sm h-8 sm:h-9"
          >
            <Link href="/register">Start Free</Link>
          </Button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="inline-flex lg:hidden h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet (iPad Portrait) Collapsible Nav Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200/80 bg-white px-3.5 sm:px-4 py-4 shadow-lg">
          <nav className="flex flex-col space-y-1 text-sm font-semibold text-stone-700">
            {[
              { href: sectionHref("#demo"), label: "Interactive Table" },
              { href: sectionHref("#how-it-works"), label: "How It Works" },
              { href: sectionHref("#features"), label: "Features" },
              { href: sectionHref("#pricing"), label: "Pricing" },
              { href: "/contact", label: "Contact" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 hover:bg-stone-50 hover:text-stone-950"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/menu/spice-garden-demo"
              target="_blank"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-between rounded-xl px-3 py-2.5 text-[#E15A2B] font-bold hover:bg-orange-50/60"
            >
              <span>Preview Live Guest Menu</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-100 mt-2">
              <Button variant="outline" asChild className="w-full font-semibold">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  Sign in
                </Link>
              </Button>
              <Button
                asChild
                className="w-full bg-[#E15A2B] hover:bg-[#C94A1E] text-white font-bold"
              >
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  Start Free Trial
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
