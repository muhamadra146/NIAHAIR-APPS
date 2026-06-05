#!/usr/bin/env node
/**
 * Integration test — Phase 10E.1: Full Salon Flow
 *
 * Tests the complete happy path:
 *   Appointment creation + status transitions (BOOKED → IN_PROGRESS)
 *   Deposit creation and linkage
 *   Treatment session + item + employee assignments
 *   Invoice creation with deposit applied
 *   Payment → invoice transitions to PAID
 *   TreatmentSession.completedAt is populated
 *   Appointment transitions to COMPLETED
 *   Commissions generated with correct amounts for each employee
 *
 * NOTE: Each run inserts real rows. No automatic cleanup.
 *
 * Prerequisites:
 *   • Backend running on BASE_URL (default: http://localhost:3000)
 *   • Set LOGIN_EMAIL / LOGIN_PASSWORD env vars OR edit the defaults below
 *
 * Run:
 *   node backend/scripts/test-phase-10e1.js
 *
 *   or with custom credentials:
 *   LOGIN_EMAIL=cashier@example.com LOGIN_PASSWORD=secret node backend/scripts/test-phase-10e1.js
 */

"use strict";

// ── ⚙ Configuration ───────────────────────────────────────────────────────────

const BASE_URL       = process.env.BASE_URL      || "http://localhost:3000";
const LOGIN_EMAIL    = process.env.LOGIN_EMAIL    || "admin@niahairextension.com";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "password123";

// ── Fixed IDs from the test spec ──────────────────────────────────────────────

const ITEM_ID       = "3f60abc1-12fc-4f79-94da-ae924f51ec23";
const UNIT_ID       = "9f8ddd74-3408-40b7-85b0-16dd02c78046";
const EMPLOYEE_A_ID = "47d18532-463d-4f4a-8f83-1541876a3cc0";
const EMPLOYEE_B_ID = "b9cd96c2-4137-444f-a365-342d692fcc2b";

// ── Expected values ───────────────────────────────────────────────────────────

const EXPECTED = {
  subtotal:             4_350_000,
  totalDeposit:           500_000,
  outstandingAmount:    3_850_000,
  invoiceStatusBefore:  "PARTIAL",
  invoiceStatusAfter:   "PAID",
  commissionCount:      2,
  commissionA:          145_000,   // Employee A (workQty 40)
  commissionB:           72_500,   // Employee B (workQty 20)
};

// ── HTTP helper ───────────────────────────────────────────────────────────────

let AUTH_TOKEN = "";

