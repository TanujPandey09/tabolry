# MenuQR API Endpoint Reference

All protected endpoints verify the authenticated session via Auth.js and resolve tenant scope strictly from PostgreSQL `RestaurantMembership` records. Client-supplied `restaurantId` values are never trusted.

## Authentication & Account

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public (Rate-limited) | Register a new `RESTAURANT_OWNER` account (`name`, `email`, `password`). |
| `GET/POST` | `/api/auth/[...nextauth]` | Public | Auth.js v5 endpoints (`csrf`, `callback/credentials`, `session`, `signout`). |
| `GET` | `/api/account` | Authenticated | Fetch logged-in user profile. |
| `PATCH` | `/api/account` | Authenticated | Update logged-in user display name. |
| `POST` | `/api/account/password` | Authenticated (Rate-limited) | Change password (`currentPassword`, `newPassword`). |

## Restaurant & Tenant Context

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/restaurants` | Authenticated | List restaurants the current user is a member of. |
| `POST` | `/api/restaurants` | Authenticated | Create a new restaurant, owner membership, 14-day `FREE_TRIAL` subscription, and general QR code. |
| `GET` | `/api/restaurants/current` | Owner/Member | Fetch active restaurant, KPI counts, subscription status (auto-expiring elapsed trials), and active plans. |
| `PATCH` | `/api/restaurants/current` | Owner/Member | Update restaurant profile, branding, template (`MODERN\|CLASSIC\|MINIMAL`), publish toggle, or onboarding state. |
| `POST` | `/api/restaurants/current` | Owner/Member | Switch active restaurant cookie (validates `RestaurantMembership` — returns `403` if unauthorized). |
| `POST` | `/api/upload` | Authenticated (Rate-limited) | Multipart image upload (`file`, `folder=menu\|branding`) with MIME + magic-byte validation (5 MB max). |

## Menu Categories

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/categories` | Owner/Member | List categories for the active restaurant ordered by `displayOrder`. |
| `POST` | `/api/categories` | Owner/Member | Create a category, or pass `{ "seedDefaults": true }` to add Starters, Main Course, Beverages, Desserts. |
| `PATCH` | `/api/categories/[id]` | Owner/Member | Update a category owned by the active restaurant (`404` on cross-tenant ID). |
| `DELETE` | `/api/categories/[id]` | Owner/Member | Delete a category owned by the active restaurant (items remain intact with `categoryId = null`). |
| `POST` | `/api/categories/reorder` | Owner/Member | Reorder categories atomically (`{ "orderedIds": [...] }`). |

## Menu Items

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/menu-items` | Owner/Member | List items with optional `?search=`, `?categoryId=`, `?dietaryType=`, `?availability=`. |
| `POST` | `/api/menu-items` | Owner/Member | Create menu item (verifies `categoryId` belongs to active restaurant). |
| `GET` | `/api/menu-items/[id]` | Owner/Member | Get single menu item (`404` on cross-tenant ID). |
| `PATCH` | `/api/menu-items/[id]` | Owner/Member | Update name, description, price, image, category, dietary type, or availability toggle. |
| `DELETE` | `/api/menu-items/[id]` | Owner/Member | Delete menu item (`404` on cross-tenant ID). |
| `POST` | `/api/menu-items/reorder` | Owner/Member | Reorder menu items atomically (`{ "orderedIds": [...] }`). |

## Tables & QR Codes

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/tables` | Owner/Member | Get general restaurant QR + all tables with active QR codes, URLs, DataURL previews, and scan counts. |
| `POST` | `/api/tables` | Owner/Member | Create a table (`tableNumber`, `label`, `capacity`) and auto-generate a unique cryptographic QR token. |
| `GET/PATCH/DELETE` | `/api/tables/[id]` | Owner/Member | Read, edit, or delete a table (`404` on cross-tenant ID). |
| `POST` | `/api/qr-codes/[id]/regenerate` | Owner/Member | Invalidate old QR token (`isActive = false`) and generate a fresh active QR token. |
| `GET` | `/api/qr-codes/[id]/download` | Owner/Member | Download QR code as `?format=png` (`image/png`) or `?format=pdf` (printable A5 table tent `application/pdf`). |
| `GET` | `/api/qr-codes/bulk-pdf` | Owner/Member | Download a single multi-page printable PDF with the general QR and all active table QRs. |

## Public Customer Menu & Table Ordering

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/menu/[slug]` | Public | Mobile-first HTML digital menu for an active & published restaurant; logs real `QRScanEvent` for general QR. |
| `GET` | `/menu/[slug]/t/[token]` | Public | Table-specific HTML menu displaying `"Table X"`; validates active token and logs table `QRScanEvent`. |
| `GET` | `/api/public/menu/[slug]` | Public | JSON representation of published menu (`?token=` for table validation, `?track=1` for scan logging). Returns `404` for unpublished/suspended restaurants. |
| `POST` | `/api/public/orders` | Public (Rate-limited) | Place order from table QR. Server validates restaurant status, table token, menu item availability, and calculates real totals in ₹. |
| `GET` | `/api/public/orders/[id]` | Public | Live order status polling endpoint for customer (returns items, table number, kitchen status, payment status). |
| `POST` | `/api/public/orders/[id]/pay` | Public | Process or record UPI payment for an order; updates `paymentStatus` to `PAID` and moves order to `CONFIRMED`. |

## Owner Live Orders Management

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/orders` | Owner/Member | List incoming orders for the active restaurant (`?status=ALL\|PENDING\|CONFIRMED\|PREPARING\|SERVED\|COMPLETED\|CANCELLED`). |
| `GET` | `/api/orders/[id]` | Owner/Member | Fetch single order with table details and itemized breakdown (`404` on cross-tenant ID). |
| `PATCH` | `/api/orders/[id]` | Owner/Member | Update order status (`CONFIRMED`, `PREPARING`, `SERVED`, `COMPLETED`, `CANCELLED`) and payment status (`PAID`, `PENDING`). |

## Analytics

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/analytics` | Owner/Member | Real QR scan analytics (`?days=7\|14\|30`): total/today/7d/period counts, daily trends, most scanned QRs, table-wise stats, device breakdown. |

## Super Admin (`role === "SUPER_ADMIN"` strictly enforced)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/admin/overview` | Super Admin | Platform KPIs (total/active/trial/suspended restaurants, users, scans) + 30-day registration trends. |
| `GET` | `/api/admin/restaurants` | Super Admin | List all restaurants with owners, onboarding status, subscription, and counts (`?search=`, `?status=`). |
| `GET` | `/api/admin/restaurants/[id]` | Super Admin | Detailed view of a single restaurant. |
| `PATCH` | `/api/admin/restaurants/[id]` | Super Admin | Activate/suspend/deactivate restaurant, assign plan, update subscription status/cycle, extend trial date, save pilot notes. |
| `GET/POST` | `/api/admin/plans` | Super Admin | List all subscription plans or create a new plan. |
| `PATCH` | `/api/admin/plans/[id]` | Super Admin | Update pricing, trial days, limits, features, or visibility of a plan. |
