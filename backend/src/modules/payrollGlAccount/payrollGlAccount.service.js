const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { findAll, upsertMany, seedMissing } = require("./payrollGlAccount.repository");

/**
 * Default mapping definitions — category, label, type.
 * glAccountId starts as null until admin sets it.
 */
const DEFAULT_MAPPINGS = [
  // ── Debit (expense) ───────────────────────────────────────────────
  { category: "gaji",               label: "Beban Gaji Pokok",           type: "DEBIT"  },
  { category: "tunjangan_makan",    label: "Beban Tunjangan Makan",      type: "DEBIT"  },
  { category: "tunjangan_transport",label: "Beban Tunjangan Transport",  type: "DEBIT"  },
  { category: "tunjangan_lain",     label: "Beban Tunjangan Lainnya",    type: "DEBIT"  },
  { category: "bpjs_perusahaan",    label: "Beban BPJS Perusahaan",      type: "DEBIT"  },
  // ── Credit (liability / asset reduction) ──────────────────────────
  { category: "hutang_bpjs",        label: "Hutang BPJS",                type: "CREDIT" },
  { category: "kasbon",             label: "Piutang Kasbon Karyawan",    type: "CREDIT" },
  { category: "kas_bank",           label: "Kas/Bank Pembayaran Gaji",   type: "CREDIT" },
];

/**
 * Return all mappings. If a category doesn't exist yet in the DB,
 * seed it first so the frontend always sees all 8 rows.
 */
const getPayrollGlAccounts = async () => {
  // Buat kategori yang belum ada saja. Dulu memakai upsert yang MENIMPA glAccountId → setiap kali
  // halaman Akun Gaji dibuka, semua pemetaan terhapus dan jurnal gaji gagal sinkron (QA G5-01).
  await seedMissing(DEFAULT_MAPPINGS);
  return findAll();
};

/**
 * Save mappings from admin.
 * body.mappings: Array<{ category: string; glAccountId: string | null }>
 */
const savePayrollGlAccounts = async (mappings) => {
  if (!Array.isArray(mappings) || mappings.some((m) => !m || typeof m !== "object")) {
    throw new AppError("Format pemetaan akun gaji tidak valid", StatusCodes.BAD_REQUEST);
  }
  const items = mappings.map(({ category, glAccountId }) => {
    const def = DEFAULT_MAPPINGS.find((d) => d.category === category);
    if (!def) throw new AppError(`Kategori akun gaji tidak dikenal: ${category}`, StatusCodes.BAD_REQUEST);
    return { category, label: def.label, type: def.type, glAccountId: glAccountId || null };
  });

  await upsertMany(items);
  return findAll();
};

module.exports = { getPayrollGlAccounts, savePayrollGlAccounts };
