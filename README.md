# MenuQR — Multi-Tenant QR Digital Menu SaaS (MVP)

A production-minded, multi-tenant QR Digital Menu SaaS built for small and medium-sized Indian restaurants (default currency `INR ₹`, 14-day free trial, Starter `₹199/mo`, Growth `₹399/mo`).

## Features

- **Multi-Tenant Architecture**: Single PostgreSQL database with strict tenant isolation (`restaurantId` scoping + server-side `RestaurantMembership` verification on every protected route, zero client-trusted `restaurantId`).
- **Role-Based Access Control (RBAC)**:
  - **Super Admin (`/admin`)**: Platform metrics, 30-day registration trends, restaurant inspection, activate/suspend/deactivate controls, manual pilot trial & subscription management, and configurable INR pricing plans.
  - **Restaurant Owner (`/dashboard`, `/onboarding`)**: Guided 5-step onboarding, restaurant profile & branding, categories CRUD + reordering, menu items CRUD + instant availability/sold-out toggle + image uploads, table management, permanent QR generation (general + per-table), PNG & printable A5 PDF downloads (single & bulk), 3 live-preview menu templates (`Modern`, `Classic`, `Minimal`), real scan analytics, and account/password settings.
  - **Customer (`/menu/[slug]` & `/menu/[slug]/t/[token]`)**: Zero-login mobile-first digital menu with subtle `"Table X"` identification, Indian Veg/Non-Veg/Egg indicators, live search, category pills, sold-out labels, and instant reflection of menu updates without regenerating QR codes.
- **Real Analytics**: Backed strictly by `QRScanEvent` rows in PostgreSQL (no fake/hardcoded numbers).

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI / shadcn-style components, Lucide Icons, Recharts, Sonner
- **Backend**: Next.js Route Handlers, Auth.js v5 (`next-auth`), `bcryptjs`, `zod` validation, sliding-window rate limiter
- **Database**: PostgreSQL 16 + Prisma ORM 6
- **QR & PDF**: `qrcode` (high-ECC PNGs) + `pdf-lib` (serverless-compatible printable A5 table tent PDFs)
- **Image Storage**: Cloudinary, Supabase Storage, or local `/public/uploads` dev fallback

## Local Setup

### 1. Prerequisites
- Node.js 20+ (tested on Node 24)
- `pnpm` 10+
- PostgreSQL 15+

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your PostgreSQL connection string and secrets:
```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql://postgres:postgres@localhost:5432/menuqr_mvp?schema=public`)
- `AUTH_SECRET`: Random 32+ character string (`openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL` / `AUTH_URL`: Base URL (e.g. `http://localhost:3000`)

Optional Production Storage (required on Vercel for persistent uploads):
- **Cloudinary**: Set `STORAGE_PROVIDER="cloudinary"` plus `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- **Supabase Storage**: Set `STORAGE_PROVIDER="supabase"` plus `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.

### 4. Database Setup & Migrations
```bash
# Generate Prisma client
pnpm db:generate

# Push schema (or run Prisma migrations for production)
pnpm db:push
# Or create/apply named migrations:
# pnpm db:migrate

# Seed subscription plans, Super Admin, and clearly-labeled Demo Restaurant
pnpm db:seed
```

Seeded accounts (for local/demo testing — change passwords before production):
- **Super Admin**: `admin@menuqr.in` / `Admin@12345` (configurable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)
- **Demo Restaurant Owner**: `demo@spicegarden.in` / `Demo@12345`
- **Demo Public Menu**: `http://localhost:3000/menu/spice-garden-demo`

### 5. Run Locally
```bash
pnpm dev
```

### 6. Run End-to-End Acceptance Tests
With PostgreSQL running and the Next.js server listening on `http://127.0.0.1:3000`:
```bash
pnpm test:e2e
```

## Deployment on Vercel

1. Provision a managed PostgreSQL database (Neon, Supabase, or Railway).
2. Configure Cloudinary or Supabase Storage for uploaded food/logo images (Vercel's local filesystem is ephemeral).
3. Push this repository to GitHub and import into Vercel.
4. Set environment variables in Vercel Project Settings:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL=https://your-domain.com`
   - `NEXT_PUBLIC_APP_URL=https://your-domain.com`
   - `AUTH_TRUST_HOST=true`
   - `STORAGE_PROVIDER=cloudinary` (or `supabase`) + provider credentials
5. Run schema migration and seed against the production database:
   ```bash
   pnpm db:migrate:deploy
   pnpm db:seed
   ```
6. Deploy! `vercel.json` is pre-configured with `pnpm build` (which runs `prisma generate && next build`).

## API Documentation
See [docs/API.md](docs/API.md) for the complete endpoint reference.

## Out of Scope for Version 1 (By Design)
Online ordering, shopping cart, payment gateways (Razorpay/Stripe), delivery, KDS, inventory, POS integration, and WhatsApp ordering are intentionally omitted in MVP v1. The normalized multi-tenant schema is designed so these modules can be added cleanly in Version 2.

## Known Limitations & Pilot Readiness Notes
- **In-memory rate limiting**: `src/lib/rate-limit.ts` uses in-memory buckets suitable for single-instance / early pilot traffic. For high-scale multi-region Vercel deployments, swap to Upstash Redis rate limiting.
- **Local image storage**: Defaults to `/public/uploads` for frictionless local setup. Configure Cloudinary or Supabase Storage before deploying to Vercel.
- **Manual pilot subscriptions**: Payment gateway integration is intentionally omitted; Super Admin manages pilot upgrades and trial dates manually in `/admin/restaurants`.
- **Single-click password reset email**: Password changes are supported for logged-in owners (`/dashboard/settings`); email-based "Forgot Password" flow requires an SMTP/Resend provider in v1.1.
