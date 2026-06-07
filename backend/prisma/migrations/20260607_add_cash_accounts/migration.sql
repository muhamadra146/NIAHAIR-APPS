-- CreateTable
CREATE TABLE "cash_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "accurateAccountId" INTEGER,
    "accurateAccountNo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_accounts_code_key" ON "cash_accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cash_accounts_accurateAccountId_key" ON "cash_accounts"("accurateAccountId");

-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN "cashAccountId" TEXT;

-- CreateIndex
CREATE INDEX "payment_methods_cashAccountId_idx" ON "payment_methods"("cashAccountId");

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_cashAccountId_fkey"
    FOREIGN KEY ("cashAccountId") REFERENCES "cash_accounts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
