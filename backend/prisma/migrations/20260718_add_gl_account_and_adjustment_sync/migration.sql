-- AlterTable: add accurate adjustment ID and GL account FK to inventory_movements
ALTER TABLE "inventory_movements" ADD COLUMN "accurateAdjustmentId" INTEGER,
ADD COLUMN "glAccountId" TEXT;

-- CreateTable: gl_accounts (synced from Accurate)
CREATE TABLE "gl_accounts" (
    "id" TEXT NOT NULL,
    "accurateGlAccountId" INTEGER,
    "number" TEXT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gl_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gl_accounts_accurateGlAccountId_key" ON "gl_accounts"("accurateGlAccountId");

-- CreateIndex
CREATE INDEX "gl_accounts_number_idx" ON "gl_accounts"("number");

-- CreateIndex
CREATE INDEX "gl_accounts_name_idx" ON "gl_accounts"("name");

-- CreateIndex
CREATE INDEX "inventory_movements_glAccountId_idx" ON "inventory_movements"("glAccountId");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "gl_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
