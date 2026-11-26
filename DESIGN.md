# Tablory Design System (`DESIGN.md`)

> Hospitality OS & QR Dining Platform — [tablory.online](https://www.tablory.online)

## 1. Visual Identity & Surfaces
- **Mode:** Warm editorial hospitality (`#FAF8F5` Warm Alabaster canvas) paired with crisp high-contrast surfaces (`#FFFFFF` cards, `#18181B` Obsidian controls).
- **Color Tokens (`src/app/globals.css`):**
  - `--background`: `#FAF8F5` (Warm Alabaster)
  - `--foreground`: `#18181B` (Obsidian Ink)
  - `--surface`: `#FFFFFF` (Pure Card Surface)
  - `--brand`: `#E15A2B` (Terracotta Flame)
  - `--brand-hover`: `#C94A1E`
  - `--brand-accent`: `#D97706` (Saffron Amber)

## 2. Typography
- **UI & Headings:** `Plus Jakarta Sans` (`--font-sans`), tight tracking (`-0.012em` body, `-0.03em` display).
- **Editorial Accent:** `Playfair Display` (`--font-serif`) for warm hospitality emphasis and Classic Bistro menu template.
- **Numerals:** Always apply `tabular-nums` on prices, order totals, timers, and analytics counters.

## 3. Iconography (`src/components/ui/icons.tsx`)
Powered by **Solar Icons V2 (`@solar-icons/react`)** in three intentional weights (never `lucide-react`):
1. **BoldDuotone** — Primary brand modules, hero focal accents, KPI cards (`QrCode`, `Store`, `ShoppingBag`, `BarChart3`, `CreditCard`, `Sparkles`).
2. **Broken** — Secondary cards, section headers, status indicators (`Bell`, `Receipt`, `Printer`, `Table2`, `Utensils`, `Clock`).
3. **Linear** — Crisp small inline UI controls, chevrons, inputs, toggles (`Plus`, `Minus`, `X`, `Check`, `ChevronRight`, `ArrowRight`, `Eye`, `EyeOff`).

## 4. Motion & Scrolling
- **Smooth Scroll:** Global `Lenis` (`lerp: 0.1`, `wheelMultiplier: 0.95`) via `<SmoothScroll />`, auto-disabled inside `[role="dialog"]` / `[data-lenis-prevent]` and under `prefers-reduced-motion: reduce`.
- **Scroll Reveals:** GPU-only `translate3d` + `opacity` transitions (`cubic-bezier(0.22, 1, 0.36, 1)`) via `<Reveal />`.

## 5. Craft Rules (`impeccable`)
- No repetitive eyebrow/kicker badges above section headings — let headings speak directly.
- No generic gradient text on headlines; use weight, scale, or `font-serif italic` terracotta emphasis.
- Declare elevation once (crisp `1px` border OR soft shadow, not stacked ghost shadows). Card radii stay `12px–16px` (`rounded-2xl`).
- Zero heavy `blur-3xl` neon glow blobs on dark CTA cards; use crisp `1px` architectural grid lines.