async function api(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;

  const options = { method, headers };
  if (body !== undefined) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${path}`, options);
  const json     = await response.json().catch(() => null);

  if (!response.ok) {
    const msg  = json?.message ?? json?.error ?? response.statusText;
    const err  = new Error(`${method} ${path} → HTTP ${response.status}: ${msg}`);
    err.status = response.status;
    err.body   = json;
    throw err;
  }

  return json;
}

// Unwrap paginated list: handles { data: { data: [...] } } and { data: [...] }
function list(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

// Unwrap single entity: handles { data: { ... } }
function entity(res) {
  return res?.data ?? null;
}

// Round Decimal strings to integer for comparison
function num(v) {
  return Math.round(Number(v ?? 0));
}

// ── Assertion helpers ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, pass, actual, expected) {
  if (pass) {
    console.log(`  ✅ PASS  ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL  ${label}`);
    console.log(`           expected : ${JSON.stringify(expected)}`);
    console.log(`           actual   : ${JSON.stringify(actual)}`);
    failed++;
  }
}

function section(title) {
  const pad = "─".repeat(Math.max(2, 55 - title.length));
  console.log(`\n── ${title} ${pad}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(60));
  console.log("  PHASE 10E.1 — Integration Test: Full Salon Flow");
  console.log(`  ${new Date().toISOString()}`);
  console.log("═".repeat(60));

  // ── Step 1: Login ──────────────────────────────────────────────────────────

  section("1 — Login");

  const loginRes = await api("POST", "/auth/login", {
    email:    LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
  });
  AUTH_TOKEN = loginRes?.data?.token ?? loginRes?.token ?? "";
  assert("Login returns JWT", !!AUTH_TOKEN, typeof AUTH_TOKEN === "string" ? "…" + AUTH_TOKEN.slice(-8) : AUTH_TOKEN, "<JWT>");

  // ── Resolve master data from DB ────────────────────────────────────────────

  section("Resolve — Customer / Branch / PaymentMethod");

  const customers = list(await api("GET", "/customers?limit=1"));
  const customer  = customers[0];
  assert("Customer exists in DB", !!customer, customer?.id, "<any customer UUID>");

  const branches = list(await api("GET", "/branches?limit=1"));
  const branch   = branches[0];
  assert("Branch exists in DB", !!branch, branch?.id, "<any branch UUID>");

  const pms = list(await api("GET", "/payment-methods?isActive=true&limit=1"));
  const pm  = pms[0];
  assert("Active PaymentMethod exists in DB", !!pm, pm?.id, "<any payment method UUID>");

  const CUSTOMER_ID = customer.id;
  const BRANCH_ID   = branch.id;
  const PM_ID       = pm.id;

  console.log(`\n  customer       : ${CUSTOMER_ID}`);
  console.log(`  branch         : ${BRANCH_ID}`);
  console.log(`  paymentMethod  : ${PM_ID}`);

  // ── Step 2: Create appointment ─────────────────────────────────────────────

  section("2 — Create Appointment");

  const today   = new Date().toISOString().slice(0, 10);
  const apptRes = await api("POST", "/appointments", {
    customerId:     CUSTOMER_ID,
    branchId:       BRANCH_ID,
    visitDate:      today,
    startTime:      "10:00",
    endTime:        "12:00",
    estimatedTotal: EXPECTED.subtotal,
    notes:          "[E2E Phase10E1]",
  });
  const appt = entity(apptRes);

  assert("Appointment created",         !!appt?.id,              appt?.id,     "<UUID>");
  assert("status = BOOKED",             appt?.status === "BOOKED", appt?.status, "BOOKED");

  const APPT_ID = appt.id;
  console.log(`\n  appointmentId : ${APPT_ID}`);

  // ── Step 3: Appointment status transitions ─────────────────────────────────

  section("3 — Appointment Status Transitions");

  for (const status of ["CONFIRMED", "CHECK_IN", "IN_PROGRESS"]) {
    const r = await api("PATCH", `/appointments/${APPT_ID}/status`, { status });
    assert(`status → ${status}`, entity(r)?.status === status, entity(r)?.status, status);
  }

  // ── Step 4: Create deposit ─────────────────────────────────────────────────

  section("4 — Create Deposit (500,000)");

  const depRes = await api("POST", `/appointments/${APPT_ID}/deposits`, {
    paymentMethodId: PM_ID,
    amount:          EXPECTED.totalDeposit,
    notes:           "[E2E Phase10E1] deposit",
  });
  const dep = entity(depRes);

  assert("Deposit created",       !!dep?.id,              dep?.id,     "<UUID>");
  assert("status = PAID",         dep?.status === "PAID", dep?.status, "PAID");

  const DEP_ID = dep.id;
  console.log(`\n  depositId : ${DEP_ID}`);

  // ── Step 5: Create treatment session ──────────────────────────────────────

  section("5 — Create Treatment Session");

  const sessRes = await api("POST", "/treatment-sessions", {
    customerId:    CUSTOMER_ID,
    branchId:      BRANCH_ID,
    appointmentId: APPT_ID,
    startedAt:     new Date().toISOString(),
    notes:         "[E2E Phase10E1] session",
  });
  const sess = entity(sessRes);

  assert("Session created", !!sess?.id, sess?.id, "<UUID>");

  const SESS_ID = sess.id;
  console.log(`\n  sessionId : ${SESS_ID}`);

  // ── Step 6: Add treatment item ─────────────────────────────────────────────

  section("6 — Add Treatment Item");

  const treatItemRes = await api("POST", `/treatment-sessions/${SESS_ID}/items`, {
    itemId: ITEM_ID,
    unitId: UNIT_ID,
    qty:    1,
    notes:  "[E2E Phase10E1] item",
  });
  const treatItem = entity(treatItemRes);

  assert("Treatment item created", !!treatItem?.id, treatItem?.id, "<UUID>");

  const TREAT_ITEM_ID = treatItem.id;
  console.log(`\n  treatmentItemId : ${TREAT_ITEM_ID}`);

  // ── Step 7: Employee assignments ───────────────────────────────────────────

  section("7 — Employee Assignments");

  const assnARes = await api("POST", `/treatment-items/${TREAT_ITEM_ID}/assignments`, {
    employeeId: EMPLOYEE_A_ID,
    workQty:    40,
    notes:      "[E2E Phase10E1] emp-A",
  });
  const assnA = entity(assnARes);
  assert("Assignment A created",          !!assnA?.id,                         assnA?.id,         "<UUID>");
  assert("Assignment A employeeId match", assnA?.employeeId === EMPLOYEE_A_ID, assnA?.employeeId, EMPLOYEE_A_ID);

  const assnBRes = await api("POST", `/treatment-items/${TREAT_ITEM_ID}/assignments`, {
    employeeId: EMPLOYEE_B_ID,
    workQty:    20,
    notes:      "[E2E Phase10E1] emp-B",
  });
  const assnB = entity(assnBRes);
  assert("Assignment B created",          !!assnB?.id,                         assnB?.id,         "<UUID>");
  assert("Assignment B employeeId match", assnB?.employeeId === EMPLOYEE_B_ID, assnB?.employeeId, EMPLOYEE_B_ID);

  // ── Step 8: Create invoice ─────────────────────────────────────────────────

  section("8 — Create Invoice");

  const invRes = await api("POST", "/invoices", {
    customerId:          CUSTOMER_ID,
    branchId:            BRANCH_ID,
    appointmentId:       APPT_ID,
    treatmentSessionIds: [SESS_ID],
    depositIds:          [DEP_ID],
    items:               [{ itemId: ITEM_ID, unitId: UNIT_ID, qty: 1 }],
    notes:               "[E2E Phase10E1] invoice",
  });
  const inv = entity(invRes);

  assert("Invoice created",                              !!inv?.id,                                                   inv?.id,                    "<UUID>");
  assert(`subtotal = ${EXPECTED.subtotal.toLocaleString()}`,            num(inv?.subtotal)           === EXPECTED.subtotal,           num(inv?.subtotal),           EXPECTED.subtotal);
  assert(`totalDeposit = ${EXPECTED.totalDeposit.toLocaleString()}`,    num(inv?.totalDeposit)       === EXPECTED.totalDeposit,       num(inv?.totalDeposit),       EXPECTED.totalDeposit);
  assert(`outstandingAmount = ${EXPECTED.outstandingAmount.toLocaleString()}`, num(inv?.outstandingAmount) === EXPECTED.outstandingAmount, num(inv?.outstandingAmount), EXPECTED.outstandingAmount);
  assert(`status = ${EXPECTED.invoiceStatusBefore}`,    inv?.status === EXPECTED.invoiceStatusBefore,                inv?.status,                EXPECTED.invoiceStatusBefore);

  const INV_ID = inv.id;
  console.log(`\n  invoiceId : ${INV_ID}`);

  // ── Step 9: Create payment ─────────────────────────────────────────────────

  section("9 — Create Payment (3,850,000)");

  const payRes = await api("POST", `/invoices/${INV_ID}/payments`, {
    paymentMethodId: PM_ID,
    amount:          EXPECTED.outstandingAmount,
    notes:           "[E2E Phase10E1] final payment",
  });
  const pay = entity(payRes);

  assert("Payment created",                        !!pay?.id,                                      pay?.id,                         "<UUID>");
  assert("paymentNo format correct",               /^PAY-\d{8}-\d{4}$/.test(pay?.paymentNo),       pay?.paymentNo,                  "PAY-YYYYMMDD-XXXX");
  assert("payment.invoice.status = PAID",          pay?.invoice?.status === "PAID",                 pay?.invoice?.status,            "PAID");
  assert("payment.invoice.outstandingAmount = 0",  num(pay?.invoice?.outstandingAmount) === 0,       num(pay?.invoice?.outstandingAmount), 0);
  console.log(`\n  paymentNo : ${pay?.paymentNo}`);
  console.log(`  paymentId : ${pay?.id}`);

  // ── Step 10: Invoice must be PAID ─────────────────────────────────────────

  section("10 — Invoice → PAID");

  const invAfterRes = await api("GET", `/invoices/${INV_ID}`);
  const invAfter    = entity(invAfterRes);

  assert(`status = PAID`,                              invAfter?.status === "PAID",                    invAfter?.status,               "PAID");
  assert(`outstandingAmount = 0`,                      num(invAfter?.outstandingAmount) === 0,          num(invAfter?.outstandingAmount), 0);
  assert(`paidAmount = ${EXPECTED.outstandingAmount.toLocaleString()}`, num(invAfter?.paidAmount) === EXPECTED.outstandingAmount, num(invAfter?.paidAmount), EXPECTED.outstandingAmount);

  // ── Step 11: TreatmentSession.completedAt filled ──────────────────────────

  section("11 — TreatmentSession.completedAt");

  const sessAfterRes = await api("GET", `/treatment-sessions/${SESS_ID}`);
  const sessAfter    = entity(sessAfterRes);

  assert("completedAt is not null",  sessAfter?.completedAt !== null,               sessAfter?.completedAt,  "<ISO timestamp>");
  assert("completedAt is valid date", !isNaN(Date.parse(sessAfter?.completedAt ?? "")), sessAfter?.completedAt, "<parseable date>");
  if (sessAfter?.completedAt) {
    console.log(`\n  completedAt : ${sessAfter.completedAt}`);
  }

  // ── Step 12: Appointment → COMPLETED ──────────────────────────────────────

  section("12 — Appointment → COMPLETED");

  const apptAfterRes = await api("GET", `/appointments/${APPT_ID}`);
  const apptAfter    = entity(apptAfterRes);

  assert("status = COMPLETED", apptAfter?.status === "COMPLETED", apptAfter?.status, "COMPLETED");

  // ── Step 13: AppointmentStatusHistory ─────────────────────────────────────

  section("13 — AppointmentStatusHistory (auto-complete record)");

  // statusHistories is included in the appointment detail response, ordered asc.
  // The latest entry is the last element.
  const histories   = Array.isArray(apptAfter?.statusHistories) ? apptAfter.statusHistories : [];
  const latestHist  = histories[histories.length - 1] ?? null;

  assert("statusHistories is not empty",                      histories.length > 0,                                  histories.length,         "> 0");
  assert("latest oldStatus = IN_PROGRESS",                    latestHist?.oldStatus === "IN_PROGRESS",               latestHist?.oldStatus,    "IN_PROGRESS");
  assert("latest newStatus = COMPLETED",                      latestHist?.newStatus === "COMPLETED",                 latestHist?.newStatus,    "COMPLETED");
  assert('latest notes = "Auto completed after invoice paid"', latestHist?.notes === "Auto completed after invoice paid", latestHist?.notes, "Auto completed after invoice paid");

  if (latestHist) {
    console.log(`\n  history.id        : ${latestHist.id}`);
    console.log(`  history.oldStatus : ${latestHist.oldStatus}`);
    console.log(`  history.newStatus : ${latestHist.newStatus}`);
    console.log(`  history.notes     : ${latestHist.notes}`);
    console.log(`  history.createdAt : ${latestHist.createdAt}`);
  }

  // ── Step 14: Commissions ───────────────────────────────────────────────────

  section("14 — Commission Verification");

  // Requires commission rule: commissionType=PERCENTAGE, commissionValue=5, commissionBase=AFTER_DISCOUNT
  // Commission generation runs synchronously but give a small buffer just in case
  await new Promise((r) => setTimeout(r, 300));

  const [comResA, comResB] = await Promise.all([
    api("GET", `/commissions?employeeId=${EMPLOYEE_A_ID}&limit=100`),
    api("GET", `/commissions?employeeId=${EMPLOYEE_B_ID}&limit=100`),
  ]);

  // Filter to this specific invoice
  const comListA = list(comResA).filter((c) => c.invoiceId === INV_ID);
  const comListB = list(comResB).filter((c) => c.invoiceId === INV_ID);
  const totalCom = comListA.length + comListB.length;

  assert(`total commission rows = ${EXPECTED.commissionCount}`, totalCom === EXPECTED.commissionCount, totalCom, EXPECTED.commissionCount);

  const comA = comListA[0];
  const comB = comListB[0];

  assert("Commission A row exists", !!comA, comA?.id, "<UUID>");
  assert("Commission B row exists", !!comB, comB?.id, "<UUID>");

  if (comA) {
    assert(`Commission A amount = ${EXPECTED.commissionA.toLocaleString()}`, num(comA.commissionAmount) === EXPECTED.commissionA, num(comA.commissionAmount), EXPECTED.commissionA);
    assert("Commission A status = PENDING",                                   comA.status === "PENDING",                           comA.status,                "PENDING");
    console.log(`\n  comA : ${comA.id}  amount=${num(comA.commissionAmount)}`);
  }
  if (comB) {
    assert(`Commission B amount = ${EXPECTED.commissionB.toLocaleString()}`, num(comB.commissionAmount) === EXPECTED.commissionB, num(comB.commissionAmount), EXPECTED.commissionB);
    assert("Commission B status = PENDING",                                   comB.status === "PENDING",                           comB.status,                "PENDING");
    console.log(`  comB : ${comB.id}  amount=${num(comB.commissionAmount)}`);
  }

  // ── Step 15: Stock movements ───────────────────────────────────────────────

  section("15 — Stock Movement Verification");

  // Query movements for this invoice
  const stockRes  = await api("GET", `/inventory/movements?referenceType=INVOICE&referenceId=${INV_ID}&limit=50`);
  const movements = list(stockRes);

  // In this test there is 1 invoice item. Count = number of INVENTORY type items in invoice.
  // If the item is SERVICE type the count will be 0 and assertions will fail with clear output.
  const EXPECTED_STOCK_COUNT = 1;

  assert(`stock movement count = ${EXPECTED_STOCK_COUNT}`, movements.length === EXPECTED_STOCK_COUNT, movements.length, EXPECTED_STOCK_COUNT);

  const mov = movements[0];
  assert("movement.type = OUT",                mov?.type          === "OUT",     mov?.type,          "OUT");
  assert("movement.referenceType = INVOICE",   mov?.referenceType === "INVOICE", mov?.referenceType, "INVOICE");
  assert("movement.referenceId = invoiceId",   mov?.referenceId   === INV_ID,    mov?.referenceId,   INV_ID);
  assert("movement.invoiceItemId is set",       !!mov?.invoiceItemId,              mov?.invoiceItemId, "<UUID>");

  if (mov) {
    const balanceBefore = num(mov.balanceBefore ?? 0);
    const balanceAfter  = num(mov.balanceAfter  ?? 0);
    const movedQty      = num(mov.qty           ?? 0);
    assert("balanceAfter = balanceBefore - qty", balanceBefore - movedQty === balanceAfter, balanceBefore - movedQty, balanceAfter);
    console.log(`\n  movement.id           : ${mov.id}`);
    console.log(`  movement.qty          : ${movedQty}`);
    console.log(`  movement.balanceBefore: ${balanceBefore}`);
    console.log(`  movement.balanceAfter : ${balanceAfter}`);
    console.log(`  movement.invoiceItemId: ${mov.invoiceItemId}`);
  }

  // Verify Inventory.availableQty matches the movement's balanceAfter
  const invBalRes  = await api("GET", `/inventory?itemId=${ITEM_ID}&limit=10`);
  const invBalList = list(invBalRes);
  const invBal     = invBalList[0];

  assert("Inventory row exists for item",                !!invBal,                                                invBal?.id,                "<UUID>");
  if (invBal && mov) {
    const expectedBal = num(mov.balanceAfter ?? 0);
    assert(`Inventory.availableQty = movement.balanceAfter (${expectedBal})`, num(invBal.availableQty) === expectedBal, num(invBal.availableQty), expectedBal);
    console.log(`\n  inventory.availableQty: ${num(invBal.availableQty)}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log(`  RESULT   ✅ ${passed} passed   ❌ ${failed} failed   (${passed + failed} total)`);
  console.log("═".repeat(60) + "\n");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("\n❌ FATAL ERROR:", err.message);
  if (err.body) console.error("   Response:", JSON.stringify(err.body, null, 2));
  process.exit(1);
});
