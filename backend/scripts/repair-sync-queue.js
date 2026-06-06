/**
 * repair-sync-queue.js
 *
 * Repairs invalid SyncQueue rows where status=PENDING but attempt >= maxAttempt.
 * These records are stuck — the worker will never process them because findPending
 * filters them out, but they show as PENDING in the admin dashboard.
 *
 * Root cause: an earlier code path did not set status=FAILED after exhausting
 * retries. This script is a one-time repair; run whenever bad records are found.
 *
 * Safe to re-run — only touches rows that are genuinely stuck.
 *
 * Usage:
 *   node backend/scripts/repair-sync-queue.js
 */

"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const prisma = require("../src/config/prisma");

async function main() {
  // Find stuck records first so we can report them
  const stuck = await prisma.$queryRaw`
    SELECT id, "entityType", "entityId", attempt, "maxAttempt", "createdAt"
    FROM   sync_queues
    WHERE  status = 'PENDING'::"SyncQueueStatus"
      AND  attempt >= "maxAttempt"
    ORDER  BY "createdAt" ASC
  `;

  if (stuck.length === 0) {
    console.log("✅ No stuck SyncQueue records found. Nothing to repair.");
    return;
  }

  console.log(`Found ${stuck.length} stuck record(s):\n`);
  for (const row of stuck) {
    console.log(
      `  [${row.entityType}] entityId=${row.entityId ?? "(none)"}` +
      `  attempt=${row.attempt}/${row.maxAttempt}  id=${row.id}`
    );
  }

  // Repair: mark all of them FAILED
  const result = await prisma.$executeRaw`
    UPDATE sync_queues
    SET    status        = 'FAILED'::"SyncQueueStatus",
           "processedAt" = NOW(),
           "errorMessage" = COALESCE(
             "errorMessage",
             'Repaired: attempt exhausted without transitioning to FAILED'
           )
    WHERE  status = 'PENDING'::"SyncQueueStatus"
      AND  attempt >= "maxAttempt"
  `;

  console.log(`\n✅ Repaired ${result} record(s) → status=FAILED`);
  console.log("   Use POST /sync-queues/:id/retry to re-queue any that should be retried.");
}

main()
  .catch((err) => {
    console.error("[FATAL]", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
