-- Phase 10G.1: Sync Queue Core
-- Redesign sync_queues table with typed enum, nullable entityId,
-- attempt tracking, and startedAt/updatedAt.

-- ── New enums ─────────────────────────────────────────────────────────

CREATE TYPE "SyncEntityType" AS ENUM (
  'CUSTOMER', 'WAREHOUSE', 'ITEM', 'UNIT',
  'ITEM_UNIT', 'ITEM_PRICE', 'INVENTORY',
  'DEPOSIT', 'INVOICE', 'PAYMENT'
);

CREATE TYPE "SyncQueueStatus" AS ENUM (
  'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'
);

-- ── Drop old table (no production data — safe to recreate) ────────────

DROP TABLE IF EXISTS "sync_queues";

-- ── Recreate with new schema ──────────────────────────────────────────

CREATE TABLE "sync_queues" (
  "id"           TEXT          NOT NULL,
  "entityType"   "SyncEntityType" NOT NULL,
  "entityId"     TEXT,
  "direction"    "SyncDirection"  NOT NULL,
  "status"       "SyncQueueStatus" NOT NULL DEFAULT 'PENDING',
  "payload"      JSONB,
  "attempt"      INTEGER       NOT NULL DEFAULT 0,
  "maxAttempt"   INTEGER       NOT NULL DEFAULT 3,
  "errorMessage" TEXT,
  "startedAt"    TIMESTAMP(3),
  "processedAt"  TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "sync_queues_pkey" PRIMARY KEY ("id")
);

-- ── Indexes ───────────────────────────────────────────────────────────

CREATE INDEX "sync_queues_status_idx"           ON "sync_queues"("status");
CREATE INDEX "sync_queues_entityType_entityId_idx" ON "sync_queues"("entityType", "entityId");
CREATE INDEX "sync_queues_createdAt_idx"        ON "sync_queues"("createdAt");
