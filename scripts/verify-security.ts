/**
 * Critical Security & Production Readiness Test Suite for MenuQR MVP
 * Verifies Auth/Session, Unauthenticated Access, Deep IDOR / Tenant Isolation,
 * Super Admin RBAC, Upload Hardening, Cross-Tenant QR Token Replay,
 * Trial Expiry Automation, and Registration Rate Limiting.
 */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const prisma = new PrismaClient();

class CookieClient {
  private cookies = new Map<string, string>();

  private extractCookies(res: Response) {
    const setCookies =
      typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const raw of setCookies) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) {
        const name = pair.slice(0, eq).trim();
        const val = pair.slice(eq + 1).trim();
        if (val === "") this.cookies.delete(name);
        else this.cookies.set(name, val);
      }
    }
  }

  private cookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const cookie = this.cookieHeader();
    if (cookie) headers.set("cookie", cookie);

    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      redirect: init.redirect ?? "manual",
    });
    this.extractCookies(res);
    return res;
  }

  async json(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const res = await this.fetch(path, { ...init, headers });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data: data as Record<string, any>, res };
  }

  async login(email: string, password: string): Promise<boolean> {
    const csrfRes = await this.json("/api/auth/csrf");
    const csrfToken = csrfRes.data?.csrfToken;
    if (!csrfToken) return false;

    const form = new URLSearchParams({
      csrfToken,
      email,
      password,
      json: "true",
    });

    await this.fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const sessionRes = await this.json("/api/auth/session");
    return sessionRes.data?.user?.email === email.toLowerCase();
  }
}

// Minimal valid 1x1 PNG binary (valid magic bytes)
const VALID_PNG_BYTES = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex"
);

