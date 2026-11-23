# Technical Requirements Document (TRD)
## MenuQR — Multi-Tenant QR Digital Menu SaaS

**Version:** 1.0  
**Architecture Style:** Modular Full-Stack Monolith (Next.js App Router + PostgreSQL + Prisma ORM)  
**Deployment Target:** Vercel (Serverless Functions + Edge Middleware) + Managed PostgreSQL (Neon / Supabase / Railway)

---

## 1. System Architecture

```
[Customer Phone] ──scan──▶ /menu/[slug] or /menu/[slug]/t/[token] (SSR + Scan Logger)
                                           │
[Owner Browser]  ──auth──▶ Edge Middleware (JWT Check) ──▶ /dashboard/* & /api/*
                                           │
[Super Admin]    ──rbac──▶ Edge Middleware (SUPER_ADMIN) ─▶ /admin/* & /api/admin/*
                                           │
                                           ▼
                   ┌──────────────────────────────────────────────┐
                   │   Next.js 15 App Router + Route Handlers     │
                   │  • Auth.js v5 (JWT + Live DB Verification)   │
                   │  • Tenant Context Resolver (src/lib/tenant)  │
                   │  • Zod Validators (src/lib/validators)       │
                   │  • QR/PDF Engine (qrcode + pdf-lib)          │
                   │  • Storage Adapter (Cloudinary/Supabase/Dev) │
                   └───────────────────────┬──────────────────────┘
                                           │
                                           ▼
                   ┌──────────────────────────────────────────────┐
                   │      PostgreSQL 16 (Prisma ORM 6)            │
                   │   Shared DB · Strict restaurantId Scoping    │
                   └──────────────────────────────────────────────┘
```

## 2. Technology Stack

| Layer | Technology | Rationale |
| --- | --- | --- |
| Framework | Next.js 15.3 (App Router), React 19, TypeScript 5.8 | Unified SSR for fast public menus + serverless API routes |
| Styling & UI | Tailwind CSS v4, Radix UI primitives, Lucide Icons, Sonner | Accessible, lightweight, zero bloat |
| ORM & Database | Prisma 6.x + PostgreSQL 16 | Strong relational integrity, migrations, typed queries |
| Auth | Auth.js v5 (`next-auth`), `bcryptjs` (12 rounds) | Secure Credentials flow, HTTP-only JWT cookies, Edge-safe middleware |
| Validation | Zod 3.x | End-to-end runtime schema validation on every API route |
| QR & PDF | `qrcode` + `pdf-lib` | High-ECC PNGs and pure-JS A5 printable PDFs (no native binary issues on Vercel) |
| Analytics Charts | Recharts | Declarative responsive Area/Bar charts for real DB metrics |
| Image Storage | Cloudinary / Supabase Storage / Local dev fallback | Serverless-safe production image hosting with strict validation |

## 3. Multi-Tenant Data Model (`prisma/schema.prisma`)

Every tenant-owned entity enforces `restaurantId` foreign key with `onDelete: Cascade`:

