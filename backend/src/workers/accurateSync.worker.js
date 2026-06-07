const { findPending, markProcessing, markSuccess, markFailed } = require("../modules/syncQueue/syncQueue.repository");
const { pushCustomerToAccurate }  = require("../modules/customer/customer.push.service");
const { syncDepositToAccurate }   = require("../modules/deposit/deposit.sync.service");
const { syncInvoiceToAccurate }   = require("../modules/invoice/invoice.sync.service");
const { syncPaymentToAccurate }   = require("../modules/payment/payment.sync.service");

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
  WAREHOUSE:  async (job) => { /* Phase 10G.2 */ },
  ITEM:       async (job) => { /* Phase 10G.2 */ },
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
};

// ── Main processor ────────────────────────────────────────────────────

const processSyncQueue = async () => {
  if (running) {
    console.log("[SyncWorker] skipping — previous run still in progress");
    return { processed: 0, succeeded: 0, failed: 0, skipped: true };
  }

  running = true;

  try {
    const jobs = await findPending(10);

    if (jobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(`[SyncWorker] found ${jobs.length} pending job(s)`);

    let succeeded = 0;
    let failed    = 0;

    for (const job of jobs) {
      const label = `${job.entityType} ${job.id}`;

      await markProcessing(job.id);
      console.log(`[SyncWorker] ${label} processing`);

      try {
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
