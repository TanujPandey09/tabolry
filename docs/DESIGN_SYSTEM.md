# MenuQR — Design System

Visual standards, tokens, reusable UI components, and public menu templates used across MenuQR. Designed for clean, minimal SaaS clarity on desktop dashboards and high-appetite readability on mobile guest menus.

---

## 1. Color Palette

### SaaS Dashboard & Marketing Tokens
| Role | Token / Hex | Tailwind Class | Usage |
| --- | --- | --- | --- |
| Brand Primary | `#2563EB` | `bg-blue-600`, `text-blue-600` | Primary buttons, active nav, chart strokes, focus rings |
| Brand Hover | `#1D4ED8` | `hover:bg-blue-700` | Primary button hover state |
| Brand Soft Tint | `#EFF6FF` | `bg-blue-50`, `text-blue-700` | Active sidebar tab, subtle badges, promo banners |
| App Canvas | `#F8FAFC` | `bg-slate-50` | Page background behind white cards |
| Surface / Card | `#FFFFFF` | `bg-white` | Cards, modals, tables, inputs, sidebar |
| Primary Text | `#0F172A` | `text-slate-900` | Headings, prices, dish titles, KPI numbers |
| Secondary Text | `#475569` | `text-slate-600` | Descriptions, table cells, navigation labels |
| Muted Text | `#64748B` | `text-slate-500` | Subtitles, metadata, timestamps |
| Hairline Border | `#E2E8F0` | `border-slate-200` | Card borders, input borders, dividers |

### Semantic Status Colors
| State | Background | Text | Border | Usage |
| --- | --- | --- | --- | --- |
| Success / Live | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` | Published Live, Active, Available, Pure Veg |
| Warning / Draft | `bg-amber-50` | `text-amber-800` | `border-amber-200` | Draft Mode, Trial Expiring, Onboarding Incomplete |
| Danger / Sold Out | `bg-red-50` | `text-red-700` | `border-red-200` | Suspended, Sold Out, Delete actions, Validation errors |

### Indian FSSAI Dietary Indicators (`DietaryIndicator` in `src/components/ui/states.tsx`)
- **Veg (`VEG`)**: Green bordered square (`border-emerald-600`) with solid green dot (`bg-emerald-600`).
- **Non-Veg (`NON_VEG`)**: Red bordered square (`border-red-600`) with solid red dot (`bg-red-600`).
- **Egg (`EGG`)**: Amber bordered square (`border-amber-600`) with solid amber dot (`bg-amber-600`).

---

## 2. Typography & Spacing

- **Font Stack**: Clean modern sans-serif (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) defined in [src/app/globals.css](file:///d:/Personal%20projects/project/qrcode_mvp/src/app/globals.css) — zero external font network delay on Indian mobile networks.
- **Classic Menu Template Serif**: Tailwind `font-serif` (`Georgia, Cambria, serif`) for warm fine-dining headers.
- **Type Scale**:
  - Dashboard Page Title: `text-2xl font-bold tracking-tight text-slate-900`
  - Public Menu Restaurant Title: `text-xl sm:text-2xl font-bold leading-tight`
  - Section / Category Heading: `text-lg sm:text-xl font-bold`
  - Dish Title: `text-base font-bold`
  - Body / Descriptions: `text-sm text-slate-600 leading-relaxed`
  - Metadata / Pills: `text-xs font-medium`
- **Radii & Elevation**:
  - Cards: `rounded-xl` (dashboard) / `rounded-2xl` (public menu cards) + `shadow-xs` / `shadow-2xs`
  - Inputs & Buttons: `rounded-lg` (dashboard) / `rounded-xl` (public menu search)
  - Pills & Badges: `rounded-full`

---

## 3. Public Digital Menu Templates (`src/components/menu/public-menu-view.tsx`)

Restaurant owners pick one of **3 templates** + any custom hex **Brand Primary Color** (default `#2563EB`) in `/dashboard/appearance` with an interactive mobile preview:

