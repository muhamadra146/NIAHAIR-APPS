-- DropForeignKey
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_treatmentAssignmentId_fkey";

-- AlterTable
ALTER TABLE "commissions" ADD COLUMN     "serviceJobSlotId" TEXT,
ADD COLUMN     "treatmentJobAssignmentId" TEXT,
ALTER COLUMN "treatmentAssignmentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "service_job_slots" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "slotKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "commissionRate" DECIMAL(8,4) NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_job_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_job_assignments" (
    "id" TEXT NOT NULL,
    "treatmentItemId" TEXT NOT NULL,
    "serviceJobSlotId" TEXT NOT NULL,
    "employeeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_job_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_job_slots_itemId_idx" ON "service_job_slots"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "service_job_slots_itemId_slotKey_key" ON "service_job_slots"("itemId", "slotKey");

-- CreateIndex
CREATE INDEX "treatment_job_assignments_treatmentItemId_idx" ON "treatment_job_assignments"("treatmentItemId");

-- CreateIndex
CREATE INDEX "treatment_job_assignments_serviceJobSlotId_idx" ON "treatment_job_assignments"("serviceJobSlotId");

-- CreateIndex
CREATE INDEX "treatment_job_assignments_employeeId_idx" ON "treatment_job_assignments"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_job_assignments_treatmentItemId_serviceJobSlotId_key" ON "treatment_job_assignments"("treatmentItemId", "serviceJobSlotId");

-- CreateIndex
CREATE INDEX "commissions_serviceJobSlotId_idx" ON "commissions"("serviceJobSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_treatmentJobAssignmentId_key" ON "commissions"("treatmentJobAssignmentId");

-- AddForeignKey
ALTER TABLE "service_job_slots" ADD CONSTRAINT "service_job_slots_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_treatmentAssignmentId_fkey" FOREIGN KEY ("treatmentAssignmentId") REFERENCES "treatment_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_treatmentJobAssignmentId_fkey" FOREIGN KEY ("treatmentJobAssignmentId") REFERENCES "treatment_job_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_serviceJobSlotId_fkey" FOREIGN KEY ("serviceJobSlotId") REFERENCES "service_job_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_job_assignments" ADD CONSTRAINT "treatment_job_assignments_treatmentItemId_fkey" FOREIGN KEY ("treatmentItemId") REFERENCES "treatment_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_job_assignments" ADD CONSTRAINT "treatment_job_assignments_serviceJobSlotId_fkey" FOREIGN KEY ("serviceJobSlotId") REFERENCES "service_job_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_job_assignments" ADD CONSTRAINT "treatment_job_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
