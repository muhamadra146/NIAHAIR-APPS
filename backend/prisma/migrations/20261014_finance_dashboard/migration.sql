-- AlterTable
ALTER TABLE "deposits" ADD COLUMN     "refundedAmount" DECIMAL(18,2),
ADD COLUMN     "refundedAt" TIMESTAMP(3);


-- Item penentu pendapatan bersih Dashboard Keuangan (FIN-039) — bisa diubah di Pengaturan tanpa ubah kode
INSERT INTO "settings" ("id", "key", "value", "description", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'finance_ongkos_pp_item_codes',      '["101313"]', 'Kode item Ongkos PP — dikeluarkan penuh dari pendapatan bersih', NOW(), NOW()),
  (gen_random_uuid()::text, 'finance_charge_lembur_item_codes',  '["101271"]', 'Kode item Charge Lembur — 50% bagian tim dikeluarkan dari pendapatan bersih', NOW(), NOW()),
  (gen_random_uuid()::text, 'finance_home_service_item_codes',   '["101312"]', 'Kode item Service Charge Home Service — komisi tim HS dikeluarkan dari pendapatan bersih', NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
