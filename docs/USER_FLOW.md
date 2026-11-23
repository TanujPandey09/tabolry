# MenuQR — User Flows

Complete end-to-end journeys for all three user roles (**Restaurant Owner**, **Customer / Diner**, and **Super Admin**), mapped directly to the live routes and source files in this codebase.

---

## 1. Restaurant Owner Flow (Signup → Onboarding → Daily Management)

```mermaid
flowchart TD
    A["Landing Page (/)"] --> B["Register (/register)"]
    B -->|POST /api/auth/register + Auto Login| C["Guided Onboarding (/onboarding)"]
    A --> L["Sign In (/login)"]
    L -->|Owner with restaurant| D["Dashboard (/dashboard)"]
    L -->|Owner without restaurant| C
    L -->|Super Admin| SA["Admin Dashboard (/admin)"]

    C --> S1["Step 1: Create Restaurant Profile<br/>(Name, Slug, Logo, City, INR, Brand Color)"]
    S1 -->|Auto-creates 14-day Trial + General QR| S2["Step 2: Add Menu Categories<br/>(1-click Defaults or Custom)"]
    S2 --> S3["Step 3: Add Menu Items<br/>(Price ₹, Photo, Veg/Non-Veg)"]
    S3 --> S4["Step 4: Add Tables & Generate QRs"]
    S4 --> S5["Step 5: Review & Publish Live"]
    S5 -->|PATCH isPublished=true| D

    D --> P1["Profile & Branding (/dashboard/profile)"]
    D --> P2["Categories CRUD & Reorder (/dashboard/categories)"]
    D --> P3["Menu CRUD & Sold-Out Toggle (/dashboard/menu)"]
    D --> P4["Tables, PNG/PDF & Regenerate QR (/dashboard/tables)"]
    D --> P5["Templates & Live Preview (/dashboard/appearance)"]
    D --> P6["Real Scan Analytics (/dashboard/analytics)"]
    D --> P7["Account, Password & Plans (/dashboard/settings)"]
```

### Key Owner Journeys & Source Files

| Journey | Route | API Endpoints | Source File |
| --- | --- | --- | --- |
| Account signup | `/register` | `POST /api/auth/register`, Auth.js credentials | `src/app/register/page.tsx` |
| Account sign in | `/login` | Auth.js `/api/auth/callback/credentials` | `src/app/login/page.tsx` |
| 5-step onboarding | `/onboarding` | `/api/restaurants`, `/api/categories`, `/api/menu-items`, `/api/tables`, `/api/restaurants/current` | `src/app/onboarding/page.tsx` |
| Publish / Unpublish menu | `/dashboard` | `PATCH /api/restaurants/current` | `src/app/dashboard/page.tsx` |
| Edit price or mark Sold Out | `/dashboard/menu` | `PATCH /api/menu-items/[id]` | `src/app/dashboard/menu/page.tsx` |
| Upload dish/logo photo | `/dashboard/menu`, `/dashboard/profile` | `POST /api/upload` | `src/components/ui/image-upload.tsx` |
| Print table QR cards | `/dashboard/tables` | `GET /api/qr-codes/[id]/download?format=png\|pdf`, `GET /api/qr-codes/bulk-pdf` | `src/app/dashboard/tables/page.tsx` |
| Invalidate & regenerate QR | `/dashboard/tables` | `POST /api/qr-codes/[id]/regenerate` | `src/app/api/qr-codes/[id]/regenerate/route.ts` |
| Switch template & color | `/dashboard/appearance` | `PATCH /api/restaurants/current` | `src/app/dashboard/appearance/page.tsx` |
| Check real scan trends | `/dashboard/analytics` | `GET /api/analytics?days=7\|14\|30` | `src/app/dashboard/analytics/page.tsx` |

---

## 2. Customer / Diner Flow (Scan QR → Browse Menu)

Zero login, zero app installation, instant SSR load.

