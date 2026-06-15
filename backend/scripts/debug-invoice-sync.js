/**
 * debug-invoice-sync.js
 *
 * Debug why discount is not appearing in Accurate for a specific invoice.
 * Shows:
 *  1. Invoice items from DB (with discount values)
 *  2. The exact payload that will be sent to Accurate
 *  3. The Accurate response after sync
 *
 * Usage:
 *   node scripts/debug-invoice-sync.js <invoiceId>
 *
 * Example:
 *   node scripts/debug-invoice-sync.js cmbxyz123...
 */

require("dotenv").config();
const prisma = require("../src/config/prisma");
const { accurateRequest } = require("../src/modules/accurate/accurate.client");
const { findInvoiceForSync } = require("../src/modules/invoice/invoice.sync.repository");
const { mapInvoiceToAccurate } = require("../src/modules/invoice/invoice.sync.mapper");
const { findWarehouseByBranchId } = require("../src/modules/inventory/inventory.repository");

const invoiceId = process.argv[2];
if (!invoiceId) {
  console.error("Usage: node scripts/debug-invoice-sync.js <invoiceId>");
  process.exit(1);
}

const ACCURATE_INVOICE_SAVE = "/sales-invoice/save.do";

async function main() {
  console.log(`\n=== DEBUG INVOICE SYNC: ${invoiceId} ===\n`);

  // 1. Load invoice from DB
  const invoice = await findInvoiceForSync(invoiceId);
  if (!invoice) {
    console.error("Invoice not found in DB");
    process.exit(1);
  }

  console.log("--- DB: Invoice items ---");
  for (const line of invoice.items) {
    console.log({
      itemCode:    line.item.itemCode,
      qty:         Number(line.qty),
      price:       Number(line.price),
      discount:    Number(line.discount),
      discountPct: Number(line.price) * Number(line.qty) > 0
        ? ((Number(line.discount) / (Number(line.price) * Number(line.qty))) * 100).toFixed(4)
        : 0,
    });
  }

  // 2. Build the payload
  const hasInventoryItem = invoice.items.some((l) => l.item.itemType === "INVENTORY");
  let warehouse = null;
  if (hasInventoryItem) {
    warehouse = await findWarehouseByBranchId(invoice.branchId);
  }

  const isUpdate = !!invoice.accurateInvoiceId;
  let currentAccurateItemIds = [];

  if (isUpdate) {
    console.log(`\n--- Fetching current Accurate items (accurateInvoiceId=${invoice.accurateInvoiceId}) ---`);
    const currentResp = await accurateRequest(ACCURATE_INVOICE_SAVE, {
      method: "POST",
      body:   { id: invoice.accurateInvoiceId },
    });
    console.log("Current Accurate detailItem:", JSON.stringify(currentResp.r?.detailItem ?? [], null, 2));
    currentAccurateItemIds = (currentResp.r?.detailItem ?? []).map((i) => i.id);
  }

  const payload = mapInvoiceToAccurate(invoice, warehouse, isUpdate ? invoice.accurateInvoiceId : null, currentAccurateItemIds);

  console.log("\n--- Payload to Accurate ---");
  console.log(JSON.stringify(payload, null, 2));

  // 3. Send to Accurate
  console.log("\n--- Sending to Accurate... ---");
  const response = await accurateRequest(ACCURATE_INVOICE_SAVE, {
    method: "POST",
    body:   payload,
  });

  console.log("\n--- Accurate Response ---");
  console.log("s:", response.s);
  console.log("d:", response.d);
  console.log("detailItem:", JSON.stringify(response.r?.detailItem ?? [], null, 2));

  if (response.s) {
    console.log("\n✓ Sync succeeded. Check detailItem above for actual discountPercent saved by Accurate.");
  } else {
    console.log("\n✗ Sync FAILED.");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
