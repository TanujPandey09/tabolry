# MenuQR MVP — Production Readiness Audit Report

**Audit Date:** 2026-11-20  
**Scope:** Full-stack security, multi-tenancy, database migration readiness, serverless compatibility, analytics integrity, and mobile performance audit of `qrcode_mvp`.  
**Overall Verdict:** **CONDITIONAL GO (DO NOT DEPLOY TO PRODUCTION UNTIL CRITICAL & HIGH ITEMS ARE RESOLVED)**  

Core multi-tenant isolation, RBAC, QR generation, and real scan tracking are **strong and verified (20/20 automated tests passing)**. However, **2 Critical** and **4 High** production-readiness gaps must be remediated before deploying to Vercel and onboarding live Meerut pilot restaurants.

---

## 1. Automated Test Execution Summary (Actually Executed)

Executed against an isolated PostgreSQL 16 database and a fresh Next.js 15.3.2 production build (zero modification to user's `.env` or running dev server):

| Suite | Command / Script | Result | Coverage |
| --- | --- | --- | --- |
| TypeScript Check | `pnpm typecheck` | **PASS** (0 errors) | Full codebase |
| Production Build + ESLint | `next build` | **PASS** (34/34 routes, 0 warnings, 87.5 kB Edge middleware) | Full codebase |
| Acceptance Suite | `scripts/verify-acceptance.ts` | **PASS (12/12)** | Onboarding, CRUD, 5 table QRs, Table 3 ID, live price update, token regeneration invalidation, cross-tenant IDOR, RBAC, suspended/unpublished 404, mobile menu, PNG/PDF/bulk PDF, real analytics |
| **New Security Audit Suite** | `scripts/verify-security.ts` (`pnpm test:security`) | **PASS (8/8)** | `SEC-1` 19 protected APIs return 401 + UI redirects; `SEC-2` invalid login, password check, deactivated user immediately blocked; `SEC-3` deep IDOR matrix + client-supplied `restaurantId` ignored; `SEC-4` Super Admin RBAC on middleware + mutations; `SEC-5` upload blocks magic-byte spoofing, SVG/XSS, >5 MB; `SEC-6` cross-tenant QR token replay returns 404; `SEC-7` trial expiry auto-transitions `TRIALING → EXPIRED`; `SEC-8` register rate limit returns 429 |

---

## 2. Risk Classification & Detailed Findings

### CRITICAL RISKS (Deployment Blockers)

| ID | Risk | File(s) | Audit Finding & Production Impact |
| --- | --- | --- | --- |
| **C-1** | **Dev-Only Local Storage Fallback Active in Production** | `src/lib/storage.ts` (L67, L142–L151) | `uploadRestaurantImage()` defaults `STORAGE_PROVIDER` to `"local"` and falls through to `writeFile(public/uploads/...)` even when `NODE_ENV === "production"` or `VERCEL === "1"`. On Vercel Serverless, `/public/uploads` is ephemeral/read-only, causing runtime upload crashes (`EROFS`) or silently losing all uploaded food/logo images on cold starts. **Fix:** Fail fast with `500` in production if `STORAGE_PROVIDER` is not `"cloudinary"` or `"supabase"` with valid credentials. |
| **C-2** | **No Prisma Migrations Directory (`prisma/migrations/` Missing)** | `prisma/schema.prisma`, `prisma/migrations/` (missing) | Schema has only been synced via `prisma db push`. There is no versioned migration history in `prisma/migrations/`. Running `pnpm db:migrate:deploy` in CI/Vercel will find zero migrations and leave production tables uncreated, while using `db push` in production risks destructive schema drift. **Fix:** Generate an initial baseline migration (`prisma migrate dev --name init`) against a local dev DB and commit `prisma/migrations/`. |

---

### HIGH RISKS (Fix Before Pilot Onboarding)

| ID | Risk | File(s) | Audit Finding & Production Impact |
| --- | --- | --- | --- |
| **H-1** | **Seed Script Hardcodes Weak Passwords, Logs Credentials & Seeds Demo Data in Production** | `prisma/seed.ts` (L134–L160, L401–L404) | (1) Falls back to `"Admin@12345"` if `SEED_ADMIN_PASSWORD` is unset. (2) Always creates demo account `demo@spicegarden.in` with hardcoded `"Demo@12345"` even in production. (3) Prints plaintext credentials to stdout/CI logs. **Fix:** Require `SEED_ADMIN_PASSWORD` explicitly in production (throw if missing), never print passwords to stdout, and gate demo restaurant creation behind `SEED_DEMO_DATA === "true"`. |
| **H-2** | **No Rate Limiting on Login (`Credentials.authorize`)** | `src/lib/auth.ts` (L33–L59), `src/app/api/auth/[...nextauth]/route.ts` | Registration and password change are rate-limited, but email/password login has zero brute-force throttling. **Fix:** Add per-email (and/or per-IP) rate limiting inside `authorize()` / auth route handler (e.g., max 10 failed attempts per 15 min). |
| **H-3** | **In-Memory Rate Limiter Resets Across Vercel Serverless Instances** | `src/lib/rate-limit.ts` (L6) | Uses a process-local `Map<string, Bucket>`. On Vercel Serverless, horizontal scaling and cold starts isolate memory per lambda, weakening rate limits under distributed load. **Fix:** Upgrade to Upstash Redis (`@upstash/ratelimit`) or a lightweight Postgres rate-limit table before scaling past initial pilot. |
| **H-4** | **No Startup Environment Variable Validation & Hardcoded IP Hash Fallback Salt** | `src/lib/utils.ts` (L70), `src/lib/auth.config.ts` | No centralized env check ensures `DATABASE_URL`, `AUTH_SECRET` (≥32 chars), `AUTH_URL`/`NEXT_PUBLIC_APP_URL`, and storage credentials are set in production. `hashIp()` silently falls back to hardcoded `"menuqr-ip-salt"` if `AUTH_SECRET` is absent. **Fix:** Add `src/lib/env.ts` to validate required env vars in production and refuse hardcoded fallback salts. |

---

### MEDIUM RISKS (Fix Before Broad Rollout)

| ID | Risk | File(s) | Audit Finding & Production Impact |
| --- | --- | --- | --- |
| **M-1** | **Analytics Inflation from Bots, Crawlers & Rapid Reloads** | `src/app/menu/[slug]/page.tsx` (L48–L69), `src/app/menu/[slug]/t/[token]/page.tsx` (L61–L80), `src/app/api/public/menu/[slug]/route.ts` (L84–L100) | Every `GET` inserts a `QRScanEvent` up to 60/min per IP with no bot User-Agent filter (WhatsApp/Instagram preview bots, Googlebot, uptime monitors) and no short-window deduplication (e.g., 60s–5m per `qrCodeId + ipHash`). Also `?track=1` on the public JSON GET route enables write amplification. **Fix:** Skip known bot/preview User-Agents, deduplicate identical `(qrCodeId, ipHash)` scans within a 2–5 minute window, and remove GET `?track=1` or restrict it. |
| **M-2** | **Incomplete Plan Limit Enforcement & Soft-Only Trial Expiry** | `src/app/api/menu-items/route.ts` (L59–L106), `src/app/api/restaurants/route.ts` (L77–L169), `src/lib/tenant.ts` (L106–L118) | `POST /api/tables` checks `plan.maxTables`, but `POST /api/menu-items` does not check `plan.maxMenuItems` and `POST /api/restaurants` does not check `plan.maxRestaurants`. Expired trials auto-flip to `EXPIRED` in DB, but owners can still edit/publish menus indefinitely unless Super Admin manually suspends them (confirm whether soft grace period is desired for pilot). |
| **M-3** | **Inconsistent Image URL Validation & Missing HTTP Security Headers** | `src/lib/validators.ts` (L41–L42), `next.config.ts` | `createRestaurantSchema` uses `.url()` (rejecting relative `/uploads/...` from Step 1 onboarding and accepting non-HTTP schemes like `javascript:`). `next.config.ts` omits baseline headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`). **Fix:** Standardize a strict `safeImageUrlSchema` (`https://`, `http://`, or `/uploads/...` only) and add `headers()` in `next.config.ts`. |
| **M-4** | **Multi-Restaurant Cookie Ignored in Sidebar Layout & Unoptimized Public Images** | `src/app/dashboard/layout.tsx` (L27–L33), `next.config.ts` (L5) | `dashboard/layout.tsx` always picks `findFirst` membership instead of reading `menuqr_active_restaurant` cookie (causing sidebar brand mismatch if an owner switches restaurants). `images: { unoptimized: true }` means large 4–5 MB camera uploads on Supabase Storage load unresized on Indian 4G networks (Cloudinary URLs should inject `f_auto,q_auto,w_800` or compress via `sharp` on upload). |

---

### LOW RISKS (Post-Pilot Improvements)

| ID | Risk | File(s) | Audit Finding |
| --- | --- | --- | --- |
| **L-1** | **Stateless JWTs Survive Password Change** | `src/app/api/account/password/route.ts`, `src/lib/auth.ts` | Existing 7-day JWTs on other devices remain valid after password change until expiry (`isActive=false` IS revoked immediately via live DB lookup). Add a `tokenVersion` integer on `User` to force immediate logout on password reset. |
| **L-2** | **Synchronous Scan Logging Adds Latency to Public Menu TTFB** | `src/app/menu/[slug]/page.tsx` (L58), `src/app/menu/[slug]/t/[token]/page.tsx` (L70) | `await prisma.qRScanEvent.create(...)` runs serially before menu queries. Use Next.js 15 `after()` or parallelize with `Promise.all` to cut 1 DB RTT off every mobile QR scan. |
| **L-3** | **Duplicate General QR Scan Logging Logic** | `src/app/menu/[slug]/page.tsx`, `src/app/menu/[slug]/t/[token]/page.tsx`, `src/app/api/public/menu/[slug]/route.ts` | Extract shared `recordQrScan()` helper so bot filtering and deduplication apply uniformly in one place. |

---

## 3. Audit Scorecard Across All 12 Dimensions + 5 Special Checks

| # | Dimension | Verdict | Summary |
| --- | --- | --- | --- |
| 1 | Authentication & Session Security | **PARTIAL (H-2, L-1)** | bcrypt(12), HTTP-only JWT, live `isActive` check verified (`SEC-1`, `SEC-2`). Missing login rate limit (`H-2`) and JWT invalidation on password change (`L-1`). |
| 2 | Multi-Tenant Isolation & IDOR | **PASS** | Server-derived `RestaurantMembership` context verified across all CRUD/reorder/QR routes; client-supplied `restaurantId` ignored (`TEST 7`, `SEC-3`). |
| 3 | Super Admin Authorization | **PASS** | Strict `role === "SUPER_ADMIN"` enforced in both Edge middleware and live DB `requireSuperAdmin()` (`TEST 8`, `SEC-4`). |
| 4 | Public Menu & Unpublished Restrictions | **PASS** | Unpublished, inactive, and suspended restaurants return `404` on SSR pages and public JSON API with zero data leakage (`TEST 9`). |
| 5 | QR Token Security & Regeneration | **PASS** | 128-bit cryptographic tokens (`crypto.randomBytes(16)`), regeneration atomically invalidates old token (`isActive=false`), cross-tenant token replay blocked (`TEST 5`, `SEC-6`). |
| 6 | Image Upload Validation & Storage | **FAIL IN PROD (C-1)** | MIME allowlist, 5 MB limit, and binary magic-byte validation verified (`SEC-5`). **Blocker:** local disk fallback still reachable in production (`C-1`). |
| 7 | Production DB Migration Readiness | **FAIL (C-2)** | Normalized schema is solid, but `prisma/migrations/` does not exist yet (`C-2`). No destructive migrations executed. |
| 8 | Rate Limiting in Serverless | **PARTIAL (H-2, H-3)** | Works in single-instance (`SEC-8`), but in-memory `Map` is non-shared across Vercel lambdas (`H-3`) and login is unprotected (`H-2`). |
| 9 | Environment Variable Validation | **FAIL (H-4)** | Missing centralized env validation; `hashIp()` has fallback salt `"menuqr-ip-salt"` (`H-4`). |
| 10 | Subscription & Trial Expiration | **PARTIAL (M-2)** | Auto-transition `TRIALING → EXPIRED` verified (`SEC-7`). `maxMenuItems`/`maxRestaurants` not enforced (`M-2`). |
| 11 | QR Analytics Accuracy & Deduplication | **PARTIAL (M-1)** | 100% real DB events (zero fake numbers verified in `TEST 12`), but lacks bot filtering & rapid-reload deduplication (`M-1`). |
| 12 | Mobile Responsiveness & Performance | **PARTIAL (M-4, L-2)** | Clean mobile-first responsive UI (`TEST 10`), but `images.unoptimized: true` and serial scan write add mobile latency (`M-4`, `L-2`). |
| — | No hardcoded production secrets | **PASS** | Zero API keys/cloud secrets in repo. Only dev seed defaults (`H-1`) and IP salt fallback (`H-4`). |
| — | Seed credentials not exposed | **NEEDS FIX (H-1)** | `prisma/seed.ts` logs passwords to stdout and hardcodes fallback `"Admin@12345"` / `"Demo@12345"`. |
| — | No fake production analytics | **PASS** | Verified: unscanned restaurant reports `0`, scanned restaurant matches exact DB event count (`TEST 12`). |
| — | No dev storage fallback in prod | **NEEDS FIX (C-1)** | Must throw error in production if `STORAGE_PROVIDER` is `"local"` or unconfigured. |
| — | No destructive DB migration | **PASS** | No production DB touched; no destructive DDL present. |

---

## 4. Exact Files Requiring Changes Before Production Launch

1. [src/lib/storage.ts](file:///d:/Personal%20projects/project/qrcode_mvp/src/lib/storage.ts) — Block `"local"` storage fallback when `NODE_ENV === "production"` or `VERCEL === "1"`; validate cloud provider credentials strictly (`C-1`).
2. `prisma/migrations/` *(to be generated via `prisma migrate dev --name init`)* — Create versioned initial SQL migration (`C-2`).
3. [prisma/seed.ts](file:///d:/Personal%20projects/project/qrcode_mvp/prisma/seed.ts) — Remove hardcoded production admin password fallback, stop logging plaintext passwords, and gate demo restaurant seeding behind `SEED_DEMO_DATA === "true"` (`H-1`).
4. [src/lib/auth.ts](file:///d:/Personal%20projects/project/qrcode_mvp/src/lib/auth.ts) — Add brute-force rate limiting in `Credentials.authorize()` (`H-2`).
5. [src/lib/rate-limit.ts](file:///d:/Personal%20projects/project/qrcode_mvp/src/lib/rate-limit.ts) — Support Upstash Redis (or Postgres-backed) distributed store when Redis env vars are provided (`H-3`).
6. [src/lib/utils.ts](file:///d:/Personal%20projects/project/qrcode_mvp/src/lib/utils.ts) + new `src/lib/env.ts` — Remove `"menuqr-ip-salt"` fallback in production and validate required env vars at startup (`H-4`).
7. [src/app/menu/[slug]/page.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/app/menu/%5Bslug%5D/page.tsx), [src/app/menu/[slug]/t/[token]/page.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/app/menu/%5Bslug%5D/t/%5Btoken%5D/page.tsx), [src/app/api/public/menu/[slug]/route.ts](file:///d:/Personal%20projects/project/qrcode_mvp/src/app/api/public/menu/%5Bslug%5D/route.ts) — Extract shared `recordQrScan()` with bot filtering, 2-minute `(qrCodeId, ipHash)` deduplication, and non-blocking execution (`M-1`, `L-2`, `L-3`).
8. [src/lib/validators.ts](file:///d:/Personal%20projects/project/qrcode_mvp/src/lib/validators.ts) — Unify strict image URL validator across `createRestaurantSchema`, `updateRestaurantSchema`, and `createMenuItemSchema` (`M-3`).
9. [next.config.ts](file:///d:/Personal%20projects/project/qrcode_mvp/next.config.ts) — Add HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) (`M-3`).
10. [src/app/api/menu-items/route.ts](file:///d:/Personal%20projects/project/qrcode_mvp/src/app/api/menu-items/route.ts) & [src/app/api/restaurants/route.ts](file:///d:/Personal%20projects/project/qrcode_mvp/src/app/api/restaurants/route.ts) — Enforce `plan.maxMenuItems` and `plan.maxRestaurants` (`M-2`).
11. [src/app/dashboard/layout.tsx](file:///d:/Personal%20projects/project/qrcode_mvp/src/app/dashboard/layout.tsx) — Honor `menuqr_active_restaurant` cookie so sidebar brand matches active tenant (`M-4`).

---

## 5. Required Environment Variables

| Variable | Required In | Description |
| --- | --- | --- |
| `DATABASE_URL` | Local & Production | Pooled PostgreSQL connection string (`?sslmode=require` in prod, e.g., Neon/Supabase) |
| `DIRECT_URL` *(recommended for Neon/Supabase)* | Production | Direct non-pooled Postgres URL for `prisma migrate deploy` |
| `AUTH_SECRET` | Local & Production | Cryptographically random 32+ byte secret (`openssl rand -base64 32`) |
| `AUTH_URL` | Local & Production | Canonical origin (`https://your-domain.com`) |
| `NEXT_PUBLIC_APP_URL` | Local & Production | Public base URL embedded inside generated QR codes (`https://your-domain.com`) |
| `AUTH_TRUST_HOST` | Production (Vercel) | `"true"` |
| `STORAGE_PROVIDER` | Local & Production | `"cloudinary"` or `"supabase"` in production (`"local"` dev-only) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Production (if Cloudinary) | Cloudinary signed upload credentials |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Production (if Supabase) | Supabase Storage public bucket + service key |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Initial Seed Only | Strong Super Admin credentials (rotate / remove from CI logs) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` *(post-H-3 fix)* | Production (recommended) | Distributed serverless rate limiting |

---

## 6. Safe Production Database Deployment Instructions

> **Do NOT use `prisma db push` or `--force-reset` in production.**

1. **Create Initial Baseline Migration (Local Dev DB Only — Once):**
   ```bash
   pnpm exec prisma migrate dev --name init
   ```
   Verify the generated SQL under `prisma/migrations/<timestamp>_init/migration.sql` contains only expected `CREATE TABLE` / `CREATE INDEX` statements, then commit `prisma/migrations/` to Git.
2. **Backup / Snapshot Existing Production DB (If Re-Deploying):**
   Take a point-in-time snapshot in Neon / Supabase / Railway before running migrations.
3. **Apply Non-Destructive Migrations Against Production:**
   ```bash
   DATABASE_URL="<PROD_DIRECT_POSTGRES_URL>" pnpm db:migrate:deploy
   ```
4. **Seed Plans & Super Admin (Without Demo Restaurant in Production):**
   ```bash
   DATABASE_URL="<PROD_DIRECT_POSTGRES_URL>" \
   SEED_ADMIN_EMAIL="founder@your-domain.com" \
   SEED_ADMIN_PASSWORD="<STRONG_UNIQUE_PASSWORD>" \
   pnpm db:seed
   ```
5. **Verify Tables & Counts:** Confirm `SubscriptionPlan` has `FREE_TRIAL`, `STARTER`, `GROWTH` and exactly 1 `SUPER_ADMIN` user exists.

---

## 7. Vercel Deployment Checklist

- [ ] Resolve **C-1**, **C-2**, **H-1**, **H-2**, **H-4** before first production deploy.
- [ ] Connect GitHub repository to Vercel; confirm Framework Preset = **Next.js** and Build Command = `pnpm build` (from `vercel.json`).
- [ ] Add all production Environment Variables in Vercel Project Settings (**Production** scope only — never commit `.env`).
- [ ] Configure custom domain + HTTPS (`https://menuqr.in` or subdomain) and ensure `NEXT_PUBLIC_APP_URL` and `AUTH_URL` match the exact HTTPS domain (QR codes encode this URL permanently!).
- [ ] Verify Cloudinary or Supabase Storage bucket has public read access for menu/logo images and private write access via server credentials only.
- [ ] Run `pnpm db:migrate:deploy` and production seed against managed PostgreSQL.
- [ ] Post-deploy smoke test:
  - [ ] Visit `/` — HTTP 200, zero console errors.
  - [ ] Sign in as Super Admin at `/login` → redirected to `/admin`.
  - [ ] Register a real test restaurant → upload a real dish photo → verify image URL is `https://res.cloudinary.com/...` or `https://...supabase.co/...` (NOT `/uploads/...`).
  - [ ] Publish menu → download single PNG, single PDF, and bulk PDF.
  - [ ] Suspend test restaurant from `/admin/restaurants` → verify public URL immediately returns `404`.
- [ ] Set up Vercel Analytics / Error Logging (Sentry or Vercel Logs drain) and PostgreSQL automated daily backups.

---

## 8. Manual Android & iOS QR Testing Checklist

Perform these checks on **real physical phones** over **4G/5G mobile data** before printing table tents for pilot restaurants:

### Scanning & URL Resolution
- [ ] **Android (Native Camera + Google Lens + Chrome)**: Point camera at printed A5 Table 3 PDF → link preview shows `https://<your-domain>/menu/<slug>/t/<token>` → taps straight into Chrome without app prompt.
- [ ] **iOS (Native Camera + Safari)**: Point iPhone Camera at printed A5 Table 3 PDF → yellow QR banner appears in <1 second → opens directly in Safari.
- [ ] **Low-Light / Glare Test**: Scan laminated/matte table tent under warm dim restaurant lighting at 20–40 cm distance (verifies ECC-H contrast).
- [ ] **General vs Table QR**: General entrance QR opens `/menu/<slug>` (no table pill); Table 3 QR opens `/menu/<slug>/t/<token>` with `"Table 3"` badge clearly visible at top.

### Customer UX & Responsiveness (360px Android & 390px iPhone)
- [ ] No horizontal page overflow or cut-off buttons; category tabs scroll smoothly horizontally.
- [ ] Tap **Veg**, **Non-Veg**, **In Stock Only**, **Price Low → High**, and type in **Search dishes...** — results update instantaneously.
- [ ] Tap any dish card → **Dish Detail Modal** opens cleanly, displays large image + INR price, closes cleanly on Android Back / `X`.
- [ ] Tap floating **Menu** button → jumps smoothly to selected category.
- [ ] Tap **Save** on 2 dishes → floating **Shortlist** pill updates subtotal; modal shows table number + disclaimer.
- [ ] Tap **Call** (opens native phone dialer), **Directions** (opens Google/Apple Maps), and **Share** (opens native Android/iOS share sheet).

### Live Updates, Invalidation & Analytics Verification
- [ ] Owner edits a dish price (`₹260 → ₹285`) and toggles another dish to **Sold Out** from dashboard → customer pulls-to-refresh on the **same QR URL** → sees `₹285` and `Sold Out` immediately.
- [ ] Owner regenerates Table 3 QR → rescanning the **old** printed Table 3 QR returns `"Menu Currently Unavailable"` (`404`); scanning the **new** QR works immediately.
- [ ] Open `/dashboard/analytics` → verify Table 3 scan count incremented accurately and device type recorded as `MOBILE`.