```mermaid
flowchart TD
    Q1["Scan Entrance / General QR<br/>(/menu/spice-garden-demo)"] --> CHK{"Restaurant ACTIVE<br/>& isPublished=true?"}
    Q2["Scan Table 3 QR<br/>(/menu/spice-garden-demo/t/token)"] --> CHK2{"Restaurant ACTIVE & Published<br/>AND Token isActive=true?"}

    CHK -->|No| NF["404 Menu Unavailable<br/>(Zero Private Data Exposed)"]
    CHK2 -->|No| NF

    CHK -->|Yes| LOG1["Log QRScanEvent<br/>(type=GENERAL, deviceType, ipHash)"]
    CHK2 -->|Yes| LOG2["Log QRScanEvent<br/>(type=TABLE, tableId=Table 3)"]

    LOG1 --> MENU["Render Public Menu UI"]
    LOG2 --> MENU_T["Render Public Menu UI<br/>with 'Table 3' Badge"]

    MENU --> ACT["Browse & Interact"]
    MENU_T --> ACT

    ACT --> A1["Search Dishes / Filter Veg, Non-Veg, Egg / Hide Sold Out"]
    ACT --> A2["Sort by Menu Order or Price"]
    ACT --> A3["Jump to Category (Floating Menu Button)"]
    ACT --> A4["Tap Dish → Full Dish Detail Sheet"]
    ACT --> A5["Tap Save → Personal Table Shortlist (Waiter Reference)"]
    ACT --> A6["Call / Google Maps Directions / Share Link / Info"]
```

### Edge Cases Handled
- **Price or Sold-Out Changed**: Customer refreshes or re-scans the **exact same QR code** and immediately sees the updated price or `Sold Out` badge (menu data is never embedded inside the QR).
- **QR Regenerated**: Old printed QR token is marked `isActive = false` and immediately returns `404 Menu Unavailable`.
- **Restaurant Suspended or Draft**: Both `/menu/[slug]` and `/api/public/menu/[slug]` return `404` with zero dish leakage.

---

## 3. Super Admin Flow (Platform Oversight & Pilot Management)

```mermaid
flowchart TD
    A["Sign In (/login)<br/>(role = SUPER_ADMIN)"] --> B["Platform Overview (/admin)<br/>KPIs + 30-Day Signup Chart"]
    B --> C["Restaurants Directory (/admin/restaurants)"]
    B --> D["Subscription Plans (/admin/plans)"]

    C --> C1["Search / Filter by Status"]
    C --> C2["Quick Activate or Suspend<br/>(Suspend auto-unpublishes menu)"]
    C --> C3["Manage Dialog:<br/>Assign Plan, Billing Cycle,<br/>Extend Trial Date, Pilot Notes"]

    D --> D1["Edit INR Monthly / Yearly Prices,<br/>Trial Days, Max Tables, Features"]
```

### Security Gate
- Non-admin users visiting `/admin/*` are redirected to `/dashboard` by `src/middleware.ts` and `src/app/admin/layout.tsx`.
- Any owner calling `/api/admin/*` receives `403 Forbidden` from `requireSuperAdmin()` in `src/lib/tenant.ts`.

---

## 4. What Happens When You Update Something?

| If you update... | Immediate effect in the app |
| --- | --- |
| A dish price or availability in `/dashboard/menu` | Public menu (`/menu/[slug]`) reflects it immediately on next load; no QR reprint needed. |
| Template (`MODERN` / `CLASSIC` / `MINIMAL`) or Brand Color in `/dashboard/appearance` | Public menu theme, category pills, table badge, and newly downloaded printable QR PDFs adopt the new styling immediately. |
| Restaurant slug in `/dashboard/profile` | Public URL changes to `/menu/<new-slug>`; re-download QR codes from `/dashboard/tables`. |
| Table QR regenerated in `/dashboard/tables` | Old table QR URL returns `404`; new table QR URL works immediately while preserving past scan counts. |
| Restaurant suspended in `/admin/restaurants` | Public menu & table QRs immediately return `404`, and owner cannot re-publish until reactivated. |
