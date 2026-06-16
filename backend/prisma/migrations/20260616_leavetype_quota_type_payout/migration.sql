-- Add QuotaType enum
CREATE TYPE "QuotaType" AS ENUM ('ANNUAL', 'EVENT_BASED', 'LIFETIME');

-- Add quotaType and unusedDayPayoutRate to leave_types
ALTER TABLE "leave_types"
  ADD COLUMN "quotaType"           "QuotaType" NOT NULL DEFAULT 'ANNUAL',
  ADD COLUMN "unusedDayPayoutRate" DECIMAL(18,2) NOT NULL DEFAULT 0;
