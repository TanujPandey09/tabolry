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
  ShoppingBag,
  Clock,
  Plus,
  Minus,
  CheckCircle2,
  IndianRupee,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Reveal } from "@/components/ui/motion";
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
    <div className="min-h-screen overflow-x-hidden bg-[#FAF8F5] text-stone-900 selection:bg-[#E15A2B] selection:text-white">
      {/* Top Announcement */}
      <div className="bg-stone-950 px-3 py-2 text-center text-[11px] sm:text-xs font-medium text-stone-300">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            <span>Go live with QR menus &amp; table ordering in 5 minutes — 14-Day Free Trial</span>
          </span>
          <Link
            href="/register"
            className="font-bold text-amber-400 underline underline-offset-2 hover:text-amber-300 whitespace-nowrap"
          >
            Start Free &rarr;
          </Link>
        </div>
      </div>

      {/* Main Navigation */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-10 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20">
        {/* Crisp Architectural Dot Grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] [background-size:24px_24px] opacity-55 [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,#000_55%,transparent_100%)]"
        />

        <div className="mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-6 text-center lg:text-left">
              <h1 className="text-[1.75rem] leading-[1.12] font-black tracking-[-0.03em] text-stone-950 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.06] text-balance">
                Every Table Has a Story.{" "}
                <span className="font-serif italic font-semibold text-[#E15A2B]">
                  Serve It Faster.
                </span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-stone-600 max-w-xl mx-auto lg:mx-0">
                Turn every table QR scan into instant kitchen orders. Guests browse rich dish photos, order right from their seat, and pay via UPI or Cash—with zero app downloads and zero menu reprints.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-1">
                <Button
                  size="lg"
                  asChild
                  className="group w-full sm:w-auto bg-[#E15A2B] hover:bg-[#C94A1E] text-white font-bold h-12 px-6 rounded-xl transition-all active:scale-[0.98]"
                >
                  <Link href="/register" className="flex items-center justify-center gap-2">
                    <span>Create Your Digital Menu Free</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto font-semibold h-12 px-5 rounded-xl border-stone-300 bg-white hover:bg-stone-50 transition-all active:scale-[0.98]"
                >
                  <Link href="/menu/spice-garden-demo" target="_blank" className="flex items-center justify-center gap-2">
                    <Smartphone className="h-4 w-4 text-[#E15A2B]" />
                    Preview Live Guest Menu
                  </Link>
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-5 text-xs text-stone-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  14-Day Free Trial
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  No App Required
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  0% Commission Direct UPI
                </span>
              </div>
            </div>

            {/* Right Column: Interactive Table Simulator */}
            <div className="lg:col-span-6 relative" id="demo">
              <div className="relative mx-auto max-w-[280px] sm:max-w-md rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 shadow-lg shadow-stone-300/30">
                {/* Table Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Live Simulator
                    </span>
                  </div>

                  <div className="flex gap-1 bg-stone-100 p-0.5 rounded-lg text-[11px] sm:text-xs font-bold">
                    {["Table 1", "Table 4", "Table 9"].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setSelectedTable(t);
                          setOrderPlaced(false);
                        }}
                        className={`px-2 sm:px-2.5 py-1 rounded-md transition cursor-pointer ${
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
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-stone-900 text-sm sm:text-base truncate">
                      The Royal Tandoor
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Civil Lines, Meerut · Mughlai &amp; North Indian
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#E15A2B] px-2.5 py-1 text-[11px] font-extrabold text-white">
                    {selectedTable}
                  </span>
                </div>

                {/* Sample Items with Micro-Steppers */}
                <div className="mt-3.5 space-y-2.5">
                  {DEMO_ITEMS.map((item) => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-stone-200/70 bg-[#FAF8F5]/80 p-3 hover:bg-[#FAF8F5] transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                item.isVeg ? "bg-emerald-600" : "bg-red-600"
                              }`}
                            />
                            <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                              {item.name}
                            </h4>
                          </div>
                          <p className="mt-0.5 text-[11px] text-stone-500 line-clamp-1">{item.desc}</p>
                          <span className="mt-1 block text-xs sm:text-sm font-extrabold text-stone-950 tabular-nums">
                            {formatCurrency(item.price, "INR")}
                          </span>
                        </div>

                        {/* Stepper */}
                        <div className="shrink-0">
                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={() => updateDemoCart(item.id, 1)}
                              className="rounded-lg bg-[#E15A2B] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#C94A1E] cursor-pointer"
                            >
                              + ADD
                            </button>
                          ) : (
                            <div className="flex items-center rounded-lg border border-stone-300 bg-white p-0.5">
                              <button
                                type="button"
                                onClick={() => updateDemoCart(item.id, -1)}
                                className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-stone-100 cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-stone-900 tabular-nums">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateDemoCart(item.id, 1)}
                                className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-stone-100 cursor-pointer"
                                aria-label="Increase quantity"
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
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                          Total Bill
                        </span>
                        <p className="text-base font-extrabold text-stone-950 tabular-nums">
                          {formatCurrency(cartTotal, "INR")}{" "}
                          <span className="text-xs font-normal text-stone-500">
                            ({cartCount} {cartCount === 1 ? "dish" : "dishes"})
                          </span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleDemoOrder}
                        disabled={cartCount === 0}
                        className="rounded-xl bg-stone-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
                        Place {selectedTable} Order
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-center space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        Order ORD-104 Placed at {selectedTable}
                      </div>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        Kitchen Status:{" "}
                        <strong>
                          {orderStatus === "RECEIVED" && "Received by Kitchen"}
                          {orderStatus === "PREPARING" && "Chef is preparing your dishes"}
                          {orderStatus === "SERVED" && "Dishes served to table"}
                        </strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => setOrderPlaced(false)}
                        className="text-[11px] text-emerald-950 underline font-bold mt-1 cursor-pointer"
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
      <section className="border-y border-stone-200/80 bg-white py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-400 mb-5">
            Tested &amp; Trusted by restaurants, dhabas &amp; bistros across Western UP &amp; Delhi-NCR
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 text-center">
            {[
              { stat: "100%", label: "App-Free Browser Menu" },
              { stat: "₹0", label: "Hardware Investment" },
              { stat: "< 3s", label: "Fast Mobile Loading" },
              { stat: "14 Days", label: "Full Free Pilot Access" },
            ].map((item, idx) => (
              <Reveal key={item.label} delay={idx * 70}>
                <div className="rounded-2xl bg-[#FAF8F5] p-4 border border-stone-200/70">
                  <span className="text-xl sm:text-2xl font-black text-stone-950 tabular-nums">
                    {item.stat}
                  </span>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">{item.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — Story Section (Clean 1-col mobile, 2-col iPad portrait, 3-col desktop) */}
      <section id="how-it-works" className="py-12 sm:py-16 border-b border-stone-200/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center space-y-2.5">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-950 text-balance">
              Every Table Full. Zero Floor Chaos.
            </h2>
            <p className="text-sm sm:text-base text-stone-600">
              See how one QR scan turns a crowded Friday dinner rush into calm, faster service — from the moment guests sit down to the second they pay.
            </p>
          </div>

          <div className="relative mt-8 sm:mt-10 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                time: "7:32 PM · Table 4 Arrives",
                icon: QrCode,
                title: "They Scan Instead of Waiting",
                desc: "No waving for a waiter or sharing torn paper menus. Guests scan your Table 4 tent and browse dish photos on their phone in 2 seconds.",
                outcome: "Zero wait time to start ordering",
              },
              {
                time: "7:34 PM · Kitchen Chimes",
                icon: Utensils,
                title: "Order Hits the Chef Directly",
                desc: "They tap Paneer Tikka & Dal Makhani. Your kitchen screen chimes instantly with Table 4's exact order — zero misheard items or lost KOT slips.",
                outcome: "Faster prep, fewer mistakes",
              },
              {
                time: "8:05 PM · Bill Settled",
                icon: ShieldCheck,
                title: "10-Second UPI & Happy Repeat Guests",
                desc: "No waiting 15 minutes for the bill folder. Guests pay via your direct UPI (0% fee), get a clean WhatsApp bill, and free up the table faster.",
                outcome: "100% revenue stays with you",
              },
            ].map((item, idx) => (
              <Reveal key={item.title} delay={idx * 90}>
                <div className="relative flex h-full flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 transition-colors duration-200 hover:border-orange-200">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-[#E15A2B] tabular-nums">
                      <Clock className="h-3 w-3" />
                      {item.time}
                    </span>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-950 text-white">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-bold text-stone-900 leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-stone-600">{item.desc}</p>
                  </div>
                  <div className="mt-5 flex items-center gap-1.5 border-t border-stone-100 pt-3 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{item.outcome}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-2.5">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-950 text-balance">
              Engineered Specifically for Restaurant Floors
            </h2>
            <p className="text-sm sm:text-base text-stone-600">
              Designed for quick updates by restaurant managers — simple on desktop, effortless on smartphone screens.
            </p>
          </div>

          <div className="mt-8 sm:mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                desc: "Guests pay directly via your verified merchant UPI (0% fee) or choose 'Pay at Counter' when dining completes.",
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
            ].map((f, idx) => (
              <Reveal key={f.title} delay={idx * 70}>
                <div className="group h-full rounded-2xl border border-stone-200/90 bg-white p-6 transition-colors duration-200 hover:border-stone-300 space-y-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#E15A2B]">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-stone-600">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section — Spacious 1-col mobile, clean stacked/2-col tablet, 3-col desktop */}
      <section id="pricing" className="bg-white border-y border-stone-200/80 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-950 text-balance">
              Transparent Plans with Zero Commission
            </h2>
            <p className="text-sm sm:text-base text-stone-600">
              Start with our 14-day free trial. Upgrade only when you see your dining tables buzzing with QR orders.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {/* Free Trial */}
            <Reveal delay={0}>
              <div className="h-full rounded-2xl border border-stone-200 bg-[#FAF8F5] p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">14-Day Free Trial</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-stone-950 tabular-nums">₹0</span>
                    <span className="text-xs text-stone-500">/ 14 days</span>
                  </div>
                  <p className="mt-2 text-xs text-stone-600">
                    Full access to test on your real dining tables.
                  </p>
                  <div className="mt-6 space-y-3 text-xs sm:text-sm text-stone-700">
                    {[
                      "1 restaurant location",
                      "Up to 15 table QR codes",
                      "Instant menu updates",
                      "PNG & PDF print downloads",
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  asChild
                  className="w-full mt-7 h-11 rounded-xl bg-stone-950 hover:bg-stone-800 text-white font-bold"
                >
                  <Link href="/register">Start Free Trial</Link>
                </Button>
              </div>
            </Reveal>

            {/* Starter Plan */}
            <Reveal delay={90}>
              <div className="h-full rounded-2xl border-2 border-[#E15A2B] bg-white p-6 sm:p-7 flex flex-col justify-between relative">
                <span className="absolute -top-3 left-6 rounded-full bg-[#E15A2B] px-3 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                  Most Popular
                </span>
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Starter</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-stone-950 tabular-nums">₹499</span>
                    <span className="text-xs text-stone-500">/ month</span>
                  </div>
                  <p className="mt-2 text-xs text-stone-600">
                    Ideal for cafes, bistros, and neighborhood dining.
                  </p>
                  <div className="mt-6 space-y-3 text-xs sm:text-sm text-stone-700">
                    {[
                      "1 restaurant location",
                      "Up to 20 table QR codes",
                      "Live Table Ordering & KDS",
                      "Direct Merchant UPI (0% fee)",
                      "WhatsApp Order & Digital Bill",
                      "Printable A5 table tent PDFs",
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  asChild
                  className="w-full mt-7 h-11 rounded-xl bg-[#E15A2B] hover:bg-[#C94A1E] text-white font-bold"
                >
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            </Reveal>

            {/* Growth Plan */}
            <Reveal delay={180} className="md:col-span-2 lg:col-span-1">
              <div className="h-full rounded-2xl border border-stone-200 bg-[#FAF8F5] p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Growth</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-stone-950 tabular-nums">₹999</span>
                    <span className="text-xs text-stone-500">/ month</span>
                  </div>
                  <p className="mt-2 text-xs text-stone-600">
                    For multi-floor dining &amp; high-volume restaurants.
                  </p>
                  <div className="mt-6 space-y-3 text-xs sm:text-sm text-stone-700">
                    {[
                      "Up to 60 table QR codes",
                      "Bulk PDF print generator",
                      "All 3 professional templates",
                      "Real QR scan analytics & graphs",
                      "Priority WhatsApp support",
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="w-full mt-7 h-11 rounded-xl border-stone-300 bg-white font-bold"
                >
                  <Link href="/register">Choose Growth</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Final High-Contrast CTA Banner */}
      <section className="py-12 sm:py-14 bg-[#FAF8F5]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 px-5 py-10 text-center text-white sm:px-10 sm:py-14">
              {/* Crisp pixel/architectural grid — zero blur/glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff0b_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0b_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_75%_75%_at_50%_50%,#000_45%,transparent_100%)]"
              />
              <div className="relative mx-auto max-w-2xl space-y-4">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-balance">
                  Ready to Serve Every Table Faster?
                </h2>
                <p className="text-sm sm:text-base text-stone-400">
                  Create your restaurant&rsquo;s QR digital menu, print table tents, and start taking live kitchen orders in under 5 minutes.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
                  <Button
                    size="lg"
                    asChild
                    className="w-full sm:w-auto bg-[#E15A2B] hover:bg-[#C94A1E] text-white font-bold h-12 px-7 rounded-xl transition-colors"
                  >
                    <Link href="/register" className="flex items-center justify-center gap-2">
                      Start Your 14-Day Free Trial
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="w-full sm:w-auto border-stone-700 bg-stone-900 text-white hover:bg-stone-800 hover:text-white h-12 px-6 rounded-xl font-semibold"
                  >
                    <Link href="/menu/spice-garden-demo" target="_blank">
                      Explore Live Guest Menu
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
