# MenuQR — Implementation & Launch Checklist

A transparent breakdown of **what is completed & verified right now** versus **what remains for production pilot launch and future versions**.

---

## ✅ COMPLETED NOW (MVP v1 — Built & Tested)

### Phase 1: Project Foundation & Authentication
- [x] Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI / shadcn-style component system
- [x] Normalized multi-tenant PostgreSQL schema (`prisma/schema.prisma`) with indexes & constraints
- [x] Seed script (`prisma/seed.ts`) with INR plans, Super Admin, and richly seeded Demo Restaurant
- [x] Auth.js v5 email/password login + registration API (`/api/auth/register`) + `bcryptjs` hashing
- [x] Edge-safe middleware (`src/middleware.ts`) + live DB session/role verification (`src/lib/tenant.ts`)
- [x] Rate limiting on auth, password changes, uploads, and public QR scan logging

### Phase 2: Multi-Tenant Core & Onboarding
- [x] Strict tenant isolation (`RestaurantMembership`-derived context, zero client-trusted `restaurantId`)
- [x] Cross-tenant IDOR protection verified across all CRUD & download APIs
- [x] 5-step guided onboarding wizard (`/onboarding`: Profile → Categories → Items → Tables & QR → Publish)
- [x] Restaurant Profile management (`/dashboard/profile`) & Account/Password settings (`/dashboard/settings`)
- [x] Automatic 14-day Free Trial provisioning + automatic expiry calculation

### Phase 3: Menu Management
- [x] Menu Categories CRUD, 1-click default Indian restaurant categories, up/down reordering
- [x] Menu Items CRUD with INR (`₹`) pricing, FSSAI Veg/Non-Veg/Egg indicators, instant Sold-Out toggle, search & filters, reordering
- [x] Protected `/api/upload` endpoint supporting Cloudinary, Supabase Storage, and local dev fallback with MIME + magic-byte checks

### Phase 4: Permanent QR Code System
- [x] Restaurant Table CRUD (number, label, capacity) with unique cryptographic tokens
- [x] General restaurant menu QR (`/menu/[slug]`) + Table-specific QR (`/menu/[slug]/t/[token]`)
- [x] QR preview modal displaying restaurant name & table identifier
- [x] High-resolution PNG download, single printable A5 PDF download, and bulk all-tables PDF export
- [x] QR token regeneration with immediate old-token invalidation while preserving scan history

### Phase 5: Customer-Facing Digital Menu & Appearance
- [x] Professional, interactive mobile-first public menu UI (`src/components/menu/public-menu-view.tsx`)
- [x] 3 distinct templates (`MODERN`, `CLASSIC`, `MINIMAL`) + custom brand accent color + live mobile preview (`/dashboard/appearance`)
- [x] Rich hero cover banner, logo, restaurant quick actions (Call, Maps Directions, Share, Info)
- [x] Interactive selectable dish cards opening full Dish Detail modal/sheet
- [x] Live search, dietary filter pills (All / Veg / Non-Veg / Egg), "Hide Sold Out" toggle, price sorting
- [x] Floating "Menu" category jump directory + optional personal "Table Shortlist" (non-ordering waiter reference)
- [x] Strict `404` Menu Unavailable protection for unpublished and suspended restaurants

### Phase 6: Real Analytics & Super Admin
- [x] Real `QRScanEvent` database tracking on public menu & table QR visits (zero fake/hardcoded stats)
- [x] Owner Analytics dashboard (`/dashboard/analytics`) with Recharts daily trends, top QRs, and table-wise breakdown
- [x] Protected Super Admin dashboard (`/admin`) with platform KPIs, 30-day registration trends chart, restaurant activation/suspension, manual pilot subscription/trial management, and pricing plan configuration

### Phase 7: Automated Testing & Documentation
- [x] TypeScript `tsc --noEmit` clean (0 errors)
- [x] Production `next build` clean (0 errors, 0 warnings)
- [x] All 12/12 Acceptance Criteria passing in `scripts/verify-acceptance.ts` against real PostgreSQL 16
- [x] Complete `README.md`, `docs/API.md`, `docs/PRD.md`, `docs/TRD.md`, `.env.example`, and `vercel.json`

---

## 🔜 WHAT NEEDS TO BE DONE BEFORE PILOT LAUNCH (Operational / Pre-Production)

- [ ] **Provision Production PostgreSQL**: Create a managed Postgres database (Neon / Supabase / Railway) and run `pnpm db:migrate:deploy` + `pnpm db:seed`.
- [ ] **Configure Cloud Image Storage**: Create a free Cloudinary or Supabase Storage bucket and set `STORAGE_PROVIDER="cloudinary"` (or `"supabase"`) + keys in Vercel Environment Variables (required because Vercel's local filesystem is ephemeral).
- [ ] **Generate Production Secrets & Change Seed Passwords**: Set a fresh 32+ char `AUTH_SECRET`, strong `SEED_ADMIN_PASSWORD`, and update `NEXT_PUBLIC_APP_URL` / `AUTH_URL` to your custom domain (e.g., `https://menuqr.in`).
- [ ] **Deploy to Vercel & Smoke-Test on Real Phones**: Scan a printed table QR code on both Android Chrome and iOS Safari to verify camera redirect speed, image rendering, and real analytics incrementing.
- [ ] **Print First Pilot Table Tents**: Use the Bulk Printable PDF export to print laminated A5 table cards for the first 5 Meerut pilot restaurants.

---

## 🚀 RECOMMENDED POST-PILOT ROADMAP (v1.1 & v2)

### v1.1 — Hardening & Pilot Feedback Polish
- [ ] **Forgot Password & Email Verification**: Integrate Resend / Postmark SMTP for self-serve password reset emails.
- [ ] **Distributed Rate Limiting**: Replace in-memory rate limiter with Upstash Redis for multi-region Vercel scaling.
- [ ] **Restaurant Opening Hours & FSSAI License Display**: Add configurable open/closed hours, pure-veg restaurant badge, and FSSAI number in footer.
- [ ] **Multi-Restaurant Switcher UI**: Expose the already-built `/api/restaurants/current` switcher API in the Owner sidebar for multi-branch owners.
- [ ] **Item Tags & Spice Level**: Add optional badges (`Bestseller`, `Chef's Special`, `Spicy`, `Jain Available`) and half/full portion price variants.
- [ ] **Bulk Menu Import (CSV/Excel)**: Let onboarding coordinators upload an existing restaurant menu spreadsheet in seconds.

### v2 — Commercial Scale (Post Willingness-to-Pay Validation)
- [ ] **Razorpay Subscription Billing**: Automated UPI AutoPay / card recurring billing for Starter & Growth plans with webhook sync.
- [ ] **Hindi + English Bilingual Menu Support**: Let customers toggle menu language cleanly.
- [ ] **Optional Table Ordering / Waiter Call**: Opt-in upgrade tier for restaurants that want direct table ordering or WhatsApp order handoff.