1. **`User`**: `id`, `name`, `email` (unique), `passwordHash`, `role` (`SUPER_ADMIN | RESTAURANT_OWNER`), `isActive`.
2. **`Restaurant`**: `id`, `name`, `slug` (unique), `logoUrl`, `coverImageUrl`, `description`, `phone`, `address`, `city`, `state`, `country`, `currency` (`INR`), `primaryColor`, `template` (`MODERN | CLASSIC | MINIMAL`), `status` (`ACTIVE | SUSPENDED | INACTIVE`), `isPublished`, `onboardingCompleted`, `onboardingStep`.
3. **`RestaurantMembership`**: Unique `(userId, restaurantId)`, `role` (`OWNER | MANAGER | STAFF`). Source of truth for tenant authorization.
4. **`Category`**: `restaurantId`, `name` (unique per restaurant), `description`, `displayOrder`, `isActive`.
5. **`MenuItem`**: `restaurantId`, `categoryId` (nullable, `onDelete: SetNull` to prevent unintended item loss when deleting a category), `name`, `description`, `imageUrl`, `price` (`Decimal(10,2)`), `dietaryType` (`VEG | NON_VEG | EGG`), `isAvailable`, `displayOrder`.
6. **`RestaurantTable`**: `restaurantId`, `tableNumber` (unique per restaurant), `label`, `capacity`, `isActive`.
7. **`QRCode`**: `restaurantId`, `tableId` (nullable for `GENERAL` menu QR), `type` (`GENERAL | TABLE`), `token` (unique 128-bit base64url cryptographic token), `isActive`, `regeneratedAt`. Regenerating sets prior tokens `isActive = false` so old links fail immediately while keeping historical `QRScanEvent` rows intact.
8. **`QRScanEvent`**: `restaurantId`, `qrCodeId`, `tableId`, `scannedAt`, `userAgent`, `deviceType` (`MOBILE | TABLET | DESKTOP | UNKNOWN`), `ipHash` (salted SHA-256 — no raw IP PII stored).
9. **`SubscriptionPlan`**: `code` (`FREE_TRIAL | STARTER | GROWTH`), `monthlyPrice`, `yearlyPrice`, `currency`, `trialDays`, `maxRestaurants`, `maxTables`, `maxMenuItems`, `features` (JSON), `isActive`.
10. **`Subscription`**: `restaurantId` (unique), `planId`, `billingCycle`, `status` (`TRIALING | ACTIVE | EXPIRED | SUSPENDED | CANCELLED`), `trialEndsAt`, `currentPeriodStart`, `currentPeriodEnd`, `notes`.

## 4. Security Architecture

### 4.1 Authentication & RBAC
- Passwords hashed with `bcryptjs` (cost 12).
- `src/lib/auth.config.ts` powers Edge Middleware (`87.5 kB`) for fast route gating of `/dashboard/*`, `/onboarding/*`, and `/admin/*`.
- `src/lib/tenant.ts` performs live PostgreSQL lookups (`requireAuth`, `requireSuperAdmin`, `requireRestaurantContext`) on every API call so deactivated users or revoked roles take effect immediately.

### 4.2 Tenant Isolation & IDOR Prevention
- Client-supplied `restaurantId` is ignored on all tenant CRUD routes.
- Active restaurant selection via HTTP-only cookie (`menuqr_active_restaurant`) is verified against `RestaurantMembership` before use; unauthorized switching returns `403`.
- Single-record operations (`GET/PATCH/DELETE` on categories, menu items, tables, QR codes) always query with `where: { id, restaurantId: ctx.restaurant.id }`, returning `404` on cross-tenant IDs.
- Cross-tenant foreign key injection (e.g., attaching another restaurant's `categoryId` to a `MenuItem`) is explicitly blocked with `400`.

### 4.3 Public Menu & Upload Hardening
- Public SSR pages and `/api/public/menu/[slug]` check `restaurant.status === "ACTIVE" && restaurant.isPublished === true`; unpublished/suspended tenants return `404`.
- `/api/upload` requires authentication, enforces 5 MB size cap, MIME allowlist (`image/jpeg`, `image/png`, `image/webp`), and binary magic-byte header verification.
- Sliding-window rate limiting protects `/api/auth/register`, `/api/account/password`, `/api/upload`, and public scan event creation.

## 5. QR Code & PDF Generation Pipeline (`src/lib/qr.ts`)
- QR codes encode **only** stable public URLs (`/menu/{slug}` or `/menu/{slug}/t/{token}`) — never menu payloads.
- PNG downloads render 800×800px high-error-correction (`H`) QR images.
- Single & bulk PDF downloads render A5 portrait table-tent cards (`420 × 595 pt`) containing the restaurant name, table badge, brand accent header, embedded high-res QR PNG, and scan instructions.

## 6. Verification Strategy
- Automated E2E verification script (`scripts/verify-acceptance.ts`) validates all 12 acceptance criteria end-to-end against a real PostgreSQL instance and production Next.js server (`pnpm test:e2e`).
- Static verification: `pnpm typecheck` (`tsc --noEmit`) and `pnpm build` (`prisma generate && next build`).
