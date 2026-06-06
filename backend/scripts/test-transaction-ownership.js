#!/usr/bin/env node
/**
 * Integration test — Phase 10G.2A: Transaction Branch + Employee Ownership
 *
 * Verifies that branchId and createdByEmployeeId are correctly stamped on
 * Appointment, Deposit, Invoice, and Payment from X-Branch-Id + JWT.
 *
 * Prerequisites:
 *   • Backend running on BASE_URL (default: http://localhost:3000)
 *   • A staff user (non-SUPER_ADMIN) with employeeId + at least one EmployeeBranch
 *   • Set the env vars below, or add a .env file with the values
 *
 * Required env vars:
 *   LOGIN_EMAIL          staff user email
 *   LOGIN_PASSWORD       staff user password
 *   TEST_CUSTOMER_ID     existing customer UUID
 *   TEST_PAYMENT_METHOD  existing payment method UUID
 *   TEST_ITEM_ID         existing item UUID
 *   TEST_UNIT_ID         existing unit UUID for that item
 *
 * Run:
 *   node backend/scripts/test-transaction-ownership.js
 */

"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

// ── ⚙ Configuration ───────────────────────────────────────────────────────────

const BASE_URL          = process.env.BASE_URL          || "http://localhost:3000";
const LOGIN_EMAIL       = process.env.LOGIN_EMAIL        || "staff@niahairextension.com";
const LOGIN_PASSWORD    = process.env.LOGIN_PASSWORD     || "password123";
const CUSTOMER_ID       = process.env.TEST_CUSTOMER_ID;
const PAYMENT_METHOD_ID = process.env.TEST_PAYMENT_METHOD;
const ITEM_ID           = process.env.TEST_ITEM_ID;
const UNIT_ID           = process.env.TEST_UNIT_ID;

const FAKE_BRANCH_ID    = "00000000-0000-0000-0000-000000000000";

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