async function run() {
  const suffix = Date.now().toString().slice(-6);
  const anon = new CookieClient();
  const ownerA = new CookieClient();
  const ownerB = new CookieClient();
  const admin = new CookieClient();

  const emailA = `sec-a-${suffix}@test.in`;
  const emailB = `sec-b-${suffix}@test.in`;
  const slugA = `sec-rest-a-${suffix}`;
  const slugB = `sec-rest-b-${suffix}`;
  const pw = "SecurePass@1234";

  console.log(`\nRunning MenuQR Security Audit Test Suite against ${BASE_URL} ...\n`);

  // SEC-1: Unauthenticated requests must be rejected with 401 on all protected APIs
  {
    const protectedEndpoints: Array<[string, string]> = [
      ["GET", "/api/account"],
      ["PATCH", "/api/account"],
      ["POST", "/api/account/password"],
      ["GET", "/api/restaurants"],
      ["POST", "/api/restaurants"],
      ["GET", "/api/restaurants/current"],
      ["PATCH", "/api/restaurants/current"],
      ["GET", "/api/categories"],
      ["POST", "/api/categories"],
      ["GET", "/api/menu-items"],
      ["POST", "/api/menu-items"],
      ["GET", "/api/tables"],
      ["POST", "/api/tables"],
      ["GET", "/api/qr-codes/bulk-pdf"],
      ["GET", "/api/analytics"],
      ["POST", "/api/upload"],
      ["GET", "/api/admin/overview"],
      ["GET", "/api/admin/restaurants"],
      ["GET", "/api/admin/plans"],
    ];

    for (const [method, path] of protectedEndpoints) {
      const res = await anon.fetch(path, {
        method,
        headers: method !== "GET" ? { "content-type": "application/json" } : undefined,
        body: method !== "GET" ? "{}" : undefined,
      });
      assert.equal(
        res.status,
        401,
        `SEC-1 FAILED: ${method} ${path} returned ${res.status} instead of 401 for unauthenticated user`
      );
    }

    // Middleware redirects unauthenticated browser routes to /login
    for (const route of ["/dashboard", "/onboarding", "/admin"]) {
      const res = await anon.fetch(route);
      assert.equal(res.status, 307, `Expected 307 redirect on unauthenticated ${route}`);
      assert.ok(
        res.headers.get("location")?.includes("/login"),
        `Expected redirect to /login for ${route}`
      );
    }
    console.log("  [PASS] SEC-1: All 19 protected APIs return 401 and UI routes redirect to /login");
  }

  // Setup Owner A & Owner B
  await ownerA.json("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Sec Owner A", email: emailA, password: pw }),
  });
  assert.equal(await ownerA.login(emailA, pw), true);

  const rA = await ownerA.json("/api/restaurants", {
    method: "POST",
    body: JSON.stringify({ name: "Sec Kitchen A", slug: slugA, city: "Meerut" }),
  });
  assert.equal(rA.status, 201);
  const restAId = rA.data.restaurant.id;
  await ownerA.json("/api/restaurants/current", {
    method: "PATCH",
    body: JSON.stringify({ isPublished: true }),
  });

  const catA = await ownerA.json("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name: "A Starters" }),
  });
  const catAId = catA.data.category.id;

  const itemA = await ownerA.json("/api/menu-items", {
    method: "POST",
    body: JSON.stringify({ name: "A Special", price: 200, categoryId: catAId }),
  });
  const itemAId = itemA.data.item.id;

  const tableA = await ownerA.json("/api/tables", {
    method: "POST",
    body: JSON.stringify({ tableNumber: "10" }),
  });
  const tableAId = tableA.data.table.id;
  const qrAId = tableA.data.table.qrCode.id;
  const tokenA = tableA.data.table.qrCode.token;

  await ownerB.json("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Sec Owner B", email: emailB, password: pw }),
  });
  assert.equal(await ownerB.login(emailB, pw), true);

  const rB = await ownerB.json("/api/restaurants", {
    method: "POST",
    body: JSON.stringify({ name: "Sec Kitchen B", slug: slugB, city: "Meerut" }),
  });
  assert.equal(rB.status, 201);
  const restBId = rB.data.restaurant.id;
  await ownerB.json("/api/restaurants/current", {
    method: "PATCH",
    body: JSON.stringify({ isPublished: true }),
  });

  // SEC-2: Auth & Session Security (wrong password, password change, user deactivation)
  {
    const badClient = new CookieClient();
    assert.equal(await badClient.login(emailA, "WrongPassword!"), false);

    // Wrong current password rejected
    const badChange = await ownerA.json("/api/account/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "WrongPassword!", newPassword: "NewSecure@123" }),
    });
    assert.equal(badChange.status, 400);

    // Deactivated user immediately blocked even with existing valid JWT cookie
    await prisma.user.update({
      where: { email: emailB },
      data: { isActive: false },
    });
    const blockedRes = await ownerB.json("/api/restaurants/current");
    assert.equal(blockedRes.status, 401, "Deactivated user must be immediately rejected");

    // Re-enable Owner B for remaining tests
    await prisma.user.update({
      where: { email: emailB },
      data: { isActive: true },
    });
    console.log("  [PASS] SEC-2: Invalid login rejected, password verification enforced, deactivated user immediately blocked");
  }

  // SEC-3: Deep Multi-Tenant IDOR & Client-Supplied restaurantId Tampering
  {
    // Attempt to inject Restaurant A's restaurantId into POST payloads as Owner B
    const forgedCat = await ownerB.json("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Injected Cat", restaurantId: restAId }),
    });
    assert.equal(forgedCat.status, 201);
    assert.equal(
      forgedCat.data.category.restaurantId,
      restBId,
      "Server MUST ignore client-supplied restaurantId and scope to Owner B"
    );

    const forgedItem = await ownerB.json("/api/menu-items", {
      method: "POST",
      body: JSON.stringify({ name: "Injected Dish", price: 50, restaurantId: restAId }),
    });
    assert.equal(forgedItem.status, 201);
    assert.equal(forgedItem.data.item.restaurantId, restBId);

    // Cross-tenant reorder, table edit, QR regeneration, PDF download
    assert.equal(
      (await ownerB.json(`/api/categories/${catAId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Hacked" }),
      })).status,
      404
    );
    assert.equal(
      (await ownerB.json("/api/categories/reorder", {
        method: "POST",
        body: JSON.stringify({ orderedIds: [catAId] }),
      })).status,
      400
    );
    assert.equal(
      (await ownerB.json("/api/menu-items/reorder", {
        method: "POST",
        body: JSON.stringify({ orderedIds: [itemAId] }),
      })).status,
      400
    );
    assert.equal(
      (await ownerB.json(`/api/tables/${tableAId}`, {
        method: "PATCH",
        body: JSON.stringify({ tableNumber: "999" }),
      })).status,
      404
    );
    assert.equal(
      (await ownerB.json(`/api/qr-codes/${qrAId}/regenerate`, { method: "POST" })).status,
      404
    );
    assert.equal(
      (await ownerB.fetch(`/api/qr-codes/${qrAId}/download?format=pdf`)).status,
      404
    );
    console.log("  [PASS] SEC-3: Deep IDOR matrix & client-supplied restaurantId tampering blocked");
  }

  // SEC-4: Super Admin RBAC Boundary (API + UI middleware)
  {
    const ownerToAdminPage = await ownerA.fetch("/admin");
    assert.equal(ownerToAdminPage.status, 307);
    assert.ok(ownerToAdminPage.headers.get("location")?.includes("/dashboard"));

    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@menuqr.in";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
    assert.equal(await admin.login(adminEmail, adminPassword), true);

    const plansRes = await admin.json("/api/admin/plans");
    assert.equal(plansRes.status, 200);
    const planId = plansRes.data.plans[0].id;

    // Owner cannot edit plans or restaurants via admin API
    assert.equal(
      (await ownerA.json(`/api/admin/plans/${planId}`, {
        method: "PATCH",
        body: JSON.stringify({ monthlyPrice: 0 }),
      })).status,
      403
    );
    assert.equal(
      (await ownerA.json(`/api/admin/restaurants/${restBId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "SUSPENDED" }),
      })).status,
      403
    );
    console.log("  [PASS] SEC-4: Super Admin RBAC enforced across middleware and all mutation endpoints");
  }

  // SEC-5: Upload Security Validation (MIME, magic-byte spoofing, size limit, valid PNG)
  {
    // 1) Spoofed MIME (HTML/XSS payload masquerading as image/png)
    const spoofForm = new FormData();
    spoofForm.append(
      "file",
      new Blob(["<script>alert('xss')</script>"], { type: "image/png" }),
      "evil.png"
    );
    const spoofRes = await ownerA.fetch("/api/upload", { method: "POST", body: spoofForm });
    assert.equal(spoofRes.status, 400, "Spoofed PNG magic bytes must be rejected");

    // 2) Disallowed SVG MIME type
    const svgForm = new FormData();
    svgForm.append(
      "file",
      new Blob(["<svg xmlns='http://www.w3.org/2000/svg'></svg>"], { type: "image/svg+xml" }),
      "xss.svg"
    );
    const svgRes = await ownerA.fetch("/api/upload", { method: "POST", body: svgForm });
    assert.equal(svgRes.status, 400, "SVG upload must be rejected");

    // 3) Oversized file (>5MB)
    const bigBuf = Buffer.alloc(5 * 1024 * 1024 + 100);
    VALID_PNG_BYTES.copy(bigBuf, 0);
    const bigForm = new FormData();
    bigForm.append("file", new Blob([bigBuf], { type: "image/png" }), "huge.png");
    const bigRes = await ownerA.fetch("/api/upload", { method: "POST", body: bigForm });
    assert.equal(bigRes.status, 400, "Oversized >5MB file must be rejected");

    // 4) Valid PNG upload succeeds
    const okForm = new FormData();
    okForm.append("file", new Blob([VALID_PNG_BYTES], { type: "image/png" }), "dish.png");
    okForm.append("folder", "menu");
    const okRes = await ownerA.fetch("/api/upload", { method: "POST", body: okForm });
    assert.equal(okRes.status, 201, "Valid PNG upload should succeed");
    console.log("  [PASS] SEC-5: Upload endpoint blocks magic-byte spoofing, SVG/XSS, and >5MB files");
  }

  // SEC-6: Cross-Tenant QR Token Replay & Forged Token Rejection
  {
    // Replaying Restaurant A's valid table token against Restaurant B's slug must fail
    const crossReplay = await anon.fetch(`/menu/${slugB}/t/${tokenA}`);
    assert.equal(
      crossReplay.status,
      404,
      "Cross-tenant QR token replay must return 404"
    );

    const forgedToken = await anon.fetch(`/menu/${slugA}/t/forged-invalid-token-12345`);
    assert.equal(forgedToken.status, 404, "Forged table QR token must return 404");

    const apiCrossReplay = await anon.json(`/api/public/menu/${slugB}?token=${tokenA}`);
    assert.equal(apiCrossReplay.status, 404, "Public API cross-tenant token replay must return 404");
    console.log("  [PASS] SEC-6: Cross-tenant QR token replay & forged tokens return 404");
  }

  // SEC-7: Automatic Trial Expiry Transition
  {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { restaurantId: restBId },
      data: { status: "TRIALING", trialEndsAt: pastDate },
    });

    const curB = await ownerB.json("/api/restaurants/current");
    assert.equal(curB.status, 200);
    assert.equal(
      curB.data.restaurant.subscription.status,
      "EXPIRED",
      "Expired trial must auto-transition from TRIALING to EXPIRED"
    );
    console.log("  [PASS] SEC-7: Trial expiry auto-transition verified (TRIALING -> EXPIRED)");
  }

  // SEC-8: Registration Rate Limiting
  {
    const rlClient = new CookieClient();
    let hit429 = false;
    for (let i = 0; i < 18; i++) {
      const res = await rlClient.json("/api/auth/register", {
        method: "POST",
        headers: { "x-forwarded-for": `203.0.113.${suffix.slice(-2)}` },
        body: JSON.stringify({ name: "R", email: "invalid-email", password: "short" }),
      });
      if (res.status === 429) {
        hit429 = true;
        break;
      }
    }
    assert.equal(hit429, true, "Registration rate limiter must trigger 429 after 15 attempts");
    console.log("  [PASS] SEC-8: Rate limiting triggers HTTP 429 after threshold");
  }

  console.log("\nALL 8 CRITICAL SECURITY TESTS PASSED!\n");
}

run()
  .catch((err) => {
    console.error("\nSECURITY AUDIT TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
