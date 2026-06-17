const { processSyncQueue }  = require("./accurateSync.worker");
const { expireMemberships } = require("./membershipExpiry.worker");

let syncWorkerStarted   = false;
let expiryWorkerStarted = false;

const startWorkers = () => {
  if (process.env.ENABLE_WORKER !== "true") {
    console.log("[worker] ENABLE_WORKER != true — workers disabled");
    return;
  }

  if (syncWorkerStarted) {
    console.log("[worker] already started");
    return;
  }

  syncWorkerStarted = true;
  console.log("[worker] Accurate sync worker started (interval: 60s)");

  // Single run shortly after startup to drain any leftover PENDING jobs
  setTimeout(() => {
    processSyncQueue().catch((err) =>
      console.error("[worker] startup run error:", err.message)
    );
  }, 5000);

  // Recurring interval
  setInterval(async () => {
    try {
      await processSyncQueue();
    } catch (err) {
      console.error("[worker] sync queue error:", err.message);
    }
  }, 60_000);

  // ── Membership expiry worker ─────────────────────────────────────────
  if (!expiryWorkerStarted) {
    expiryWorkerStarted = true;
    console.log("[worker] Membership expiry worker started (interval: 24h)");

    setTimeout(() => {
      expireMemberships().catch((err) =>
        console.error("[expiry worker] startup run error:", err.message)
      );
    }, 5000);

    setInterval(async () => {
      try {
        await expireMemberships();
      } catch (err) {
        console.error("[expiry worker] error:", err.message);
      }
    }, 86_400_000);
  }
};

module.exports = { startWorkers };
