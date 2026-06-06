-- Phase 10F.0: Add Accurate sync fields to Payment and PaymentMethod

ALTER TABLE "payments"
  ADD COLUMN "accurateReceiptId"     INTEGER,
  ADD COLUMN "accurateReceiptNumber" TEXT,
  ADD COLUMN "lastSyncAt"            TIMESTAMP(3);

CREATE UNIQUE INDEX "payments_accurateReceiptId_key"
  ON "payments"("accurateReceiptId");

ALTER TABLE "payment_methods"
  ADD COLUMN "accuratePaymentMethodId" INTEGER;