const pass = (label) => { passed++; console.log(`  ✅ ${label}`); };
const fail = (label, detail) => {
  failed++;
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     → ${detail}`);
};

const assert = (condition, label, detail) =>
  condition ? pass(label) : fail(label, detail ?? "assertion failed");

const api = async (method, path, { body, token, branchId } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (token)    headers["Authorization"]  = `Bearer ${token}`;
  if (branchId) headers["X-Branch-Id"]    = branchId;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }
  // method + path carried along so assertStatus can print them on failure
  return { status: res.status, data, method, path };
};

// Asserts an HTTP status; on failure prints method, URL, status, and full body.
// expected can be a single number or an array of acceptable codes.
const assertStatus = (res, expected, label) => {
  const ok = Array.isArray(expected)
    ? expected.includes(res.status)
    : res.status === expected;

  const expectedStr = Array.isArray(expected) ? expected.join(" or ") : String(expected);

  if (ok) {
    pass(label ?? `HTTP ${expectedStr}`);
    return;
  }

  fail(label ?? `HTTP ${expectedStr}`, `got ${res.status}`);
  const body = JSON.stringify(res.data, null, 2)
    .split("\n")
    .map((l) => `  │  ${l}`)
    .join("\n");
  console.log(`\n  ┌─ DEBUG ──────────────────────────────────────────`);
  console.log(`  │  ❌ ${res.method} ${BASE_URL}${res.path}`);
  console.log(`  │  Status: ${res.status}`);
  console.log(`  │  Response:`);
  console.log(body);
  console.log(`  └────────────────────────────────────────────────────\n`);
};

const entity = (res) => res.data?.data;

// ── Config guard ──────────────────────────────────────────────────────────────

const checkConfig = () => {
  const missing = [];
  if (!CUSTOMER_ID)       missing.push("TEST_CUSTOMER_ID");
  if (!PAYMENT_METHOD_ID) missing.push("TEST_PAYMENT_METHOD");
  if (!ITEM_ID)           missing.push("TEST_ITEM_ID");
  if (!UNIT_ID)           missing.push("TEST_UNIT_ID");
  if (missing.length) {
    console.error(`\n[CONFIG ERROR] Missing env vars:\n  ${missing.join("\n  ")}`);
    console.error(`\nSet these in your .env file or as environment variables.\n`);
    process.exit(1);
  }
};

// ── Main ──────────────────────────────────────────────────────────────────────

const run = async () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   PHASE 10G.2A — TRANSACTION OWNERSHIP TEST  ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  checkConfig();

  let token, employeeId, branchId, secondBranchId;

  // ── Step 1: Login ──────────────────────────────────────────────────────────

  console.log("Step 1 — Login");
  {
    const res = await api("POST", "/auth/login", {
      body: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
    });

    assertStatus(res, 200,              "HTTP 200");
    assert(!!res.data?.data?.token,     "token present");

    const user = res.data?.data?.user;
    assert(!!user?.employeeId,          "user.employeeId set");
    assert(Array.isArray(user?.branches) && user.branches.length > 0,
                                        `branches populated (${user?.branches?.length ?? 0} found)`);

    if (res.status !== 200 || !user?.employeeId || !user?.branches?.length) {
      console.error("\n  FATAL: Login failed or user has no employeeId / branches.");
      console.error("  Ensure the staff user has an Employee linked and at least one EmployeeBranch.\n");
      process.exit(1);
    }

    token        = res.data.data.token;
    employeeId   = user.employeeId;
    branchId     = user.branches[0].branch.id;
    secondBranchId = user.branches.length > 1 ? user.branches[1].branch.id : null;

    console.log(`  ℹ  employeeId = ${employeeId}`);
    console.log(`  ℹ  branchId   = ${branchId}`);
    if (secondBranchId) console.log(`  ℹ  branch2    = ${secondBranchId}`);
  }
  console.log();

  // ── Step 2: Appointment ownership ─────────────────────────────────────────

  console.log("Step 2 — Appointment ownership");
  let appointmentId;
  {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();

    const res = await api("POST", "/appointments", {
      token,
      branchId,           // X-Branch-Id header
      body: {
        customerId:    CUSTOMER_ID,
        // branchId intentionally absent — must come from header
        visitDate:     tomorrow,
        startTime:     tomorrow,
        endTime:       new Date(Date.now() + 86_400_000 + 3_600_000).toISOString(),
      },
    });

    assertStatus(res, 201,               "HTTP 201 created");

    const appt = entity(res);
    appointmentId = appt?.id;

    assert(appt?.branch?.id === branchId,
      `branch.id = ${branchId}`,
      `got ${appt?.branch?.id}`);

    assert(appt?.createdByEmployee?.id === employeeId,
      `createdByEmployee.id = ${employeeId}`,
      `got ${appt?.createdByEmployee?.id}`);
  }
  console.log();

  // ── Step 3: Deposit ownership ──────────────────────────────────────────────

  console.log("Step 3 — Deposit ownership");
  let depositedInvoiceId;
  {
    const res = await api("POST", `/appointments/${appointmentId}/deposits`, {
      token,
      branchId,
      body: {
        paymentMethodId: PAYMENT_METHOD_ID,
        amount:          100000,
      },
    });

    assertStatus(res, 201,               "HTTP 201 created");

    const dep = entity(res);

    assert(dep?.branch?.id === branchId,
      `branch.id = ${branchId}`,
      `got ${dep?.branch?.id}`);

    assert(dep?.createdByEmployee?.id === employeeId,
      `createdByEmployee.id = ${employeeId}`,
      `got ${dep?.createdByEmployee?.id}`);
  }
  console.log();

  // ── Step 4: Invoice ownership ──────────────────────────────────────────────

  console.log("Step 4 — Invoice ownership");
  let invoiceId;
  {
    const res = await api("POST", "/invoices", {
      token,
      branchId,
      body: {
        customerId: CUSTOMER_ID,
        // branchId intentionally absent — must come from header
        items: [{ itemId: ITEM_ID, unitId: UNIT_ID, qty: 1 }],
      },
    });

    assertStatus(res, 201,               "HTTP 201 created");

    const inv = entity(res);
    invoiceId = inv?.id;

    assert(inv?.branch?.id === branchId,
      `branch.id = ${branchId}`,
      `got ${inv?.branch?.id}`);

    assert(inv?.createdByEmployee?.id === employeeId,
      `createdByEmployee.id = ${employeeId}`,
      `got ${inv?.createdByEmployee?.id}`);

    assert(inv?.status === "UNPAID" || inv?.status === "PARTIAL" || inv?.status === "PAID",
      `invoice status is a valid value (${inv?.status})`);
  }
  console.log();

  // ── Step 5: Payment ownership ──────────────────────────────────────────────

  console.log("Step 5 — Payment ownership");
  {
    const res = await api("POST", `/invoices/${invoiceId}/payments`, {
      token,
      branchId,
      body: {
        paymentMethodId: PAYMENT_METHOD_ID,
        amount:          1,       // small payment — avoids complications with paid status
        paymentDate:     new Date().toISOString(),
      },
    });

    // 201 = payment created; 422 = already PAID (if deposit covered it) — both acceptable
    assertStatus(res, [201, 422],        "HTTP 201 created or 422 already paid");

    if (res.status === 201) {
      const pay = entity(res);

      assert(pay?.invoice?.id === invoiceId,
        `payment.invoice.id = ${invoiceId}`);

      assert(pay?.branch?.id === branchId,
        `branch.id = ${branchId}`,
        `got ${pay?.branch?.id}`);

      assert(pay?.createdByEmployee?.id === employeeId,
        `createdByEmployee.id = ${employeeId}`,
        `got ${pay?.createdByEmployee?.id}`);
    } else {
      console.log(`  ℹ  Invoice already PAID (covered by deposit) — payment ownership checks skipped`);
    }
  }
  console.log();

  // ── Step 6: Branch security — fake branch ID ──────────────────────────────

  console.log("Step 6 — Branch security (fake branch ID)");
  {
    const res = await api("POST", `/appointments/${appointmentId}/deposits`, {
      token,
      branchId: FAKE_BRANCH_ID,   // non-existent branch
      body: {
        paymentMethodId: PAYMENT_METHOD_ID,
        amount:          50000,
      },
    });

    assertStatus(res, 403,               "fake branch → 403 Forbidden");
  }
  console.log();

  // ── Step 7: Payment branch mismatch ───────────────────────────────────────

  console.log("Step 7 — Payment branch mismatch");
  {
    if (!secondBranchId) {
      console.log("  ℹ  User only has one branch — mismatch test skipped");
      pass("skipped (single-branch user)");
    } else {
      // Invoice was created on branchId; attempt payment with secondBranchId
      const res = await api("POST", `/invoices/${invoiceId}/payments`, {
        token,
        branchId: secondBranchId,
        body: {
          paymentMethodId: PAYMENT_METHOD_ID,
          amount:          1,
        },
      });

      assertStatus(res, 403,             "different branch → 403 Branch mismatch");
    }
  }
  console.log();

  // ── Final summary ──────────────────────────────────────────────────────────

  const total = passed + failed;
  console.log("══════════════════════════════════════════════");
  console.log(`RESULTS: ${passed}/${total} passed`);
  if (failed === 0) {
    console.log("\nFINAL:\nTRANSACTION OWNERSHIP PASSED ✅\n");
  } else {
    console.log(`\nFINAL:\nTRANSACTION OWNERSHIP FAILED ❌ (${failed} assertion(s) failed)\n`);
    process.exit(1);
  }
};

run().catch((err) => {
  console.error("\n[FATAL]", err.message);
  process.exit(1);
});
