-- Phase 9B.0: Add paidBy audit field to commissions
-- Completes the approval trail: approvedBy/approvedAt already exist;
-- paidBy records which user marked the commission as PAID.

ALTER TABLE "commissions" ADD COLUMN "paidBy" TEXT;