| Template Key | Visual Personality | Canvas | Card Style | Headings |
| --- | --- | --- | --- | --- |
| `MODERN` | Zomato / Swiggy Dineout editorial menu | `bg-slate-50` | Elevated `rounded-2xl` white cards with subtle hover lift & rounded dish photos | Clean bold sans |
| `CLASSIC` | Fine dining & family bistro | Warm ivory `bg-[#FAF7F2]` | `rounded-xl` white cards with warm `border-stone-200` and double-weight category dividers | Refined `font-serif` |
| `MINIMAL` | Modern specialty café / bakery | Pure `bg-white` | Borderless clean horizontal rows separated by `divide-slate-100` | Crisp minimal sans |

### Public Menu Interactive Components
1. **Hero Cover & Overlapping Identity Card**: Full-bleed cover image (or brand-color gradient pattern fallback), logo, Pure Veg badge, Table badge (`Table 3`), Call / Directions / Share / Info actions.
2. **Sticky Discovery Toolbar**: Search input, Sort dropdown (Menu Order / Price Low→High / High→Low), Veg/Non-Veg/Egg chips, In Stock Only toggle, scrollable Category tabs with counts.
3. **Interactive Dish Cards & Dish Detail Modal**: Clicking any dish opens a full modal with large photo, full description, availability status, INR price, and Save button.
4. **Floating Mobile Dock**: Bottom-right **"Menu"** button (Category Jump Directory) + Bottom-left **"Shortlist"** pill (personal non-ordering waiter reference list with subtotal).

---

## 4. Reusable Component Library (`src/components/`)

| Component | File Path | Purpose |
| --- | --- | --- |
| `Button` | [button.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/button.tsx) | Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`; sizes `sm`, `default`, `lg`, `icon` |
| `Card` | [card.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/card.tsx) | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `Badge` | [badge.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/badge.tsx) | `default`, `secondary`, `success`, `warning`, `destructive`, `outline` |
| `Dialog` | [dialog.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/dialog.tsx) | Radix accessible modal/sheet used for CRUD forms, QR previews, and Dish Details |
| `Table` | [table.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/table.tsx) | Responsive horizontally scrollable SaaS data tables |
| `Input` / `Textarea` / `Label` | [input.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/input.tsx), [textarea.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/textarea.tsx), [label.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/label.tsx) | Accessible form controls with consistent blue focus rings |
| `Switch` / `Select` / `Tabs` | [switch.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/switch.tsx), [select.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/select.tsx), [tabs.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/tabs.tsx) | Radix interactive toggles and tab bars |
| `States` | [states.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/states.tsx) | `LoadingState`, `ErrorState`, `EmptyState`, `DietaryIndicator` |
| `ImageUpload` | [image-upload.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/image-upload.tsx) | Click-to-upload image widget with instant preview & `/api/upload` integration |
| `DashboardShell` | [dashboard-shell.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/layout/dashboard-shell.tsx) | Shared responsive desktop sidebar + mobile drawer used by Owner & Super Admin dashboards |

---

## 5. Quick Edit Guide — Update & See What Happens

- **Change brand default accent color across the app**: Edit `bg-blue-600` in [button.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/ui/button.tsx) and default `#2563EB` in [schema.prisma](file:///d:/Personal%20projects/project/qrcode_mvp/prisma/schema.prisma).
- **Customize the customer-facing QR menu layout or card style**: Edit [public-menu-view.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/components/menu/public-menu-view.tsx) — your changes automatically appear in **both** the live `/menu/[slug]` pages and the `/dashboard/appearance` live phone preview!
- **Customize printable QR PDF table card layout**: Edit `generatePrintableQrPdf()` in [src/lib/qr.ts](file:///d:/Personal%20projects/project/qrcode_mvp/src/lib/qr.ts).
- **Change global background / fonts**: Edit [src/app/globals.css](file:///d:/Personal%20projects/project/qrcode_mvp/src/app/globals.css).
