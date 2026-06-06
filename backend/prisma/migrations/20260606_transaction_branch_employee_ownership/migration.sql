-- Phase 10G.2A: Transaction Branch + Employee Ownership
-- Adds branchId and createdByEmployeeId to financial transaction tables.
-- Deposits and Payments get branchId (non-nullable after back-fill).
-- All four tables get createdByEmployeeId (nullable).

-- ── Step 1: Add all new columns as nullable ───────────────────────────

ALTER TABLE "appointments" ADD COLUMN "createdByEmployeeId" TEXT;

ALTER TABLE "deposits"
  ADD COLUMN "branchId"            TEXT,
  ADD COLUMN "createdByEmployeeId" TEXT;

ALTER TABLE "invoices"  ADD COLUMN "createdByEmployeeId" TEXT;

ALTER TABLE "payments"
  ADD COLUMN "branchId"            TEXT,
  ADD COLUMN "createdByEmployeeId" TEXT;

-- ── Step 2: Back-fill branchId from parent records ────────────────────

-- Deposit.branchId ← Appointment.branchId
UPDATE "deposits" d
SET "branchId" = (
  SELECT a."branchId" FROM "appointments" a WHERE a.id = d."appointmentId"
)
WHERE d."branchId" IS NULL;

-- Payment.branchId ← Invoice.branchId
UPDATE "payments" p
SET "branchId" = (
  SELECT i."branchId" FROM "invoices" i WHERE i.id = p."invoiceId"
)
WHERE p."branchId" IS NULL;

-- ── Step 3: Enforce NOT NULL on branchId now that data is back-filled ─

ALTER TABLE "deposits"  ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "payments"  ALTER COLUMN "branchId" SET NOT NULL;

-- ── Step 4: Indexes ───────────────────────────────────────────────────

CREATE INDEX "appointments_createdByEmployeeId_idx" ON "appointments"("createdByEmployeeId");
CREATE INDEX "deposits_branchId_idx"               ON "deposits"("branchId");
CREATE INDEX "deposits_createdByEmployeeId_idx"    ON "deposits"("createdByEmployeeId");
CREATE INDEX "invoices_createdByEmployeeId_idx"    ON "invoices"("createdByEmployeeId");
CREATE INDEX "payments_branchId_idx"               ON "payments"("branchId");
CREATE INDEX "payments_createdByEmployeeId_idx"    ON "payments"("createdByEmployeeId");

-- ── Step 5: Foreign keys ──────────────────────────────────────────────

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_createdByEmployeeId_fkey"
  FOREIGN KEY ("createdByEmployeeId") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deposits"
  ADD CONSTRAINT "deposits_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deposits"
  ADD CONSTRAINT "deposits_createdByEmployeeId_fkey"
  FOREIGN KEY ("createdByEmployeeId") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_createdByEmployeeId_fkey"
  FOREIGN KEY ("createdByEmployeeId") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_createdByEmployeeId_fkey"
  FOREIGN KEY ("createdByEmployeeId") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
