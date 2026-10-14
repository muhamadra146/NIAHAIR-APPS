-- AlterTable
ALTER TABLE "items" ADD COLUMN     "excludeMemberDiscount" BOOLEAN NOT NULL DEFAULT false;
-- CreateTable
CREATE TABLE "membership_discount_categories" (
    "membershipId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_discount_categories_pkey" PRIMARY KEY ("membershipId","categoryId")
);
-- CreateIndex
CREATE INDEX "membership_discount_categories_categoryId_idx" ON "membership_discount_categories"("categoryId");
-- AddForeignKey
ALTER TABLE "membership_discount_categories" ADD CONSTRAINT "membership_discount_categories_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "membership_discount_categories" ADD CONSTRAINT "membership_discount_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "item_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data awal (keputusan user 2026-10-14): Ongkos PP, Service Charge, semua Charge & Cancel tidak pernah kena diskon membership
UPDATE "items" SET "excludeMemberDiscount" = true
WHERE "itemCode" IN ('101313', '101312', '101667', '101257', '101321', '101273', '101271', '101455', '101450', '101449', '101451');

-- Paket membership lama mempertahankan perilaku sebelumnya: diskon untuk kategori JASA
INSERT INTO "membership_discount_categories" ("membershipId", "categoryId")
SELECT m."id", c."id" FROM "memberships" m CROSS JOIN "item_categories" c
WHERE c."name" = 'JASA' AND c."parentId" IS NULL
ON CONFLICT DO NOTHING;
