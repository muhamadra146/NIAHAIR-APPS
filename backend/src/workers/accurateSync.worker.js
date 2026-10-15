const { findPending, claimPending, markSkipped, entityExists, markSuccess, markFailed, reclaimStaleProcessing } = require("../modules/syncQueue/syncQueue.repository");
const { pushItemToAccurate }      = require("../modules/item/item.push.service");
const { pushCustomerToAccurate }  = require("../modules/customer/customer.push.service");
const { syncDepositToAccurate }   = require("../modules/deposit/deposit.sync.service");
const { syncInvoiceToAccurate }   = require("../modules/invoice/invoice.sync.service");
const { syncPaymentToAccurate }        = require("../modules/payment/payment.sync.service");
const { syncDepositPaymentToAccurate } = require("../modules/depositPayment/depositPayment.sync.service");
const { syncTransferToAccurate, syncTransferReceiveToAccurate } = require("../modules/stockTransfer/stockTransfer.sync.service");
const { pushPurchaseInvoiceToAccurate } = require("../modules/purchase/purchase.accurate.sync.service");
const { pushPurchaseReturnToAccurate }  = require("../modules/purchaseReturn/purchaseReturn.accurate.sync.service");
const { syncPayrollToAccurate }         = require("../modules/payroll/payroll.sync.service");

// ── Overlap guard — prevents concurrent execution ─────────────────────
let running = false;

// ── Entity handlers (placeholders — Accurate API calls in Phase 10G.2+) ─

const HANDLERS = {
  CUSTOMER: async (job) => {
    if (job.direction === "APP_TO_ACCURATE") {
      await pushCustomerToAccurate(job.entityId);
    }
    // ACCURATE_TO_APP is a bulk pull handled by the sync endpoint — not queued per-item
  },
  // BRANCH sync is a bulk pull triggered via POST /branches/sync-accurate — not per-item queued
  BRANCH:     async (_job) => { /* bulk pull — handled by syncFromAccurateController */ },
  WAREHOUSE:  async (job) => { /* Phase 10G.2 */ },
  ITEM: async (job) => {
    if (job.direction === "APP_TO_ACCURATE") {
      await pushItemToAccurate(job.entityId);
    }
  },
  UNIT:       async (job) => { /* Phase 10G.2 */ },
  ITEM_UNIT:  async (job) => { /* Phase 10G.2 */ },
  ITEM_PRICE: async (job) => { /* Phase 10G.2 */ },
  INVENTORY:  async (job) => { /* Phase 10G.2 */ },
  DEPOSIT: async (job) => {
    if (job.direction === "APP_TO_ACCURATE") {
      await syncDepositToAccurate(job.entityId);
    }
  },
  INVOICE: async (job) => {
    if (job.direction === "APP_TO_ACCURATE") {
      await syncInvoiceToAccurate(job.entityId);
    }
  },
  PAYMENT: async (job) => {
    if (job.direction === "APP_TO_ACCURATE") {
      await syncPaymentToAccurate(job.entityId);
    }
  },
  DEPOSIT_PAYMENT: async (job) => {
    if (job.direction === "APP_TO_ACCURATE") {
      await syncDepositPaymentToAccurate(job.entityId);
    }
  },
  STOCK_TRANSFER: async (job) => {
    if (job.direction === "APP_TO_ACCURATE") {
      await syncTransferToAccurate(job.entityId);
    }
  },
  STOCK_TRANSFER_RECEIVE: async (job) => {
    if (job.direction === "APP_TO_ACCURATE") {
      await syncTransferReceiveToAccurate(job.entityId);
    }
  },
  PURCHASE_INVOICE: async (job) => {
    if (job.direction === "APP_TO_ACCURATE") {
      await pushPurchaseInvoiceToAccurate(job.entityId);
    }
  },
  PURCHASE_RETURN: async (job) => {
    if (job.direction === "APP_TO_ACCURATE") {
      await pushPurchaseReturnToAccurate(job.entityId);
    }
  },
  PAYROLL: async (job) => {
    if (job.direction === "APP_TO_ACCURATE") {
      await syncPayrollToAccurate(job.entityId);
    }
  },
};

// ── Main processor ────────────────────────────────────────────────────

const processSyncQueue = async () => {
  if (running) {
    console.log("[SyncWorker] skipping — previous run still in progress");
    return { processed: 0, succeeded: 0, failed: 0, skipped: true };
  }

  running = true;

  try {
    // Job PROCESSING yang macet (worker mati di tengah proses) → kembali ke PENDING (G5-03)
    const reclaimed = await reclaimStaleProcessing();
    if (reclaimed > 0) console.log(`[SyncWorker] reclaimed ${reclaimed} stale PROCESSING job(s)`);

    const jobs = await findPending(10);

    if (jobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(`[SyncWorker] found ${jobs.length} pending job(s)`);

    let succeeded = 0;
    let failed    = 0;

    for (const job of jobs) {
      const label = `${job.entityType} ${job.id}`;

      // Klaim atomik — jika runner lain (inline / interval) sudah mengambil job ini, lewati
      const claimed = await claimPending(job.id);
      if (!claimed) {
        console.log(`[SyncWorker] ${label} already claimed — skipped`);
        continue;
      }
      console.log(`[SyncWorker] ${label} processing`);

      try {
        // Data sumber sudah dihapus → selesaikan job, jangan retry sampai FAILED
        if (await entityExists(job.entityType, job.entityId) === false) {
          await markSkipped(job.id, "Dilewati: data sumber sudah dihapus");
          console.log(`[SyncWorker] ${label} skipped — entity deleted`);
          continue;
        }

        const handler = HANDLERS[job.entityType];
        if (!handler) {
          throw new Error(`No handler registered for entityType: ${job.entityType}`);
        }

        await handler(job);
        await markSuccess(job.id);

        console.log(`[SyncWorker] ${label} success`);
        succeeded++;
      } catch (err) {
        await markFailed(job.id, err.message);
        console.error(`[SyncWorker] ${label} failed: ${err.message}`);
        failed++;
      }
    }

    console.log(`[SyncWorker] done — succeeded=${succeeded} failed=${failed}`);
    return { processed: jobs.length, succeeded, failed };
  } finally {
    running = false;
  }
};

module.exports = { processSyncQueue };
