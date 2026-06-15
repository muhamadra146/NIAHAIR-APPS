-- CreateTable
CREATE TABLE "client_consultation_notes" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "filledByEmployeeId" TEXT,
    "profession" TEXT,
    "professionOther" TEXT,
    "ageRange" TEXT,
    "dailyStyling" TEXT[],
    "dailyStylingOther" TEXT,
    "discoveryChannel" TEXT,
    "discoveryChannelDetail" TEXT,
    "reasonForService" TEXT[],
    "reasonForServiceOther" TEXT,
    "hesitation" TEXT[],
    "hesitationOther" TEXT,
    "previousExpType" TEXT,
    "previousSalonName" TEXT,
    "reasonSwitchToNia" TEXT,
    "issuesDuringUse" TEXT,
    "changesAfterUse" TEXT,
    "interestingNote" TEXT NOT NULL,
    "additionalNotes" TEXT,
    "filledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_consultation_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_consultation_notes_invoiceId_key" ON "client_consultation_notes"("invoiceId");

-- CreateIndex
CREATE INDEX "client_consultation_notes_customerId_idx" ON "client_consultation_notes"("customerId");

-- CreateIndex
CREATE INDEX "client_consultation_notes_branchId_idx" ON "client_consultation_notes"("branchId");

-- CreateIndex
CREATE INDEX "client_consultation_notes_filledByEmployeeId_idx" ON "client_consultation_notes"("filledByEmployeeId");

-- AddForeignKey
ALTER TABLE "client_consultation_notes" ADD CONSTRAINT "client_consultation_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_consultation_notes" ADD CONSTRAINT "client_consultation_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_consultation_notes" ADD CONSTRAINT "client_consultation_notes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_consultation_notes" ADD CONSTRAINT "client_consultation_notes_filledByEmployeeId_fkey" FOREIGN KEY ("filledByEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
