# Product Requirements Document (PRD)
## MenuQR — Multi-Tenant QR Digital Menu SaaS

**Version:** 1.0 (Pilot MVP)  
**Target Market:** Small & medium-sized restaurants, cafes, and family dining venues in India (initial pilot cohort: 5–10 restaurants in Meerut & NCR)  
**Default Currency:** INR (`₹`)  

---

## 1. Problem Statement
Local Indian restaurants frequently reprint paper menus due to ingredient price fluctuations, seasonal dishes, and sold-out items. Paper menus wear out quickly, cannot show food photos cleanly at scale, and provide zero insight into diner browsing behavior. Existing POS/ordering suites are overly complex and expensive for small venues that only want a fast, reliable digital menu on every table.

## 2. Product Vision & Business Model
MenuQR enables any restaurant owner to go live with a branded, mobile-first QR digital menu in under 5 minutes:
- **Pilot GTM**: Onboard 5–10 local restaurants in Meerut on a **14-day Free Trial**.
- **Experimental Launch Pricing (INR)**:
  - **Free Trial**: ₹0 for 14 days (1 restaurant, full menu & QR features)
  - **Starter**: ₹199/month or ₹1,990/year (1 restaurant, up to 15 tables, basic customization)
  - **Growth**: ₹399/month or ₹3,990/year (1 restaurant, up to 50 tables, all 3 templates, real scan analytics, bulk PDF exports)
- **Payment Strategy (MVP)**: No online payment gateway in v1. Super Admins manually manage pilot subscriptions and trial periods to validate willingness to pay before adding Razorpay/Stripe in v1.1.

## 3. Target Personas & User Roles

### A. Super Admin (Platform Operator)
- Monitors platform growth (total/active/trial/suspended restaurants, registered users, total QR scans, 30-day signup trends).
- Reviews onboarding progress and inspects restaurant details.
- Activates, suspends, or deactivates restaurants (immediately hiding suspended menus from public access).
- Manually manages pilot subscriptions, trial expiry dates, and notes.
- Configures INR pricing plans, features, and table/item limits.

### B. Restaurant Owner (Tenant)
- Registers with email/password and completes a 5-step guided onboarding flow.
- Manages restaurant profile, logo, cover image, address, brand color, and template choice (`Modern`, `Classic`, `Minimal`).
- Manages menu categories (CRUD + display order + 1-click suggested Indian restaurant defaults).
- Manages food items (CRUD, photo upload, INR pricing, FSSAI Veg/Non-Veg/Egg indicators, instant Sold-Out toggle, search/filter, ordering).
- Manages tables and permanent QR codes (general restaurant QR + unique per-table QRs, PNG & printable A5 PDF downloads, bulk PDF, token regeneration).
- Views real QR scan analytics (daily trends, top QRs, table-wise scan counts).
- Updates account details, changes password, and reviews subscription status.

### C. Customer / Diner (Public, Unauthenticated)
- Scans a table or entrance QR code using their native smartphone camera — zero app install or login required.
- Sees a polished, fast, mobile-first menu with the restaurant's branding, food photos, Veg/Non-Veg badges, prices in `₹`, and sold-out labels.
- Sees a subtle table identifier (e.g., `Table 3`) when scanning a table-specific QR code.
- Searches dishes, filters by Veg/Non-Veg/Egg, hides sold-out items, sorts by price, opens rich dish detail modals, jumps quickly between categories, and optionally bookmarks a personal table shortlist for verbal reference when speaking to their server.

## 4. Functional Requirements

| Area | Requirement | Priority | Status |
| --- | --- | --- | --- |
| Onboarding | 5-step guided setup (Profile → Categories → Items → Tables & QR → Publish) | P0 | Implemented |
| Multi-Tenancy | Complete data isolation per restaurant in shared PostgreSQL DB | P0 | Implemented |
| Menu CRUD | Categories & items CRUD, image uploads, reordering, sold-out toggle | P0 | Implemented |
| Permanent QR System | General `/menu/[slug]` & table `/menu/[slug]/t/[token]` permanent links | P0 | Implemented |
| QR Downloads | PNG, single printable A5 PDF, and bulk multi-page printable PDF | P0 | Implemented |
| QR Regeneration | Regenerate table QR token while invalidating old token & keeping scan history | P0 | Implemented |
| Public Digital Menu | Mobile-first UI, 3 templates, dish detail modal, search, Veg/Non-Veg filter, category jump drawer, personal waiter shortlist | P0 | Implemented |
| Real Analytics | Track genuine `QRScanEvent` hits; daily chart, top QRs, table breakdown | P0 | Implemented |
| Super Admin | Platform overview, restaurant suspension/activation, plan & trial management | P0 | Implemented |
| Auth & Security | Auth.js v5, bcryptjs, RBAC, IDOR prevention, input validation, rate limiting | P0 | Implemented |

## 5. Non-Functional Requirements
- **Performance**: Mobile public menu loads fast with server-rendered HTML, lazy-loaded dish images, and zero client-side waterfall for initial menu data.
- **Security**: Zero client-trusted `restaurantId`; server-verified memberships; magic-byte validation on image uploads; suspended/unpublished menus return `404` with zero data leakage.
- **Mobile Responsiveness**: Public menu designed mobile-first (`360px–430px` primary viewport); Owner & Admin dashboards responsive across desktop, tablet, and mobile drawers.
- **No Fake Metrics**: Analytics strictly report real `QRScanEvent` database rows (0 scans displays clean empty state).

## 6. Strictly Out of Scope for MVP v1
- Online food ordering & checkout
- Payment gateway processing (Razorpay/UPI/Cards)
- Delivery tracking & rider management
- Kitchen Display System (KDS) & Waiter/POS integration
- Inventory/recipe stock management
- AI menu translation & AI recommendations
- WhatsApp ordering integration

## 7. Success Metrics for Pilot Launch (Meerut Cohort)
- Onboard **5–10 local restaurants** within 30 days.
- **≥ 80%** of onboarded restaurants publish their menu and print table QR codes within 48 hours.
- **≥ 500** real customer QR scans across pilot venues in the first 14 days.
- Convert **≥ 3 pilot restaurants** to Starter (₹199/mo) or Growth (₹399/mo) post-trial.
