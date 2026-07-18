-- Add parentId self-relation to item_categories
-- Supports Accurate's category/subcategory hierarchy (parent -> children)

ALTER TABLE "item_categories" ADD COLUMN "parentId" TEXT;

ALTER TABLE "item_categories"
  ADD CONSTRAINT "item_categories_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "item_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "item_categories_parentId_idx" ON "item_categories"("parentId");
