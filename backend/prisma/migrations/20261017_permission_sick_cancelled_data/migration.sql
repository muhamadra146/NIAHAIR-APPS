-- Data lama: pembatalan oleh karyawan dulu disimpan sebagai REJECTED tanpa reviewer.
-- Penolakan atasan selalu mengisi "reviewedBy", jadi REJECTED tanpa reviewer = dibatalkan.
UPDATE "permission_requests" SET "status" = 'CANCELLED' WHERE "status" = 'REJECTED' AND "reviewedBy" IS NULL;
UPDATE "sick_leaves"         SET "status" = 'CANCELLED' WHERE "status" = 'REJECTED' AND "reviewedBy" IS NULL;
