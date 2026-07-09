/**
 * Migrasi slotKey: "stylist" → "pemasang"
 *
 * Tabel yang terpengaruh:
 *   - TreatmentAssignment (treatment_assignments)
 *   - CommissionRule (commission_rules)
 *
 * Reversible: jalankan dengan --reverse untuk membatalkan
 *   node scripts/migrate-slotkey-stylist-to-pemasang.js --reverse
 *
 * Dry-run (count only):
 *   node scripts/migrate-slotkey-stylist-to-pemasang.js --dry
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const FROM = process.argv.includes("--reverse") ? "pemasang" : "stylist";
const TO   = process.argv.includes("--reverse") ? "stylist"  : "pemasang";
const DRY  = process.argv.includes("--dry");

async function main() {
  console.log(`\n=== Migrasi slotKey "${FROM}" → "${TO}" ${DRY ? "(DRY-RUN)" : "(EXECUTE)"} ===\n`);

  // 1. Count dulu
  const [assignmentCount, ruleCount] = await Promise.all([
    prisma.treatmentAssignment.count({ where: { slotKey: FROM } }),
    prisma.commissionRule.count({ where: { slotKey: FROM } }),
  ]);

  console.log(`TreatmentAssignment: ${assignmentCount} baris slotKey="${FROM}" akan diubah ke "${TO}"`);
  console.log(`CommissionRule:      ${ruleCount} baris slotKey="${FROM}" akan diubah ke "${TO}"`);
  console.log("");

  if (DRY) {
    console.log("[DRY-RUN] Tidak ada perubahan yang dilakukan.");
    return;
  }

  if (assignmentCount === 0 && ruleCount === 0) {
    console.log(`Tidak ada baris dengan slotKey="${FROM}". Tidak ada yang perlu diubah.`);
    return;
  }

  // 2. Pre-check konflik unique constraint pada CommissionRule
  //    Terjadi jika ada baris slotKey="stylist" dan slotKey="pemasang"
  //    dengan kombinasi (employeeId, commissionCategoryId, coloristCondition, effectiveDate) yang identik
  if (FROM === "stylist") {
    const conflicts = await prisma.$queryRaw`
      SELECT s.id AS stylist_id, s."employeeId", s."commissionCategoryId",
             s."coloristCondition", s."effectiveDate"
      FROM commission_rules s
      JOIN commission_rules p
        ON  s."employeeId"           = p."employeeId"
        AND s."commissionCategoryId" = p."commissionCategoryId"
        AND s."coloristCondition"    = p."coloristCondition"
        AND s."effectiveDate"        = p."effectiveDate"
      WHERE s."slotKey" = 'stylist'
        AND p."slotKey" = 'pemasang'
    `;
    if (conflicts.length > 0) {
      console.error(`\n✗ ABORT: Ditemukan ${conflicts.length} konflik potensial di CommissionRule.`);
      console.error("Karyawan berikut sudah punya rule slotKey=\"pemasang\" pada kombinasi yang sama:");
      conflicts.forEach((r) =>
        console.error(`  employeeId=${r.employeeId}, categoryId=${r.commissionCategoryId}, effectiveDate=${r.effectiveDate}`)
      );
      console.error("\nSelesaikan konflik secara manual sebelum menjalankan migrasi.");
      process.exit(1);
    }
    console.log("✓ Tidak ada konflik unique constraint pada CommissionRule.");
  }

  // 3. Eksekusi dalam satu transaksi
  const [updatedAssignments, updatedRules] = await prisma.$transaction([
    prisma.treatmentAssignment.updateMany({
      where: { slotKey: FROM },
      data:  { slotKey: TO },
    }),
    prisma.commissionRule.updateMany({
      where: { slotKey: FROM },
      data:  { slotKey: TO },
    }),
  ]);

  console.log(`✓ TreatmentAssignment: ${updatedAssignments.count} baris diubah → "${TO}"`);
  console.log(`✓ CommissionRule:      ${updatedRules.count} baris diubah → "${TO}"`);

  // 3. Verifikasi — cek distribusi final
  console.log("\n=== Distribusi slotKey setelah migrasi ===");

  const [assignmentDist, ruleDist] = await Promise.all([
    prisma.treatmentAssignment.groupBy({ by: ["slotKey"], _count: { slotKey: true } }),
    prisma.commissionRule.groupBy({ by: ["slotKey"], _count: { slotKey: true } }),
  ]);

  console.log("TreatmentAssignment:");
  if (assignmentDist.length === 0) {
    console.log("  (tidak ada data)");
  } else {
    assignmentDist.forEach((r) =>
      console.log(`  slotKey="${r.slotKey ?? "null"}": ${r._count.slotKey} baris`)
    );
  }

  console.log("CommissionRule:");
  if (ruleDist.length === 0) {
    console.log("  (tidak ada data)");
  } else {
    ruleDist.forEach((r) =>
      console.log(`  slotKey="${r.slotKey ?? "null"}": ${r._count.slotKey} baris`)
    );
  }

  // 4. Pastikan tidak ada lagi slotKey lama
  const [remainingAssignment, remainingRule] = await Promise.all([
    prisma.treatmentAssignment.count({ where: { slotKey: FROM } }),
    prisma.commissionRule.count({ where: { slotKey: FROM } }),
  ]);

  if (remainingAssignment > 0 || remainingRule > 0) {
    console.error(`\n✗ GAGAL: masih ada ${remainingAssignment + remainingRule} baris dengan slotKey="${FROM}"!`);
    process.exit(1);
  }

  // 5. Cek tidak ada slotKey di luar daftar yang diizinkan
  const ALLOWED = new Set(["pemasang", "asisten", "colorist", null]);
  const unexpected = [
    ...assignmentDist.filter((r) => !ALLOWED.has(r.slotKey)),
    ...ruleDist.filter((r) => !ALLOWED.has(r.slotKey)),
  ];

  if (unexpected.length > 0) {
    console.warn("\n⚠ PERINGATAN: ditemukan slotKey tidak terduga:");
    unexpected.forEach((r) =>
      console.warn(`  slotKey="${r.slotKey}": ${r._count.slotKey} baris`)
    );
  } else {
    console.log("\n✓ Semua slotKey dalam daftar yang diizinkan: pemasang, asisten, colorist, null");
  }

  console.log("\n=== Migrasi selesai ===");
}

main()
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
