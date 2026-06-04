-- Hardening: one TreatmentAssignment can only produce one Commission row.
-- Protects against double-click, concurrent requests, retry jobs, and
-- duplicate webhook events even when they bypass the application-level guard.

CREATE UNIQUE INDEX "commissions_treatmentAssignmentId_key"
  ON "commissions"("treatmentAssignmentId");
