/**
 * End-to-End Table Ordering & Payment Flow Verification Script
 * Tests:
 * 1. Customer scanning Table QR
 * 2. Table Cart item selection & order placement
 * 3. Server-side price calculation & tenant isolation
 * 4. Customer UPI Payment simulation & confirmation
 * 5. Restaurant Owner Live Orders monitoring & status transitions (PENDING -> PREPARING -> COMPLETED)
 * 6. Customer live polling order receipt
 * 7. Multi-tenant isolation between Restaurant A & Restaurant B
 * 8. Invalid table token & sold-out item rejection
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
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data, headers: res.headers };
  }

  async login(email: string, pass: string) {
    const csrfRes = await this.json("/api/auth/csrf");
    const csrfToken = csrfRes.data?.csrfToken;
    assert.ok(csrfToken, "CSRF token required");

    const body = new URLSearchParams({
      csrfToken,
      email,
      password: pass,
      callbackUrl: `${BASE_URL}/dashboard`,
      redirect: "false",
    });

    const res = await this.fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return res;
  }
}

async function run() {
  console.log("==================================================================");
  console.log("STARTING END-TO-END TABLE ORDERING & PAYMENT VERIFICATION");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================================\n");

  const nonce = Date.now();
  const ownerA = new CookieClient();
  const ownerB = new CookieClient();
  const customer = new CookieClient();

  const emailA = `order_owner_a_${nonce}@test.com`;
  const emailB = `order_owner_b_${nonce}@test.com`;
  const password = "Password@123456";
  const slugA = `royal-order-test-${nonce}`;
  const slugB = `spice-order-test-${nonce}`;

  // 1. Setup Restaurant A
  console.log("[STEP 1] Setting up Restaurant A...");
  await ownerA.json("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Owner A", email: emailA, password }),
  });
  await ownerA.login(emailA, password);

  const restA = await ownerA.json("/api/restaurants", {
    method: "POST",
    body: JSON.stringify({
      name: "Royal Meerut Diner",
      slug: slugA,
      currency: "INR",
      primaryColor: "#2563EB",
    }),
  });
  assert.equal(restA.status, 201);

  // Add category & menu items
  const catRes = await ownerA.json("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name: "Tandoori Starters", displayOrder: 1 }),
  });
  const catId = catRes.data.category.id;

  const item1Res = await ownerA.json("/api/menu-items", {
    method: "POST",
    body: JSON.stringify({
      categoryId: catId,
      name: "Paneer Tikka Angara",
      price: 260,
      dietaryType: "VEG",
      isAvailable: true,
    }),
  });
  assert.equal(item1Res.status, 201);
  const item1Id = item1Res.data.item.id;

  const item2Res = await ownerA.json("/api/menu-items", {
    method: "POST",
    body: JSON.stringify({
      categoryId: catId,
      name: "Dal Makhani Handi",
      price: 220,
      dietaryType: "VEG",
      isAvailable: true,
    }),
  });
  assert.equal(item2Res.status, 201);
  const item2Id = item2Res.data.item.id;

  const soldOutRes = await ownerA.json("/api/menu-items", {
    method: "POST",
    body: JSON.stringify({
      categoryId: catId,
      name: "Seasonal Gulab Jamun",
      price: 90,
      dietaryType: "VEG",
      isAvailable: false,
    }),
  });
  const soldOutId = soldOutRes.data.item.id;

  // Add Table 3
  const table3Res = await ownerA.json("/api/tables", {
    method: "POST",
    body: JSON.stringify({ tableNumber: "3", capacity: 4 }),
  });
  assert.equal(table3Res.status, 201);
  const table3Token = table3Res.data.table.qrCode.token;
  const table3Id = table3Res.data.table.id;
  assert.ok(table3Token, "Table 3 QR token generated");

  // Publish Restaurant A
  await ownerA.json("/api/restaurants/current", {
    method: "PATCH",
    body: JSON.stringify({ isPublished: true, onboardingCompleted: true }),
  });
  console.log("  [PASS] Restaurant A published with Table 3 QR and Menu items");

  // 2. Customer opens Table 3 QR menu
  console.log("\n[STEP 2] Customer scans Table 3 QR...");
  const tableMenuRes = await customer.fetch(`/menu/${slugA}/t/${table3Token}`);
  assert.equal(tableMenuRes.status, 200);
  const tableHtml = await tableMenuRes.text();
  assert.ok(tableHtml.includes("Table 3"), "Menu displays Table 3 identifier");
  assert.ok(tableHtml.includes("Paneer Tikka Angara"), "Menu displays dish name");
  console.log("  [PASS] Customer sees Table 3 menu with dishes");

  // 3. Customer places order from Table 3
  console.log("\n[STEP 3] Customer places Table 3 Order (2x Paneer Tikka + 1x Dal Makhani)...");
  // 2 * 260 + 1 * 220 = 520 + 220 = 740
  const orderRes = await customer.json("/api/public/orders", {
    method: "POST",
    body: JSON.stringify({
      restaurantSlug: slugA,
      tableToken: table3Token,
      customerName: "Rahul Sharma",
      customerPhone: "+91 98970 12345",
      paymentMethod: "UPI_ONLINE",
      notes: "Please make Paneer Tikka spicy",
      items: [
        { menuItemId: item1Id, quantity: 2, notes: "Spicy" },
        { menuItemId: item2Id, quantity: 1 },
      ],
    }),
  });

  assert.equal(orderRes.status, 201, `Order placement failed: ${JSON.stringify(orderRes.data)}`);
  const orderData = orderRes.data.order;
  assert.ok(orderData.id, "Order ID created");
  assert.ok(orderData.orderNumber.startsWith("ORD-"), "Order number generated");
  assert.equal(orderData.totalAmount, 740, "Total amount accurately calculated by server");
  assert.equal(orderData.tableNumber, "3", "Table accurately mapped to Table 3");
  assert.equal(orderData.status, "PENDING", "Order initially in PENDING status");
  assert.equal(orderData.paymentStatus, "PENDING", "Payment initially PENDING");
  assert.equal(orderData.items.length, 2, "2 order item records created");
  console.log(`  [PASS] Order placed successfully: ${orderData.orderNumber} for ₹${orderData.totalAmount}`);

  // 4. Customer pays via UPI
  console.log("\n[STEP 4] Customer confirms UPI payment...");
  const payRes = await customer.json(`/api/public/orders/${orderData.id}/pay`, {
    method: "POST",
    body: JSON.stringify({
      paymentMethod: "UPI_ONLINE",
      transactionRef: "UPI-TXN-987654321",
    }),
  });
  assert.equal(payRes.status, 200);
  assert.equal(payRes.data.order.paymentStatus, "PAID", "Payment status updated to PAID");
  assert.equal(payRes.data.order.status, "CONFIRMED", "Order status advanced to CONFIRMED");
  console.log("  [PASS] UPI payment confirmed and status moved to CONFIRMED");

  // 5. Restaurant Owner checks Live Orders
  console.log("\n[STEP 5] Restaurant Owner views Live Orders...");
  const liveOrdersRes = await ownerA.json("/api/orders");
  assert.equal(liveOrdersRes.status, 200);
  const foundOrder = liveOrdersRes.data.orders.find((o: any) => o.id === orderData.id);
  assert.ok(foundOrder, "Placed order found in owner's live orders list");
  assert.equal(foundOrder.paymentStatus, "PAID");
  assert.equal(foundOrder.table?.tableNumber, "3");
  assert.equal(foundOrder.customerName, "Rahul Sharma");
  assert.equal(foundOrder.totalAmount, 740);
  console.log("  [PASS] Owner sees Table 3 order in Live Orders dashboard");

  // 6. Owner transitions order: CONFIRMED -> PREPARING -> COMPLETED
  console.log("\n[STEP 6] Owner kitchen workflow transitions...");
  const prepRes = await ownerA.json(`/api/orders/${orderData.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "PREPARING" }),
  });
  assert.equal(prepRes.status, 200);
  assert.equal(prepRes.data.order.status, "PREPARING");

  // Customer polls and sees PREPARING
  const custPoll = await customer.json(`/api/public/orders/${orderData.id}`);
  assert.equal(custPoll.status, 200);
  assert.equal(custPoll.data.order.status, "PREPARING");
  console.log("  [PASS] Customer poll sees live status: PREPARING");

  // Owner marks COMPLETED
  const completeRes = await ownerA.json(`/api/orders/${orderData.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "COMPLETED" }),
  });
  assert.equal(completeRes.status, 200);
  assert.equal(completeRes.data.order.status, "COMPLETED");
  console.log("  [PASS] Owner completes order: COMPLETED");

  // 7. Multi-Tenant Isolation Checks
  console.log("\n[STEP 7] Verifying Multi-Tenant Isolation...");
  await ownerB.json("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Owner B", email: emailB, password }),
  });
  await ownerB.login(emailB, password);
  await ownerB.json("/api/restaurants", {
    method: "POST",
    body: JSON.stringify({
      name: "Spice Garden Meerut",
      slug: slugB,
      currency: "INR",
    }),
  });

  // Owner B cannot see Owner A's orders
  const ownerBOrders = await ownerB.json("/api/orders");
  assert.equal(ownerBOrders.status, 200);
  assert.equal(ownerBOrders.data.orders.length, 0, "Restaurant B must not see Restaurant A's orders");

  // Owner B cannot modify Owner A's order
  const idorAttack = await ownerB.json(`/api/orders/${orderData.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "CANCELLED" }),
  });
  assert.equal(idorAttack.status, 404, "Cross-tenant order modification must be rejected with 404");
  console.log("  [PASS] Multi-tenant isolation verified: Restaurant B cannot view or tamper with Restaurant A's orders");

  // 8. Rejection of Sold-Out items & forged table tokens
  console.log("\n[STEP 8] Verifying validation guards...");
  const soldOutAttempt = await customer.json("/api/public/orders", {
    method: "POST",
    body: JSON.stringify({
      restaurantSlug: slugA,
      tableToken: table3Token,
      paymentMethod: "CASH_AT_COUNTER",
      items: [{ menuItemId: soldOutId, quantity: 1 }],
    }),
  });
  assert.equal(soldOutAttempt.status, 400, "Sold out item order must be rejected");
  assert.ok(soldOutAttempt.data.error.includes("sold out"));
  console.log("  [PASS] Sold-out item properly rejected");

  const invalidTokenAttempt = await customer.json("/api/public/orders", {
    method: "POST",
    body: JSON.stringify({
      restaurantSlug: slugA,
      tableToken: "non_existent_fake_token_123",
      paymentMethod: "CASH_AT_COUNTER",
      items: [{ menuItemId: item1Id, quantity: 1 }],
    }),
  });
  assert.equal(invalidTokenAttempt.status, 400, "Invalid table token order must be rejected");
  console.log("  [PASS] Invalid table token properly rejected");

  console.log("\n==================================================================");
  console.log("ALL TABLE ORDERING & PAYMENT TESTS PASSED CLEANLY! (8/8 PASSED)");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
