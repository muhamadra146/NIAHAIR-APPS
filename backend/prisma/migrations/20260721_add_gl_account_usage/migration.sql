-- Add usage field to gl_accounts for manual account purpose tagging
ALTER TABLE "gl_accounts" ADD COLUMN "usage" TEXT;

CREATE INDEX "gl_accounts_usage_idx" ON "gl_accounts"("usage");
