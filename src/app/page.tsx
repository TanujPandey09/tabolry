"use client";

import * as React from "react";
import Link from "next/link";
import {
  QrCode,
  Smartphone,
  BarChart3,
  Check,
  Utensils,
  Zap,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Clock,
  Printer,
  ChevronRight,
  ExternalLink,
  Plus,
  Minus,
  CheckCircle2,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TabloryLogo } from "@/components/ui/tablory-logo";
import { formatCurrency } from "@/lib/utils";

const DEMO_ITEMS = [
  {
    id: "item-1",
    name: "Paneer Tikka Angara",
    desc: "Smoky tandoori cottage cheese cubes marinated in Kashmiri chili & mustard oil",
    price: 260,
    isVeg: true,
    tag: "Bestseller",
  },
  {
    id: "item-2",
    name: "Dal Makhani Handi",
    desc: "Slow-simmered black lentils cooked overnight with cultured white butter",
    price: 220,
    isVeg: true,
    tag: "Chef's Special",
  },
  {
    id: "item-3",
    name: "Murgh Dum Biryani",
    desc: "Aromatic aged basmati rice layered with tender saffron chicken & brown onions",
    price: 340,
    isVeg: false,
    tag: "Popular",
  },
];

export default function HomePage() {
  const [selectedTable, setSelectedTable] = React.useState("Table 4");
  const [cart, setCart] = React.useState<Record<string, number>>({ "item-1": 2, "item-2": 1 });
  const [orderPlaced, setOrderPlaced] = React.useState(false);
  const [orderStatus, setOrderStatus] = React.useState<"RECEIVED" | "PREPARING" | "SERVED">("RECEIVED");

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = DEMO_ITEMS.find((i) => i.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  function updateDemoCart(id: string, delta: number) {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  }

  function handleDemoOrder() {
    setOrderPlaced(true);
    setOrderStatus("RECEIVED");
    setTimeout(() => setOrderStatus("PREPARING"), 1800);
    setTimeout(() => setOrderStatus("SERVED"), 4000);
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 selection:bg-[#E15A2B] selection:text-white">
      {/* Top Announcement */}
      <div className="bg-stone-950 px-4 py-2 text-center text-xs font-medium text-stone-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Launch your QR digital menu &amp; table ordering in 5 minutes — 14-Day Free Trial</span>
          <Link href="/register" className="font-bold text-amber-400 underline underline-offset-2 ml-1 hover:text-amber-300">
            Start Free &rarr;
          </Link>
        </span>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <TabloryLogo />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-stone-600 md:flex">
            <a href="#demo" className="transition hover:text-stone-950">
              Interactive Table
            </a>
            <a href="#features" className="transition hover:text-stone-950">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-stone-950">
              How It Works
            </a>
            <a href="#pricing" className="transition hover:text-stone-950">
              Pricing
            </a>
            <Link
              href="/menu/spice-garden-demo"
              target="_blank"
              className="inline-flex items-center gap-1 text-[#E15A2B] hover:text-[#C94A1E] font-bold"
            >
              Guest Menu Demo
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="font-semibold text-stone-700">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild className="bg-stone-950 hover:bg-stone-800 text-white shadow-sm font-bold">
              <Link href="/register">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
        {/* Warm Terracotta Ambient Glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[550px] w-[850px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-orange-500/10 via-amber-500/10 to-transparent blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50 px-3.5 py-1 text-xs font-bold text-orange-950 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
                <span>QR Menus &bull; Table Ordering &bull; Live Kitchen Alerts</span>
              </div>

              <h1 className="text-4xl font-black tracking-tight text-stone-950 sm:text-5xl lg:text-6xl lg:leading-[1.1]">
                Every Table Has a Story.{" "}
                <span className="bg-gradient-to-r from-[#E15A2B] via-[#D97706] to-amber-600 bg-clip-text text-transparent">
                  Serve It Faster.
                </span>
              </h1>

              <p className="text-base sm:text-lg leading-relaxed text-stone-600 max-w-2xl mx-auto lg:mx-0">
                Turn every table QR scan into instant kitchen orders. Guests browse rich dish photos, order right from their seat, and pay via UPI or Cash—with zero app downloads and zero menu reprints.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Button size="lg" asChild className="w-full sm:w-auto bg-[#E15A2B] hover:bg-[#C94A1E] text-white shadow-md shadow-orange-600/25 font-bold h-12 px-6">
                  <Link href="/register" className="flex items-center gap-2">
                    Create Your Digital Menu Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto font-semibold h-12 px-5 border-stone-300 bg-white hover:bg-stone-50">
                  <Link href="/menu/spice-garden-demo" target="_blank" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-[#E15A2B]" />
                    Preview Live Guest Menu
                  </Link>
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-stone-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  14-Day Free Trial
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  No App Installation Required
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  UPI &amp; FSSAI Veg/Non-Veg Compliant
                </span>
              </div>
            </div>

            {/* Right Column: Interactive Table Simulator */}
            <div className="lg:col-span-6" id="demo">
              <div className="relative mx-auto max-w-md rounded-3xl border border-stone-200/90 bg-white p-5 shadow-2xl shadow-stone-300/40">
                {/* Table Header */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Live Table Simulator
                    </span>
                  </div>

                  <div className="flex gap-1 bg-stone-100 p-0.5 rounded-lg text-xs font-bold">
                    {["Table 1", "Table 4", "Table 9"].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setSelectedTable(t);
                          setOrderPlaced(false);
                        }}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          selectedTable === t
                            ? "bg-white text-stone-900 shadow-2xs"
                            : "text-stone-500 hover:text-stone-900"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Restaurant Brand Header */}
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-stone-900 text-base">The Royal Tandoor</h3>
                    <p className="text-xs text-stone-500">Civil Lines, Meerut · Mughlai &amp; North Indian</p>
                  </div>
                  <span className="rounded-full bg-[#E15A2B] px-3 py-1 text-xs font-extrabold text-white shadow-xs">
                    {selectedTable}
                  </span>
                </div>

                {/* Sample Items with Micro-Steppers */}
                <div className="mt-4 space-y-2.5">
                  {DEMO_ITEMS.map((item) => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-stone-100 bg-[#FAF8F5]/80 p-3 hover:bg-[#FAF8F5] transition"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                item.isVeg ? "bg-emerald-600" : "bg-red-600"
                              }`}
                            />
                            <h4 className="text-xs font-bold text-stone-900 truncate">{item.name}</h4>
                            <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-900">
                              {item.tag}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-stone-500 line-clamp-1">{item.desc}</p>
                          <span className="mt-1 block text-xs font-extrabold text-stone-900">
                            {formatCurrency(item.price, "INR")}
                          </span>
                        </div>

                        {/* Stepper */}
                        <div className="shrink-0">
                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={() => updateDemoCart(item.id, 1)}
                              className="rounded-lg bg-[#E15A2B] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#C94A1E] cursor-pointer"
                            >
                              + ADD
                            </button>
                          ) : (
                            <div className="flex items-center rounded-lg border border-stone-300 bg-white p-0.5">
                              <button
                                type="button"
                                onClick={() => updateDemoCart(item.id, -1)}
                                className="flex h-6 w-6 items-center justify-center rounded text-stone-600 hover:bg-stone-100 cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center text-xs font-bold text-stone-900">{qty}</span>
                              <button
                                type="button"
                                onClick={() => updateDemoCart(item.id, 1)}
                                className="flex h-6 w-6 items-center justify-center rounded text-stone-600 hover:bg-stone-100 cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Checkout Box */}
                <div className="mt-4 border-t border-stone-100 pt-3">
                  {!orderPlaced ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400">Total Bill</span>
                        <p className="text-base font-extrabold text-stone-900">
                          {formatCurrency(cartTotal, "INR")}{" "}
                          <span className="text-xs font-normal text-stone-500">({cartCount} dishes)</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleDemoOrder}
                        disabled={cartCount === 0}
                        className="rounded-xl bg-stone-950 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-stone-800 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
                        Place {selectedTable} Order
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-center space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Order ORD-842 Placed at {selectedTable}!
                      </div>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        Kitchen Status:{" "}
                        <strong>
                          {orderStatus === "RECEIVED" && "🕒 Received by Kitchen"}
                          {orderStatus === "PREPARING" && "🍳 Chef is cooking your dishes"}
                          {orderStatus === "SERVED" && "🍽️ Dishes served to table!"}
                        </strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => setOrderPlaced(false)}
                        className="text-[10px] text-emerald-950 underline font-bold mt-1 cursor-pointer"
                      >
                        Reset Demo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pilot Proof Strip */}
      <section className="border-y border-stone-200/80 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-stone-400 mb-6">
            Tested &amp; Trusted by restaurants, dhabas &amp; bistros across Western UP &amp; Delhi-NCR
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
            <div className="rounded-xl bg-[#FAF8F5] p-4 border border-stone-100">
              <span className="text-2xl font-black text-stone-900">100%</span>
              <p className="text-xs text-stone-500 font-medium mt-0.5">App-Free Browser Menu</p>
            </div>
            <div className="rounded-xl bg-[#FAF8F5] p-4 border border-stone-100">
              <span className="text-2xl font-black text-stone-900">₹0</span>
              <p className="text-xs text-stone-500 font-medium mt-0.5">Hardware Investment</p>
            </div>
            <div className="rounded-xl bg-[#FAF8F5] p-4 border border-stone-100">
              <span className="text-2xl font-black text-stone-900">&lt; 3s</span>
              <p className="text-xs text-stone-500 font-medium mt-0.5">Lightning Fast Loading</p>
            </div>
            <div className="rounded-xl bg-[#FAF8F5] p-4 border border-stone-100">
              <span className="text-2xl font-black text-stone-900">14 Days</span>
              <p className="text-xs text-stone-500 font-medium mt-0.5">Full Free Pilot Access</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <Badge className="bg-orange-100 text-orange-950 hover:bg-orange-100 font-bold px-3 py-1">
              Real Hospitality Features
            </Badge>
            <h2 className="text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">
              Engineered Specifically for Restaurant Floors
            </h2>
            <p className="text-base text-stone-600">
              Designed for quick updates by restaurant managers — simple on desktop, effortless on smartphone screens.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: QrCode,
                title: "Permanent Table QR Codes",
                desc: "Generate unique, tamper-proof QR codes for each table. Download high-res PNGs or printable A5 table tent PDFs with your brand color.",
              },
              {
                icon: Zap,
                title: "Instant Stock & Price Edits",
                desc: "Ran out of Kadhai Paneer or adjusting festival prices? Toggle 'Sold Out' or update prices in 2 seconds from your phone.",
              },
              {
                icon: ShoppingBag,
                title: "Live Kitchen Display (KDS)",
                desc: "Incoming table orders trigger real-time audible chimes and visual alerts. Move orders from Cooking to Served with 1 tap.",
              },
              {
                icon: IndianRupee,
                title: "UPI & Counter Settlement",
                desc: "Guests can scan your dynamic restaurant UPI QR code or choose 'Pay at Counter / Cash' when dining completes.",
              },
              {
                icon: Utensils,
                title: "3 Professional Aesthetics",
                desc: "Modern Card, Classic Bistro (warm serif typography), or Minimal List. Match your restaurant brand identity effortlessly.",
              },
              {
                icon: BarChart3,
                title: "100% Real Scan Analytics",
                desc: "Track real guest visits, table-wise scan counts, and daily peak dining hours with zero fake statistics.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-stone-200/90 bg-white p-7 shadow-xs hover:border-stone-300 hover:shadow-md transition space-y-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#E15A2B]">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-stone-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-white border-y border-stone-200/80 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <Badge className="bg-orange-100 text-orange-950 hover:bg-orange-100 font-bold px-3 py-1">
              Simple INR Pricing
            </Badge>
            <h2 className="text-3xl font-black text-stone-950 sm:text-4xl">
              Transparent Plans with Zero Commission
            </h2>
            <p className="text-stone-600">
              Start with our 14-day free trial. Upgrade only when you see your dining tables buzzing with QR orders.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {/* Free Trial */}
            <div className="rounded-3xl border border-stone-200 bg-[#FAF8F5] p-8 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Pilot Launch</span>
                <h3 className="text-xl font-bold text-stone-900 mt-1">14-Day Free Trial</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-stone-950">₹0</span>
                  <span className="text-xs text-stone-500">/ 14 days</span>
                </div>
                <p className="mt-2 text-xs text-stone-600">Full access to test on your real dining tables.</p>
                <div className="mt-6 space-y-3 text-xs text-stone-700">
                  {["1 restaurant location", "Up to 15 table QR codes", "Instant menu updates", "PNG & PDF print downloads"].map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button asChild className="w-full mt-8 bg-stone-950 hover:bg-stone-800 text-white font-bold">
                <Link href="/register">Start Free Trial</Link>
              </Button>
            </div>

            {/* Starter Plan */}
            <div className="rounded-3xl border border-[#E15A2B] bg-white p-8 shadow-xl shadow-orange-500/10 ring-2 ring-[#E15A2B] flex flex-col justify-between relative">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#E15A2B] px-3.5 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                Most Popular
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#E15A2B]">Small Restaurants &amp; Cafes</span>
                <h3 className="text-xl font-bold text-stone-900 mt-1">Starter</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-stone-950">₹199</span>
                  <span className="text-xs text-stone-500">/ month</span>
                </div>
                <p className="mt-2 text-xs text-stone-600">Ideal for bistros, dhabas, and neighborhood cafes.</p>
                <div className="mt-6 space-y-3 text-xs text-stone-700">
                  {[
                    "1 restaurant location",
                    "Up to 25 table QR codes",
                    "Live Table Ordering & KDS",
                    "UPI QR code settlement",
                    "Printable A5 table tent PDFs",
                    "Priority WhatsApp support",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button asChild className="w-full mt-8 bg-[#E15A2B] hover:bg-[#C94A1E] text-white font-bold shadow-md shadow-orange-600/20">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>

            {/* Growth Plan */}
            <div className="rounded-3xl border border-stone-200 bg-[#FAF8F5] p-8 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Family Dining</span>
                <h3 className="text-xl font-bold text-stone-900 mt-1">Growth</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-stone-950">₹399</span>
                  <span className="text-xs text-stone-500">/ month</span>
                </div>
                <p className="mt-2 text-xs text-stone-600">For multi-floor dining &amp; high volume restaurants.</p>
                <div className="mt-6 space-y-3 text-xs text-stone-700">
                  {[
                    "Up to 60 table QR codes",
                    "Bulk PDF print generator",
                    "All 3 professional templates",
                    "Real QR scan analytics & graphs",
                    "Dedicated onboarding manager",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-8 border-stone-300 font-bold">
                <Link href="/register">Choose Growth</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 text-xs text-stone-500 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <TabloryLogo size="sm" />
              <span>&middot; Every Table Has a Story. Serve It Faster.</span>
            </div>
            <div className="flex items-center gap-6 font-medium">
              <Link href="/login" className="hover:text-stone-900">
                Sign In
              </Link>
              <Link href="/register" className="hover:text-stone-900">
                Start Free Trial
              </Link>
              <Link href="/menu/spice-garden-demo" target="_blank" className="hover:text-stone-900">
                Live Demo
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
    </div>
  );
}
