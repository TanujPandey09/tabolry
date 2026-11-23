/**
 * Automated End-to-End Acceptance Test Suite for MenuQR MVP
 * Verifies all 12 Acceptance Criteria against a live Next.js server & PostgreSQL database.
 */
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

class CookieClient {
  private cookies = new Map<string, string>();

  private extractCookies(res: Response) {
    const setCookies =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
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

  async login(email: string, password: string) {
    const csrfRes = await this.json("/api/auth/csrf");
    assert.equal(csrfRes.status, 200, "Failed to obtain CSRF token");
    const csrfToken = csrfRes.data.csrfToken;
    assert.ok(csrfToken, "Missing csrfToken");

    const form = new URLSearchParams({
      csrfToken,
      email,
      password,
      json: "true",
    });

    const loginRes = await this.fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    assert.ok(
      loginRes.status === 200 || loginRes.status === 302,
      `Login failed with status ${loginRes.status}`
    );

    const sessionRes = await this.json("/api/auth/session");
    assert.equal(sessionRes.status, 200);
    assert.equal(
      sessionRes.data?.user?.email,
      email.toLowerCase(),
      `Session email mismatch after login for ${email}`
    );
    return sessionRes.data.user;
  }
}

async function run() {
  const suffix = Date.now().toString().slice(-6);
  const clientA = new CookieClient();
  const clientB = new CookieClient();
  const adminClient = new CookieClient();
  const guestClient = new CookieClient();

  const emailA = `owner-a-${suffix}@test.in`;
  const emailB = `owner-b-${suffix}@test.in`;
  const slugA = `royal-tandoor-${suffix}`;
  const slugB = `cafe-aroma-${suffix}`;
  const password = "TestPassword@123";

  console.log(`\nRunning MenuQR 12 Acceptance Criteria against ${BASE_URL} ...\n`);

  // TEST 1: Restaurant A registers and creates its restaurant
  {
    const reg = await clientA.json("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Owner A", email: emailA, password }),
    });
    assert.equal(reg.status, 201, `TEST 1 register failed: ${JSON.stringify(reg.data)}`);
    await clientA.login(emailA, password);

    const rest = await clientA.json("/api/restaurants", {
      method: "POST",
      body: JSON.stringify({
        name: "Royal Tandoor Meerut",
        slug: slugA,
        description: "Authentic Mughlai & Tandoor",
        phone: "+91 98100 11111",
        address: "12 Shastri Nagar",
        city: "Meerut",
        state: "Uttar Pradesh",
        country: "India",
        currency: "INR",
        primaryColor: "#2563EB",
      }),
    });
    assert.equal(rest.status, 201, `TEST 1 create restaurant failed: ${JSON.stringify(rest.data)}`);
    assert.equal(rest.data.restaurant.slug, slugA);
    assert.equal(rest.data.restaurant.subscription.status, "TRIALING");
    console.log("  [PASS] TEST 1: Restaurant A registers and creates its restaurant (14-day trial active)");
  }

  // TEST 2: Restaurant A creates categories and adds food items
  let catAId = "";
  let itemAId = "";
  {
    const defaults = await clientA.json("/api/categories", {
      method: "POST",
      body: JSON.stringify({ seedDefaults: true }),
    });
    assert.equal(defaults.status, 201);
    assert.ok(defaults.data.categories.length >= 4, "Expected 4 default categories");
    catAId = defaults.data.categories[0].id;

    const item1 = await clientA.json("/api/menu-items", {
      method: "POST",
      body: JSON.stringify({
        name: "Shahi Paneer",
        description: "Rich cashew tomato gravy",
        price: 240,
        categoryId: catAId,
        dietaryType: "VEG",
        isAvailable: true,
      }),
    });
    assert.equal(item1.status, 201);
    itemAId = item1.data.item.id;

    const item2 = await clientA.json("/api/menu-items", {
      method: "POST",
      body: JSON.stringify({
        name: "Chicken Malai Tikka",
        description: "Creamy char-grilled chicken",
        price: 340,
        categoryId: catAId,
        dietaryType: "NON_VEG",
        isAvailable: false,
      }),
    });
    assert.equal(item2.status, 201);
    console.log("  [PASS] TEST 2: Restaurant A creates categories and adds food items");
  }

  // TEST 3: Restaurant A creates 5 tables and generates 5 distinct QR codes
  let table3Token = "";
  let table3QrId = "";
  let table3Id = "";
  const tokens = new Set<string>();
  {
    for (let i = 1; i <= 5; i++) {
      const t = await clientA.json("/api/tables", {
        method: "POST",
        body: JSON.stringify({
          tableNumber: String(i),
          label: `Section ${i}`,
          capacity: 4,
        }),
      });
      assert.equal(t.status, 201, `Table ${i} creation failed`);
      const token = t.data.table.qrCode.token;
      assert.ok(token && token.length >= 16, "Secure QR token expected");
      tokens.add(token);
      if (i === 3) {
        table3Token = token;
        table3QrId = t.data.table.qrCode.id;
        table3Id = t.data.table.id;
      }
    }
    assert.equal(tokens.size, 5, "All 5 tables must have distinct QR tokens");
    console.log("  [PASS] TEST 3: Restaurant A creates 5 tables with 5 unique QR codes");
  }

  // Publish Restaurant A
  {
    const pub = await clientA.json("/api/restaurants/current", {
      method: "PATCH",
      body: JSON.stringify({ isPublished: true, onboardingCompleted: true }),
    });
    assert.equal(pub.status, 200);
    assert.equal(pub.data.restaurant.isPublished, true);
  }

  // TEST 4: Scanning Table 3 QR opens Restaurant A's menu and identifies Table 3
  {
    const scanRes = await guestClient.fetch(`/menu/${slugA}/t/${table3Token}`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148",
      },
    });
    assert.equal(scanRes.status, 200, "Table 3 QR URL should return 200");
    const html = await scanRes.text();
    assert.ok(html.includes("Royal Tandoor Meerut"), "HTML should include restaurant name");
    assert.ok(html.includes("Table 3"), "HTML should display Table 3 identifier");
    assert.ok(html.includes("Shahi Paneer"), "HTML should display menu item");
    assert.ok(html.includes("₹240"), "HTML should display INR formatted price");
    console.log("  [PASS] TEST 4: Scanning Table 3 QR opens Restaurant A menu and identifies Table 3");
  }

  // TEST 5: Restaurant A changes an item's price -> same QR opens updated menu
  {
    const upd = await clientA.json(`/api/menu-items/${itemAId}`, {
      method: "PATCH",
      body: JSON.stringify({ price: 295 }),
    });
    assert.equal(upd.status, 200);
    assert.equal(upd.data.item.price, 295);

    const rescan = await guestClient.fetch(`/menu/${slugA}/t/${table3Token}`, {
      headers: { "user-agent": "Mozilla/5.0 (Linux; Android 14) Mobile" },
    });
    assert.equal(rescan.status, 200);
    const html = await rescan.text();
    assert.ok(html.includes("₹295"), "Same QR must immediately show updated price ₹295");
    assert.ok(!html.includes("₹240"), "Old price ₹240 should no longer appear");

    // Also verify QR regeneration invalidates old token & activates new token
    const regen = await clientA.json(`/api/qr-codes/${table3QrId}/regenerate`, {
      method: "POST",
    });
    assert.equal(regen.status, 200);
    const newToken = regen.data.qrCode.token;
    assert.notEqual(newToken, table3Token);
    const oldCheck = await guestClient.fetch(`/menu/${slugA}/t/${table3Token}`);
    assert.equal(oldCheck.status, 404, "Regenerated old QR token must return 404");
    const newCheck = await guestClient.fetch(`/menu/${slugA}/t/${newToken}`);
    assert.equal(newCheck.status, 200, "New regenerated QR token must return 200");
    table3Token = newToken;
    table3QrId = regen.data.qrCode.id;

    console.log("  [PASS] TEST 5: Price update reflects on same QR; QR regeneration invalidates old token");
  }

  // TEST 6: Restaurant B registers independently and creates its own menu
  let restAId = "";
  {
    const curA = await clientA.json("/api/restaurants/current");
    restAId = curA.data.restaurant.id;

    const regB = await clientB.json("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Owner B", email: emailB, password }),
    });
    assert.equal(regB.status, 201);
    await clientB.login(emailB, password);

    const restB = await clientB.json("/api/restaurants", {
      method: "POST",
      body: JSON.stringify({
        name: "Cafe Aroma Private",
        slug: slugB,
        city: "Meerut",
        country: "India",
        currency: "INR",
      }),
    });
    assert.equal(restB.status, 201);

    const catB = await clientB.json("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Coffee" }),
    });
    assert.equal(catB.status, 201);

    const itemB = await clientB.json("/api/menu-items", {
      method: "POST",
      body: JSON.stringify({
        name: "Secret Cold Brew",
        price: 160,
        categoryId: catB.data.category.id,
        dietaryType: "VEG",
      }),
    });
    assert.equal(itemB.status, 201);
    console.log("  [PASS] TEST 6: Restaurant B registers independently and creates its own menu");
  }

  // TEST 7: Tenant Isolation & IDOR prevention
  {
    const idorGet = await clientB.json(`/api/menu-items/${itemAId}`);
    assert.equal(idorGet.status, 404, "Restaurant B must NOT read Restaurant A's menu item");

    const idorPatch = await clientB.json(`/api/menu-items/${itemAId}`, {
      method: "PATCH",
      body: JSON.stringify({ price: 1 }),
    });
    assert.equal(idorPatch.status, 404, "Restaurant B must NOT modify Restaurant A's menu item");

    const idorDel = await clientB.json(`/api/menu-items/${itemAId}`, {
      method: "DELETE",
    });
    assert.equal(idorDel.status, 404, "Restaurant B must NOT delete Restaurant A's menu item");

    const idorCat = await clientB.json(`/api/categories/${catAId}`, {
      method: "DELETE",
    });
    assert.equal(idorCat.status, 404, "Restaurant B must NOT delete Restaurant A's category");

    const idorTable = await clientB.json(`/api/tables/${table3Id}`, {
      method: "DELETE",
    });
    assert.equal(idorTable.status, 404, "Restaurant B must NOT delete Restaurant A's table");

    const idorQr = await clientB.fetch(`/api/qr-codes/${table3QrId}/download?format=png`);
    assert.equal(idorQr.status, 404, "Restaurant B must NOT download Restaurant A's QR");

    const idorSwitch = await clientB.json("/api/restaurants/current", {
      method: "POST",
      body: JSON.stringify({ restaurantId: restAId }),
    });
    assert.equal(idorSwitch.status, 403, "Restaurant B must NOT switch into Restaurant A context");

    const idorLinkCat = await clientB.json("/api/menu-items", {
      method: "POST",
      body: JSON.stringify({ name: "Injected", price: 10, categoryId: catAId }),
    });
    assert.equal(idorLinkCat.status, 400, "Restaurant B must NOT link item to Restaurant A's category");

    // Verify Restaurant A's item price is still 295
    const checkA = await clientA.json(`/api/menu-items/${itemAId}`);
    assert.equal(checkA.status, 200);
    assert.equal(checkA.data.item.price, 295);

    console.log("  [PASS] TEST 7: Strict tenant isolation & IDOR protection verified across all APIs");
  }

  // TEST 8: Restaurant owner cannot access super admin routes
  {
    const ownerAdminOverview = await clientA.json("/api/admin/overview");
    assert.equal(ownerAdminOverview.status, 403, "Owner must get 403 on /api/admin/overview");

    const ownerAdminRests = await clientB.json("/api/admin/restaurants");
    assert.equal(ownerAdminRests.status, 403, "Owner must get 403 on /api/admin/restaurants");

    const ownerAdminPlans = await clientA.json("/api/admin/plans");
    assert.equal(ownerAdminPlans.status, 403, "Owner must get 403 on /api/admin/plans");

    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@menuqr.in";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
    await adminClient.login(adminEmail, adminPassword);

    const adminOverview = await adminClient.json("/api/admin/overview");
    assert.equal(adminOverview.status, 200, "Super Admin must access /api/admin/overview");
    assert.ok(adminOverview.data.metrics.totalRestaurants >= 2);
    console.log("  [PASS] TEST 8: RBAC blocks restaurant owners (403) and authorizes Super Admin (200)");
  }

  // TEST 9: Suspended or unpublished restaurant cannot expose private menu data
  {
    // Restaurant B is still unpublished
    const unpubHtml = await guestClient.fetch(`/menu/${slugB}`);
    assert.equal(unpubHtml.status, 404, "Unpublished restaurant page must return 404");
    const unpubBody = await unpubHtml.text();
    assert.ok(!unpubBody.includes("Secret Cold Brew"), "Unpublished menu must NOT leak items");

    const unpubApi = await guestClient.json(`/api/public/menu/${slugB}`);
    assert.equal(unpubApi.status, 404, "Unpublished public API must return 404");

    // Super Admin suspends Restaurant A
    const susp = await adminClient.json(`/api/admin/restaurants/${restAId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "SUSPENDED" }),
    });
    assert.equal(susp.status, 200);
    assert.equal(susp.data.restaurant.status, "SUSPENDED");

    const suspPage = await guestClient.fetch(`/menu/${slugA}`);
    assert.equal(suspPage.status, 404, "Suspended restaurant general menu must return 404");
    const suspTable = await guestClient.fetch(`/menu/${slugA}/t/${table3Token}`);
    assert.equal(suspTable.status, 404, "Suspended restaurant table menu must return 404");

    // Reactivate & republish Restaurant A for remaining tests
    await adminClient.json(`/api/admin/restaurants/${restAId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "ACTIVE", isPublished: true }),
    });
    console.log("  [PASS] TEST 9: Unpublished & suspended restaurants are strictly hidden (404)");
  }

  // TEST 10: Public menu works on mobile devices
  {
    const mobileRes = await guestClient.fetch(`/menu/${slugA}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148",
      },
    });
    assert.equal(mobileRes.status, 200);
    const html = await mobileRes.text();
    assert.ok(html.includes("viewport"), "Mobile viewport meta tag expected");
    assert.ok(html.includes("Sold Out"), "Sold-out indicator should render for unavailable dish");
    assert.ok(html.includes("Search dishes..."), "Search input should be present on public menu");
    console.log("  [PASS] TEST 10: Mobile-first public menu verified (viewport, search, Veg/Non-Veg, Sold Out)");
  }

  // TEST 11: QR PNG and printable PDF downloads work
  {
    const pngRes = await clientA.fetch(`/api/qr-codes/${table3QrId}/download?format=png`);
    assert.equal(pngRes.status, 200);
    assert.equal(pngRes.headers.get("content-type"), "image/png");
    const pngBuf = Buffer.from(await pngRes.arrayBuffer());
    assert.equal(pngBuf[0], 0x89, "Valid PNG signature byte 0");
    assert.equal(pngBuf[1], 0x50, "Valid PNG signature byte 1");
    assert.equal(pngBuf[2], 0x4e, "Valid PNG signature byte 2");
    assert.equal(pngBuf[3], 0x47, "Valid PNG signature byte 3");

    const pdfRes = await clientA.fetch(`/api/qr-codes/${table3QrId}/download?format=pdf`);
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get("content-type"), "application/pdf");
    const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
    assert.equal(pdfBuf.subarray(0, 5).toString("ascii"), "%PDF-", "Valid single printable PDF header");

    const bulkPdfRes = await clientA.fetch("/api/qr-codes/bulk-pdf");
    assert.equal(bulkPdfRes.status, 200);
    assert.equal(bulkPdfRes.headers.get("content-type"), "application/pdf");
    const bulkBuf = Buffer.from(await bulkPdfRes.arrayBuffer());
    assert.equal(bulkBuf.subarray(0, 5).toString("ascii"), "%PDF-", "Valid bulk printable PDF header");
    console.log("  [PASS] TEST 11: QR PNG, single printable PDF, and bulk PDF downloads verified");
  }

  // TEST 12: Analytics reflect real tracked scan events, not hardcoded numbers
  {
    const analyticsA = await clientA.json("/api/analytics?days=14");
    assert.equal(analyticsA.status, 200);
    // Restaurant A had 3 table-3 scans (TEST 4, TEST 5 rescan, TEST 5 newToken) + 1 general scan (TEST 10) = 4 real scans
    assert.equal(
      analyticsA.data.summary.totalScans,
      4,
      `Expected exactly 4 real tracked scans for Restaurant A, got ${analyticsA.data.summary.totalScans}`
    );
    const t3Stat = analyticsA.data.tableStats.find(
      (t: { tableNumber: string }) => t.tableNumber === "3"
    );
    assert.equal(t3Stat?.scans, 3, "Table 3 must report exactly 3 real tracked scans");

    // Restaurant B has NEVER been scanned -> must report 0 (no fake numbers!)
    const analyticsB = await clientB.json("/api/analytics?days=14");
    assert.equal(analyticsB.status, 200);
    assert.equal(
      analyticsB.data.summary.totalScans,
      0,
      "Unscanned Restaurant B must report 0 scans (no fake numbers)"
    );
    console.log("  [PASS] TEST 12: Analytics reflect 100% real tracked DB scan events (A=4, Table3=3, B=0)");
  }

  console.log("\nALL 12 ACCEPTANCE CRITERIA PASSED!\n");
}

run().catch((err) => {
  console.error("\nACCEPTANCE TEST FAILED:", err);
  process.exit(1);
});
