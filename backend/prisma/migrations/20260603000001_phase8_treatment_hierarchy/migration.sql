-- Phase 8.0: Treatment Hierarchy Correction
-- Introduces TreatmentItem as the intermediate layer between
-- TreatmentSession (one visit) and TreatmentAssignment (employee work split).
--
-- TreatmentSession → TreatmentItem → TreatmentAssignment
--                                  → MaterialUsage

-- ── 1. Create treatment_items ──────────────────────────────────────────

CREATE TABLE "treatment_items" (
    "id"                 TEXT          NOT NULL,
    "treatmentSessionId" TEXT          NOT NULL,
    "itemId"             TEXT          NOT NULL,
    "unitId"             TEXT          NOT NULL,
    "qty"                DECIMAL(18,2) NOT NULL,
    "priceSnapshot"      DECIMAL(18,2) NOT NULL,
    "conversionSnapshot" DECIMAL(18,6) NOT NULL,
    "notes"              TEXT,
    "createdAt"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "treatment_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "treatment_items"
    ADD CONSTRAINT "treatment_items_treatmentSessionId_fkey"
    FOREIGN KEY ("treatmentSessionId") REFERENCES "treatment_sessions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "treatment_items"
    ADD CONSTRAINT "treatment_items_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "items"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "treatment_items"
    ADD CONSTRAINT "treatment_items_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "treatment_items_treatmentSessionId_idx" ON "treatment_items"("treatmentSessionId");
CREATE INDEX "treatment_items_itemId_idx"             ON "treatment_items"("itemId");
CREATE INDEX "treatment_items_unitId_idx"             ON "treatment_items"("unitId");

-- ── 2. Add treatmentItemId to treatment_assignments ────────────────────
-- Add nullable first; set NOT NULL after dropping old column.

ALTER TABLE "treatment_assignments" ADD COLUMN "treatmentItemId" TEXT;

ALTER TABLE "treatment_assignments"
    ADD CONSTRAINT "treatment_assignments_treatmentItemId_fkey"
    FOREIGN KEY ("treatmentItemId") REFERENCES "treatment_items"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "treatment_assignments_treatmentItemId_idx" ON "treatment_assignments"("treatmentItemId");

-- ── 3. Add treatmentItemId to material_usages ──────────────────────────

ALTER TABLE "material_usages" ADD COLUMN "treatmentItemId" TEXT;

ALTER TABLE "material_usages"
    ADD CONSTRAINT "material_usages_treatmentItemId_fkey"
    FOREIGN KEY ("treatmentItemId") REFERENCES "treatment_items"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "material_usages_treatmentItemId_idx" ON "material_usages"("treatmentItemId");

-- ── 4. Drop old FK constraints ─────────────────────────────────────────

ALTER TABLE "treatment_assignments" DROP CONSTRAINT IF EXISTS "treatment_assignments_treatmentSessionId_fkey";
ALTER TABLE "material_usages"       DROP CONSTRAINT IF EXISTS "material_usages_treatmentSessionId_fkey";
ALTER TABLE "material_usages"       DROP CONSTRAINT IF EXISTS "material_usages_serviceItemId_fkey";
ALTER TABLE "treatment_sessions"    DROP CONSTRAINT IF EXISTS "treatment_sessions_serviceItemId_fkey";

-- ── 5. Drop old indexes ────────────────────────────────────────────────

DROP INDEX IF EXISTS "treatment_assignments_treatmentSessionId_idx";
DROP INDEX IF EXISTS "material_usages_treatmentSessionId_idx";
DROP INDEX IF EXISTS "material_usages_serviceItemId_idx";
DROP INDEX IF EXISTS "treatment_sessions_serviceItemId_idx";

-- ── 6. Drop old columns ────────────────────────────────────────────────

ALTER TABLE "treatment_assignments" DROP COLUMN IF EXISTS "treatmentSessionId";
ALTER TABLE "material_usages"       DROP COLUMN IF EXISTS "treatmentSessionId";
ALTER TABLE "material_usages"       DROP COLUMN IF EXISTS "serviceItemId";
ALTER TABLE "treatment_sessions"    DROP COLUMN IF EXISTS "serviceItemId";

-- ── 7. Enforce NOT NULL on new FK columns ─────────────────────────────
-- Safe only when no data rows exist in these tables.
-- If rows exist, populate treatmentItemId before running this step.

ALTER TABLE "treatment_assignments" ALTER COLUMN "treatmentItemId" SET NOT NULL;
ALTER TABLE "material_usages"       ALTER COLUMN "treatmentItemId" SET NOT NULL;
