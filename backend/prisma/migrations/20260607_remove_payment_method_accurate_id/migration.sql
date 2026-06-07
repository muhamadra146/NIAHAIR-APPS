-- AlterTable: drop deprecated field — CashAccount.accurateAccountId is the correct mapping now
ALTER TABLE "payment_methods" DROP COLUMN IF EXISTS "accuratePaymentMethodId";
